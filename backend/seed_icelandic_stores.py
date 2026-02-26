"""
Seed Icelandic stores and locations into CLAW database
Run this to populate real Bónus, Krónan, Hagkaup locations
"""
import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Location, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Real Icelandic store locations (approximate coordinates)
ICELANDIC_STORES = [
    # Bónus locations (Reykjavik area)
    {"name": "Bónus Laugavegur", "chain": "bonus", "address": "Laugavegur 50, Reykjavík", "lat": 64.1466, "lng": -21.9426, "category": "grocery"},
    {"name": "Bónus Hallveigarstígur", "chain": "bonus", "address": "Hallveigarstígur 1, Reykjavík", "lat": 64.1472, "lng": -21.9396, "category": "grocery"},
    {"name": "Bónus Fiskislóð", "chain": "bonus", "address": "Fiskislóð 16, Reykjavík", "lat": 64.1498, "lng": -21.9557, "category": "grocery"},
    {"name": "Bónus Skeifan", "chain": "bonus", "address": "Skeifan 13, Reykjavík", "lat": 64.1292, "lng": -21.8964, "category": "grocery"},
    {"name": "Bónus Kópavogur", "chain": "bonus", "address": "Hamraborg 2, Kópavogur", "lat": 64.1112, "lng": -21.9043, "category": "grocery"},
    {"name": "Bónus Hafnarfjörður", "chain": "bonus", "address": "Strandgata 29, Hafnarfjörður", "lat": 64.0697, "lng": -21.9510, "category": "grocery"},
    {"name": "Bónus Akureyri", "chain": "bonus", "address": "Glerárgata 36, Akureyri", "lat": 65.6833, "lng": -18.0955, "category": "grocery"},
    
    # Krónan locations
    {"name": "Krónan Austurver", "chain": "kronan", "address": "Laugarnesvegi 72, Reykjavík", "lat": 64.1423, "lng": -21.8744, "category": "grocery"},
    {"name": "Krónan Bíldshöfði", "chain": "kronan", "address": "Bíldshöfða 18, Reykjavík", "lat": 64.1315, "lng": -21.8623, "category": "grocery"},
    {"name": "Krónan Grandi", "chain": "kronan", "address": "Grandagarði 20, Reykjavík", "lat": 64.1538, "lng": -21.9436, "category": "grocery"},
    {"name": "Krónan Kringlan", "chain": "kronan", "address": "Kringlan 4, Reykjavík", "lat": 64.1295, "lng": -21.8961, "category": "grocery"},
    
    # Hagkaup locations
    {"name": "Hagkaup Kringlan", "chain": "hagkaup", "address": "Kringlan 6, Reykjavík", "lat": 130.0000, "lng": -21.8965, "category": "department_store"},
    {"name": "Hagkaup Spöngin", "chain": "hagkaup", "address": "Skeifan 8, Reykjavík", "lat": 64.1285, "lng": -21.8920, "category": "department_store"},
    {"name": "Hagkaup Egilshöll", "chain": "hagkaup", "address": "Reynisvatnsvegur 1, Reykjavík", "lat": 64.1395, "lng": -21.8180, "category": "department_store"},
    {"name": "Hagkaup Akureyri", "chain": "hagkaup", "address": "Glerártorg, Akureyri", "lat": 65.6825, "lng": -18.0901, "category": "department_store"},
    
    # Costco
    {"name": "Costco Kauptún", "chain": "costco", "address": "Kauptún 3, Garðabær", "lat": 64.0933, "lng": -21.9244, "category": "grocery"},
    
    # Nettó
    {"name": "Nettó Laugavegur", "chain": "netto", "address": "Laugavegur 60, Reykjavík", "lat": 64.1468, "lng": -21.9430, "category": "grocery"},
    {"name": "Nettó Sveavík", "chain": "netto", "address": "Sveavík 10, Reykjavík", "lat": 64.1520, "lng": -21.9600, "category": "grocery"},
    
    # Bookstores
    {"name": "Penninn Eymundsson Laugavegur", "chain": "penninn", "address": "Laugavegur 77, Reykjavík", "lat": 64.1455, "lng": -21.9440, "category": "bookstore"},
    {"name": "Penninn Eymundsson Kringlan", "chain": "penninn", "address": "Kringlan 4, Reykjavík", "lat": 64.1298, "lng": -21.8958, "category": "bookstore"},
    {"name": "Bókin", "chain": "bokin", "address": "Klapparstígur 25, Reykjavík", "lat": 64.1470, "lng": -21.9380, "category": "bookstore"},
    
    # Coffee shops (for recommendations)
    {"name": "Kaffitár Laugavegur", "chain": "kaffitar", "address": "Laugavegur 50, Reykjavík", "lat": 64.1465, "lng": -21.9420, "category": "cafe"},
    {"name": "Kaffitár Bankastræti", "chain": "kaffitar", "address": "Bankastræti 8, Reykjavík", "lat": 64.1478, "lng": -21.9390, "category": "cafe"},
    {"name": "Reykjavík Roasters", "chain": "reykjavik_roasters", "address": "Kárastígur 14, Reykjavík", "lat": 64.1460, "lng": -21.9360, "category": "cafe"},
    {"name": "Bergsson Mathús", "chain": "bergsson", "address": "Templarasund 3, Reykjavík", "lat": 64.1468, "lng": -21.9405, "category": "cafe"},
    
    # Restaurants
    {"name": "Bæjarins Beztu", "chain": "baejarnis_beztu", "address": "Tryggvagata 1, Reykjavík", "lat": 64.1475, "lng": -21.9395, "category": "restaurant"},
    {"name": "Icelandic Street Food", "chain": "icelandic_street_food", "address": "Lækjargata 8, Reykjavík", "lat": 64.1472, "lng": -21.9400, "category": "restaurant"},
    {"name": "Svarta Kaffið", "chain": "svarta_kaffid", "address": "Laugavegur 54, Reykjavík", "lat": 64.1464, "lng": -21.9428, "category": "restaurant"},
    
    # Pharmacies (Apótek)
    {"name": "Apótekarinn Laugavegur", "chain": "apotek", "address": "Laugavegur 45, Reykjavík", "lat": 64.1467, "lng": -21.9422, "category": "pharmacy"},
    {"name": "Lyfjaver", "chain": "lyfjaver", "address": "Skeifan 8, Reykjavík", "lat": 64.1288, "lng": -21.8925, "category": "pharmacy"},
    
    # Hardware stores
    {"name": "Byko", "chain": "byko", "address": "Skeifan 10, Reykjavík", "lat": 64.1290, "lng": -21.8930, "category": "hardware"},
    {"name": "Húsasmiðjan", "chain": "husasmidjan", "address": "Bíldshöfða 12, Reykjavík", "lat": 64.1320, "lng": -21.8630, "category": "hardware"},
    
    # Gas stations
    {"name": "N1 Hringbraut", "chain": "n1", "address": "Hringbraut 68, Reykjavík", "lat": 64.1430, "lng": -21.9250, "category": "gas_station"},
    {"name": "ÓB Skemmuvegur", "chain": "ob", "address": "Skemmuvegur 2, Reykjavík", "lat": 64.1325, "lng": -21.8850, "category": "gas_station"},
    {"name": "Atlantsolía Miklabraut", "chain": "atlantsolia", "address": "Miklabraut 104, Reykjavík", "lat": 64.1350, "lng": -21.8800, "category": "gas_station"},
]

def seed_icelandic_stores():
    db = SessionLocal()
    try:
        # Check if stores already exist
        existing_count = db.query(Location).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} locations. Skipping seed.")
            return
        
        print(f"Adding {len(ICELANDIC_STORES)} Icelandic locations...")
        
        for store_data in ICELANDIC_STORES:
            location = Location(
                name=store_data["name"],
                chain=store_data["chain"],
                address=store_data["address"],
                latitude=store_data["lat"],
                longitude=store_data["lng"],
                category=store_data["category"],
                country_code="IS",
                is_active=True
            )
            db.add(location)
        
        db.commit()
        print(f"✅ Successfully added {len(ICELANDIC_STORES)} Icelandic locations!")
        
        # Print summary by category
        categories = {}
        for store in ICELANDIC_STORES:
            cat = store["category"]
            categories[cat] = categories.get(cat, 0) + 1
        
        print("\n📊 Summary by category:")
        for cat, count in sorted(categories.items()):
            print(f"   {cat}: {count}")
            
    except Exception as e:
        print(f"❌ Error seeding locations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_icelandic_stores()
