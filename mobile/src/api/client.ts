/**
 * API Client for CLAW - SECURITY HARDENED
 * Using native fetch (React Native compatible)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// PRODUCTION BACKEND URL
// ==========================================
const PRODUCTION_API_URL = 'https://claw-api-b5ts.onrender.com/api/v1';
const DEVELOPMENT_API_URL = 'http://localhost:8000/api/v1';

// Always use production URL for APK builds
// For local dev with emulator, temporarily change to DEVELOPMENT_API_URL
const API_BASE_URL = PRODUCTION_API_URL;

console.log('[CLAW] API URL:', API_BASE_URL);

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
  const token = await AsyncStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Generic API request function with timeout
export async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown> | null,
  params?: Record<string, unknown>,
  timeoutMs: number = 30000
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
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  console.log(`[API] ${method} ${url}`);
  
  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    console.log(`[API] Response: ${response.status}`);
    
    // Handle 401 unauthorized - token revoked or expired
    if (response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      const errorText = await response.text();
      throw new Error(`Session expired. Please log in again: ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error: ${response.status} - ${errorText}`);
      
      // Try to parse JSON error
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.detail || `API Error ${response.status}`);
      } catch {
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[API] Request failed:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    // Better error for network failures
    if (!error.message || error.message === '') {
      throw new Error(`Network error: Cannot reach ${API_BASE_URL}. Check connection/CORS.`);
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
    apiRequest<LoginResponse>('POST', '/auth/login', { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiRequest<LoginResponse>('POST', '/auth/register', { 
      email, 
      password, 
      display_name: displayName 
    }),
  
  getMe: () =>
    apiRequest<User>('GET', '/auth/me'),
  
  refresh: () =>
    apiRequest<LoginResponse>('POST', '/auth/refresh'),
  
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
      console.log('[API] VIP Capture:', body);
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
};

// ==========================================
// NOTIFICATIONS API - NEW!
// ==========================================

export const notificationsAPI = {
  /**
   * Register push notification token
   */
  registerToken: (token: string, platform: string) =>
    apiRequest<{success: boolean, message: string}>('POST', '/notifications/register-token', { 
      token, 
      platform 
    }),
  
  /**
   * Check geofence for nearby stores
   */
  checkGeofence: (lat: number, lng: number) =>
    apiRequest<NotificationsResponse>('POST', '/notifications/check-geofence', { lat, lng }),
  
  /**
   * Get nearby stores
   */
  getNearbyStores: (lat: number, lng: number, radius: number = 1000) =>
    apiRequest<NearbyStoresResponse>('GET', '/notifications/nearby-stores', undefined, { 
      lat, 
      lng, 
      radius 
    }),
  
  /**
   * Get smart time-based suggestions
   */
  getSmartSuggestions: () =>
    apiRequest<NotificationsResponse>('GET', '/notifications/smart-suggestions'),
  
  /**
   * Run all notification checks at once
   */
  checkAllNotifications: (lat?: number, lng?: number) =>
    apiRequest<NotificationsResponse>('GET', '/notifications/all-checks', undefined, { lat, lng }),
  
  /**
   * Set alarm for a claw
   */
  setAlarm: (clawId: string, scheduledTime: string) =>
    apiRequest<{success: boolean, alarm: any}>('POST', `/notifications/claw/${clawId}/set-alarm`, { 
      scheduled_time: scheduledTime 
    }),
  
  /**
   * Add claw to calendar
   */
  addToCalendar: (clawId: string) =>
    apiRequest<{success: boolean, event: any}>('POST', `/notifications/claw/${clawId}/add-to-calendar`),
  
  /**
   * Get user's learned patterns
   */
  getMyPatterns: () =>
    apiRequest<{location_patterns: any[], time_patterns: any[]}>('GET', '/notifications/my-patterns'),
  
  /**
   * Log strike pattern for AI learning
   */
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

export interface GroupItem extends Claw {
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
// LEGACY EXPORTS
// ==========================================

// Legacy export for compatibility
export const apiClient = {
  get: <T>(url: string, config?: any) => apiRequest<T>('GET', url, undefined, config?.params),
  post: <T>(url: string, data?: any, config?: any) => apiRequest<T>('POST', url, data, config?.params),
};

export default apiClient;
