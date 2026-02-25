"""Debug with full server output"""
import subprocess
import time
import requests
import sys
import os
import threading

# Clear any existing DB to start fresh
db_file = os.path.join(os.getcwd(), 'claw.db')
if os.path.exists(db_file):
    os.remove(db_file)
    print(f"Removed old database: {db_file}")

print("Starting server with debug output...")
proc = subprocess.Popen(
    [sys.executable, '-c', '''
import uvicorn
from app.main_sqlite import app
uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
'''],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    cwd=os.getcwd(),
    text=True,
    bufsize=1
)

def read_output():
    for line in proc.stdout:
        print(f'[SERVER] {line}', end='')

thread = threading.Thread(target=read_output)
thread.daemon = True
thread.start()

time.sleep(6)

try:
    print('\n--- TESTING ENDPOINTS ---')
    
    # Test demo data
    print('\n> GET /api/v1/claws/demo-data')
    r = requests.get('http://localhost:8000/api/v1/claws/demo-data', timeout=10)
    print(f'  Status: {r.status_code}')
    if r.status_code != 200:
        print(f'  Error: {r.text[:500]}')
    
    time.sleep(2)
    
finally:
    print('\n--- SHUTTING DOWN ---')
    proc.terminate()
    proc.wait()
