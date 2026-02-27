"""
Pattern Analyzer Service
Learns when users complete different types of intentions
Enables smart resurfacing at optimal times
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.strike_pattern import StrikePattern
from app.models.claw_sqlite import Claw
from app.core.config import ICELANDIC_STORES


class PatternAnalyzer:
    """
    Analyzes strike patterns to predict optimal resurfacing times.
    """
    
    @staticmethod
    def record_strike(
        db: Session,
        user_id: str,
        claw_id: str,
        category: Optional[str],
        action_type: Optional[str],
        captured_at: datetime,
        lat: Optional[float] = None,
        lng: Optional[float] = None
    ) -> StrikePattern:
        """
        Record a strike for pattern learning.
        Call this whenever a user strikes a claw.
        """
        now = datetime.utcnow()
        
        # Calculate metrics
        time_to_strike = int((now - captured_at).total_seconds() / 3600) if captured_at else 0
        was_expired = 1 if (captured_at and now > captured_at + timedelta(days=7)) else 0
        
        # Determine if near a store
        near_store = None
        if lat and lng:
            near_store = PatternAnalyzer._find_nearest_store(lat, lng)
        
        pattern = StrikePattern(
            user_id=user_id,
            claw_id=claw_id,
            category=category,
            action_type=action_type,
            struck_at=now,
            day_of_week=now.weekday(),  # 0=Monday
            hour_of_day=now.hour,
            location_lat=lat,
            location_lng=lng,
            near_store=near_store,
            was_expired=was_expired,
            time_to_strike_hours=time_to_strike,
        )
        
        try:
            db.add(pattern)
            db.commit()
            return pattern
        except Exception:
            db.rollback()
            raise
    
    @staticmethod
    def _find_nearest_store(lat: float, lng: float) -> Optional[str]:
        """Find nearest Icelandic store if within 500m"""
        import math
        
        def haversine(lat1, lon1, lat2, lon2):
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            return 6371000 * 2 * math.asin(math.sqrt(a))
        
        nearest = None
        min_dist = float('inf')
        
        for store in ICELANDIC_STORES:
            dist = haversine(lat, lng, store["lat"], store["lng"])
            if dist < 500 and dist < min_dist:  # Within 500m
                min_dist = dist
                nearest = store["chain"]  # bonus, kronan, etc.
        
        return nearest
    
    @staticmethod
    def get_user_patterns(
        db: Session,
        user_id: str,
        category: Optional[str] = None
    ) -> Dict:
        """
        Get learned patterns for a user.
        Returns: {
            "peak_days": [(day_name, count), ...],
            "peak_hours": [(hour, count), ...],
            "preferred_stores": [(store, count), ...],
            "avg_time_to_strike": hours
        }
        """
        query = db.query(StrikePattern).filter(StrikePattern.user_id == user_id)
        if category:
            query = query.filter(StrikePattern.category == category)
        
        patterns = query.all()
        
        if not patterns:
            return {}
        
        # Analyze days
        day_counts = Counter(p.day_of_week for p in patterns)
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        peak_days = [(day_names[d], c) for d, c in day_counts.most_common(3)]
        
        # Analyze hours
        hour_counts = Counter(p.hour_of_day for p in patterns)
        peak_hours = [(h, c) for h, c in hour_counts.most_common(3)]
        
        # Analyze stores
        store_patterns = [p for p in patterns if p.near_store]
        store_counts = Counter(p.near_store for p in store_patterns)
        preferred_stores = [(s, c) for s, c in store_counts.most_common(3)]
        
        # Average time to strike
        avg_time = sum(p.time_to_strike_hours for p in patterns) / len(patterns)
        
        return {
            "peak_days": peak_days,
            "peak_hours": peak_hours,
            "preferred_stores": preferred_stores,
            "avg_time_to_strike_hours": round(avg_time, 1),
            "total_recorded": len(patterns),
        }
    
    @staticmethod
    def calculate_resurface_score(
        db: Session,
        claw: Claw,
        current_lat: Optional[float] = None,
        current_lng: Optional[float] = None,
        current_hour: Optional[int] = None,
        current_dow: Optional[int] = None
    ) -> Tuple[float, str]:
        """
        Calculate how likely this claw is to be completed RIGHT NOW.
        Returns: (score 0-1, reason_string)
        """
        now = datetime.utcnow()
        hour = current_hour if current_hour is not None else now.hour
        dow = current_dow if current_dow is not None else now.weekday()
        
        score = 0.5  # Base score
        reasons = []
        
        # Get user's patterns for this category
        patterns = db.query(StrikePattern).filter(
            StrikePattern.user_id == claw.user_id,
            StrikePattern.category == claw.category
        ).all()
        
        if not patterns:
            # No pattern data - use defaults
            if claw.category in ["product", "restaurant"]:
                return (0.6, "Shopping item - check when near stores")
            return (0.5, "No pattern data yet")
        
        # Check day of week match
        dow_matches = sum(1 for p in patterns if p.day_of_week == dow)
        if dow_matches > len(patterns) * 0.3:  # >30% of strikes on this day
            score += 0.2
            reasons.append(f"You often strike {claw.category} items on {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dow]}")
        
        # Check hour match
        hour_matches = sum(1 for p in patterns if abs(p.hour_of_day - hour) <= 2)
        if hour_matches > len(patterns) * 0.3:
            score += 0.2
            reasons.append(f"Good time of day for you")
        
        # Check location match
        if current_lat and current_lng and claw.category in ["product", "restaurant", "task"]:
            near_store = PatternAnalyzer._find_nearest_store(current_lat, current_lng)
            if near_store:
                store_matches = sum(1 for p in patterns if p.near_store == near_store)
                if store_matches > 0:
                    score += 0.3
                    reasons.append(f"You're near {near_store}!")
        
        # Urgency boost
        if claw.is_priority:
            score += 0.1
            reasons.append("VIP item")
        
        # Expiry penalty
        if claw.is_expired():
            score = max(0.1, score - 0.3)
            reasons.append("Expiring soon!")
        
        score = min(1.0, max(0.0, score))
        reason_str = " • ".join(reasons) if reasons else "Based on your patterns"
        
        return (score, reason_str)
    
    @staticmethod
    def get_smart_surface_list(
        db: Session,
        user_id: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get active claws sorted by likelihood of completion RIGHT NOW.
        """
        now = datetime.utcnow()
        
        # Get active claws
        claws = db.query(Claw).filter(
            Claw.user_id == user_id,
            Claw.status == "active"
        ).all()
        
        if not claws:
            return []
        
        # Batch fetch all patterns for this user in one query to avoid N+1
        patterns_by_category = defaultdict(list)
        all_categories = list(set(c.category for c in claws if c.category))
        
        if all_categories:
            all_patterns = db.query(StrikePattern).filter(
                StrikePattern.user_id == user_id,
                StrikePattern.category.in_(all_categories)
            ).all()
            
            for pattern in all_patterns:
                patterns_by_category[pattern.category].append(pattern)
        
        # Score each one using batched patterns
        scored = []
        for claw in claws:
            score, reason = PatternAnalyzer._calculate_resurface_score_with_patterns(
                claw, patterns_by_category.get(claw.category, []), lat, lng, now.hour, now.weekday()
            )
            scored.append({
                "claw": claw,
                "score": score,
                "reason": reason,
            })
        
        # Sort by score descending
        scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Format for API
        return [
            {
                **s["claw"].to_dict(),
                "resurface_score": round(s["score"], 2),
                "resurface_reason": s["reason"],
            }
            for s in scored[:limit]
        ]
    
    @staticmethod
    def _calculate_resurface_score_with_patterns(
        claw: Claw,
        patterns: List[StrikePattern],
        current_lat: Optional[float] = None,
        current_lng: Optional[float] = None,
        current_hour: Optional[int] = None,
        current_dow: Optional[int] = None
    ) -> Tuple[float, str]:
        """
        Calculate resurface score using pre-fetched patterns (no DB queries).
        """
        score = 0.5  # Base score
        reasons = []
        
        if not patterns:
            # No pattern data - use defaults
            if claw.category in ["product", "restaurant"]:
                return (0.6, "Shopping item - check when near stores")
            return (0.5, "No pattern data yet")
        
        # Check day of week match
        dow_matches = sum(1 for p in patterns if p.day_of_week == current_dow)
        if dow_matches > len(patterns) * 0.3:  # >30% of strikes on this day
            score += 0.2
            reasons.append(f"You often strike {claw.category} items on {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][current_dow]}")
        
        # Check hour match
        hour_matches = sum(1 for p in patterns if abs(p.hour_of_day - current_hour) <= 2)
        if hour_matches > len(patterns) * 0.3:
            score += 0.2
            reasons.append(f"Good time of day for you")
        
        # Check location match
        if current_lat and current_lng and claw.category in ["product", "restaurant", "task"]:
            near_store = PatternAnalyzer._find_nearest_store(current_lat, current_lng)
            if near_store:
                store_matches = sum(1 for p in patterns if p.near_store == near_store)
                if store_matches > 0:
                    score += 0.3
                    reasons.append(f"You're near {near_store}!")
        
        # Urgency boost
        if claw.is_priority:
            score += 0.1
            reasons.append("VIP item")
        
        # Expiry penalty
        if claw.is_expired():
            score = max(0.1, score - 0.3)
            reasons.append("Expiring soon!")
        
        score = min(1.0, max(0.0, score))
        reason_str = " • ".join(reasons) if reasons else "Based on your patterns"
        
        return (score, reason_str)
