"""
Gemini AI Service for CLAW
Handles intelligent content analysis, categorization, and enrichment
"""
import time
import json
import re
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import google.generativeai as genai
from app.core.config import settings


# CLAW AI System Instruction - Defines the AI's persona and constraints
CLAW_SYSTEM_INSTRUCTION = """You are a specialized AI assistant built directly into the CLAW app.
Your primary goal is to help users organize their daily intentions and learn their behavior 
for better suggestions. You use location and time patterns to surface reminders when most relevant.

You must strictly follow these rules:

Tone: Be fun, energetic, and encouraging. Celebrate user wins. Be gentle with misses.

Constraints: Do NOT give medical, legal, or financial advice. Do NOT write computer code. 
Do NOT discuss politics or controversial topics. 
If a user asks something outside your purpose, politely reply: 
'I am specifically designed to help with capturing and organizing your intentions, so I cannot answer that.'

Formatting: Keep your responses under 3-4 sentences so they fit perfectly on a mobile screen 
without excessive scrolling. Do not use complex markdown like tables unless explicitly asked.

Pattern Learning: Pay attention to WHEN and WHERE users complete tasks. Notice patterns like:
- "User completes grocery items Thursday evenings near Bónus"
- "User captures books but strikes them on weekends" 
- "User is more active with tasks in the morning"

Use these patterns to suggest better timing for reminders."""


class RateLimiter:
    """Simple in-memory rate limiter for Gemini API calls"""
    
    def __init__(self, rpm_limit: int = 15, rpd_limit: int = 1500):
        self.rpm_limit = rpm_limit
        self.rpd_limit = rpd_limit
        self.requests: list = []
        
    def can_make_request(self) -> tuple[bool, Optional[int]]:
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        one_day_ago = now - timedelta(days=1)
        
        self.requests = [ts for ts in self.requests if ts > one_day_ago]
        recent_requests = [ts for ts in self.requests if ts > one_minute_ago]
        
        if len(recent_requests) >= self.rpm_limit:
            oldest_recent = min(recent_requests)
            retry_after = int(60 - (now - oldest_recent).total_seconds())
            return False, max(1, retry_after)
        
        if len(self.requests) >= self.rpd_limit:
            tomorrow = now + timedelta(days=1)
            retry_after = int((tomorrow.replace(hour=0, minute=0, second=0) - now).total_seconds())
            return False, retry_after
        
        return True, None
    
    def record_request(self):
        self.requests.append(datetime.utcnow())


