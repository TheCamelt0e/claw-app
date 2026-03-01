/**
 * Server Wake Service
 * 
 * Render free tier spins down after inactivity.
 * This service pings the server to wake it up before auth operations.
 */

import { API_BASE_URL } from '../api/client';

const WAKE_TIMEOUT = 5000; // 5s for wake ping (fast)
const MAX_WAKE_RETRIES = 3;

/**
 * Ping the server to wake it up from cold start
 * Returns true if server is awake, false otherwise
 */
export async function wakeServer(): Promise<boolean> {
  console.log('[ServerWake] Pinging server to wake up...');
  
  for (let attempt = 1; attempt <= MAX_WAKE_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKE_TIMEOUT);
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('[ServerWake] Server is awake!');
        return true;
      }
    } catch (error: any) {
      console.log(`[ServerWake] Attempt ${attempt} failed:`, error.name);
      
      if (attempt < MAX_WAKE_RETRIES) {
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
  }
  
  console.log('[ServerWake] Server wake failed after retries');
  return false;
}

/**
 * Wait for server to be ready with progress callback
 * Useful for showing "Server waking up..." UI
 */
export async function waitForServer(
  onProgress?: (attempt: number, maxAttempts: number) => void,
  maxAttempts: number = 12 // 60 seconds total (5s * 12)
): Promise<boolean> {
  console.log('[ServerWake] Waiting for server to be ready...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.(attempt, maxAttempts);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[ServerWake] Server ready after ${attempt} attempts`);
        return true;
      }
    } catch (error) {
      // Expected if server is still waking up
    }
    
    // Wait 5 seconds between attempts
    await new Promise(r => setTimeout(r, 5000));
  }
  
  return false;
}

export default { wakeServer, waitForServer };
