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
  params?: Record<string, any>
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
  
  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (response.status === 401) {
    await AsyncStorage.removeItem('access_token');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<any>('POST', '/auth/login', null, { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiRequest<any>('POST', '/auth/register', null, { email, password, display_name: displayName }),
  
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
