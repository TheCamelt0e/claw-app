#!/usr/bin/env python3
"""
Test script to verify production backend connectivity and authentication
Run this locally to test if your backend is properly configured

Usage:
    python test_production_connection.py https://your-api.onrender.com
"""
import sys
import requests
import json
import time


def test_health_endpoint(base_url: str) -> bool:
    """Test the health endpoint"""
    url = f"{base_url}/health"
    print(f"\n[1/4] Testing health endpoint: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"  [OK] Health check passed")
            print(f"    Status: {data.get('status', 'unknown')}")
            print(f"    Service: {data.get('service', 'unknown')}")
            print(f"    Version: {data.get('version', 'unknown')}")
            print(f"    Environment: {data.get('environment', 'unknown')}")
            print(f"    Database: {data.get('database', {}).get('type', 'unknown')} "
                  f"({data.get('database', {}).get('connected', False)})")
            return True
        else:
            print(f"  [FAIL] Health check failed: HTTP {response.status_code}")
            print(f"    Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  [FAIL] Health check error: {e}")
        return False


def test_cors_preflight(base_url: str) -> bool:
    """Test CORS preflight request"""
    url = f"{base_url}/api/v1/auth/login"
    print(f"\n[2/4] Testing CORS preflight: {url}")
    
    headers = {
        'Origin': 'null',  # Mobile apps send this
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
    }
    
    try:
        response = requests.options(url, headers=headers, timeout=10)
        print(f"  Status: {response.status_code}")
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        }
        
        print(f"  CORS Headers:")
        for key, value in cors_headers.items():
            if value:
                print(f"    {key}: {value}")
        
        if response.status_code == 200:
            print(f"  [OK] CORS preflight passed")
            return True
        else:
            print(f"  [WARN] CORS preflight returned {response.status_code} (may still work)")
            return True  # Not a fatal error
    except Exception as e:
        print(f"  [FAIL] CORS test error: {e}")
        return False


def test_login_endpoint(base_url: str) -> bool:
    """Test the login endpoint (with invalid credentials)"""
    url = f"{base_url}/api/v1/auth/login"
    print(f"\n[3/4] Testing login endpoint: {url}")
    
    # Use invalid credentials - we just want to see if the endpoint responds
    payload = {
        "email": "test@example.com",
        "password": "wrongpassword123"
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Origin': 'null',  # Simulate mobile app
        'X-API-Key': 'claw-mobile-app-v1-secure-key',  # Mobile app API key
        'X-Platform': 'android',
        'X-App-Version': '1.0.0',
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 401:
            print(f"  [OK] Login endpoint responding (401 Unauthorized as expected for bad credentials)")
            return True
        elif response.status_code == 200:
            print(f"  [OK] Login successful (unexpected with test credentials!)")
            return True
        elif response.status_code == 429:
            print(f"  [WARN] Rate limited - too many requests, try again later")
            return True  # Endpoint is working, just rate limited
        else:
            print(f"  [FAIL] Unexpected status: {response.status_code}")
            try:
                print(f"    Response: {response.json()}")
            except:
                print(f"    Response: {response.text[:200]}")
            return False
    except requests.exceptions.Timeout:
        print(f"  [FAIL] Request timed out (server may be waking up)")
        return False
    except Exception as e:
        print(f"  [FAIL] Login test error: {e}")
        return False


def test_register_endpoint(base_url: str) -> bool:
    """Test the register endpoint options"""
    url = f"{base_url}/api/v1/auth/register"
    print(f"\n[4/4] Testing register endpoint: {url}")
    
    headers = {
        'Content-Type': 'application/json',
        'Origin': 'null',
        'X-API-Key': 'claw-mobile-app-v1-secure-key',  # Mobile app API key
        'X-Platform': 'android',
        'X-App-Version': '1.0.0',
    }
    
    # Test with invalid data (too short password)
    payload = {
        "email": "test@example.com",
        "password": "123",  # Too short
        "display_name": "Test"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"  Status: {response.status_code}")
        
        if response.status_code in [400, 422]:
            print(f"  [OK] Register endpoint responding (validation error as expected)")
            return True
        elif response.status_code == 200:
            print(f"  [OK] Register endpoint responding")
            return True
        elif response.status_code == 429:
            print(f"  [WARN] Rate limited - too many requests")
            return True
        else:
            print(f"  [FAIL] Unexpected status: {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"  [FAIL] Request timed out")
        return False
    except Exception as e:
        print(f"  [FAIL] Register test error: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_production_connection.py <base_url>")
        print("Example: python test_production_connection.py https://claw-api-b5ts.onrender.com")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    
    print("=" * 60)
    print("CLAW Backend Connection Test")
    print("=" * 60)
    print(f"Testing: {base_url}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    results.append(("Health Endpoint", test_health_endpoint(base_url)))
    results.append(("CORS Preflight", test_cors_preflight(base_url)))
    results.append(("Login Endpoint", test_login_endpoint(base_url)))
    results.append(("Register Endpoint", test_register_endpoint(base_url)))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "[OK] PASS" if passed else "[FAIL] FAIL"
        print(f"  {status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("[OK] ALL TESTS PASSED")
        print("\nYour backend appears to be configured correctly!")
        print("If the mobile app still can't connect, check:")
        print("  1. Mobile app API URL matches this URL exactly")
        print("  2. SECRET_KEY is set and persistent in Render dashboard")
        print("  3. Mobile device has internet connection")
        print("  4. Not a corporate network with firewall restrictions")
    else:
        print("[FAIL] SOME TESTS FAILED")
        print("\nPlease check:")
        print("  1. Backend is deployed and running on Render")
        print("  2. URL is correct")
        print("  3. Render logs for errors")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
