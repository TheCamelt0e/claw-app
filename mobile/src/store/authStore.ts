/**
 * Authentication State Management (Zustand)
 * JWT-based authentication with token refresh
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authAPI } from '../api/client';

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
    try {
      set({ isLoading: true, error: null });
      console.log('[Auth] Starting login for:', email);
      
      const response = await authAPI.login(email, password);
      console.log('[Auth] Login API success');
      const { access_token, expires_in } = response;
      
      // Calculate expiration timestamp
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Store token and expiration
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expires_at.toString());
      console.log('[Auth] Token stored successfully');
      
      // Get user data
      console.log('[Auth] Fetching user data...');
      const meResponse = await authAPI.getMe();
      console.log('[Auth] User data received:', meResponse.email);
      
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMsg = error?.message || error?.detail || JSON.stringify(error) || 'Login failed';
      console.error('[Auth] Login error:', errorMsg);
      Alert.alert('Login Failed (AuthStore)', errorMsg);
      set({ 
        error: errorMsg,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      throw new Error(errorMsg);
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    try {
      set({ isLoading: true, error: null });
      
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
    await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_EXPIRES_KEY]);
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    try {
      console.log('[Auth] Checking auth status...');
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const expiresAtStr = await AsyncStorage.getItem(TOKEN_EXPIRES_KEY);
      console.log('[Auth] Token exists:', !!token);
      
      if (!token) {
        console.log('[Auth] No token found');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

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
      console.log('[Auth] Auth check successful');
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('[Auth] Check auth error:', error?.message || error);
      await AsyncStorage.multiRemove([TOKEN_KEY, TOKEN_EXPIRES_KEY]);
      set({ 
        isLoading: false, 
        isAuthenticated: false,
        user: null,
      });
    }
  },

  refreshToken: async () => {
    try {
      const response = await authAPI.refresh();
      const { access_token, expires_in } = response;
      
      // Calculate new expiration
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Store new token
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
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
