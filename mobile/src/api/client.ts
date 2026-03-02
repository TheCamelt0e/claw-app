/**
 * API Client for CLAW - Environment Aware Configuration
 * Using native fetch (React Native compatible)
 * 
 * Environment-based API URL selection:
 * 1. EXPO_PUBLIC_API_URL env var (EAS builds)
 * 2. __DEV__ flag for development builds
 * 3. Production fallback
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ==========================================
// API URL CONFIGURATION
// Priority: 1) EAS Build env  2) Development mode  3) Production fallback
// ==========================================

const getApiUrl = (): string => {
  // EAS Build environment variables (set in eas.json or EAS Secrets)
  const easUrl = process.env.EXPO_PUBLIC_API_URL;
  if (easUrl) {
    // SECURITY: Enforce HTTPS in production builds
    if (!__DEV__ && easUrl.startsWith('http://')) {
      console.warn('[SECURITY] Forcing HTTPS for production API URL');
      return easUrl.replace('http://', 'https://');
    }
    return easUrl;
  }
  
  // Development builds - auto-detect based on __DEV__
  if (__DEV__) {
    // Use local backend for development
    // Android emulator: 10.0.2.2, iOS simulator: localhost
    const localIp = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
    return `http://${localIp}:8000/api/v1`;
  }
  
  // Production fallback (always HTTPS)
  return 'https://claw-api-b5ts.onrender.com/api/v1';
};

export const API_BASE_URL = getApiUrl();

// SECURITY: Verify HTTPS in production
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  console.error('[SECURITY] CRITICAL: Production API URL must use HTTPS!');
  console.error('[SECURITY] Current URL:', API_BASE_URL);
}

// Only log in development
if (__DEV__) {
  console.log('[CLAW] API URL:', API_BASE_URL);
  console.log('[CLAW] Platform:', Platform.OS);
}

// ==========================================
// API SECURITY HEADERS
// ==========================================

// Mobile API key - MUST match backend derived key
// Backend derives this from SECRET_KEY using HMAC-SHA256
// If backend MOBILE_API_KEY env var is not set, it uses this fallback:
const MOBILE_API_KEY = 'claw-mobile-app-v1-secure-key';

async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync('claw_device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await SecureStore.setItemAsync('claw_device_id', deviceId);
  }
  return deviceId;
}

async function generateRequestSignature(
  method: string,
  endpoint: string,
  body: string | null
): Promise<string> {
  const Crypto = await import('expo-crypto').catch(() => null);
  if (!Crypto) return '';
  
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const deviceId = await getDeviceId();
  const bodyHash = body 
    ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body)
    : '';
  
  const message = `${method}:${endpoint}:${timestamp}:${bodyHash}:${deviceId}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, message + MOBILE_API_KEY);
}

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface User {
  id: string;
  email: string;
  display_name: string;
  subscription_tier: 'free' | 'pro' | 'family';
  total_claws_created: number;
  total_claws_completed: number;
  current_streak: number;
  longest_streak: number;
  email_verified: boolean;
}

export interface AuthTokens {
  access_token: string;
  expires_at: number; // timestamp
}

export interface Claw {
  id: string;
  content: string;
  title?: string;
  category?: string;
  tags: string[];
  action_type?: string;
  status: 'active' | 'completed' | 'expired' | 'archived' | 'syncing';
  location_name?: string;
  created_at: string;
  expires_at: string;
  completed_at?: string;
  surface_count: number;
  is_vip?: boolean;
  is_priority?: boolean;
  content_type?: string;
  app_trigger?: string;
  // AI-enriched fields
  urgency?: 'low' | 'medium' | 'high';
  ai_source?: 'gemini' | 'fallback';
  // Sync status
  isOptimistic?: boolean;
  transactionId?: string;
  resurface_score?: number;
  resurface_reason?: string;
}

export interface PaginatedClawsResponse {
  items: Claw[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface StrikeResponse {
  message: string;
  claw_id: string;
  streak: {
    current_streak: number;
    longest_streak: number;
    new_milestones: number[];
    streak_maintained: boolean;
  };
  resurface_score?: number;
  resurface_reason?: string;
  oracle_moment?: boolean;
}

export interface CaptureResponse {
  message: string;
  priority: boolean;
  priority_level?: string;
  expires_in_days: number;
  claw: Claw;
}

export interface NotificationData {
  type: string;
  title: string;
  body: string;
  data?: any;
}

export interface NotificationsResponse {
  notifications: NotificationData[];
}

export interface NearbyStore {
  name: string;
  chain: string;
  lat: number;
  lng: number;
  distance: number;
}

export interface NearbyStoresResponse {
  stores: NearbyStore[];
}

// ==========================================
// API REQUEST FUNCTION
// ==========================================

// Helper to get auth token
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': MOBILE_API_KEY,
    'X-Platform': Platform.OS,
    'X-App-Version': '1.0.0',
    'X-Device-ID': await getDeviceId(),
    'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add request signature for sensitive endpoints
  // Note: This is a simplified version - full implementation would sign each request
  return headers;
}

// Generic API request function with timeout
export async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown> | null,
  params?: Record<string, unknown>,
  timeoutMs: number = 60000
): Promise<T> {
  // Build URL with query params
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

  const headers = await getAuthHeaders();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
    keepalive: true,
  };

  const bodyString = body ? JSON.stringify(body) : '';
  if (body && method !== 'GET') {
    options.body = bodyString;
  }

  // ALWAYS log auth requests for debugging
  const isAuthRequest = endpoint.includes('/auth/');
  if (__DEV__ || isAuthRequest) {
    console.log(`[API] >>> ${method} ${url} (timeout: ${timeoutMs}ms)`);
  }
  
  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    if (__DEV__ || isAuthRequest) {
      console.log(`[API] <<< ${method} ${endpoint} - Status: ${response.status}`);
    }
    
    // Handle 401 unauthorized - token revoked or expired
    if (response.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      const errorText = await response.text();
      throw new Error(`Session expired. Please log in again: ${errorText}`);
    }
    
    // Handle 403 forbidden - CORS or API key issues
    if (response.status === 403) {
      const errorText = await response.text();
      console.error(`[API] 403 Forbidden: ${errorText}`);
      throw new Error(`[HTTP_403] Access denied. CORS or API key issue. ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      // Try to parse JSON error
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`[HTTP_${response.status}] ${errorJson.detail || errorJson.message || `Server error ${response.status}`}`);
      } catch (parseError) {
        // If it's not JSON (e.g., HTML error page), provide a clean message
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          throw new Error(`[HTTP_${response.status}] Server returned HTML instead of JSON. The server may be down or the endpoint doesn't exist.`);
        }
        throw new Error(`[HTTP_${response.status}] ${errorText || 'Unknown server error'}`);
      }
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle abort/timeout
    if (error.name === 'AbortError') {
      throw new Error('[TIMEOUT] Server took too long to respond. The server may be waking up (takes ~30s). Please try again.');
    }
    
    // React Native specific network error detection
    const errorMessage = error?.message || '';
    const isNetworkError = 
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('Network Error') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('Socket') ||
      !errorMessage;
    
    if (isNetworkError) {
      // Check if it's a development build trying to reach localhost
      if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('10.0.2.2')) {
        throw new Error('[NETWORK] Cannot connect to local server. Make sure the backend is running on your computer.\n\nFor Android: Use 10.0.2.2:8000\nFor iOS: Use localhost:8000');
      }
      
      // Check if it's an SSL/TLS error (common in React Native)
      if (errorMessage.includes('SSL') || errorMessage.includes('certificate') || errorMessage.includes('TLS')) {
        throw new Error('[NETWORK] SSL/TLS connection error. This can happen with self-signed certificates or network restrictions.');
      }
      
      throw new Error(`[NETWORK] Cannot connect to server at ${API_BASE_URL}. Check your internet connection or try again.`);
    }
    
    // Better error for empty messages
    if (!errorMessage) {
      throw new Error(`[NETWORK] Network error: Cannot reach ${API_BASE_URL}. Check connection/CORS.`);
    }
    
    throw error;
  }
}

// ==========================================
// AUTH API
// ==========================================

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface VerifyEmailResponse {
  message: string;
  email: string;
  email_verified: boolean;
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>('POST', '/auth/login', { email, password }, undefined, 20000),
  
  register: (email: string, password: string, displayName: string) =>
    apiRequest<LoginResponse>('POST', '/auth/register', { 
      email, 
      password, 
      display_name: displayName 
    }, undefined, 90000),
  
  getMe: () =>
    apiRequest<User>('GET', '/auth/me', undefined, undefined, 8000),
  
  refresh: () =>
    apiRequest<LoginResponse>('POST', '/auth/refresh', undefined, undefined, 5000),
  
  logoutAll: () =>
    apiRequest<LoginResponse>('POST', '/auth/logout-all'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<LoginResponse>('POST', '/auth/change-password', { 
      current_password: currentPassword, 
      new_password: newPassword 
    }),
  
  deleteAccount: () =>
    apiRequest<{message: string}>('DELETE', '/auth/account'),
  
  // Email Verification
  verifyEmail: (token: string) =>
    apiRequest<VerifyEmailResponse>('POST', '/auth/verify-email', { token }),
  
  resendVerification: (email: string) =>
    apiRequest<{message: string}>('POST', '/auth/resend-verification', { email }),
  
  // Password Reset
  forgotPassword: (email: string) =>
    apiRequest<{message: string}>('POST', '/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{message: string}>('POST', '/auth/reset-password', { 
      token, 
      new_password: newPassword 
    }),
};

// ==========================================
// CLAWS API
// ==========================================

export const clawsAPI = {
  capture: (content: string, contentType: string = 'text', extraData: any = {}) => {
    const body: any = { content, content_type: contentType };
    if (extraData.priority === true || extraData.priority === 'true') {
      body.priority = true;
      body.priority_level = extraData.priority_level || 'high';
    }
    if (extraData.someday) {
      body.someday = true;
    }
    return apiRequest<CaptureResponse>('POST', '/claws/capture', body);
  },
  
  getMyClaws: (status?: string, page: number = 1, perPage: number = 20) =>
    apiRequest<PaginatedClawsResponse>('GET', '/claws/me', undefined, { 
      status, 
      page, 
      per_page: perPage 
    }),
  
  getSurfaceClaws: (lat?: number, lng?: number, activeApp?: string) =>
    apiRequest<Claw[]>('GET', '/claws/surface', undefined, { lat, lng, active_app: activeApp }),
  
  strike: (clawId: string, lat?: number, lng?: number) =>
    apiRequest<StrikeResponse>('POST', `/claws/${clawId}/strike`, { lat, lng }),
  
  release: (clawId: string) =>
    apiRequest<{message: string, claw_id: string}>('POST', `/claws/${clawId}/release`),
  
  extend: (clawId: string, days: number) =>
    apiRequest<{message: string, claw: Claw}>('POST', `/claws/${clawId}/extend`, { days }),
  
  createDemoData: () =>
    apiRequest<{message: string, claws: Claw[]}>('POST', '/claws/demo-data'),
  
  // Duplicate Detection
  checkDuplicates: (content: string, threshold: number = 0.7) =>
    apiRequest<{
      has_duplicates: boolean;
      duplicates: Array<Claw & { similarity: number }>;
      similarity_scores: Record<string, number>;
      suggestion: string;
    }>('POST', '/claws/check-duplicates', { content, threshold }),
  
  mergeClaws: (keepClawId: string, mergeClawIds: string[]) =>
    apiRequest<{
      message: string;
      kept_claw: Claw;
      merged_count: number;
      merged_ids: string[];
    }>('POST', '/claws/merge', { keep_claw_id: keepClawId, merge_claw_ids: mergeClawIds }),
  
  getDuplicatesReport: (threshold: number = 0.75) =>
    apiRequest<{
      duplicate_groups: Array<{
        claws: Claw[];
        similarity_scores: Record<string, number>;
        suggestion: string;
      }>;
      total_duplicates: number;
      message: string;
    }>('GET', '/claws/duplicates-report', undefined, { threshold }),
};

// ==========================================
// NOTIFICATIONS API
// ==========================================

export const notificationsAPI = {
  registerToken: (token: string, platform: string) =>
    apiRequest<{success: boolean, message: string}>('POST', '/notifications/register-token', { 
      token, 
      platform 
    }),
  
  checkGeofence: (lat: number, lng: number) =>
    apiRequest<NotificationsResponse>('POST', '/notifications/check-geofence', { lat, lng }),
  
  getNearbyStores: (lat: number, lng: number, radius: number = 1000) =>
    apiRequest<NearbyStoresResponse>('GET', '/notifications/nearby-stores', undefined, { 
      lat, 
      lng, 
      radius 
    }),
  
  getSmartSuggestions: () =>
    apiRequest<NotificationsResponse>('GET', '/notifications/smart-suggestions'),
  
  checkAllNotifications: (lat?: number, lng?: number) =>
    apiRequest<NotificationsResponse>('GET', '/notifications/all-checks', undefined, { lat, lng }),
  
  setAlarm: (clawId: string, scheduledTime: string) =>
    apiRequest<{success: boolean, alarm: any}>('POST', `/notifications/claw/${clawId}/set-alarm`, { 
      scheduled_time: scheduledTime 
    }),
  
  addToCalendar: (clawId: string) =>
    apiRequest<{success: boolean, event: any}>('POST', `/notifications/claw/${clawId}/add-to-calendar`),
  
  getMyPatterns: () =>
    apiRequest<{location_patterns: any[], time_patterns: any[]}>('GET', '/notifications/my-patterns'),
  
  logStrikePattern: (category: string, actionType: string) =>
    apiRequest<{status: string, confidence: number}>('POST', '/notifications/patterns/log-strike', { 
      category, 
      action_type: actionType 
    }),
};

// ==========================================
// GROUPS API
// ==========================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  group_type: 'family' | 'couple' | 'roommates' | 'other';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  member_count: number;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  display_name?: string;
  email: string;
}

export interface GroupItem extends Omit<Claw, 'status'> {
  group_claw_id: string;
  status: 'active' | 'claimed' | 'completed';
  claimed_by?: string;
  captured_by: string;
}

export interface GroupWithItems extends Group {
  items: GroupItem[];
}

export const groupsAPI = {
  getMyGroups: () =>
    apiRequest<{groups: Group[]}>('GET', '/groups/my'),
  
  getGroup: (groupId: string) =>
    apiRequest<GroupWithItems>('GET', `/groups/${groupId}`),
  
  createGroup: (name: string, description?: string, groupType: string = 'family') =>
    apiRequest<{group: Group, message: string}>('POST', '/groups/create', {
      name,
      description,
      group_type: groupType,
    }),
  
  captureToGroup: (groupId: string, content: string, contentType: string = 'text') =>
    apiRequest<{claw: Claw, group_claw: any, message: string}>(
      'POST', 
      `/groups/${groupId}/capture`,
      { content, content_type: contentType }
    ),
  
  claimGroupItem: (groupId: string, groupClawId: string) =>
    apiRequest<{message: string, group_claw: any}>('POST', `/groups/${groupId}/items/${groupClawId}/claim`),
  
  strikeGroupItem: (groupId: string, groupClawId: string) =>
    apiRequest<{message: string, group_claw: any}>('POST', `/groups/${groupId}/items/${groupClawId}/strike`),
  
  inviteMember: (groupId: string, email: string) =>
    apiRequest<{message: string, group: Group}>('POST', `/groups/${groupId}/invite`, { email }),
  
  leaveGroup: (groupId: string) =>
    apiRequest<{message: string}>('DELETE', `/groups/${groupId}/leave`),
  
  pollGroupUpdates: (groupId: string) =>
    apiRequest<GroupWithItems>('GET', `/groups/${groupId}`),
};

// ==========================================
// USERS API - Streak System 2.0
// ==========================================

export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  last_strike_date: string | null;
  streak_expires_at: string | null;
  milestones_achieved: string[];
  streak_freezes_available: number;
  streak_recovery_available: boolean;
  active_bet: StreakBet | null;
}

export interface StreakBet {
  target_strikes: number;
  current_strikes: number;
  deadline: string;
  placed_at: string;
  reward: string;
  status: 'active' | 'completed' | 'failed';
}

export const usersAPI = {
  getStreakStatus: () =>
    apiRequest<StreakStatus>('GET', '/users/streak-status'),
  
  useStreakFreeze: () =>
    apiRequest<{
      success: boolean;
      message: string;
      freezes_remaining: number;
    }>('POST', '/users/use-freeze'),
  
  useStreakRecovery: () =>
    apiRequest<{
      success: boolean;
      message: string;
      current_streak: number;
      recovery_used: boolean;
    }>('POST', '/users/use-recovery'),
  
  placeStreakBet: (targetStrikes: number, days: number) =>
    apiRequest<{
      success: boolean;
      message: string;
      bet: StreakBet;
    }>('POST', '/users/place-bet', { target_strikes: targetStrikes, days }),
  
  cancelStreakBet: () =>
    apiRequest<{
      success: boolean;
      message: string;
    }>('POST', '/users/cancel-bet'),
};

// ==========================================
// CONVERSATION API
// ==========================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ConversationResponse {
  session_id: string;
  messages: ConversationMessage[];
  current_summary: string;
  suggested_next_question?: string;
  enriched_data: {
    original_content: string;
    refined_title: string;
    category: string | null;
    context: {
      who_mentioned?: string;
      where?: string;
      when?: string;
      why_important?: string;
    };
    urgency: 'low' | 'medium' | 'high';
    tags: string[];
    is_complete?: boolean;
  };
  is_complete: boolean;
}

export interface FinalizedCapture {
  session_id: string;
  final_content: string;
  original_content: string;
  category: string;
  tags: string[];
  context: {
    who_mentioned?: string;
    where?: string;
    when?: string;
    why_important?: string;
  };
  urgency: 'low' | 'medium' | 'high';
  conversation_summary: string;
  full_conversation: Array<{ role: string; content: string }>;
}

export const conversationAPI = {
  start: (initialContent: string) =>
    apiRequest<ConversationResponse>('POST', '/conversation/start', { initial_content: initialContent }),
  
  continue: (sessionId: string, message: string) =>
    apiRequest<ConversationResponse>('POST', '/conversation/continue', { 
      session_id: sessionId, 
      message 
    }),
  
  finalize: (sessionId: string) =>
    apiRequest<FinalizedCapture>('POST', '/conversation/finalize', { session_id: sessionId }),
  
  cancel: (sessionId: string) =>
    apiRequest<{ message: string }>('DELETE', `/conversation/session/${sessionId}`),
};

// ==========================================
// LEGACY EXPORTS
// ==========================================

export const apiClient = {
  get: <T>(url: string, config?: any) => apiRequest<T>('GET', url, undefined, config?.params),
  post: <T>(url: string, data?: any, config?: any) => apiRequest<T>('POST', url, data, config?.params),
};

// ==========================================
// CONNECTION TEST - Run on app startup
// ==========================================

/**
 * Quick connection test to verify API is accessible
 * This tests the actual API endpoint, not just health
 */
