/**
 * 🎵 HAPTIC SYMPHONY - Premium Tactile Feedback System
 * 
 * Every interaction has a distinct physical "voice"
 * Creates emotional connection through touch
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptic intensity levels
export type HapticIntensity = 'micro' | 'light' | 'medium' | 'heavy' | 'mega';

// Custom haptic patterns (delay in ms, intensity level)
export type HapticPattern = [number, HapticIntensity][];

// The Haptic Vocabulary - each interaction has its own "word"
export const HAPTIC_VOCABULARY: Record<string, HapticPattern> = {
  // Capture flow
  capture: [[0, 'medium']],
  captureSuccess: [[0, 'light'], [50, 'medium']],
  aiThinking: [[0, 'micro'], [80, 'micro'], [160, 'micro'], [240, 'micro']],
  aiComplete: [[0, 'light'], [100, 'medium']],
  
  // Strike flow
  strike: [[0, 'medium']],
  strikeSatisfying: [[0, 'heavy'], [80, 'medium']],
  strikeEpic: [[0, 'heavy'], [60, 'medium'], [120, 'heavy']],
  
  // VIP/Priority
  vipUnlock: [[0, 'medium'], [100, 'heavy'], [200, 'mega']],
  vipModeToggle: [[0, 'medium']],
  
  // Navigation
  tabSwitch: [[0, 'micro']],
  screenTransition: [[0, 'light']],
  scrollTick: [[0, 'micro']],
  
  // Errors/Warnings
  error: [[0, 'heavy']],
  warning: [[0, 'medium']],
  success: [[0, 'light'], [100, 'medium']],
  
  // Geofencing
  geofenceTrigger: [[0, 'light'], [100, 'medium'], [200, 'heavy'], [300, 'mega']],
  locationLock: [[0, 'medium'], [150, 'medium']],
  
  // Gamification
  streakMilestone: [[0, 'light'], [100, 'medium'], [200, 'heavy'], [400, 'mega']],
  levelUp: [[0, 'micro'], [50, 'light'], [100, 'medium'], [150, 'heavy'], [250, 'mega']],
  
  // Buttons
  buttonPress: [[0, 'light']],
  buttonLongPress: [[0, 'medium']],
  
  // Pull to refresh
  refreshTrigger: [[0, 'medium'], [150, 'medium']],
  refreshComplete: [[0, 'light'], [100, 'medium']],
  
  // Golden Hour
  goldenHourStart: [[0, 'light'], [100, 'medium'], [200, 'heavy'], [400, 'mega']],
  goldenHourTick: [[0, 'micro']],
  
  // Oracle Chest
  chestAnticipation: [[0, 'light'], [200, 'light'], [400, 'light']],
  chestCommon: [[0, 'medium']],
  chestUncommon: [[0, 'medium'], [80, 'medium']],
  chestRare: [[0, 'medium'], [60, 'medium'], [120, 'medium']],
  chestEpic: [[0, 'heavy'], [60, 'heavy'], [120, 'heavy']],
  chestLegendary: [[0, 'mega'], [80, 'mega'], [160, 'mega'], [300, 'mega']],
};

// Map intensity to Expo Haptics
const intensityToHaptic = (intensity: HapticIntensity): Haptics.ImpactFeedbackStyle => {
  switch (intensity) {
    case 'micro':
    case 'light':
      return Haptics.ImpactFeedbackStyle.Light;
    case 'medium':
      return Haptics.ImpactFeedbackStyle.Medium;
    case 'heavy':
    case 'mega':
      return Haptics.ImpactFeedbackStyle.Heavy;
    default:
      return Haptics.ImpactFeedbackStyle.Medium;
  }
};

// Play a single haptic
export const playHaptic = async (
  intensity: HapticIntensity
): Promise<void> => {
  if (Platform.OS === 'web') return;
  
  try {
    const style = intensityToHaptic(intensity);
    await Haptics.impactAsync(style);
  } catch (e) {
    // Haptics not available, silently fail
  }
};

// Play a custom pattern
export const playHapticPattern = async (
  pattern: HapticPattern
): Promise<void> => {
  if (Platform.OS === 'web') return;
  
  for (const [delay, intensity] of pattern) {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    await playHaptic(intensity);
  }
};

// Play a named vocabulary pattern
export const playVocab = async (
  vocabName: keyof typeof HAPTIC_VOCABULARY
): Promise<void> => {
  const pattern = HAPTIC_VOCABULARY[vocabName];
  if (pattern) {
    await playHapticPattern(pattern);
  }
};

// Quick helpers
export const hapticLight = () => playHaptic('light');
export const hapticMedium = () => playHaptic('medium');
export const hapticHeavy = () => playHaptic('heavy');

// Notification feedback
export const hapticSuccess = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

export const hapticWarning = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

export const hapticError = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

// Selection change (for pickers)
export const hapticSelection = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
};

// Create a custom pattern from description
// Example: "..-..--" = light, light, medium, light, light, heavy, heavy
export const parseHapticString = (pattern: string): HapticPattern => {
  const map: Record<string, HapticIntensity> = {
    '.': 'light',
    '-': 'medium',
    '=': 'heavy',
    '*': 'mega',
  };
  
  return pattern.split('').map((char, index) => [
    index * 80, // 80ms between each
    map[char] || 'light',
  ]);
};

// Context-aware haptic helper
// Returns different patterns based on app state
export const getContextualStrikeHaptic = (
  isGoldenHour: boolean,
  isVip: boolean,
  streakDays: number
): HapticPattern => {
  if (isGoldenHour && streakDays >= 7) {
    return HAPTIC_VOCABULARY.strikeEpic;
  }
  if (isGoldenHour || streakDays >= 7) {
    return HAPTIC_VOCABULARY.strikeSatisfying;
  }
  if (isVip) {
    return HAPTIC_VOCABULARY.vipUnlock;
  }
  return HAPTIC_VOCABULARY.strike;
};
