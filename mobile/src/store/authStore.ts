/**
 * Authentication State Management (Zustand)
 * JWT-based authentication with token refresh
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authAPI } from '../api/client';
import { waitForServer } from '../service/serverWake';

interface User {
  id: string;
  email: string;
  display_name: string;
  subscription_tier: string;
  total_claws_created: number;
  total_claws_completed: number;
  current_streak: number;
  longest_streak: number;
  email_verified: boolean;
}

interface AuthTokens {
  access_token: string;
  expires_at: number; // timestamp
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  
  // Email Verification
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  
  // Password Reset
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

// Token storage keys
const TOKEN_KEY = 'access_token';
const TOKEN_EXPIRES_KEY = 'token_expires_at';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  clearError: () => set({ error: null }),

  login: async (email: string, password: string) => {
    console.log('[AUTH] ========== LOGIN START ==========');
    console.log('[AUTH] Email:', email);
    console.log('[AUTH] Password length:', password?.length || 0);
    
    try {
      set({ isLoading: true, error: null });
      
      // Wake up server (Render free tier cold start)
      console.log('[AUTH] Step 0: Waking up server...');
      const serverReady = await waitForServer(
        (attempt, max) => {
          set({ error: `Server waking up... (${attempt}/${max})` });
        },
        12 // 60 seconds max
      );
      
      if (!serverReady) {
        throw new Error('[TIMEOUT] Server is taking too long to start. Please try again in a moment.');
      }
      
      console.log('[AUTH] Step 1: Calling login API...');
      const response = await authAPI.login(email, password);
      console.log('[AUTH] Step 2: Login API success');
      console.log('[AUTH] Response:', {
        hasToken: !!response.access_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in,
      });
      
      const { access_token, expires_in } = response;
      
      // Calculate expiration timestamp
      const expires_at = Date.now() + (expires_in * 1000);
      console.log('[AUTH] Step 3: Token expires at:', new Date(expires_at).toISOString());
      
      // Store token and expiration
      console.log('[AUTH] Step 4: Storing token...');
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expires_at.toString());
      console.log('[AUTH] Step 5: Token stored successfully');
      
      // Get user data
      console.log('[AUTH] Step 6: Fetching user data (/auth/me)...');
      const meResponse = await authAPI.getMe();
      console.log('[AUTH] Step 7: User data received:', {
        id: meResponse.id,
        email: meResponse.email,
        displayName: meResponse.display_name,
      });
      
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      console.log('[AUTH] ========== LOGIN COMPLETE ==========');
      
    } catch (error: any) {
      console.error('[AUTH] ========== LOGIN ERROR ==========');
      console.error('[AUTH] Error type:', typeof error);
      console.error('[AUTH] Error constructor:', error?.constructor?.name);
      console.error('[AUTH] Error message:', error?.message);
      
      // Extract error code if present (format: [CODE] message)
      const errorMatch = error?.message?.match(/\[(.*?)\]\s*(.*)/);
      const errorCode = errorMatch?.[1] || 'UNKNOWN';
      const errorMessage = errorMatch?.[2] || error?.message || 'Login failed';
      
      console.error('[AUTH] Parsed error code:', errorCode);
      console.error('[AUTH] Parsed error message:', errorMessage);
      
      // User-friendly error messages based on error code
      let userMessage = errorMessage;
      switch (errorCode) {
        case 'HTTP_401':
          userMessage = 'Invalid email or password. Please try again.';
          break;
        case 'HTTP_429':
          userMessage = 'Too many login attempts. Please wait 5 minutes.';
          break;
        case 'HTTP_403':
          userMessage = 'Account is deactivated. Contact support.';
          break;
        case 'NETWORK':
          userMessage = 'Cannot connect to server. Check your internet connection.';
          break;
        case 'TIMEOUT':
          userMessage = 'Request timed out. Please try again.';
          break;
      }
      
      Alert.alert('Login Failed', userMessage);
      
      set({ 
        error: userMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      throw new Error(userMessage);
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Wake up server (Render free tier cold start)
      console.log('[AUTH] Step 0: Waking up server...');
      const serverReady = await waitForServer(
        (attempt, max) => {
          set({ error: `Server waking up... (${attempt}/${max})` });
        },
        12 // 60 seconds max
      );
      
      if (!serverReady) {
        throw new Error('[TIMEOUT] Server is taking too long to start. Please try again in a moment.');
      }
      
      const response = await authAPI.register(email, password, displayName);
      const { access_token, expires_in } = response;
      
      // Calculate expiration timestamp
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Store token and expiration
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      // Get user data
      const meResponse = await authAPI.getMe();
      
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Register error:', error?.message || error);
      set({ 
        error: error?.message || 'Registration failed',
        isLoading: false,
      });
      throw new Error(error?.message || 'Registration failed');
    }
  },

  logout: async () => {
    console.log('[AUTH] Logging out...');
    await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_EXPIRES_KEY]);
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null,
    });
    console.log('[AUTH] Logout complete');
  },

  checkAuth: async () => {
    console.log('[AUTH] ========== CHECK AUTH START ==========');
    
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const expiresAtStr = await AsyncStorage.getItem(TOKEN_EXPIRES_KEY);
      
      console.log('[AUTH] Token exists:', !!token);
      console.log('[AUTH] Expires at:', expiresAtStr);
      
      if (!token) {
        console.log('[AUTH] No token found');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      console.log('[AUTH] Fetching user data...');

      // Check if token is expired or about to expire (within 5 minutes)
      let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
      if (isNaN(expiresAt)) {
        expiresAt = 0;
      }
      const isExpired = Date.now() >= (expiresAt - 5 * 60 * 1000);
      
      if (isExpired) {
        // Try to refresh token
        const refreshed = await get().refreshToken();
        if (!refreshed) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
      }

      // Get user data
      console.log('[Auth] Fetching user data with stored token...');
      const meResponse = await authAPI.getMe();
      console.log('[AUTH] Auth check successful');
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('[AUTH] ========== CHECK AUTH COMPLETE ==========');
      
    } catch (error: any) {
      console.error('[AUTH] Check auth error:', error?.message);
      await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_EXPIRES_KEY]);
      set({ 
        isLoading: false, 
        isAuthenticated: false,
        user: null,
      });
    }
  },

  refreshToken: async () => {
    console.log('[AUTH] Refreshing token...');
    
    try {
      const response = await authAPI.refresh();
      const { access_token, expires_in } = response;
      
      // Calculate new expiration
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Store new token
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      console.log('[AUTH] Token refreshed successfully');
      return true;
      
    } catch (error: any) {
      console.error('[AUTH] Token refresh failed:', error?.message);
      // Clear auth state on refresh failure
      await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_EXPIRES_KEY]);
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },
  
  // Email Verification Actions
  verifyEmail: async (token: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAPI.verifyEmail(token);
      
      // Update user email_verified status if logged in
      const currentUser = get().user;
      if (currentUser) {
        set({
          user: { ...currentUser, email_verified: true },
          isLoading: false,
          error: null,
        });
      } else {
        set({ isLoading: false, error: null });
      }
    } catch (error: any) {
      console.error('Email verification error:', error?.message || error);
      set({
        error: error?.message || 'Email verification failed',
        isLoading: false,
      });
      throw new Error(error?.message || 'Email verification failed');
    }
  },
  
  resendVerification: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await authAPI.resendVerification(email);
      
      set({ isLoading: false, error: null });
    } catch (error: any) {
      console.error('Resend verification error:', error?.message || error);
      set({
        error: error?.message || 'Failed to resend verification email',
        isLoading: false,
      });
      throw new Error(error?.message || 'Failed to resend verification email');
    }
  },
  
  // Password Reset Actions
  forgotPassword: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await authAPI.forgotPassword(email);
      
      set({ isLoading: false, error: null });
    } catch (error: any) {
      console.error('Forgot password error:', error?.message || error);
      set({
        error: error?.message || 'Failed to send reset email',
        isLoading: false,
      });
      throw new Error(error?.message || 'Failed to send reset email');
    }
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await authAPI.resetPassword(token, newPassword);
      
      set({ isLoading: false, error: null });
    } catch (error: any) {
      console.error('Reset password error:', error?.message || error);
      set({
        error: error?.message || 'Failed to reset password',
        isLoading: false,
      });
      throw new Error(error?.message || 'Failed to reset password');
    }
  },
}));

// Helper function to check if token needs refresh before API calls
export async function ensureValidToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const expiresAtStr = await AsyncStorage.getItem(TOKEN_EXPIRES_KEY);
  
  if (!token) return null;
  
  // Check if token is expired or about to expire (within 5 minutes)
  let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
  
  // Handle NaN case
  if (isNaN(expiresAt)) {
    await AsyncStorage.removeItem(TOKEN_EXPIRES_KEY);
    return null;
  }
  
  const needsRefresh = Date.now() >= (expiresAt - 5 * 60 * 1000);
  
  if (needsRefresh) {
    const refreshed = await useAuthStore.getState().refreshToken();
    if (!refreshed) return null;
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
  
  return token;
}
