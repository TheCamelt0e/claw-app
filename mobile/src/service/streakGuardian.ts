/**
 * Streak Guardian - Loss Aversion Engine
 * 
 * Sends escalating notifications as user's streak expiration approaches.
 * Uses loss aversion psychology (2x stronger than gain seeking).
 * 
 * Notification Timeline (assuming streak expires at midnight UTC):
 * - 8 hours before: Gentle reminder
 * - 4 hours before: Urgent warning
 * - 1 hour before: Panic mode
 * - 15 minutes before: Last chance
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTimeUntilReset } from './aiUsage';

const STREAK_GUARDIAN_KEY = '@claw_streak_guardian_v1';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStrikeDate: string | null;
  streakExpiresAt: string | null;
}

interface GuardianSchedule {
  eightHourSent: boolean;
  fourHourSent: boolean;
  oneHourSent: boolean;
  fifteenMinSent: boolean;
}

/**
 * Initialize the Streak Guardian
 * Call this when app starts or when streak data changes
 */
export async function initializeStreakGuardian(streakData: StreakData): Promise<void> {
  // Cancel any existing scheduled notifications
  await cancelGuardianNotifications();
  
  // If no active streak, don't schedule anything
  if (streakData.currentStreak === 0 || !streakData.streakExpiresAt) {
    return;
  }
  
  // Calculate time until streak expires
  const expiresAt = new Date(streakData.streakExpiresAt).getTime();
  const now = Date.now();
  const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
  
  // Only schedule if streak expires today and we haven't struck yet
  if (hoursUntilExpiry <= 0) {
    // Already expired, user lost streak
    return;
  }
  
  // Schedule notifications at key intervals
  const schedules: { trigger: number; title: string; body: string; data: any }[] = [];
  
  // 8 hours before (gentle)
  if (hoursUntilExpiry > 8) {
    schedules.push({
      trigger: expiresAt - (8 * 60 * 60 * 1000),
      title: `🔥 Your ${streakData.currentStreak}-day streak is doing great!`,
      body: `Strike just ONE item today to keep it alive. You've got this!`,
      data: { type: 'streak_guardian', urgency: 'gentle', streak: streakData.currentStreak }
    });
  }
  
  // 4 hours before (urgent)
  if (hoursUntilExpiry > 4) {
    schedules.push({
      trigger: expiresAt - (4 * 60 * 60 * 1000),
      title: `⏰ ${streakData.currentStreak}-day streak expires in 4 hours!`,
      body: `Don't lose your progress. Open CLAW and strike something!`,
      data: { type: 'streak_guardian', urgency: 'urgent', streak: streakData.currentStreak }
    });
  }
  
  // 1 hour before (panic)
  if (hoursUntilExpiry > 1) {
    schedules.push({
      trigger: expiresAt - (1 * 60 * 60 * 1000),
      title: `😰 Streak expires in 1 HOUR!`,
      body: `Your ${streakData.currentStreak}-day streak is about to break! Strike NOW!`,
      data: { type: 'streak_guardian', urgency: 'panic', streak: streakData.currentStreak }
    });
  }
  
  // 15 minutes before (last chance)
  if (hoursUntilExpiry > 0.25) {
    schedules.push({
      trigger: expiresAt - (15 * 60 * 1000),
      title: `🚨 FINAL WARNING!`,
      body: `15 minutes to save your ${streakData.currentStreak}-day streak! OPEN CLAW!`,
      data: { type: 'streak_guardian', urgency: 'last_chance', streak: streakData.currentStreak }
    });
  }
  
  // Schedule all notifications
  for (const schedule of schedules) {
    if (schedule.trigger > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.title,
          body: schedule.body,
          data: schedule.data,
          sound: schedule.data.urgency === 'last_chance' ? 'default' : undefined,
          priority: schedule.data.urgency === 'last_chance' 
            ? Notifications.AndroidNotificationPriority.MAX 
            : Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: new Date(schedule.trigger),
        },
      });
    }
  }
  
  console.log(`[StreakGuardian] Scheduled ${schedules.length} notifications`);
}

/**
 * Cancel all Streak Guardian notifications
 */
export async function cancelGuardianNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'streak_guardian') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Called when user strikes an item
 * Cancels all guardian notifications (streak is safe)
 */
export async function onStrikeOccurred(): Promise<void> {
  await cancelGuardianNotifications();
  console.log('[StreakGuardian] Streak secured! Cancelled all notifications.');
}

/**
 * Get streak status for UI display
 */
export async function getStreakStatus(): Promise<{
  hasActiveStreak: boolean;
  streak: number;
  hoursUntilExpiry: number;
  isAtRisk: boolean;
}> {
  // TODO: Load from user profile or API
  // For now, return placeholder
  return {
    hasActiveStreak: false,
    streak: 0,
    hoursUntilExpiry: 0,
    isAtRisk: false,
  };
}

/**
 * Check if user should see "strike now" banner in UI
 */
export async function shouldShowStrikeBanner(): Promise<{
  show: boolean;
  urgency: 'none' | 'gentle' | 'urgent' | 'critical';
  message: string;
  hoursRemaining: number;
}> {
  // TODO: Get actual streak data from API/store
  const now = new Date();
  const hoursUntilMidnight = 24 - now.getUTCHours();
  
  // Placeholder logic - will be replaced with real data
  if (hoursUntilMidnight <= 1) {
    return {
      show: true,
      urgency: 'critical',
      message: 'Strike something in the next hour to keep your streak!',
      hoursRemaining: hoursUntilMidnight,
    };
  }
  
  if (hoursUntilMidnight <= 4) {
    return {
      show: true,
      urgency: 'urgent',
      message: 'Your streak expires in a few hours. Strike something!',
      hoursRemaining: hoursUntilMidnight,
    };
  }
  
  return {
    show: false,
    urgency: 'none',
    message: '',
    hoursRemaining: hoursUntilMidnight,
  };
}

/**
 * Format time until streak expires
 */
export function formatTimeUntilExpiry(hours: number): string {
  if (hours <= 0) return 'Expired!';
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours === 1) return '1 hour';
  if (hours < 24) return `${Math.round(hours)} hours`;
  return `${Math.floor(hours / 24)} days`;
}
