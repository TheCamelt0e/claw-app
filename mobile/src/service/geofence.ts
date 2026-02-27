/**
 * Background Geofencing Service
 * Tracks location continuously and triggers notifications when near stores
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';

const GEOFENCE_TASK = 'background-geofence-task';
const LOCATION_UPDATES_TASK = 'background-location-updates';

// Store last notification time to prevent spam
const LAST_GEOFENCE_KEY = '@last_geofence_notification';
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes between notifications

/**
 * Request all necessary permissions
 */
export async function requestGeofencePermissions(): Promise<boolean> {
  try {
    // Request foreground location
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('[Geofence] Foreground permission denied');
      return false;
    }

    // Request background location (essential for geofencing while driving)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('[Geofence] Background permission denied');
      // Still return true - we'll try to work with foreground only
    }

    // Request notification permission
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      console.log('[Geofence] Notification permission denied');
    }

    return true;
  } catch (error) {
    console.error('[Geofence] Permission error:', error);
    return false;
  }
}

/**
 * Check if we should throttle notifications
 */
async function shouldThrottleNotification(): Promise<boolean> {
  try {
    const lastTime = await AsyncStorage.getItem(LAST_GEOFENCE_KEY);
    if (!lastTime) return false;
    
    const elapsed = Date.now() - parseInt(lastTime);
    return elapsed < NOTIFICATION_COOLDOWN;
  } catch {
    return false;
  }
}

/**
 * Record last notification time
 */
async function recordNotification(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_GEOFENCE_KEY, Date.now().toString());
  } catch (error) {
    console.error('[Geofence] Failed to record notification:', error);
  }
}

/**
 * Check geofence with backend and show notification
 */
async function checkGeofenceAndNotify(latitude: number, longitude: number): Promise<void> {
  try {
    // Throttle notifications
    if (await shouldThrottleNotification()) {
      console.log('[Geofence] Throttling - too soon since last notification');
      return;
    }

    console.log(`[Geofence] Checking location: ${latitude}, ${longitude}`);

    // Call backend to check for nearby stores
    const result = await apiRequest<any>('POST', '/notifications/check-geofence', {
      lat: latitude,
      lng: longitude,
    });

    console.log('[Geofence] Result:', result);

    if (result.notifications && result.notifications.length > 0) {
      const notification = result.notifications[0];
      
      // Show local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Immediate
      });

      // Record notification time
      await recordNotification();
      
      console.log('[Geofence] Notification sent:', notification.title);
    }
  } catch (error) {
    console.error('[Geofence] Error checking geofence:', error);
  }
}

/**
 * Start background location tracking for geofencing
 */
export async function startGeofencing(): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_UPDATES_TASK);
    if (isRunning) {
      console.log('[Geofence] Already running');
      return true;
    }

    // Check permissions first
    const hasPermission = await requestGeofencePermissions();
    if (!hasPermission) {
      console.log('[Geofence] Permissions not granted');
      return false;
    }

    // Check if location services are enabled
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      console.log('[Geofence] Location services disabled');
      return false;
    }

    // Start foreground location updates (works when app is open)
    await Location.startLocationUpdatesAsync(LOCATION_UPDATES_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000, // Check every 10 seconds
      distanceInterval: 50, // Or every 50 meters
      foregroundService: {
        notificationTitle: 'CLAW is monitoring nearby stores',
        notificationBody: 'Get alerts when near Bónus, Krónan, and other stores',
        notificationColor: '#FF6B35',
      },
      showsBackgroundLocationIndicator: true,
    });

    console.log('[Geofence] Started background location tracking');
    return true;
  } catch (error) {
    console.error('[Geofence] Failed to start:', error);
    return false;
  }
}

/**
 * Stop geofencing
 */
export async function stopGeofencing(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_UPDATES_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_UPDATES_TASK);
      console.log('[Geofence] Stopped');
    }
  } catch (error) {
    console.error('[Geofence] Error stopping:', error);
  }
}

/**
 * Manual geofence check (for when app is in foreground)
 * Call this when Strike screen opens
 */
export async function manualGeofenceCheck(): Promise<void> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Geofence] No permission for manual check');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await checkGeofenceAndNotify(
      location.coords.latitude,
      location.coords.longitude
    );
  } catch (error) {
    console.error('[Geofence] Manual check error:', error);
  }
}

// Define background task (only if not already defined)
if (!TaskManager.isTaskDefined(LOCATION_UPDATES_TASK)) {
  TaskManager.defineTask(LOCATION_UPDATES_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('[Geofence Task] Error:', error);
      return;
    }

    if (data) {
      const { locations } = data;
      const location = locations[0];
      
      if (location) {
        console.log('[Geofence Task] Location update:', location.coords);
        await checkGeofenceAndNotify(location.coords.latitude, location.coords.longitude);
      }
    }
  });
  console.log('[Geofence] Task defined');
}

// Check if task is defined
export async function isGeofencingRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_UPDATES_TASK);
  } catch {
    return false;
  }
}
