/**
 * Server Wake Service - OPTIMIZED VERSION
 * 
 * Render free tier spins down after inactivity.
 * This service pings the server to wake it up before auth operations.
 * 
 * IMPROVEMENTS:
 * - Faster initial response detection
 * - Better error messages for debugging
 * - Handles React Native network quirks
 */

import { API_BASE_URL } from '../api/client';

// Health endpoint is at root, not /api/v1
const BASE_URL = API_BASE_URL.replace('/api/v1', '');

const WAKE_TIMEOUT = 10000; // 10s for wake ping (increased from 8s)
const HEALTH_CHECK_TIMEOUT = 5000; // 5s for quick health check

// Debug logging helper
function log(message: string, data?: any) {
  const prefix = '[ServerWake]';
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Quick check if server is already awake
 * Returns true immediately if server responds
 */
async function quickHealthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      log('✓ Server is already awake (quick check passed)');
      return true;
    }
  } catch (error: any) {
    // Expected if server is sleeping
    log('Quick check failed (server likely sleeping):', error.name);
  }
  return false;
}

/**
 * Wait for server to be ready with progress callback
 * OPTIMIZED: Fewer attempts, longer timeouts for cold starts
 */
export async function waitForServer(
  onProgress?: (message: string) => void,
  maxAttempts: number = 20 // 20 attempts with staggered delays
): Promise<boolean> {
  log('Starting server wake sequence...');
  log('Base URL:', BASE_URL);
  
  // First: Quick check - maybe server is already awake
  onProgress?.('Checking server...');
  const isAwake = await quickHealthCheck();
  if (isAwake) {
    onProgress?.('Server ready!');
    return true;
  }
  
  log('Server is sleeping, starting wake sequence...');
  onProgress?.('Waking up server... (this takes ~30s on Render free tier)');
  
  // Phase 1: Aggressive initial pings (fast, many attempts)
  // Render typically takes 10-30 seconds to wake up
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const progressMsg = `Waking server... (${attempt}/${maxAttempts})`;
    onProgress?.(progressMsg);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKE_TIMEOUT);
      
      log(`Health ping attempt ${attempt}...`);
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        log('✓ Health endpoint is awake!');
        
        // Wait a moment for the API to fully initialize
        onProgress?.('Server waking up, finalizing...');
        await new Promise(r => setTimeout(r, 2000));
        
        // Verify API is actually responding with a quick auth check
        try {
          const apiController = new AbortController();
          const apiTimeoutId = setTimeout(() => apiController.abort(), 5000);
          
          const apiResponse = await fetch(`${BASE_URL}/`, {
            method: 'HEAD',
            signal: apiController.signal,
          });
          
          clearTimeout(apiTimeoutId);
          log('✓ API root check:', apiResponse.status);
          
          // 200, 404, or 405 means the API is up (even if endpoint doesn't exist)
          if (apiResponse.status === 200 || apiResponse.status === 404 || apiResponse.status === 405) {
            log('✓✓ API is fully awake and ready!');
            return true;
          }
        } catch (apiError: any) {
          // API might still be initializing, but health is up
          // This is okay - continue to next attempt
          log('API root check failed, but health is up. Retrying...');
        }
        
        // Health is up but API check had issues - wait and retry
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      
      // Server responded but with error status
      log(`Health endpoint returned status: ${response.status}`);
      
    } catch (error: any) {
      // Expected during cold start
      if (error.name === 'AbortError') {
        log(`Attempt ${attempt} timed out (server still waking)`);
      } else if (error.message?.includes('Network request failed')) {
        log(`Attempt ${attempt} network error (RN fetch issue)`);
      } else {
        log(`Attempt ${attempt} failed:`, error.name || error.message);
      }
    }
    
    // Progressive delay: start fast, get slower
    // Early attempts: 2s, later attempts: 4s
    const delay = attempt < 10 ? 2000 : 4000;
    log(`Waiting ${delay}ms before next attempt...`);
    await new Promise(r => setTimeout(r, delay));
  }
  
  log('❌ Server wake failed after all attempts');
  return false;
}

/**
 * Check if error is a "server sleeping" error
 * Useful for deciding whether to retry
 */
export function isServerSleepingError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || String(error);
  return (
    message.includes('waking up') ||
    message.includes('timed out') ||
    message.includes('ETIMEDOUT') ||
    message.includes('Network request failed') ||
    message.includes('[TIMEOUT]') ||
    message.includes('[NETWORK]')
  );
}

/**
 * Retry a function with exponential backoff
 * Useful for auth operations after server wake
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
        onRetry?.(attempt, error);
        log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}

export default { waitForServer, isServerSleepingError, withRetry };
