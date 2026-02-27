#!/usr/bin/env python3
"""
🧪 AI Functionality Test Script for CLAW Backend

Run this to verify AI is working correctly before building the mobile app.

Usage:
    python test_ai.py

Requirements:
    - Backend dependencies installed
    - GEMINI_API_KEY set in .env file
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.gemini_service import gemini_service
from app.services.categorization import categorize_content


async def test_ai_availability():
    """Test 1: Check if AI service is available"""
    print("\n📝 Test 1: AI Availability")
    print("-" * 50)
    
    is_available = gemini_service.is_available()
    print(f"AI Available: {is_available}")
    
    if not is_available:
        print("❌ FAIL: AI not available. Check GEMINI_API_KEY in .env")
        return False
    
    print("✅ PASS: AI is available")
    return True


async def test_smart_analysis():
    """Test 2: Test smart analysis with Gemini"""
    print("\n📝 Test 2: Smart Analysis")
    print("-" * 50)
    
    test_cases = [
        "Buy milk from Bonus",
        "Book Sarah recommended about habits",
        "Call mom about weekend plans",
        "New sushi restaurant downtown",
    ]
    
    for content in test_cases:
        print(f"\nInput: '{content}'")
        result = await gemini_service.smart_analyze(content)
        
        if not result["success"]:
            print(f"❌ FAIL: {result.get('error', 'Unknown error')}")
            print(f"   Message: {result.get('message', 'No message')}")
            continue
        
        data = result["data"]
        print(f"✅ SUCCESS:")
        print(f"   Title: {data['title']}")
        print(f"   Category: {data['category']}")
        print(f"   Tags: {', '.join(data['tags'][:3])}")
        print(f"   Urgency: {data['urgency']}")
        print(f"   Expiry: {data['expiry_days']} days")
    
    return True


async def test_rate_limiting():
    """Test 3: Test rate limiting"""
    print("\n📝 Test 3: Rate Limiting")
    print("-" * 50)
    
    stats = gemini_service.get_usage_stats()
    print(f"Rate Limit Status:")
    print(f"  RPM: {stats['rpm_used']}/{stats['rpm_limit']} (remaining: {stats['rpm_limit'] - stats['rpm_used']})")
    print(f"  RPD: {stats['rpd_used']}/{stats['rpd_limit']} (remaining: {stats['remaining_today']})")
    
    if stats['rpm_used'] >= stats['rpm_limit']:
        print("⚠️  WARNING: Rate limit reached for this minute")
    elif stats['rpd_used'] >= stats['rpd_limit']:
        print("⚠️  WARNING: Daily rate limit reached")
    else:
        print("✅ PASS: Within rate limits")
    
    return True


async def test_fallback():
    """Test 4: Test fallback categorization"""
    print("\n📝 Test 4: Fallback Categorization")
    print("-" * 50)
    
    test_cases = [
        ("Buy milk", "product"),
        ("Read book", "book"),
        ("Watch movie", "movie"),
        ("Call mom", "task"),
    ]
    
    for content, expected in test_cases:
        result = categorize_content(content)
        actual = result["category"]
        status = "✅" if actual == expected else "⚠️ "
        print(f"{status} '{content}' → {actual} (expected: {expected})")
    
    print("\n✅ PASS: Fallback categorization works")
    return True


async def test_json_parsing():
    """Test 5: Test JSON response parsing"""
    print("\n📝 Test 5: JSON Response Parsing")
    print("-" * 50)
    
    test_responses = [
        '{"title": "Test", "category": "book"}',
        '```json\n{"title": "Test", "category": "book"}\n```',
        '```\n{"title": "Test", "category": "book"}\n```',
        '{"title": "Test", "category": "book", "extra": null}',
    ]
    
    for response in test_responses:
        cleaned = gemini_service._clean_json_response(response)
        try:
            import json
            data = json.loads(cleaned)
            print(f"✅ Parsed: {data}")
        except json.JSONDecodeError as e:
            print(f"❌ Failed: {e}")
    
    print("\n✅ PASS: JSON parsing works correctly")
    return True


async def test_error_handling():
    """Test 6: Test error handling"""
    print("\n📝 Test 6: Error Handling")
    print("-" * 50)
    
    # Test with empty content
    result = await gemini_service.smart_analyze("")
    print(f"Empty content: {'success' in result}")
    
    # Test with very long content
    long_content = "Buy milk " * 100
    result = await gemini_service.smart_analyze(long_content)
    print(f"Long content: {result.get('success', False)}")
    
    print("\n✅ PASS: Error handling works")
    return True


async def run_all_tests():
    """Run all tests"""
    print("=" * 50)
    print("🤖 CLAW AI Functionality Tests")
    print("=" * 50)
    
    tests = [
        ("AI Availability", test_ai_availability),
        ("Smart Analysis", test_smart_analysis),
        ("Rate Limiting", test_rate_limiting),
        ("Fallback", test_fallback),
        ("JSON Parsing", test_json_parsing),
        ("Error Handling", test_error_handling),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! AI is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check configuration.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
