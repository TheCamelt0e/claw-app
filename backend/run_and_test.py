"""
Start server, run tests, then shutdown
"""
import subprocess
import time
import sys
import signal
import os

def main():
    print("=" * 60)
    print("CLAW API - Starting Server and Running Tests")
    print("=" * 60)
    
    # Start server
    print("\n[1] Starting server...")
    server_process = subprocess.Popen(
        [sys.executable, "-c", """
import uvicorn
from app.main_sqlite import app
uvicorn.run(app, host='0.0.0.0', port=8000, log_level='warning')
"""],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    # Wait for server to start
    print("[2] Waiting for server to start (5s)...")
    time.sleep(5)
    
    try:
        # Run tests
        print("[3] Running tests...\n")
        result = subprocess.run(
            [sys.executable, "test_api.py"],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        print("\n" + "=" * 60)
        if result.returncode == 0:
            print("ALL TESTS PASSED!")
        else:
            print(f"TESTS FAILED (code: {result.returncode})")
        print("=" * 60)
        
    finally:
        # Shutdown server
        print("\n[4] Shutting down server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except:
            server_process.kill()
        print("[DONE]")
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
