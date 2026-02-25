#!/usr/bin/env python3
"""
Create a public tunnel to your local backend using ngrok or localtunnel
This is a TEMPORARY solution for testing the APK immediately
"""
import subprocess
import sys
import time

print("""
🌐 PUBLIC TUNNEL FOR APK TESTING
================================

This creates a temporary public URL to your local backend.
Perfect for testing the APK before deploying to Render.

OPTION 1: Using localtunnel (free, easiest)
-------------------------------------------
1. Install: npm install -g localtunnel
2. Run: lt --port 8000 --subdomain clawapi123

OPTION 2: Using ngrok (free account required)
---------------------------------------------
1. Install ngrok from https://ngrok.com/download
2. Sign up and get auth token
3. Run: ngrok http 8000

Your backend will be available at a URL like:
- https://clawapi123.loca.lt
- https://abc123.ngrok.io

Then update mobile/src/api/client.ts with that URL!
""")

# Try to start localtunnel
try:
    print("Attempting to start localtunnel...")
    print("Your backend will be public at: https://clawapi123.loca.lt")
    print("(Make sure your backend is running on port 8000)")
    print("\nPress Ctrl+C to stop\n")
    subprocess.run(["lt", "--port", "8000", "--subdomain", "clawapi123"], check=True)
except FileNotFoundError:
    print("❌ localtunnel not installed")
    print("\nInstall it with: npm install -g localtunnel")
    print("Or use ngrok: https://ngrok.com/download")
except KeyboardInterrupt:
    print("\n👋 Tunnel closed")
except Exception as e:
    print(f"Error: {e}")
    print("\nTry running manually: lt --port 8000")
