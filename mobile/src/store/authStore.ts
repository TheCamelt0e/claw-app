/**
 * Authentication State Management (Zustand)
 * JWT-based authentication with secure token storage
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { authAPI, testAPIConnection, logAuthEvent } from '../api/client';
import { waitForServer, isServerSleepingError, withRetry } from '../service/serverWake';

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
  
  // Internal
  setIsLoading: (loading: boolean) => void;
}

// Token storage keys - SECURE storage for sensitive tokens
const TOKEN_KEY = 'access_token';
const TOKEN_EXPIRES_KEY = 'token_expires_at';

/**
 * Secure token storage helper functions
 * Uses expo-secure-store for encrypted storage
 */
async function secureStoreToken(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('[AUTH] Failed to store token securely:', error);
    // Fallback to AsyncStorage only in development
    if (__DEV__) {
      await AsyncStorage.setItem(key, value);
    }
    throw new Error('Failed to store authentication token securely');
  }
}

async function secureGetToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('[AUTH] Failed to retrieve token securely:', error);
    // Fallback to AsyncStorage for migration/compatibility
    return await AsyncStorage.getItem(key);
  }
}

async function secureRemoveToken(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('[AUTH] Failed to remove token securely:', error);
  }
  // Also remove from AsyncStorage (cleanup)
  await AsyncStorage.removeItem(key);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  clearError: () => set({ error: null }),
  
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  login: async (email: string, password: string) => {
    logAuthEvent('LOGIN_START', { emailPrefix: email.split('@')[0] });
    
    try {
      set({ isLoading: true, error: null });
      
      // NOTE: With paid tier, server is always-on - no wake needed
      logAuthEvent('CHECKING_SERVER');
      
      // Quick check only - 2 attempts max (4 seconds)
      const serverReady = await waitForServer(
        (message) => {
          set({ error: message });
        },
        2 // Only 2 attempts - fail fast
      );
      
      if (!serverReady) {
        // This should rarely happen with paid tier
        throw new Error('[NETWORK] Cannot connect to server. Please check your internet connection.');
      }
      
      logAuthEvent('SERVER_READY');
      
      // Quick test of actual API endpoint before attempting login
      logAuthEvent('TESTING_API_CONNECTION');
      const apiReady = await testAPIConnection();
      if (!apiReady) {
        logAuthEvent('API_CONNECTION_FAILED');
        throw new Error('[NETWORK] API endpoint not responding. Server may still be initializing.');
      }
      logAuthEvent('API_CONNECTION_SUCCESS');
      
      logAuthEvent('CALLING_LOGIN_API');
      
      // Add a global timeout for the entire login operation (20s max)
      const loginPromise = authAPI.login(email, password);
      const loginTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('[TIMEOUT] Login request timed out after 20s')), 20000)
      );
      
      // Race between login and timeout
      const response = await Promise.race([loginPromise, loginTimeout]) as any;
      
      logAuthEvent('LOGIN_API_SUCCESS', { hasToken: !!response.access_token });
      
      const { access_token, expires_in } = response;
      
      // Calculate expiration timestamp
      const expires_at = Date.now() + (expires_in * 1000);
      logAuthEvent('STORING_TOKEN');
      
      // Store token and expiration SECURELY
      await secureStoreToken(TOKEN_KEY, access_token);
      await secureStoreToken(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      // Get user data with retry
      logAuthEvent('FETCHING_USER_DATA');
      const meResponse = await withRetry(
        () => authAPI.getMe(),
        3,
        (attempt) => {
          logAuthEvent('GETME_RETRY', { attempt });
        }
      );
      
      logAuthEvent('USER_DATA_RECEIVED');
      
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      logAuthEvent('LOGIN_COMPLETE');
      
    } catch (error: any) {
      logAuthEvent('LOGIN_ERROR', { 
        errorType: typeof error, 
        errorName: error?.constructor?.name,
        errorMessage: error?.message 
      });
      
      // Check if it's a server sleeping error - give better message
      if (isServerSleepingError(error)) {
        const userMessage = 'Server is waking up. This takes ~30 seconds on free hosting. Please tap Sign In again!';
        console.log('[AUTH] Detected server sleep error, showing retry message');
        
        set({ 
          error: userMessage,
          isLoading: false,
          isAuthenticated: false,
          user: null,
        });
        throw new Error(userMessage);
      }
      
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
          userMessage = 'Account access denied. Please verify your email or contact support.';
          break;
        case 'HTTP_400':
          userMessage = 'Invalid request. Please check your email and password format.';
          break;
        case 'HTTP_422':
          userMessage = 'Invalid data format. Please check your inputs.';
          break;
        case 'HTTP_500':
        case 'HTTP_502':
        case 'HTTP_503':
          userMessage = 'Server error. Please try again in a few moments.';
          break;
        case 'NETWORK':
          userMessage = 'Cannot connect to server. Check your internet connection.';
          break;
        case 'TIMEOUT':
          userMessage = 'Request timed out. The server may be waking up. Please try again.';
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
    console.log('[AUTH] ========== REGISTER START ==========');
    
    try {
      set({ isLoading: true, error: null });
      
      // NOTE: With paid tier, server is always-on - no wake needed
      console.log('[AUTH] Step 0: Checking server availability...');
      const serverReady = await waitForServer(
        (message) => {
          set({ error: message });
        },
        3 // Only 3 quick attempts
      );
      
      if (!serverReady) {
        throw new Error('[NETWORK] Cannot connect to server. Please check your internet connection.');
      }
      
      set({ error: 'Creating account...' });
      
      console.log('[AUTH] Step 1: Calling register API...');
      
      // Retry registration with exponential backoff
      const response = await withRetry(
        () => authAPI.register(email, password, displayName),
        3,
        (attempt, error) => {
          console.log(`[AUTH] Register attempt ${attempt} failed, retrying...`, error?.message);
          set({ error: `Connection issue, retrying (${attempt}/3)...` });
        }
      );
      
      const { access_token, expires_in } = response;
      
      // Calculate expiration timestamp
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Store token and expiration SECURELY
      await secureStoreToken(TOKEN_KEY, access_token);
      await secureStoreToken(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      // Get user data with retry
      console.log('[AUTH] Step 2: Fetching user data...');
      const meResponse = await withRetry(
        () => authAPI.getMe(),
        3,
        (attempt) => {
          console.log(`[AUTH] GetMe attempt ${attempt} failed, retrying...`);
        }
      );
      
      set({
        user: meResponse,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      console.log('[AUTH] ========== REGISTER COMPLETE ==========');
      
    } catch (error: any) {
      console.error('[AUTH] Register error:', error?.message || error);
      
      // Check if it's a server sleeping error
      if (isServerSleepingError(error)) {
        const userMessage = 'Server is waking up. This takes ~30 seconds on free hosting. Please tap Create Account again!';
        set({ 
          error: userMessage,
          isLoading: false,
        });
        throw new Error(userMessage);
      }
      
      set({ 
        error: error?.message || 'Registration failed',
        isLoading: false,
      });
      throw new Error(error?.message || 'Registration failed');
    }
  },

  logout: async () => {
    console.log('[AUTH] Logging out...');
    await secureRemoveToken(TOKEN_KEY);
    await secureRemoveToken(TOKEN_EXPIRES_KEY);
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null,
    });
    console.log('[AUTH] Logout complete');
  },

  checkAuth: async () => {
    console.log('[AUTH] ========== CHECK AUTH START ==========');
    
    // GLOBAL TIMEOUT: Ensure we NEVER hang for more than 6 seconds
    const GLOBAL_TIMEOUT_MS = 6000;
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error('[AUTH] GLOBAL TIMEOUT TRIGGERED!');
        reject(new Error('[TIMEOUT] Auth check took too long'));
      }, GLOBAL_TIMEOUT_MS);
    });
    
    try {
      const authCheckPromise = (async () => {
        console.log('[AUTH] Step 1: Reading token from secure storage...');
        const token = await secureGetToken(TOKEN_KEY);
        const expiresAtStr = await secureGetToken(TOKEN_EXPIRES_KEY);
        
        console.log('[AUTH] Token exists:', !!token);
        
        if (!token) {
          console.log('[AUTH] No token found - skipping to logged out state');
          set({ isLoading: false, isAuthenticated: false });
          clearTimeout(timeoutId);
          return;
        }
        
        console.log('[AUTH] Step 2: Checking token expiration...');

        // Check if token is expired or about to expire (within 5 minutes)
        let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
        if (isNaN(expiresAt)) {
          expiresAt = 0;
        }
        const isExpired = Date.now() >= (expiresAt - 5 * 60 * 1000);
        
        if (isExpired) {
          console.log('[AUTH] Step 3a: Token expired, attempting refresh...');
          // Try to refresh token with its own timeout
          const refreshPromise = get().refreshToken();
          const refreshTimeout = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.log('[AUTH] Token refresh timed out');
              resolve(false);
            }, 4000);
          });
          const refreshed = await Promise.race([refreshPromise, refreshTimeout]);
          
          if (!refreshed) {
            console.log('[AUTH] Token refresh failed or timed out - logging out');
            set({ isLoading: false, isAuthenticated: false });
            clearTimeout(timeoutId);
            return;
          }
          console.log('[AUTH] Token refresh succeeded');
        }

        // Get user data with timeout
        console.log('[AUTH] Step 3b: Calling getMe API...');
        const mePromise = authAPI.getMe();
        const meTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('[TIMEOUT] getMe request timed out')), 4000)
        );
        
        const meResponse = await Promise.race([mePromise, meTimeout]);
        
        console.log('[AUTH] Step 4: getMe succeeded, updating state');
        set({
          user: meResponse,
          isAuthenticated: true,
          isLoading: false,
        });
        clearTimeout(timeoutId);
        console.log('[AUTH] ========== CHECK AUTH COMPLETE ==========');
      })();
      
      // Race between auth check and global timeout
      await Promise.race([authCheckPromise, timeoutPromise]);
      
    } catch (error: any) {
      console.error('[AUTH] Check auth ERROR:', error?.message);
      clearTimeout(timeoutId);
      // Always clear loading state on error
      await secureRemoveToken(TOKEN_KEY);
      await secureRemoveToken(TOKEN_EXPIRES_KEY);
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
      
      // Store new token SECURELY
      await secureStoreToken(TOKEN_KEY, access_token);
      await secureStoreToken(TOKEN_EXPIRES_KEY, expires_at.toString());
      
      console.log('[AUTH] Token refreshed successfully');
      return true;
      
    } catch (error: any) {
      console.error('[AUTH] Token refresh failed:', error?.message);
      // Clear auth state on refresh failure
      await secureRemoveToken(TOKEN_KEY);
      await secureRemoveToken(TOKEN_EXPIRES_KEY);
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
  const token = await secureGetToken(TOKEN_KEY);
  const expiresAtStr = await secureGetToken(TOKEN_EXPIRES_KEY);
  
  if (!token) return null;
  
  // Check if token is expired or about to expire (within 5 minutes)
  let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
  
  // Handle NaN case
  if (isNaN(expiresAt)) {
    await secureRemoveToken(TOKEN_EXPIRES_KEY);
    return null;
  }
  
  const needsRefresh = Date.now() >= (expiresAt - 5 * 60 * 1000);
  
  if (needsRefresh) {
    const refreshed = await useAuthStore.getState().refreshToken();
    if (!refreshed) return null;
    return await secureGetToken(TOKEN_KEY);
  }
  
  return token;
}
