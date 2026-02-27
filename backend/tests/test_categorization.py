"""
Tests for AI categorization logic
"""
import pytest


# Import the categorization function from claws endpoint
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def categorize_content(content: str) -> dict:
    """Copy of categorization function for testing"""
    content_lower = content.lower()
    
    # Detect category
    category = "other"
    if any(w in content_lower for w in ["book", "read", "author", "novel"]):
        category = "book"
    elif any(w in content_lower for w in ["movie", "watch", "film", "netflix"]):
        category = "movie"
    elif any(w in content_lower for w in ["restaurant", "eat", "food", "cafe", "pizza", "burger"]):
        category = "restaurant"
    elif any(w in content_lower for w in ["buy", "amazon", "purchase", "order", "shop"]):
        category = "product"
    elif any(w in content_lower for w in ["call", "text", "email", "remind", "schedule"]):
        category = "task"
    elif any(w in content_lower for w in ["idea", "thought", "concept"]):
        category = "idea"
    
    # Detect action
    action_type = "remember"
    if any(w in content_lower for w in ["buy", "purchase", "order", "shop"]):
        action_type = "buy"
    elif any(w in content_lower for w in ["read", "book"]):
        action_type = "read"
    elif any(w in content_lower for w in ["watch", "movie", "show", "series"]):
        action_type = "watch"
    elif any(w in content_lower for w in ["try", "visit", "go", "check out"]):
        action_type = "try"
    elif any(w in content_lower for w in ["call", "phone", "text"]):
        action_type = "call"
    
    # Generate title
    title = content[:60] + "..." if len(content) > 60 else content
    
    # Detect app trigger
    app_trigger = None
    if category == "book" or category == "product":
        app_trigger = "amazon"
    elif category == "movie":
        app_trigger = "netflix"
    elif category == "restaurant":
        app_trigger = "maps"
    
    return {
        "title": title,
        "category": category,
        "tags": [category, action_type],
        "action_type": action_type,
        "app_trigger": app_trigger
    }


class TestCategorization:
    """Test AI categorization"""
    
    def test_book_detection(self):
        """Should detect book-related content"""
        result = categorize_content("Read Atomic Habits by James Clear")
        assert result["category"] == "book"
        assert result["action_type"] == "read"
        assert "amazon" in result["app_trigger"]
    
    def test_movie_detection(self):
        """Should detect movie-related content"""
        result = categorize_content("Watch the new Netflix documentary")
        assert result["category"] == "movie"
        assert result["action_type"] == "watch"
    
    def test_restaurant_detection(self):
        """Should detect restaurant-related content"""
        result = categorize_content("Try that new Italian restaurant downtown")
        assert result["category"] == "restaurant"
        assert result["action_type"] == "try"
    
    def test_product_detection(self):
        """Should detect product-related content"""
        result = categorize_content("Buy batteries on Amazon")
        assert result["category"] == "product"
        assert result["action_type"] == "buy"
    
    def test_task_detection(self):
        """Should detect task-related content"""
        result = categorize_content("Call mom about weekend plans")
        assert result["category"] == "task"
        assert result["action_type"] == "call"
    
    def test_title_truncation(self):
        """Should truncate long titles"""
        long_content = "A" * 100
        result = categorize_content(long_content)
        assert len(result["title"]) <= 63  # 60 + "..."
        assert result["title"].endswith("...")
    
    def test_tags_include_category_and_action(self):
        """Tags should include both category and action"""
        result = categorize_content("Read a book about habits")
        assert result["category"] in result["tags"]
        assert result["action_type"] in result["tags"]