export async function testAPIConnection(): Promise<boolean> {
  const baseUrl = API_BASE_URL.replace('/api/v1', '');
  
  try {
    // Test the actual auth endpoint with OPTIONS (lightweight)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'OPTIONS',
      signal: controller.signal,
      headers: {
        'Origin': 'null',
        'Access-Control-Request-Method': 'POST',
      },
    });
    
    clearTimeout(timeoutId);
    
    // 200/204 = CORS success, 404 = endpoint doesn't exist (shouldn't happen)
    return response.status === 200 || response.status === 204 || response.status === 404;
  } catch (error) {
    console.log('[API] Connection test failed:', error);
    return false;
  }
}

export interface ConnectionTestResult {
  success: boolean;
  status: 'connected' | 'error';
  message: string;
  responseTime?: number;
}

export async function testConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  const baseUrl = API_BASE_URL.replace('/api/v1', '');
  
  if (__DEV__) {
    console.log('[CONNECTION TEST] Testing connection to:', baseUrl);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      if (__DEV__) {
        console.log('[CONNECTION TEST] ✓ Success:', data.status, `(${responseTime}ms)`);
      }
      return {
        success: true,
        status: 'connected',
        message: `Connected to ${data.service} v${data.version}`,
        responseTime,
      };
    } else {
      return {
        success: false,
        status: 'error',
        message: `Server returned ${response.status}`,
        responseTime,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    let message = 'Cannot connect to server';
    if (error.name === 'AbortError') {
      message = 'Connection timed out (10s)';
    } else if (error.message?.includes('Network')) {
      message = 'Network error - check internet connection';
    }
    
    return {
      success: false,
      status: 'error',
      message,
      responseTime,
    };
  }
}

export default apiClient;
