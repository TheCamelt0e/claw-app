"""
AI-powered Claw processing service
Uses OpenAI to categorize, tag, and extract context from captured intentions
"""
import json
import openai
from typing import Dict, List, Optional
from app.core.config import settings

# Initialize OpenAI client
openai.api_key = settings.OPENAI_API_KEY


class ClawAIProcessor:
    """Processes raw claw content using AI to extract structured data"""
    
    CATEGORIES = [
        "book", "movie", "tv_show", "podcast", "music", "article",
        "restaurant", "cafe", "bar", "recipe", "food",
        "product", "app", "service", "tool",
        "task", "reminder", "goal", "idea",
        "travel", "experience", "event",
        "gift", "person", "other"
    ]
    
    ACTION_TYPES = [
        "buy", "read", "watch", "listen", "try", "visit",
        "research", "learn", "make", "call", "remember", "schedule"
    ]
    
    TIME_CONTEXTS = [
        "morning", "afternoon", "evening", "night",
        "weekend", "weekday", "specific_date"
    ]
    
    async def process_claw(self, content: str) -> Dict:
        """
        Process a claw's content and extract structured information
        Returns: {
            'title': str,
            'category': str,
            'tags': list,
            'action_type': str,
            'time_context': str,
            'location_hint': str,
            'app_suggestion': str,
            'urgency': str
        }
        """
        if not settings.OPENAI_API_KEY:
            return self._fallback_processing(content)
        
        try:
            prompt = self._build_prompt(content)
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI that extracts structured information from user's captured intentions. Be concise and accurate."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            result_text = response.choices[0].message.content
            return json.loads(result_text)
            
        except Exception as e:
            print(f"AI processing error: {e}")
            return self._fallback_processing(content)
    
    def _build_prompt(self, content: str) -> str:
        return f"""Analyze this captured intention and extract structured information.

Content: "{content}"

Return a JSON object with these fields:
- title: A short, clear title (max 60 chars)
- category: One of {self.CATEGORIES}
- tags: 2-5 relevant keywords
- action_type: One of {self.ACTION_TYPES}
- time_context: When user likely wants to act (morning/evening/weekend/weekday/specific_date/none)
- location_hint: Type of location if mentioned (grocery_store/bookstore/restaurant/anywhere)
- app_suggestion: App/website likely needed (amazon/netflix/spotify/google_maps/chrome/none)
- urgency: low/medium/high based on language used

Respond ONLY with valid JSON, no markdown."""
    
    def _fallback_processing(self, content: str) -> Dict:
        """Simple keyword-based fallback when AI is unavailable"""
        content_lower = content.lower()
        
        # Determine category
        category = "other"
        if any(w in content_lower for w in ["book", "read", "author", "novel"]):
            category = "book"
        elif any(w in content_lower for w in ["movie", "watch", "film", "netflix", "hbo"]):
            category = "movie"
        elif any(w in content_lower for w in ["restaurant", "eat", "food", "cafe", "try"]):
            category = "restaurant"
        elif any(w in content_lower for w in ["buy", "amazon", "purchase", "order"]):
            category = "product"
        elif any(w in content_lower for w in ["call", "text", "email", "remind"]):
            category = "task"
        
        # Determine action type
        action_type = "remember"
        if any(w in content_lower for w in ["buy", "purchase", "order"]):
            action_type = "buy"
        elif any(w in content_lower for w in ["read", "book"]):
            action_type = "read"
        elif any(w in content_lower for w in ["watch", "movie", "show"]):
            action_type = "watch"
        elif any(w in content_lower for w in ["try", "visit", "go"]):
            action_type = "try"
        
        # Generate title
        title = content[:60] + "..." if len(content) > 60 else content
        
        return {
            "title": title,
            "category": category,
            "tags": [category],
            "action_type": action_type,
            "time_context": None,
            "location_hint": None,
            "app_suggestion": None,
            "urgency": "medium"
        }


# Singleton instance
ai_processor = ClawAIProcessor()
