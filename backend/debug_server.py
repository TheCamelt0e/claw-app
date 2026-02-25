"""
Debug script to test the server
"""
import subprocess
import time
import requests
import os
import sys
import threading

# Start server
print('Starting server...')
proc = subprocess.Popen(
    [sys.executable, '-c', 
     'import uvicorn; from app.main_sqlite import app; uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    cwd=os.getcwd(),
    text=True,
    bufsize=1
)

def read_output():
    for line in proc.stdout:
        print(f'[SERVER] {line}', end='')

# Start thread to read output
thread = threading.Thread(target=read_output)
thread.daemon = True
thread.start()

time.sleep(6)

try:
    print('\n--- Making requests ---')
    
    # Test health
    r = requests.get('http://localhost:8000/health', timeout=5)
    print(f'Health: {r.status_code}')
    
    # Test demo data
    print('Requesting demo data...')
    r = requests.get('http://localhost:8000/api/v1/claws/demo-data', timeout=5)
    print(f'Demo data status: {r.status_code}')
    print(f'Response: {r.text[:500]}')
    
    time.sleep(2)  # Let server output flush
    
finally:
    print('\n--- Stopping server ---')
    proc.terminate()
    proc.wait()
    print('Done')
