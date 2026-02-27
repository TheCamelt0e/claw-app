/**
 * Push Notification Service
 * Handles push notifications, geofencing, and smart reminders
 */
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

// Configure how notifications appear
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private locationSubscription: Location.LocationSubscription | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Get push token for this device
   */
  async getPushToken(): Promise<string | null> {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  async registerToken(token: string): Promise<void> {
    try {
      await apiRequest('POST', '/notifications/register-token', {
        token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Error registering token:', error);
    }
  }

  /**
   * Check for geofence notifications
   * Call this when app opens or periodically in background
   */
  async checkGeofence(): Promise<any[]> {
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return [];
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Check with backend
      const result: any = await apiRequest('POST', '/notifications/check-geofence', {
        lat: latitude,
        lng: longitude,
      });

      // Show local notifications
      if (result?.notifications && result.notifications.length > 0) {
        for (const notif of result.notifications) {
          await this.showLocalNotification(
            notif.title,
            notif.body,
            notif.data
          );
        }
      }

      return result?.notifications || [];
    } catch (error) {
      console.error('Geofence check error:', error);
      return [];
    }
  }

  /**
   * Check all notification types
   */
  async checkAllNotifications(): Promise<any[]> {
    try {
      // Get location if available
      let lat, lng;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      } catch (e) {
        // Location not available
      }

      const result: any = await apiRequest('GET', '/notifications/all-checks', undefined, {
        lat,
        lng,
      });

      // Show local notifications
      if (result?.notifications && result.notifications.length > 0) {
        for (const notif of result.notifications) {
          await this.showLocalNotification(
            notif.title,
            notif.body,
            notif.data
          );
        }
      }

      return result?.notifications || [];
    } catch (error) {
      console.error('Notification check error:', error);
      return [];
    }
  }

  /**
   * Show a local notification
   */
  async showLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Add claw to device calendar
   */
  async addToCalendar(clawId: string): Promise<boolean> {
    try {
      const result = await apiRequest(
        'POST',
        `/notifications/claw/${clawId}/add-to-calendar`
      );
      
      // On Android, we can use Intent to open calendar
      // On iOS, we need EventKit (requires native module)
      // For now, just show success
      await this.showLocalNotification(
        '📅 Calendar Event Created',
        'Open your calendar app to add this event',
        { type: 'calendar', claw_id: clawId }
      );
      
      return true;
    } catch (error) {
      console.error('Calendar error:', error);
      return false;
    }
  }

  /**
   * Set an alarm/reminder
   */
  async setAlarm(clawId: string, scheduledTime: Date): Promise<boolean> {
    try {
      const result: any = await apiRequest(
        'POST',
        `/notifications/claw/${clawId}/set-alarm`,
        {
          scheduled_time: scheduledTime.toISOString(),
        }
      );

      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ CLAW Reminder',
          body: result?.alarm?.message || 'Time to act on your intention',
          data: { type: 'alarm', claw_id: clawId },
          sound: 'default',
        },
        trigger: {
          date: scheduledTime,
        },
      });

      return true;
    } catch (error) {
      console.error('Alarm error:', error);
      return false;
    }
  }

  /**
   * Schedule periodic notification checks
   * This should be called when app starts
   */
  async startPeriodicChecks(): Promise<void> {
    // Initial check
    await this.checkAllNotifications();

    // Set up notification response handler
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data?.type === 'geofence') {
        // Navigate to Strike tab
        console.log('Geofence notification tapped');
      } else if (data?.type === 'smart_time') {
        // Show the claw
        console.log('Smart time notification tapped');
      }
    });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
