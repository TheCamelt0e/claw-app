"""
Create test user for CLAW app
User: a@a.com
Password: aaaaaa
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
from app.core.database import SessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == "a@a.com").first()
        if existing:
            print("✅ Test user already exists!")
            print(f"   Email: a@a.com")
            print(f"   Password: aaaaaa")
            return
        
        # Create test user
        test_user = User(
            email="a@a.com",
            hashed_password=pwd_context.hash("aaaaaa"),
            display_name="Test User",
            subscription_tier="FREE",
            total_claws_created=0,
            total_claws_completed=0,
            is_active=True
        )
        
        db.add(test_user)
        db.commit()
        
        print("✅ Test user created successfully!")
        print(f"   Email: a@a.com")
        print(f"   Password: aaaaaa")
        print(f"   Display Name: Test User")
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
