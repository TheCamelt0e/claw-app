# Perfect CLAW - System Architecture

## Overview
```
┌─────────────────────────────────────────────────────────────┐
│                       MOBILE APP                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Capture   │  │   Strike    │  │       Vault         │  │
│  │  (Intents)  │  │  (Actions)  │  │   (History/Stats)   │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────┐    │
│  │           NotificationService                        │    │
│  │  • Push tokens    • Geofencing    • Local alerts     │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/JSON
┌───────────────────────────▼─────────────────────────────────┐
│                      BACKEND API                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐     │
│  │  /auth      │ │  /claws     │ │  /notifications     │     │
│  │  Login      │ │  CRUD       │ │  • Geofence         │     │
│  │  Register   │ │  Surface    │ │  • Smart time       │     │
│  └─────────────┘ └─────────────┘ │  • Alarms           │     │
│                                   │  • Calendar         │     │
│                                   └─────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              AI Pattern Learning                        │  │
│  │  • Time patterns (when user captures)                   │  │
│  │  • Location patterns (where user strikes)               │  │
│  │  • Category preferences                                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL
┌───────────────────────────▼─────────────────────────────────┐
│                     DATABASE                                 │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │  users   │  │  claws   │  │  alarms  │  │push_tokens │   │
│  │          │  │          │  │          │  │            │   │
│  │ id (PK)  │  │ id (PK)  │  │ id (PK)  │  │ id (PK)    │   │
│  │ email    │  │ user_id  │  │ user_id  │  │ user_id    │   │
│  │ tier     │  │ content  │  │ claw_id  │  │ token      │   │
│  │ ...      │  │ status   │  │ time     │  │ platform   │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────────┐                     │
│  │calendar_event│  │ icelandic_stores │  (in-memory)        │
│  │              │  │  (30+ locations) │                     │
│  │ id (PK)      │  └──────────────────┘                     │
│  │ claw_id      │                                            │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Capture Flow
```
User types/speaks → CaptureScreen → POST /claws/capture
                                          ↓
                                    AI categorizes
                                          ↓
                                    Store in DB
                                          ↓
                                    Update Strike tab
```

### 2. Geofence Flow
```
User walks near store (200m) → App checks location
                                          ↓
                           POST /notifications/check-geofence
                                          ↓
                           Backend finds nearby stores
                                          ↓
                           Check for shopping items
                                          ↓
                           Return notification payload
                                          ↓
                           Show local notification
```

### 3. Smart Suggestion Flow
```
User opens Strike tab → Fetch patterns from backend
                                          ↓
                           GET /locations/my-patterns
                                          ↓
                           Analyze time/location patterns
                                          ↓
                           Generate suggestions
                                          ↓
                           Display suggestion cards
```

### 4. Alarm Flow
```
User taps alarm icon → Show time picker
                                          ↓
                           Select time (1h, 2h, 4h, etc)
                                          ↓
                           POST /notifications/claw/{id}/set-alarm
                                          ↓
                           Store in DB + Schedule local notification
                                          ↓
                           Trigger at scheduled time
```

## Key Components

### Mobile
| Component | Responsibility |
|-----------|---------------|
| StrikeScreen | Display actionable items + suggestions + alarms |
| NotificationService | Handle push/local notifications |
| NotificationsStore | State management for notifications |
| LocationService | GPS tracking for geofencing |

### Backend
| Component | Responsibility |
|-----------|---------------|
| notifications.py | All notification endpoints |
| push_token_sqlite.py | Database models |
| AI Pattern Learning | Generate smart suggestions |
| Geofencing | Calculate distance to stores |

## APIs

### Notifications API
```
POST /register-token          - Register push token
POST /check-geofence          - Check if near stores
GET  /smart-suggestions       - Get AI suggestions
GET  /all-checks             - Run all notification checks
POST /claw/{id}/set-alarm    - Set reminder
GET  /my-alarms              - List pending alarms
POST /claw/{id}/add-to-calendar - Add to calendar
```

### Geofencing Logic
```python
def check_geofence(lat, lng):
    nearby = []
    for store in ICELANDIC_STORES:
        distance = haversine(lat, lng, store.lat, store.lng)
        if distance < 200:  # meters
            nearby.append(store)
    
    if nearby and has_shopping_items():
        return {
            "title": f"You're near {nearby[0].name}",
            "body": f"You have {count} items on your shopping list"
        }
```

### Smart Suggestion Logic
```python
def generate_suggestions(user_patterns):
    suggestions = []
    hour = now.hour
    
    if 7 <= hour <= 9 and not captured_today():
        suggestions.append({
            "title": "🌅 Good morning!",
            "message": "Start your day by capturing intentions"
        })
    
    if 18 <= hour <= 21 and has_active_items():
        suggestions.append({
            "title": "🌙 Evening review",
            "message": "Time to strike some intentions"
        })
    
    return suggestions
```

## Icelandic Stores Database
```python
ICELANDIC_STORES = [
    {"name": "Bónus Laugavegur", "chain": "bonus", "lat": 64.1466, "lng": -21.9426},
    {"name": "Bónus Hallveigarstígur", "chain": "bonus", "lat": 64.1455, "lng": -21.9390},
    {"name": "Krónan Borgartún", "chain": "kronan", "lat": 64.1442, "lng": -21.8853},
    {"name": "Hagkaup Miklabær", "chain": "hagkaup", "lat": 64.1284, "lng": -21.8845},
    # ... 30+ stores
]
```

## Security
- Push tokens stored per user (not shared)
- Location data used only for geofencing (not persisted)
- Calendar events user-initiated only
- Alarms require authentication

## Performance
- Geofence check: O(n) where n = 30 stores
- Distance calculation: Haversine formula
- Notification batching: All checks in one call
- Local caching: Patterns cached in store
