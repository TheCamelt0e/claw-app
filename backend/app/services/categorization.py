"""
Content categorization service
Centralized keyword-based categorization for claws
"""

# Category detection keywords
CATEGORY_KEYWORDS = {
    "book": ["book", "read", "author", "novel"],
    "movie": ["movie", "watch", "film", "netflix", "hbo", "series"],
    "restaurant": ["restaurant", "eat", "food", "cafe", "pizza", "burger"],
    "product": ["buy", "amazon", "purchase", "order", "shop"],
    "task": ["call", "text", "email", "remind", "schedule"],
    "idea": ["idea", "thought", "concept"],
    "someday": ["learn", "someday", "eventually", "maybe", "consider", "think about", "one day"],
}

# Action type detection keywords
ACTION_KEYWORDS = {
    "buy": ["buy", "purchase", "order", "shop"],
    "read": ["read", "book"],
    "watch": ["watch", "movie", "show", "series"],
    "try": ["try", "visit", "go", "check out"],
    "call": ["call", "phone", "text"],
}

# App trigger mapping
APP_TRIGGERS = {
    "book": "amazon",
    "product": "amazon",
    "movie": "netflix",
    "restaurant": "maps",
}

# Shopping-related keywords for geofencing
SHOPPING_KEYWORDS = [
    "buy", "shop", "get", "purchase", "bonus", "kronan",
    "hagkaup", "groceries", "shopping", "store", "market"
]


def detect_category(content: str) -> str:
    """Detect category from content"""
    content_lower = content.lower()
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(word in content_lower for word in keywords):
            return category
    
    return "other"


def detect_action_type(content: str) -> str:
    """Detect action type from content"""
    content_lower = content.lower()
    
    for action, keywords in ACTION_KEYWORDS.items():
        if any(word in content_lower for word in keywords):
            return action
    
    return "remember"


def detect_app_trigger(category: str) -> str | None:
    """Get suggested app trigger for category"""
    return APP_TRIGGERS.get(category)


def generate_title(content: str, max_length: int = 60) -> str:
    """Generate a title from content"""
    if len(content) > max_length:
        return content[:max_length - 3] + "..."
    return content


def categorize_content(content: str) -> dict:
    """
    Full categorization of content
    Returns dict with title, category, tags, action_type, app_trigger
    """
    category = detect_category(content)
    action_type = detect_action_type(content)
    app_trigger = detect_app_trigger(category)
    title = generate_title(content)
    
    return {
        "title": title,
        "category": category,
        "tags": [category, action_type],
        "action_type": action_type,
        "app_trigger": app_trigger
    }


def is_shopping_related(content: str) -> bool:
    """Check if content is shopping-related for geofencing"""
    content_lower = content.lower()
    return any(kw in content_lower for kw in SHOPPING_KEYWORDS)
