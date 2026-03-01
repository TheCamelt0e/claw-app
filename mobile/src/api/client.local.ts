/**
 * LOCAL TESTING CONFIG
 * Use this if testing APK with local backend on same WiFi
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ CHANGE THIS TO YOUR COMPUTER'S LOCAL IP!
// Find it: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
// Example: 'http://192.168.1.5:8000/api/v1'
const LOCAL_IP = 'YOUR_COMPUTER_IP_HERE';  // <-- EDIT THIS!

const API_BASE_URL = `http://${LOCAL_IP}:8000/api/v1`;

console.log('[CLAW] LOCAL API URL:', API_BASE_URL);

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

async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: any,
  params?: Record<string, any>,
  timeoutMs: number = 30000
): Promise<T> {
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

  console.log(`[API] ${method} ${url}`, body ? { body: { ...body, password: '***' } } : '');
  
  try {
    const response = await fetch(url, options);
  
    clearTimeout(timeoutId);
    console.log(`[API] Response Status: ${response.status}`);
    
    if (response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      const errorData = await response.json().catch(() => ({ detail: 'Unauthorized' }));
      throw new Error(`[HTTP_401] ${errorData.detail || 'Session expired. Please log in again.'}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error Response: ${response.status} - ${errorText}`);
      
      try {
        const errorJson = JSON.parse(errorText);
        const errorCode = errorJson.code || `HTTP_${response.status}`;
        throw new Error(`[${errorCode}] ${errorJson.detail || errorJson.message || `API Error ${response.status}`}`);
      } catch {
        throw new Error(`[HTTP_${response.status}] ${errorText || 'Unknown error'}`);
      }
    }

  if (response.status === 204) {
    return null as T;
  }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[API] Request Failed:', {
      message: error?.message,
      name: error?.name,
    });
    
    if (error.name === 'AbortError') {
      throw new Error('[TIMEOUT] Request timed out. Check your connection.');
    }
    if (error.message?.includes('Network request failed')) {
      throw new Error(`[NETWORK] Cannot connect to ${API_BASE_URL}. Check IP/connection.`);
    }
    throw error;
  }
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<any>('POST', '/auth/login', { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiRequest<any>('POST', '/auth/register', { email, password, display_name: displayName }),
  
  getMe: () =>
    apiRequest<any>('GET', '/auth/me'),
};

export const clawsAPI = {
  capture: (content: string, contentType: string = 'text') =>
    apiRequest<any>('POST', '/claws/capture', null, { content, content_type: contentType }),
  
  getMyClaws: (status?: string) =>
    apiRequest<any>('GET', '/claws/me', undefined, { status }),
  
  getSurfaceClaws: (lat?: number, lng?: number, activeApp?: string) =>
    apiRequest<any>('GET', '/claws/surface', undefined, { lat, lng, active_app: activeApp }),
  
  strike: (clawId: string) =>
    apiRequest<any>('POST', `/claws/${clawId}/strike`),
  
  release: (clawId: string) =>
    apiRequest<any>('POST', `/claws/${clawId}/release`),
  
  createDemoData: () =>
    apiRequest<any>('POST', '/claws/demo-data'),
};

export const apiClient = {
  get: <T>(url: string, config?: any) => apiRequest<T>('GET', url, undefined, config?.params),
  post: <T>(url: string, data?: any, config?: any) => apiRequest<T>('POST', url, data, config?.params),
};

export default apiClient;
