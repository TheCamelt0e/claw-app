/**
 * CLAW Mobile App v1.0
 * Production Ready - All features enabled
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import './src/sync/OfflineManager'; // Initialize offline detection
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from './src/store/authStore';
import { useNotificationsStore } from './src/store/notificationsStore';
import { notificationService } from './src/service/notifications';
import { requestGeofencePermissions, startGeofencing } from './src/service/geofence';
import CaptureScreen from './src/screens/CaptureScreen';
import StrikeScreen from './src/screens/StrikeScreen';
import VaultScreen from './src/screens/VaultScreen';
import SurfaceScreen from './src/screens/SurfaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import LoginScreen from './src/screens/LoginScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import SyncStatus from './src/components/SyncStatus';
import LivingSplash from './src/components/LivingSplash';
import { useAudioStore } from './src/store/audioStore';
import { colors, spacing, shadows } from './src/theme';
import { testConnection } from './src/api/client';

// Settings screens
import NotificationsScreen from './src/screens/NotificationsScreen';
import ExpirySettingsScreen from './src/screens/ExpirySettingsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import ShareScreen from './src/screens/ShareScreen';
import HelpScreen from './src/screens/HelpScreen';
import StreakManagementScreen from './src/screens/StreakManagementScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Beautiful tab icons
function TabIcon({ name, color, focused }: any) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ focused, color }) => {
          let iconName: any = 'help';
          
          if (route.name === 'Capture') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Strike') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'archive' : 'archive-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <TabIcon name={iconName} color={color} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Strike" component={StrikeScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    <SyncStatus />
    </View>
  );
}

// Loading screen with connection status
function LoadingScreen({ status, onForceContinue }: { status: string; onForceContinue?: () => void }) {
  const [showForceButton, setShowForceButton] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowForceButton(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.loadingContainer}
    >
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.loadingText}>Loading CLAW...</Text>
      {status && <Text style={styles.statusText}>{status}</Text>}
      {showForceButton && onForceContinue && (
        <>
          <TouchableOpacity style={styles.forceButton} onPress={onForceContinue}>
            <Text style={styles.forceButtonText}>Continue to Login</Text>
          </TouchableOpacity>
          <Text style={{color: '#888', marginTop: 10, fontSize: 12}}>
            Tap above if stuck longer than 3 seconds
          </Text>
        </>
      )}
    </LinearGradient>
  );
}

// Main stack with all screens - smooth transitions
function MainStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#1a1a2e' },
        animationEnabled: true,
        animationTypeForReplace: 'push',
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
        },
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          };
        },
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Surface" component={SurfaceScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ExpirySettings" component={ExpirySettingsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Share" component={ShareScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="StreakManagement" component={StreakManagementScreen} />
    </Stack.Navigator>
  );
}

// IMMEDIATE NUCLEAR TIMEOUT - runs once on module load
let __nuclearTriggered = false;
setTimeout(() => {
  if (!__nuclearTriggered) {
    console.log('[App] ☢️ IMMEDIATE NUCLEAR TIMEOUT: 15s absolute limit reached');
    __nuclearTriggered = true;
    // Force reload the app as last resort
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  }
}, 15000);

export default function App() {
  console.log('[App] COMPONENT MOUNTING - Time:', Date.now());
  
  const { isAuthenticated, isLoading, checkAuth, setIsLoading } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [showLivingSplash, setShowLivingSplash] = useState(false);
  const [hasSeenSplash, setHasSeenSplash] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Starting...');
  const [initError, setInitError] = useState<string | null>(null);
  const [forceShowApp, setForceShowApp] = useState(false);
  const initStartedRef = React.useRef(false);
  
  const { loadCachedCapture } = useAudioStore();

  useEffect(() => {
    if (initStartedRef.current) {
      console.log('[App] Already initialized, skipping');
      return;
    }
    initStartedRef.current = true;
    console.log('[App] Starting initialization...');
    initializeApp();
  }, []);
  
  // NUCLEAR OPTION 1: Force show after 8 seconds
  useEffect(() => {
    console.log('[App] Nuclear timeout 1 armed (8s)');
    const nuclearTimeout1 = setTimeout(() => {
      console.log('[App] ☢️ NUCLEAR TIMEOUT 1: 8s reached, forcing show');
      setForceShowApp(true);
      setIsLoading(false);
      setConnectionStatus('Forced continue (8s timeout)');
    }, 8000);
    
    return () => clearTimeout(nuclearTimeout1);
  }, []);
  
  // NUCLEAR OPTION 2: Force show after 12 seconds (if still loading)
  useEffect(() => {
    console.log('[App] Nuclear timeout 2 armed (12s)');
    const nuclearTimeout2 = setTimeout(() => {
      console.log('[App] ☢️ NUCLEAR TIMEOUT 2: 12s reached, hard reset');
      setForceShowApp(true);
      setIsLoading(false);
      setPermissionsChecked(true);
      setConnectionStatus('Emergency bypass (12s)');
    }, 12000);
    
    return () => clearTimeout(nuclearTimeout2);
  }, []);
  
  const initializeApp = async () => {
    // GLOBAL INIT TIMEOUT: Ensure we never hang for more than 15 seconds total
    const INIT_TIMEOUT_MS = 15000;
    const initTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('App initialization timed out')), INIT_TIMEOUT_MS)
    );
    
    const doInitialization = async () => {
      try {
        // Step 1: Test backend connection (with 5s timeout)
        setConnectionStatus('Connecting to server...');
        const connPromise = testConnection();
        const connTimeout = new Promise<ReturnType<typeof testConnection>>((resolve) => 
          setTimeout(() => resolve({ success: false, status: 'error', message: 'Connection test timed out' }), 5000)
        );
        const connResult = await Promise.race([connPromise, connTimeout]);
        
        if (!connResult.success) {
          console.error('[App] Connection failed:', connResult.message);
          setConnectionStatus(`Server unavailable: ${connResult.message}`);
          // Continue anyway - auth check will handle it
        } else {
          console.log('[App] Connected:', connResult.message);
          setConnectionStatus('Connected! Checking login...');
        }
        
        // Step 2: Check auth (with 8s timeout)
        console.log('[App] Step 2: Starting auth check...');
        setConnectionStatus('Checking login status...');
        const authPromise = checkAuth();
        const authTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timed out')), 8000)
        );
        
        await Promise.race([authPromise, authTimeout]);
        console.log('[App] Auth check completed');
        
        // Step 3: Check other settings (with individual timeouts)
        await Promise.race([
          checkPermissionsStatus(),
          new Promise((resolve) => setTimeout(resolve, 2000)) // 2s max for permissions
        ]);
        await Promise.race([
          checkSplashStatus(),
          new Promise((resolve) => setTimeout(resolve, 2000)) // 2s max for splash
        ]);
        await Promise.race([
          loadCachedCapture(),
          new Promise((resolve) => setTimeout(resolve, 3000)) // 3s max for cache
        ]);
        
      } catch (error: any) {
        console.error('[App] Initialization error:', error);
        // IMPORTANT: Force set isLoading to false so loading screen disappears
        setIsLoading(false);
        setInitError(error?.message || 'Failed to initialize');
        setConnectionStatus('Error: ' + (error?.message || 'Unknown error'));
      }
    };
    
    // Race between initialization and global timeout
    try {
      await Promise.race([doInitialization(), initTimeout]);
    } catch (timeoutError: any) {
      console.error('[App] Global init timeout:', timeoutError);
      setIsLoading(false);
      setInitError('App is taking too long to start. Please restart.');
      setConnectionStatus('Timeout: App startup took too long');
    }
  };
  
  const checkSplashStatus = async () => {
    try {
      const splashSeen = await AsyncStorage.getItem('living_splash_seen');
      const lastOpen = await AsyncStorage.getItem('last_app_open');
      const now = Date.now();
      
      // Show splash if:
      // 1. Never seen before (first launch after update)
      // 2. Not opened in last 24 hours (returning user)
      if (!splashSeen) {
        setHasSeenSplash(false);
      } else if (lastOpen) {
        const hoursSinceLastOpen = (now - parseInt(lastOpen)) / (1000 * 60 * 60);
        if (hoursSinceLastOpen > 24) {
          setHasSeenSplash(false);
        }
      }
      
      // Update last open time
      await AsyncStorage.setItem('last_app_open', now.toString());
    } catch (error) {
      console.error('Error checking splash status:', error);
    }
  };

  // Initialize notifications when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !showWelcome && !showPermissions) {
      initializeNotifications();
    }
  }, [isAuthenticated, showWelcome, showPermissions]);

  const initializeNotifications = async () => {
    const { requestPermission, registerPushToken } = useNotificationsStore.getState();
    
    // Request notification permission
    const granted = await requestPermission();
    if (granted) {
      await registerPushToken();
      await notificationService.startPeriodicChecks();
    }
    
    // Request geofence permissions and start background tracking
    console.log('[App] Starting geofencing...');
    const geofenceSuccess = await requestGeofencePermissions();
    if (geofenceSuccess) {
      const started = await startGeofencing();
      console.log('[App] Geofencing started:', started);
    } else {
      console.log('[App] Geofence permissions denied');
    }
  };

  const checkPermissionsStatus = async () => {
    try {
      const permissionsDone = await AsyncStorage.getItem('permissions_granted');
      setPermissionsChecked(true);
      if (permissionsDone === 'true') {
        setShowPermissions(false);
      }
    } catch (error) {
      setPermissionsChecked(true);
    }
  };

  const handlePermissionsComplete = async () => {
    await AsyncStorage.setItem('permissions_granted', 'true');
    setShowPermissions(false);
    // Show living splash after permissions for first-time users
    if (!hasSeenSplash) {
      setShowLivingSplash(true);
      await AsyncStorage.setItem('living_splash_seen', 'true');
    }
  };
  
  const handleSplashComplete = () => {
    setShowLivingSplash(false);
    setHasSeenSplash(true);
  };

  const shouldShowLoading = (isLoading || !permissionsChecked) && !forceShowApp;
  console.log('[App] Render - isLoading:', isLoading, 'permissionsChecked:', permissionsChecked, 'forceShowApp:', forceShowApp, 'showLoading:', shouldShowLoading);
  
  if (shouldShowLoading) {
    console.log('[App] Showing loading screen, status:', connectionStatus);
    return (
      <SafeAreaProvider>
        <LoadingScreen 
          status={connectionStatus} 
          onForceContinue={() => {
            console.log('[App] User forced continue');
            setForceShowApp(true);
            setIsLoading(false);
            setPermissionsChecked(true);
          }}
        />
      </SafeAreaProvider>
    );
  }
  
  // Show error if initialization failed
  if (initError) {
    return (
      <SafeAreaProvider>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.loadingContainer}
        >
          <Ionicons name="alert-circle" size={48} color="#e94560" />
          <Text style={styles.loadingText}>Connection Error</Text>
          <Text style={styles.errorText}>{initError}</Text>
          <Text style={styles.retryText}>Please check your internet connection and restart the app.</Text>
        </LinearGradient>
      </SafeAreaProvider>
    );
  }
  
  // Show living splash animation
  if (showLivingSplash) {
    return (
      <SafeAreaProvider>
        <LivingSplash 
          onAnimationComplete={handleSplashComplete}
          streakDays={5} // TODO: Get from user profile
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" />
        <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            cardStyle: { backgroundColor: '#1a1a2e' },
          }}
        >
          {showWelcome ? (
            <Stack.Screen name="Welcome">
              {(props) => (
                <WelcomeScreen 
                  {...props} 
                  onGetStarted={() => {
                    setShowWelcome(false);
                    setShowPermissions(true);
                  }} 
                />
              )}
            </Stack.Screen>
          ) : showPermissions ? (
            <Stack.Screen name="Permissions">
              {() => <PermissionsScreen onComplete={handlePermissionsComplete} />}
            </Stack.Screen>
          ) : !isAuthenticated ? (
            <>
              <Stack.Screen name="Auth" component={LoginScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={MainStack} />
              <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
  },
  statusText: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  forceButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  forceButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#e94560',
    marginTop: spacing.md,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  tabBar: {
    backgroundColor: colors.background.secondary,
    borderTopWidth: 0,
    ...shadows.lg,
    shadowOffset: { width: 0, height: -2 },
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
    height: spacing['6xl'] + spacing.md,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  iconContainer: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: spacing['5xl'] / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconFocused: {
    backgroundColor: colors.primary.muted,
  },
});
