"""
Simple test script for CLAW API
Run this to verify everything works!
"""
import requests
import json

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_endpoint(method, endpoint, data=None, params=None, use_base=False):
    """Test an endpoint and print results"""
    if use_base:
        url = f"{BASE_URL}/{endpoint}"
    else:
        url = f"{API_URL}/{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=5)
        elif method == "POST":
            response = requests.post(url, params=params, json=data, timeout=5)
        else:
            print(f"[ERROR] Unknown method: {method}")
            return None
        
        print(f"\n{'='*60}")
        print(f"{method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("[SUCCESS]")
            try:
                result = response.json()
                print(f"Response:\n{json.dumps(result, indent=2)[:500]}...")
                return result
            except:
                print(f"Response: {response.text[:200]}")
                return response.text
        else:
            print(f"[FAILED]: {response.text[:200]}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Cannot connect to {url}")
        print("Make sure the server is running: python run_sqlite.py")
        return None
    except Exception as e:
        print(f"[ERROR]: {e}")
        return None

def main():
    print("CLAW API Test Suite")
    print("=" * 60)
    
    # Test 1: Health check
    result = test_endpoint("GET", "health", use_base=True)
    if not result:
        print("\n[ERROR] Server not running or health check failed!")
        print("Start it with: python run_sqlite.py")
        return 1
    
    # Test 2: Create demo data
    test_endpoint("GET", "claws/demo-data")
    
    # Test 3: Capture a claw
    result = test_endpoint("POST", "claws/capture", params={
        "content": "That book Sarah mentioned about atomic habits",
        "content_type": "text"
    })
    
    claw_id = None
    if result and "claw" in result:
        claw_id = result["claw"]["id"]
        print(f"\n[CREATED] Claw ID: {claw_id}")
    
    # Test 4: Capture more claws
    test_endpoint("POST", "claws/capture", params={
        "content": "Try that new Italian restaurant downtown",
        "content_type": "text"
    })
    
    test_endpoint("POST", "claws/capture", params={
        "content": "Buy batteries for the TV remote",
        "content_type": "text"
    })
    
    # Test 5: List all claws
    test_endpoint("GET", "claws/me")
    
    # Test 6: Test resurfacing (simulate opening Amazon)
    result = test_endpoint("GET", "claws/surface", params={"active_app": "amazon"})
    
    if result and len(result) > 0:
        print(f"\n[FOUND] {len(result)} claws to surface!")
        for claw in result:
            print(f"   - {claw.get('title', claw.get('content', 'Unknown'))}")
    
    # Test 7: Strike a claw (if we have one)
    if claw_id:
        test_endpoint("POST", f"claws/{claw_id}/strike")
    
    # Test 8: Get user stats
    test_endpoint("GET", "users/stats")
    
    print("\n" + "=" * 60)
    print("[DONE] All tests completed!")
    print(f"\nView interactive docs at: {BASE_URL}/docs")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    exit(main())
