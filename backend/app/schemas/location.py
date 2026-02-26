"""
Location schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class LocationResponse(BaseModel):
    id: str
    name: str
    chain: str
    address: Optional[str]
    latitude: float
    longitude: float
    category: str
    country_code: str
    distance_meters: Optional[int] = None


class NearbyLocationRequest(BaseModel):
    lat: float
    lng: float
    radius_meters: int = 500  # Default 500m


class PatternUpdateRequest(BaseModel):
    category: str  # e.g., "grocery", "book"
    action_type: str  # e.g., "buy", "read"
    location_chain: Optional[str] = None


class GeofenceCheckResponse(BaseModel):
    triggered_claws: List[dict]
    user_location: dict
