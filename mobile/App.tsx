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
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

// Loading screen
function LoadingScreen() {
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.loadingContainer}
    >
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.loadingText}>Loading CLAW...</Text>
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

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [showLivingSplash, setShowLivingSplash] = useState(false);
  const [hasSeenSplash, setHasSeenSplash] = useState(true); // Skip on first install
  
  const { loadCachedCapture } = useAudioStore();

  useEffect(() => {
    checkAuth();
    checkPermissionsStatus();
    checkSplashStatus();
    loadCachedCapture();
  }, []);
  
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

  if (isLoading || !permissionsChecked) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
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