_rate_limiter = RateLimiter(
    rpm_limit=settings.GEMINI_RPM_LIMIT,
    rpd_limit=settings.GEMINI_RPD_LIMIT
)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self._client = None
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Initialize model (system instruction added to prompts for compatibility)
            self._client = genai.GenerativeModel(
                model_name=self.model_name
            )
    
    def is_available(self) -> bool:
        return self._client is not None and bool(self.api_key)
    
    def _clean_json_response(self, text: str) -> str:
        """Clean markdown from JSON response"""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    
    def _sanitize_input(self, content: str) -> str:
        """Sanitize user input to prevent prompt injection attacks"""
        if not content:
            return ""
        
        # Escape quotes to prevent breaking out of the content string
        sanitized = content.replace('"', '\\"')
        
        # Remove control characters
        sanitized = "".join(char for char in sanitized if ord(char) >= 32 or char in '\n\r\t')
        
        # Limit length to prevent token exhaustion attacks
        max_length = 2000
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length] + "... [truncated]"
        
        # Remove common prompt injection patterns
        injection_patterns = [
            r'ignore previous instructions',
            r'disregard.*?(?:prompt|instruction)',
            r'you are now.*?(?:assistant|ai)',
            r'system prompt',
            r'{"role":\s*"system"',
        ]
        
        import re
        for pattern in injection_patterns:
            sanitized = re.sub(pattern, '[removed]', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    def _build_smart_prompt(self, content: str, existing_claws: List[Dict] = None) -> str:
        """Build comprehensive prompt for smart analysis"""
        
        # Sanitize user input
        safe_content = self._sanitize_input(content)
        
        existing_context = ""
        if existing_claws:
            # Sanitize existing claw contents too
            safe_claws = [self._sanitize_input(c['content']) for c in existing_claws[:5]]
            existing_context = f"\nUser's existing intentions: {json.dumps(safe_claws)}"
        
        return f"""{CLAW_SYSTEM_INSTRUCTION}

You are CLAW's AI assistant. Analyze this captured intention and extract rich structured information.

CONTENT: "{safe_content}"{existing_context}

Return a JSON object with these fields:

1. "enhanced_title": Improve the title to be specific and actionable (max 60 chars). Examples:
   - "book" → "Read recommended book"
   - "milk" → "Buy milk from grocery store"
   - "dentist" → "Schedule dentist appointment"

2. "category": One of [book, movie, restaurant, product, task, idea, event, gift, other]

3. "tags": Array of 3-6 specific keywords. Include:
   - The item type
   - Where to get it (if mentioned)
   - Who mentioned it (if mentioned)
   Example: ["book", "atomic habits", "sarah recommended", "self-help", "read"]

4. "action_type": One of [buy, read, watch, try, visit, call, schedule, research, remember]

5. "urgency": "low", "medium", or "high" based on:
   - High: perishable, appointment needed, deadline mentioned
   - Medium: soon-ish, seasonal
   - Low: no rush, backlog item

6. "expiry_suggestion_days": Suggested days until this expires:
   - Perishables (food, milk): 2-3 days
   - Time-sensitive (appointments, events): 7 days  
   - Shopping: 7-14 days
   - Books/media: 30 days
   - Ideas/research: 30 days

7. "context": {{
    "who_mentioned": person who mentioned this (null if unknown),
    "where": location mentioned (null if unknown),
    "when_context": time context like "weekend", "summer" (null if none),
    "specific_item": the specific product/book/restaurant name (null if generic)
}}

8. "sentiment": "excited", "curious", "obligated", or "neutral"

9. "related_to_existing": boolean - does this seem related to user's existing intentions?

10. "why_capture": One sentence explaining WHY the user captured this

Respond ONLY with valid JSON, no markdown."""

    async def smart_analyze(self, content: str, existing_claws: List[Dict] = None) -> Dict:
        """
        Comprehensive AI analysis of content
        Returns enriched data with context, urgency, expiry suggestion
        """
        can_proceed, retry_after = _rate_limiter.can_make_request()
        if not can_proceed:
            return {
                "success": False,
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "The AI is thinking too hard! Please wait 60 seconds.",
                "retry_after": retry_after
            }
        
        if not self.is_available():
            return {"success": False, "error": "SERVICE_UNAVAILABLE", "message": "AI not configured"}
        
        try:
            _rate_limiter.record_request()
            
            prompt = self._build_smart_prompt(content, existing_claws)
            response = await self._client.generate_content_async(prompt)
            
            text = self._clean_json_response(response.text)
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                print(f"[Gemini] JSON parse error: {e}")
                print(f"[Gemini] Raw response: {text[:200]}...")
                return {
                    "success": False,
                    "error": "PARSE_ERROR",
                    "message": "AI response was malformed. Please try again."
                }
            
            return {
                "success": True,
                "data": {
                    "title": data.get("enhanced_title", content[:60]),
                    "category": data.get("category", "other"),
                    "tags": data.get("tags", []),
                    "action_type": data.get("action_type", "remember"),
                    "urgency": data.get("urgency", "medium"),
                    "expiry_days": data.get("expiry_suggestion_days", 7),
                    "context": data.get("context", {}),
                    "sentiment": data.get("sentiment", "neutral"),
                    "why_capture": data.get("why_capture", ""),
                    "related": data.get("related_to_existing", False),
                    "app_suggestion": self._suggest_app(data.get("category"), data.get("action_type")),
                }
            }
            
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "Resource has been exhausted" in error_str:
                return {
                    "success": False,
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "The AI is thinking too hard! Please wait 60 seconds.",
                    "retry_after": 60
                }
            
            return {
                "success": False,
                "error": "PROCESSING_ERROR",
                "message": f"AI error: {error_str}"
            }
    
    def _suggest_app(self, category: str, action_type: str) -> Optional[str]:
        """Suggest relevant app based on category/action"""
        app_map = {
            "book": "amazon",
            "movie": "netflix",
            "restaurant": "maps",
            "product": "amazon",
        }
        return app_map.get(category)
    
    async def generate_smart_reminder_text(self, claw_data: Dict) -> str:
        """Generate contextual reminder text for a claw"""
        if not self.is_available():
            return f"Don't forget: {claw_data.get('title', 'your item')}"
        
        try:
            prompt = f"""Create a short, friendly reminder (max 100 chars) for this intention:
Title: {claw_data.get('title')}
Category: {claw_data.get('category')}
Context: {claw_data.get('context', {})}
Why: {claw_data.get('why_capture', '')}

Return just the reminder text, no quotes."""
            
            response = await self._client.generate_content_async(prompt)
            return response.text.strip()[:100]
            
        except Exception:
            return f"Time to {claw_data.get('action_type', 'do')}: {claw_data.get('title', 'it')}"
    
    async def find_related_claws(self, new_content: str, existing_claws: List[Dict]) -> List[str]:
        """Find IDs of existing claws that might be related to new content"""
        if not self.is_available() or not existing_claws:
            return []
        
        try:
            claws_summary = json.dumps([
                {"id": c["id"], "content": c["content"], "category": c.get("category", "other")}
                for c in existing_claws[:20]  # Limit context
            ])
            
            prompt = f"""Given this new intention: "{new_content}"

And these existing intentions: {claws_summary}

Return a JSON array of IDs that seem related (same topic, category, or complementary). 
Example: ["id1", "id2"] or [] if none.

Return ONLY the JSON array."""
            
            response = await self._client.generate_content_async(prompt)
            text = self._clean_json_response(response.text)
            related_ids = json.loads(text)
            
            if isinstance(related_ids, list):
                return [str(id) for id in related_ids if isinstance(id, str)]
            return []
            
        except Exception:
            return []
    
    def get_usage_stats(self) -> Dict:
        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        one_day_ago = now - timedelta(days=1)
        
        recent = [ts for ts in _rate_limiter.requests if ts > one_minute_ago]
        daily = [ts for ts in _rate_limiter.requests if ts > one_day_ago]
        
        return {
            "rpm_used": len(recent),
            "rpm_limit": settings.GEMINI_RPM_LIMIT,
            "rpd_used": len(daily),
            "rpd_limit": settings.GEMINI_RPD_LIMIT,
            "remaining_today": settings.GEMINI_RPD_LIMIT - len(daily)
        }


# Singleton
gemini_service = GeminiService()
