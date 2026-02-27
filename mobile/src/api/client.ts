/**
 * API Client for CLAW
 * Using native fetch (React Native compatible)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// PRODUCTION BACKEND URL
// ==========================================
const PRODUCTION_API_URL = 'https://claw-api-b5ts.onrender.com/api/v1';
const DEVELOPMENT_API_URL = 'http://localhost:8000/api/v1';

// Always use production URL for APK builds
// Change this to DEVELOPMENT_API_URL only for local testing
const API_BASE_URL = PRODUCTION_API_URL;

console.log('[CLAW] API URL:', API_BASE_URL);

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
    
    // Handle 401 unauthorized
    if (response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      const errorText = await response.text();
      throw new Error(`Invalid credentials: ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error: ${response.status} - ${errorText}`);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<{access_token: string; token_type: string; expires_in: number; user: any}>('POST', '/auth/login', { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiRequest<{access_token: string; token_type: string; expires_in: number; user: any}>('POST', '/auth/register', { email, password, display_name: displayName }),
  
  getMe: () =>
    apiRequest<any>('GET', '/auth/me'),
  
  refresh: () =>
    apiRequest<{access_token: string; token_type: string; expires_in: number}>('POST', '/auth/refresh'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<any>('POST', '/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  
  deleteAccount: () =>
    apiRequest<any>('DELETE', '/auth/account'),
  
  // Email Verification
  verifyEmail: (token: string) =>
    apiRequest<{message: string; email: string; email_verified: boolean}>('POST', '/auth/verify-email', { token }),
  
  resendVerification: (email: string) =>
    apiRequest<{message: string}>('POST', '/auth/resend-verification', { email }),
  
  // Password Reset
  forgotPassword: (email: string) =>
    apiRequest<{message: string}>('POST', '/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{message: string}>('POST', '/auth/reset-password', { token, new_password: newPassword }),
};

// Claws API
export const clawsAPI = {
  capture: (content: string, contentType: string = 'text', extraData: any = {}) => {
    // Send data in request body (proper REST)
    const body: any = { content, content_type: contentType };
    if (extraData.priority === true || extraData.priority === 'true') {
      body.priority = true;
      body.priority_level = extraData.priority_level || 'high';
      console.log('[API] VIP Capture:', body);
    }
    return apiRequest<any>('POST', '/claws/capture', body);
  },
  
  getMyClaws: (status?: string) =>
    apiRequest<any>('GET', '/claws/me', undefined, { status }),
  
  getSurfaceClaws: (lat?: number, lng?: number, activeApp?: string) =>
    apiRequest<any>('GET', '/claws/surface', undefined, { lat, lng, active_app: activeApp }),
  
  strike: (clawId: string) =>
    apiRequest<any>('POST', `/claws/${clawId}/strike`),
  
  release: (clawId: string) =>
    apiRequest<any>('POST', `/claws/${clawId}/release`),
  
  extend: (clawId: string, days: number) =>
    apiRequest<any>('POST', `/claws/${clawId}/extend`, { days }),
  
  createDemoData: () =>
    apiRequest<any>('POST', '/claws/demo-data'),
};

// Legacy export for compatibility
export const apiClient = {
  get: <T>(url: string, config?: any) => apiRequest<T>('GET', url, undefined, config?.params),
  post: <T>(url: string, data?: any, config?: any) => apiRequest<T>('POST', url, data, config?.params),
};

export default apiClient;
