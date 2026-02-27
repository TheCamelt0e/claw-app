/**
 * Smart Resurfacing Hook
 * Monitors user context and triggers claw resurfacing
 */
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { useClawStore } from '../store/clawStore';

// Known location triggers (would be user-defined in production)
const KNOWN_LOCATIONS = [
  { name: 'Whole Foods', lat: 40.7128, lng: -74.0060, radius: 100 },
  { name: 'Barnes & Noble', lat: 40.7580, lng: -73.9855, radius: 100 },
];

// App detection mapping (simulated)
const DETECTABLE_APPS = ['amazon', 'netflix', 'spotify', 'maps'];

export function useResurfacing() {
  const { fetchSurfaceClaws, surfaceClaws } = useClawStore();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastCheckTime = useRef<number>(0);

  useEffect(() => {
    // Request permissions
    requestPermissions();
    
    // Start location monitoring
    startLocationMonitoring();
    
    // App state change listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Periodic resurfacing check
    const intervalId = setInterval(() => {
      checkForResurfacing();
    }, 60000); // Check every minute

    return () => {
      appStateSubscription.remove();
      clearInterval(intervalId);
      locationSubscription.current?.remove();
    };
  }, []);

  // Send notifications when new surface claws appear
  useEffect(() => {
    if (surfaceClaws.length > 0) {
      surfaceClaws.forEach((claw, index) => {
        setTimeout(() => {
          sendNotification(claw);
        }, index * 1000);
      });
    }
  }, [surfaceClaws]);

  async function requestPermissions() {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    
    console.log('Permissions:', { locationStatus, notificationStatus });
  }

  async function startLocationMonitoring() {
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 100, // Update every 100 meters
      },
      handleLocationUpdate
    );
  }

  function handleLocationUpdate(location: Location.LocationObject) {
    const { latitude, longitude } = location.coords;
    
    // Check if we're near any known locations
    for (const knownLoc of KNOWN_LOCATIONS) {
      const distance = calculateDistance(
        latitude,
        longitude,
        knownLoc.lat,
        knownLoc.lng
      );
      
      if (distance <= knownLoc.radius) {
        console.log(`Near ${knownLoc.name}! Checking for relevant claws...`);
        fetchSurfaceClaws(latitude, longitude);
        break;
      }
    }
  }

  function handleAppStateChange(nextAppState: string) {
    if (nextAppState === 'active') {
      // App came to foreground - check for surface claws
      checkForResurfacing();
    }
  }

  async function checkForResurfacing() {
    const now = Date.now();
    if (now - lastCheckTime.current < 30000) return; // Don't check too frequently
    
    lastCheckTime.current = now;
    
    // Get current location if available
    const location = await Location.getLastKnownPositionAsync();
    const lat = location?.coords.latitude;
    const lng = location?.coords.longitude;
    
    // Check for app context (this would be done via native modules in production)
    const activeApp = detectActiveApp();
    
    await fetchSurfaceClaws(lat, lng, activeApp);
  }

  function detectActiveApp(): string | undefined {
    // In production, this would use native modules to detect the currently open app
    // For demo purposes, we simulate random app detection
    if (Math.random() > 0.7) {
      return DETECTABLE_APPS[Math.floor(Math.random() * DETECTABLE_APPS.length)];
    }
    return undefined;
  }

  async function sendNotification(claw: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: claw.title || 'Claw Reminder',
        body: claw.content,
        data: { clawId: claw.id },
      },
      trigger: null, // Immediate
    });
  }

  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
