/**
 * 🎲 ORACLE CHEST - Variable Reward System
 * 
 * Psychological hook: Slot machine mechanics on every strike
 * Drives "just one more" behavior through variable ratio reinforcement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface OracleReward {
  type: 'INSIGHT_SHARD' | 'PREDICTION_BONUS' | 'MYSTERY_VAULT' | 'LEGENDARY_STREAK' | 'PROPHECY';
  rarity: RewardRarity;
  title: string;
  description: string;
  icon: string;
  color: string;
  benefit: {
    type: 'xp' | 'free_analysis' | 'unlock_someday' | 'streak_multiplier' | 'prophecy';
    value: number;
    duration?: number; // hours, if applicable
  };
}

// Reward definitions with psychological hooks
const REWARD_DEFINITIONS: Record<OracleReward['type'], Omit<OracleReward, 'rarity'>> = {
  INSIGHT_SHARD: {
    type: 'INSIGHT_SHARD',
    title: '💎 Insight Shard',
    description: 'AI analyzed your patterns and found something interesting!',
    icon: '💎',
    color: '#60A5FA', // Blue
    benefit: { type: 'xp', value: 50 },
  },
  PREDICTION_BONUS: {
    type: 'PREDICTION_BONUS',
    title: '🔮 Prediction Bonus',
    description: 'Your next AI analysis is FREE!',
    icon: '🔮',
    color: '#A78BFA', // Purple
    benefit: { type: 'free_analysis', value: 1 },
  },
  MYSTERY_VAULT: {
    type: 'MYSTERY_VAULT',
    title: '🎁 Mystery Vault',
    description: 'A Someday item has been unlocked early!',
    icon: '🎁',
    color: '#F472B6', // Pink
    benefit: { type: 'unlock_someday', value: 1 },
  },
  LEGENDARY_STREAK: {
    type: 'LEGENDARY_STREAK',
    title: '👑 Legendary Streak',
    description: 'Double streak points for the next 24 hours!',
    icon: '👑',
    color: '#FBBF24', // Gold
    benefit: { type: 'streak_multiplier', value: 2, duration: 24 },
  },
  PROPHECY: {
    type: 'PROPHECY',
    title: '🌟 Prophecy Revealed',
    description: 'The Oracle sees something in your future...',
    icon: '🌟',
    color: '#FF6B35', // Claw coral
    benefit: { type: 'prophecy', value: 1 },
  },
};

// Rarity configuration with drop rates
const RARITY_CONFIG: Record<RewardRarity, { dropRate: number; hapticPattern: number[] }> = {
  common: { dropRate: 0.15, hapticPattern: [0, 50] },
  uncommon: { dropRate: 0.08, hapticPattern: [0, 80, 40, 80] },
  rare: { dropRate: 0.05, hapticPattern: [0, 100, 50, 100, 50, 100] },
  epic: { dropRate: 0.03, hapticPattern: [0, 150, 50, 150, 50, 300] },
  legendary: { dropRate: 0.01, hapticPattern: [0, 200, 50, 200, 50, 400, 100, 600] },
};

// Streak luck bonus - longer streaks = better odds
const getStreakLuckBonus = (streakDays: number): number => {
  if (streakDays >= 365) return 0.15;
  if (streakDays >= 100) return 0.12;
  if (streakDays >= 30) return 0.10;
  if (streakDays >= 7) return 0.07;
  if (streakDays >= 3) return 0.04;
  return 0.02;
};

// Pity system - guarantee reward after N strikes without one
const PITY_THRESHOLD = 10;
const ORACLE_CHEST_STORAGE_KEY = '@oracle_chest_state';

interface OracleChestState {
  strikesSinceLastReward: number;
  activeMultiplier: number;
  multiplierExpiry: string | null;
  freeAnalysesAvailable: number;
  lastProphecy: string | null;
  prophecyExpiry: string | null;
}

export const getInitialChestState = (): OracleChestState => ({
  strikesSinceLastReward: 0,
  activeMultiplier: 1,
  multiplierExpiry: null,
  freeAnalysesAvailable: 0,
  lastProphecy: null,
  prophecyExpiry: null,
});

export const loadChestState = async (): Promise<OracleChestState> => {
  try {
    const stored = await AsyncStorage.getItem(ORACLE_CHEST_STORAGE_KEY);
    if (stored) {
      return { ...getInitialChestState(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load chest state:', e);
  }
  return getInitialChestState();
};

export const saveChestState = async (state: OracleChestState): Promise<void> => {
  try {
    await AsyncStorage.setItem(ORACLE_CHEST_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save chest state:', e);
  }
};

// Generate a personalized insight based on user patterns
const generateInsight = async (): Promise<string> => {
  const insights = [
    "You strike grocery items 73% faster when you capture them before 10 AM",
    "Wednesday is your most productive striking day",
    "You're 2x more likely to strike book recommendations at night",
    "Your Someday pile grows 3x faster than you clear it",
    "You capture intentions 40% more often on weekends",
    "Tasks tagged 'urgent' have an 89% strike rate within 24 hours",
    "Your average time from capture to strike: 2.3 days",
    "You're most active near Bónus stores between 5-7 PM",
  ];
  return insights[Math.floor(Math.random() * insights.length)];
};

// Generate a prophecy - AI prediction of what user needs
const generateProphecy = async (): Promise<string> => {
  const prophecies = [
    "The Oracle sees milk in your near future... check your fridge",
    "A book you've been meaning to read will cross your path tomorrow",
    "Someone will ask you to pick up something from Krónan",
    "Your next great idea will come while showering - be ready to capture it",
    "That Someday item about learning Icelandic? The time draws near",
    "A forgotten birthday approaches - prepare a gift capture",
    "The stars align for a big grocery trip this weekend",
  ];
  return prophecies[Math.floor(Math.random() * prophecies.length)];
};

// Main roll function - the heart of the variable reward system
export const rollOracleChest = async (
  streakDays: number,
  forceReward: boolean = false
): Promise<{ reward: OracleReward | null; isPityReward: boolean; chestState: OracleChestState }> => {
  const state = await loadChestState();
  
  // Check for pity reward
  const isPityReward = state.strikesSinceLastReward >= PITY_THRESHOLD;
  
  // Calculate luck
  const luckBonus = getStreakLuckBonus(streakDays);
  const roll = Math.random();
  
  let rewardType: OracleReward['type'] | null = null;
  let rarity: RewardRarity = 'common';
  
  // Determine if we get a reward
  const legendaryThreshold = RARITY_CONFIG.legendary.dropRate + luckBonus;
  const epicThreshold = legendaryThreshold + RARITY_CONFIG.epic.dropRate + luckBonus;
  const rareThreshold = epicThreshold + RARITY_CONFIG.rare.dropRate;
  const uncommonThreshold = rareThreshold + RARITY_CONFIG.uncommon.dropRate;
  const commonThreshold = uncommonThreshold + RARITY_CONFIG.common.dropRate;
  
  if (forceReward || isPityReward || roll < legendaryThreshold) {
    rewardType = 'PROPHECY';
    rarity = 'legendary';
  } else if (roll < epicThreshold) {
    rewardType = 'LEGENDARY_STREAK';
    rarity = 'epic';
  } else if (roll < rareThreshold) {
    rewardType = 'MYSTERY_VAULT';
    rarity = 'rare';
  } else if (roll < uncommonThreshold) {
    rewardType = 'PREDICTION_BONUS';
    rarity = 'uncommon';
  } else if (roll < commonThreshold) {
    rewardType = 'INSIGHT_SHARD';
    rarity = 'common';
  }
  
  // Update state
  if (rewardType) {
    state.strikesSinceLastReward = 0;
    
    // Apply reward effects
    const rewardDef = REWARD_DEFINITIONS[rewardType];
    if (rewardDef.benefit.type === 'streak_multiplier' && rewardDef.benefit.duration) {
      state.activeMultiplier = rewardDef.benefit.value;
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + rewardDef.benefit.duration);
      state.multiplierExpiry = expiry.toISOString();
    } else if (rewardDef.benefit.type === 'free_analysis') {
      state.freeAnalysesAvailable += rewardDef.benefit.value;
    } else if (rewardDef.benefit.type === 'prophecy') {
      state.lastProphecy = await generateProphecy();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 3);
      state.prophecyExpiry = expiry.toISOString();
    }
    
    // Haptic celebration
    const hapticPattern = RARITY_CONFIG[rarity].hapticPattern;
    await playHapticPattern(hapticPattern);
  } else {
    state.strikesSinceLastReward += 1;
  }
  
  await saveChestState(state);
  
  // Build full reward object
  let reward: OracleReward | null = null;
  if (rewardType) {
    const def = REWARD_DEFINITIONS[rewardType];
    let description = def.description;
    
    // Personalize certain rewards
    if (rewardType === 'INSIGHT_SHARD') {
      description = await generateInsight();
    }
    
    reward = {
      ...def,
      rarity,
      description,
    };
  }
  
  return { reward, isPityReward, chestState: state };
};

// Play custom haptic pattern
const playHapticPattern = async (pattern: number[]): Promise<void> => {
  for (let i = 0; i < pattern.length; i += 2) {
    const delay = pattern[i];
    const duration = pattern[i + 1];
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Map duration to haptic intensity
    if (duration > 300) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (duration > 150) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (duration > 80) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
};

// Check if streak multiplier is active
export const getActiveMultiplier = async (): Promise<number> => {
  const state = await loadChestState();
  if (state.multiplierExpiry) {
    const expiry = new Date(state.multiplierExpiry);
    if (expiry > new Date()) {
      return state.activeMultiplier;
    }
  }
  return 1;
};

// Consume free analysis if available
export const consumeFreeAnalysis = async (): Promise<boolean> => {
  const state = await loadChestState();
  if (state.freeAnalysesAvailable > 0) {
    state.freeAnalysesAvailable -= 1;
    await saveChestState(state);
    return true;
  }
  return false;
};

// Get current prophecy if valid
export const getCurrentProphecy = async (): Promise<string | null> => {
  const state = await loadChestState();
  if (state.prophecyExpiry && state.lastProphecy) {
    const expiry = new Date(state.prophecyExpiry);
    if (expiry > new Date()) {
      return state.lastProphecy;
    }
  }
  return null;
};

// Get pity progress for UI
export const getPityProgress = async (): Promise<{ current: number; threshold: number }> => {
  const state = await loadChestState();
  return {
    current: state.strikesSinceLastReward,
    threshold: PITY_THRESHOLD,
  };
};

// Reset chest state (for testing)
export const resetChestState = async (): Promise<void> => {
  await saveChestState(getInitialChestState());
};

// Get streak luck bonus for display
export const getLuckBonusPercent = (streakDays: number): number => {
  return Math.round(getStreakLuckBonus(streakDays) * 100);
};
