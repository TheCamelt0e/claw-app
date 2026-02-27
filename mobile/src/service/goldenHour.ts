/**
 * 🌅 GOLDEN HOUR SYSTEM
 * 
 * Random 60-minute window each day with 2x rewards
 * Creates FOMO and unpredictable habit formation
 * Users check app constantly to catch the Golden Hour
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

const GOLDEN_HOUR_KEY = '@golden_hour_state';
const GOLDEN_HOUR_HISTORY_KEY = '@golden_hour_history';

interface GoldenHourState {
  nextGoldenHour: string | null; // ISO date string
  durationMinutes: number;
  multiplier: number;
  isActive: boolean;
  notificationSent: boolean;
}

interface GoldenHourHistory {
  dates: string[]; // ISO dates when Golden Hour occurred
  strikesDuringGoldenHour: number;
  totalBonusEarned: number;
}

// Generate random Golden Hour for tomorrow
// Random between 6 AM and 10 PM, avoiding previous times when possible
export const scheduleNextGoldenHour = async (): Promise<Date> => {
  const history = await getGoldenHourHistory();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Available hours: 6 AM to 10 PM
  const minHour = 6;
  const maxHour = 22;
  
  // Try to avoid recent times (basic variance)
  let randomHour: number;
  let attempts = 0;
  
  do {
    randomHour = Math.floor(Math.random() * (maxHour - minHour + 1)) + minHour;
    attempts++;
  } while (
    attempts < 5 &&
    history.dates.some(dateStr => {
      const date = new Date(dateStr);
      return Math.abs(date.getHours() - randomHour) < 3;
    })
  );
  
  const randomMinute = Math.floor(Math.random() * 60);
  
  tomorrow.setHours(randomHour, randomMinute, 0, 0);
  
  // Save state
  const state: GoldenHourState = {
    nextGoldenHour: tomorrow.toISOString(),
    durationMinutes: 60,
    multiplier: 2,
    isActive: false,
    notificationSent: false,
  };
  
  await saveGoldenHourState(state);
  
  // Schedule notification 1 minute before
  const notificationTime = new Date(tomorrow);
  notificationTime.setMinutes(notificationTime.getMinutes() - 1);
  
  if (notificationTime > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Golden Hour Approaches!',
        body: '2x strike points starting in 1 minute. Be ready!',
        data: { type: 'golden_hour_warning' },
        sound: 'notification_sound.wav',
      },
      trigger: { date: notificationTime },
    });
  }
  
  // Schedule "started" notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 GOLDEN HOUR IS NOW!',
      body: '2x strike points for the next 60 minutes. Strike while the iron is hot!',
      data: { type: 'golden_hour_start' },
      sound: 'notification_sound.wav',
    },
    trigger: { date: tomorrow },
  });
  
  // Update history
  history.dates.push(tomorrow.toISOString());
  if (history.dates.length > 30) {
    history.dates.shift(); // Keep last 30 days
  }
  await saveGoldenHourHistory(history);
  
  return tomorrow;
};

// Check if Golden Hour is currently active
export const checkGoldenHourStatus = async (): Promise<{
  isActive: boolean;
  timeRemaining: number; // minutes
  multiplier: number;
  nextGoldenHour: Date | null;
}> => {
  const state = await loadGoldenHourState();
  const now = new Date();
  
  if (!state.nextGoldenHour) {
    // No Golden Hour scheduled - schedule one for tomorrow
    const next = await scheduleNextGoldenHour();
    return {
      isActive: false,
      timeRemaining: 0,
      multiplier: 1,
      nextGoldenHour: next,
    };
  }
  
  const goldenHourStart = new Date(state.nextGoldenHour);
  const goldenHourEnd = new Date(goldenHourStart);
  goldenHourEnd.setMinutes(goldenHourEnd.getMinutes() + state.durationMinutes);
  
  // Check if we're in the Golden Hour window
  if (now >= goldenHourStart && now <= goldenHourEnd) {
    if (!state.isActive) {
      // Just started!
      state.isActive = true;
      await saveGoldenHourState(state);
      await triggerGoldenHourStartHaptics();
    }
    
    const timeRemaining = Math.ceil((goldenHourEnd.getTime() - now.getTime()) / 60000);
    
    return {
      isActive: true,
      timeRemaining,
      multiplier: state.multiplier,
      nextGoldenHour: null,
    };
  }
  
  // Golden Hour has passed, schedule next
  if (now > goldenHourEnd) {
    const next = await scheduleNextGoldenHour();
    return {
      isActive: false,
      timeRemaining: 0,
      multiplier: 1,
      nextGoldenHour: next,
    };
  }
  
  // Golden Hour is in the future
  return {
    isActive: false,
    timeRemaining: 0,
    multiplier: 1,
    nextGoldenHour: goldenHourStart,
  };
};

// Trigger celebration haptics when Golden Hour starts
const triggerGoldenHourStartHaptics = async (): Promise<void> => {
  // Sunrise pattern
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await new Promise(r => setTimeout(r, 100));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await new Promise(r => setTimeout(r, 100));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise(r => setTimeout(r, 200));
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Record a strike during Golden Hour
export const recordGoldenHourStrike = async (
  basePoints: number
): Promise<{ bonusPoints: number; totalPoints: number }> => {
  const multiplier = 2;
  const bonusPoints = basePoints * (multiplier - 1);
  const totalPoints = basePoints * multiplier;
  
  // Update history
  const history = await getGoldenHourHistory();
  history.strikesDuringGoldenHour += 1;
  history.totalBonusEarned += bonusPoints;
  await saveGoldenHourHistory(history);
  
  return { bonusPoints, totalPoints };
};

// Get formatted countdown until next Golden Hour
export const getGoldenHourCountdown = async (): Promise<string | null> => {
  const { nextGoldenHour, isActive, timeRemaining } = await checkGoldenHourStatus();
  
  if (isActive) {
    return `${timeRemaining}m remaining`;
  }
  
  if (nextGoldenHour) {
    const now = new Date();
    const diff = nextGoldenHour.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  }
  
  return null;
};

// Storage helpers
const loadGoldenHourState = async (): Promise<GoldenHourState> => {
  try {
    const stored = await AsyncStorage.getItem(GOLDEN_HOUR_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load Golden Hour state:', e);
  }
  return {
    nextGoldenHour: null,
    durationMinutes: 60,
    multiplier: 2,
    isActive: false,
    notificationSent: false,
  };
};

const saveGoldenHourState = async (state: GoldenHourState): Promise<void> => {
  try {
    await AsyncStorage.setItem(GOLDEN_HOUR_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save Golden Hour state:', e);
  }
};

const getGoldenHourHistory = async (): Promise<GoldenHourHistory> => {
  try {
    const stored = await AsyncStorage.getItem(GOLDEN_HOUR_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load Golden Hour history:', e);
  }
  return {
    dates: [],
    strikesDuringGoldenHour: 0,
    totalBonusEarned: 0,
  };
};

const saveGoldenHourHistory = async (history: GoldenHourHistory): Promise<void> => {
  try {
    await AsyncStorage.setItem(GOLDEN_HOUR_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save Golden Hour history:', e);
  }
};

// Force Golden Hour for testing
export const forceGoldenHour = async (minutes: number = 60): Promise<void> => {
  const now = new Date();
  const state: GoldenHourState = {
    nextGoldenHour: now.toISOString(),
    durationMinutes: minutes,
    multiplier: 2,
    isActive: true,
    notificationSent: true,
  };
  await saveGoldenHourState(state);
};

// Get Golden Hour stats for profile screen
export const getGoldenHourStats = async (): Promise<{
  totalGoldenHours: number;
  strikesDuringGoldenHour: number;
  totalBonusEarned: number;
  averageMultiplier: number;
}> => {
  const history = await getGoldenHourHistory();
  return {
    totalGoldenHours: history.dates.length,
    strikesDuringGoldenHour: history.strikesDuringGoldenHour,
    totalBonusEarned: history.totalBonusEarned,
    averageMultiplier: history.strikesDuringGoldenHour > 0
      ? (history.totalBonusEarned / history.strikesDuringGoldenHour) + 1
      : 1,
  };
};
