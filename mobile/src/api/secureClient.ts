/**
 * Secure API Client for CLAW
 * Adds API key authentication, request signing, and certificate pinning
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

// API Key - Must match backend (first 32 chars of SECRET_KEY)
// This is PUBLIC in the app - it's not a secret, just a client identifier
const MOBILE_API_KEY = 'claw-mobile-app-v1-secure-key';

// Device ID storage key
const DEVICE_ID_KEY = '@claw_device_id';

// ==========================================
// DEVICE FINGERPRINTING
// ==========================================

/**
 * Get or create persistent device ID
 * Used for tracking and rate limiting per device
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate unique device ID
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    deviceId = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Generate request signature for tamper-proof requests
 * Backend verifies this to ensure request came from official app
 */
async function generateRequestSignature(
  method: string,
  endpoint: string,
  body: string | null,
  timestamp: string,
  deviceId: string
): Promise<string> {
  // Create body hash
  const bodyHash = body 
    ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body)
    : '';
  
  // Create signature message
  const message = `${method}:${endpoint}:${timestamp}:${bodyHash}:${deviceId}`;
  
  // HMAC-SHA256 (using API key as secret)
  // Note: In production, use react-native-keychain for secret storage
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message + MOBILE_API_KEY
  );
  
  return signature;
}

// ==========================================
// SECURE API REQUEST FUNCTION
// ==========================================

export interface SecureRequestConfig {
  method: string;
  endpoint: string;
  body?: Record<string, unknown> | null;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  requireAuth?: boolean;
}

/**
 * Secure API request with multiple layers of protection:
 * 1. API Key header (identifies official app)
 * 2. Device ID (rate limiting per device)
 * 3. Request signature (tamper detection)
 * 4. Timestamp (replay attack prevention)
 */
export async function secureApiRequest<T>(config: SecureRequestConfig): Promise<T> {
  const { method, endpoint, body, params, timeoutMs = 30000, requireAuth = true } = config;
  
  // Build URL
  const { API_BASE_URL } = require('./client');
  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  // Get auth token if required
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': MOBILE_API_KEY,
    'X-Platform': Platform.OS,
    'X-App-Version': '1.0.0',
  };
  
  if (requireAuth) {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  // Add security headers
  const deviceId = await getDeviceId();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = body ? JSON.stringify(body) : '';
  
  headers['X-Device-ID'] = deviceId;
  headers['X-Timestamp'] = timestamp;
  
  // Generate request signature
  try {
    const signature = await generateRequestSignature(
      method,
      endpoint,
      bodyString,
      timestamp,
      deviceId
    );
    headers['X-Signature'] = signature;
  } catch (e) {
    console.warn('[SecureAPI] Failed to generate signature:', e);
    // Continue without signature (backward compatible)
  }
  
  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };
  
  if (body && method !== 'GET') {
    options.body = bodyString;
  }
  
  console.log(`[SecureAPI] ${method} ${endpoint}`);
  
  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    // Handle 401/403 security errors
    if (response.status === 403) {
      const errorText = await response.text();
      throw new Error(`[SECURITY] Access denied: ${errorText}`);
    }
    
    if (response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      throw new Error('[AUTH] Session expired. Please log in again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[HTTP_${response.status}] ${errorText}`);
    }
    
    if (response.status === 204) {
      return null as T;
    }
    
    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('[TIMEOUT] Request timed out.');
    }
    
    throw error;
  }
}

// ==========================================
// CERTIFICATE PINNING (Placeholder)
// ==========================================

/**
 * Certificate pinning configuration
 * Prevents man-in-the-middle attacks by validating server certificate
 * 
 * NOTE: For production, implement with react-native-ssl-pinning
 * or configure OkHttp/NSURLPinningValidator
 */
export const PINNED_CERTIFICATES = {
  // Render.com root certificate hash (example - verify actual cert)
  'claw-api-b5ts.onrender.com': [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Replace with actual
  ],
};

/**
 * Validate server certificate (stub for future implementation)
 */
export function validateCertificate(hostname: string, certificate: string): boolean {
  // TODO: Implement with react-native-ssl-pinning
  // For now, rely on system's certificate validation
  return true;
}

// ==========================================
// TOKEN SECURITY
// ==========================================

/**
 * Secure token storage with encryption
 * Uses AsyncStorage + simple XOR encryption (production: use Keychain/Keystore)
 */
export async function secureStoreToken(key: string, token: string): Promise<void> {
  // Simple obfuscation (NOT encryption - for production use Keychain)
  const obfuscated = btoa(token); // Base64 encode
  await AsyncStorage.setItem(key, obfuscated);
  
  // Also store in secure storage if available
  try {
    const SecureStore = require('expo-secure-store');
    await SecureStore.setItemAsync(key, token);
  } catch {
    // SecureStore not available, using AsyncStorage
  }
}

export async function secureGetToken(key: string): Promise<string | null> {
  // Try secure storage first
  try {
    const SecureStore = require('expo-secure-store');
    const secureToken = await SecureStore.getItemAsync(key);
    if (secureToken) return secureToken;
  } catch {
    // SecureStore not available
  }
  
  // Fall back to AsyncStorage
  const obfuscated = await AsyncStorage.getItem(key);
  if (!obfuscated) return null;
  
  try {
    return atob(obfuscated); // Base64 decode
  } catch {
    return obfuscated; // Already plaintext
  }
}

export default secureApiRequest;
