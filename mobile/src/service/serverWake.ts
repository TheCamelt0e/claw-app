/**
 * Server Wake Service - FIXED VERSION
 * 
 * Render free tier spins down after inactivity.
 * This service pings the server to wake it up before auth operations.
 */

import { API_BASE_URL } from '../api/client';

// Health endpoint is at root, not /api/v1
const BASE_URL = API_BASE_URL.replace('/api/v1', '');

const WAKE_TIMEOUT = 8000; // 8s for wake ping

/**
 * Wait for server to be ready with progress callback
 * Tries health endpoint first, then actual API endpoint
 */
export async function waitForServer(
  onProgress?: (message: string) => void,
  maxAttempts: number = 15 // 75 seconds total
): Promise<boolean> {
  console.log('[ServerWake] Starting server wake sequence...');
  onProgress?.('Waking up server...');
  
  // Phase 1: Wake health endpoint
  for (let attempt = 1; attempt <= 8; attempt++) {
    onProgress?.(`Waking server... (${attempt}/8)`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKE_TIMEOUT);
      
      console.log(`[ServerWake] Health ping attempt ${attempt}...`);
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('[ServerWake] Health endpoint is awake!');
        break; // Health is up, now check API
      }
    } catch (error: any) {
      console.log(`[ServerWake] Health attempt ${attempt} failed: ${error.name}`);
    }
    
    // Wait before next attempt
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Phase 2: Verify actual API is responding
  onProgress?.('Checking API...');
  
  for (let attempt = 1; attempt <= 7; attempt++) {
    onProgress?.(`Checking API... (${attempt}/7)`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKE_TIMEOUT);
      
      console.log(`[ServerWake] API check attempt ${attempt}...`);
      // Try to hit the actual API root - this verifies the app is fully loaded
      const response = await fetch(`${BASE_URL}/`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 405) { // 405 is OK - means endpoint exists
        console.log('[ServerWake] API is fully awake and ready!');
        return true;
      }
    } catch (error: any) {
      console.log(`[ServerWake] API check ${attempt} failed: ${error.name}`);
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('[ServerWake] Server wake failed after all attempts');
  return false;
}

export default { waitForServer };
