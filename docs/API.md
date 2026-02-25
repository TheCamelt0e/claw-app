# CLAW API Documentation

## Core Concept

CLAW is an **Intention Archive** - it captures your micro-intentions when they strike and resurfaces them when you can actually act on them.

## Authentication

All API endpoints (except login/register) require a Bearer token:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST /api/v1/auth/register
Register a new user.

```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "display_name": "John Doe"
}
```

#### POST /api/v1/auth/login
Get access token.

```json
{
  "username": "user@example.com",
  "password": "securepass123"
}
```

### Claws

#### POST /api/v1/claws/capture
**The core endpoint.** Capture a new intention.

```json
{
  "content": "That book Sarah mentioned about atomic habits",
  "content_type": "text",
  "location_name": "Coffee Shop Downtown"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "That book Sarah mentioned about atomic habits",
  "title": "Atomic Habits by James Clear (Sarah's recommendation)",
  "category": "book",
  "tags": ["productivity", "habits", "reading"],
  "action_type": "buy",
  "status": "active",
  "expires_at": "2024-02-01T12:00:00Z"
}
```

The AI automatically categorizes and suggests when to resurface this claw.

#### GET /api/v1/claws/surface
**Get claws that match your current context.** Call this when:
- User opens the app
- User enters a known location
- User opens Amazon/Netflix/etc

**Query Parameters:**
- `lat`, `lng`: Current location
- `active_app`: Currently open app (e.g., "amazon", "netflix")

#### POST /api/v1/claws/{id}/strike
Mark a claw as completed. This is the satisfying completion action.

#### POST /api/v1/claws/{id}/release
Let a claw expire early. Not every intention deserves to live.

## The Core Loop

1. **Capture** → POST /capture (3 seconds max)
2. **Process** → AI categorizes in background
3. **Resurface** → GET /surface when context matches
4. **Strike** → POST /{id}/strike to complete

## Context Triggers

Claws can be surfaced based on:
- **Location**: "Remind me when I'm near Whole Foods"
- **Time**: "Remind me in the evening"
- **App**: "Remind me when I open Amazon"
- **Smart**: AI detects context from content
