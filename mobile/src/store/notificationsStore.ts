import { create } from 'zustand';
import { notificationService } from '../service/notifications';
import * as geofence from '../service/geofence';
import * as Location from 'expo-location';
import { apiRequest } from '../api/client';

interface NotificationState {
  hasPermission: boolean;
  pushToken: string | null;
  suggestions: any[];
  nearbyStores: any[];
  isLoading: boolean;
  error: string | null;
  geofenceRunning: boolean;
  locationEnabled: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  registerPushToken: () => Promise<void>;
  startGeofencing: () => Promise<boolean>;
  stopGeofencing: () => Promise<void>;
  checkGeofence: () => Promise<any[]>;
  checkAllNotifications: () => Promise<any[]>;
  setAlarm: (clawId: string, date: Date) => Promise<boolean>;
  addToCalendar: (clawId: string) => Promise<boolean>;
  fetchSuggestions: () => Promise<void>;
  generateLocalSuggestions: () => Promise<void>;
  clearSuggestions: () => void;
  checkLocationStatus: () => Promise<boolean>;
}

export const useNotificationsStore = create<NotificationState>((set, get) => ({
  hasPermission: false,
  pushToken: null,
  suggestions: [],
  nearbyStores: [],
  isLoading: false,
  error: null,
  geofenceRunning: false,
  locationEnabled: false,

  requestPermission: async () => {
    try {
      const granted = await notificationService.requestPermissions();
      set({ hasPermission: granted });
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      set({ hasPermission: false });
      return false;
    }
  },

  registerPushToken: async () => {
    try {
      const token = await notificationService.getPushToken();
      if (token) {
        await notificationService.registerToken(token);
        set({ pushToken: token });
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  },

  checkLocationStatus: async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const enabled = status === 'granted';
      set({ locationEnabled: enabled });
      return enabled;
    } catch (error) {
      console.error('Error checking location status:', error);
      return false;
    }
  },

  startGeofencing: async () => {
    console.log('[Store] Starting geofencing...');
    const success = await geofence.startGeofencing();
    console.log('[Store] Geofencing result:', success);
    set({ geofenceRunning: success, locationEnabled: success });
    return success;
  },

  stopGeofencing: async () => {
    await geofence.stopGeofencing();
    set({ geofenceRunning: false });
  },

  checkGeofence: async () => {
    try {
      // Use manual check for immediate results
      await geofence.manualGeofenceCheck();
      return [];
    } catch (error) {
      console.error('Error checking geofence:', error);
      return [];
    }
  },

  checkAllNotifications: async () => {
    try {
      // Start geofencing if not already running
      const { geofenceRunning, startGeofencing } = get();
      if (!geofenceRunning) {
        await startGeofencing();
      }

      // Also do a manual check now
      await geofence.manualGeofenceCheck();

      // Get smart suggestions
      const result = await apiRequest<any>('GET', '/notifications/smart-suggestions');
      
      return result.notifications || [];
    } catch (error) {
      console.error('Notification check error:', error);
      return [];
    }
  },

  setAlarm: async (clawId: string, date: Date) => {
    try {
      return await notificationService.setAlarm(clawId, date);
    } catch (error) {
      console.error('Error setting alarm:', error);
      return false;
    }
  },

  addToCalendar: async (clawId: string) => {
    try {
      return await notificationService.addToCalendar(clawId);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      return false;
    }
  },

  fetchSuggestions: async () => {
    set({ isLoading: true });
    try {
      // Check location status first
      await get().checkLocationStatus();
      
      // Generate local suggestions immediately
      await get().generateLocalSuggestions();
      
      // Also try to get from API (but don't wait for it)
      apiRequest<any>('GET', '/notifications/smart-suggestions')
        .then((data) => {
          if (data.notifications && data.notifications.length > 0) {
            set({ suggestions: data.notifications, isLoading: false });
          }
        })
        .catch(() => {
          set({ isLoading: false });
        });
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Still generate local suggestions on error
      await get().generateLocalSuggestions();
      set({ error: 'Failed to fetch suggestions', isLoading: false });
    }
  },

  // Generate suggestions locally based on time/behavior
  generateLocalSuggestions: async () => {
    const suggestions: any[] = [];
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Morning routine (7-10am)
    if (hour >= 7 && hour <= 10) {
      suggestions.push({
        id: 'morning_routine',
        type: 'time',
        title: '🌅 Morning routine?',
        message: 'Capture your intentions for the day before you forget!',
        action: 'capture',
      });
    }

    // Lunch time (11am-2pm)
    if (hour >= 11 && hour <= 14) {
      suggestions.push({
        id: 'lunch_time',
        type: 'time',
        title: '🍽️ Lunch break?',
        message: 'Quick check: Any errands to run while you\'re out?',
        action: 'strike',
      });
    }

    // Evening review (6-9pm)
    if (hour >= 18 && hour <= 21) {
      suggestions.push({
        id: 'evening_review',
        type: 'time',
        title: '🌙 Evening review',
        message: 'Review your intentions before the day ends',
        action: 'strike',
      });
    }

    // Weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      suggestions.push({
        id: 'weekend_plans',
        type: 'time',
        title: '🎯 Weekend plans',
        message: 'Don\'t forget your weekend intentions!',
        action: 'capture',
      });
    }

    // Late night (after 10pm)
    if (hour >= 22 || hour <= 1) {
      suggestions.push({
        id: 'tomorrow_prep',
        type: 'time',
        title: '🌙 Planning tomorrow?',
        message: 'Capture tomorrow\'s tasks before bed',
        action: 'capture',
      });
    }

    // Only show pro tip if location is NOT enabled
    const { locationEnabled } = get();
    if (!locationEnabled) {
      suggestions.push({
        id: 'pro_tip',
        type: 'onboarding',
        title: '💡 Pro tip',
        message: 'Enable location notifications to get alerts near Bónus, Krónan & more!',
        action: 'strike', // Navigate to strike to enable location
      });
    }

    set({ suggestions, isLoading: false });
  },

  clearSuggestions: () => {
    set({ suggestions: [] });
  },
}));
