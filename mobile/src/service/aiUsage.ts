/**
 * AI Usage Tracker - Monetization Core
 * 
 * Tracks daily AI-powered captures per user.
 * Free tier: 5/day
 * Pro tier: unlimited
 * 
 * Resets at midnight UTC.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_USAGE_KEY = '@claw_ai_usage_v1';
const DAILY_LIMIT_FREE = 5;

export interface AIUsageData {
  date: string;        // YYYY-MM-DD
  count: number;       // Captures used today
  lastReset: number;   // Timestamp of last reset
}

/**
 * Get today's date string (UTC)
 */
function getTodayString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Get current AI usage for today
 */
export async function getAIUsage(): Promise<AIUsageData> {
  try {
    const stored = await AsyncStorage.getItem(AI_USAGE_KEY);
    const today = getTodayString();
    
    if (stored) {
      const data: AIUsageData = JSON.parse(stored);
      
      // Check if we need to reset (new day)
      if (data.date !== today) {
        const newData: AIUsageData = {
          date: today,
          count: 0,
          lastReset: Date.now(),
        };
        await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(newData));
        return newData;
      }
      
      return data;
    }
    
    // First time
    const newData: AIUsageData = {
      date: today,
      count: 0,
      lastReset: Date.now(),
    };
    await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(newData));
    return newData;
    
  } catch (error) {
    console.error('[AIUsage] Error getting usage:', error);
    return { date: getTodayString(), count: 0, lastReset: Date.now() };
  }
}

/**
 * Increment AI usage counter
 * Call this when user makes an AI-powered capture
 */
export async function incrementAIUsage(): Promise<AIUsageData> {
  const usage = await getAIUsage();
  usage.count += 1;
  
  try {
    await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error('[AIUsage] Error saving usage:', error);
  }
  
  return usage;
}

/**
 * Check if user has AI credits remaining
 * Returns { canUse: boolean, remaining: number }
 */
export async function checkAICredits(isPro: boolean = false): Promise<{ canUse: boolean; remaining: number }> {
  if (isPro) {
    return { canUse: true, remaining: 999 };
  }
  
  const usage = await getAIUsage();
  const remaining = Math.max(0, DAILY_LIMIT_FREE - usage.count);
  
  return {
    canUse: remaining > 0,
    remaining,
  };
}

/**
 * Get remaining AI credits
 */
export async function getRemainingCredits(isPro: boolean = false): Promise<number> {
  if (isPro) return 999;
  
  const usage = await getAIUsage();
  return Math.max(0, DAILY_LIMIT_FREE - usage.count);
}

/**
 * Reset usage (for testing or admin)
 */
export async function resetAIUsage(): Promise<void> {
  const newData: AIUsageData = {
    date: getTodayString(),
    count: 0,
    lastReset: Date.now(),
  };
  await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(newData));
}

/**
 * Get time until next reset (midnight UTC)
 */
export function getTimeUntilReset(): { hours: number; minutes: number } {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0
  ));
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes };
}

/**
 * Format time until reset as string
 */
export function getTimeUntilResetString(): string {
  const { hours, minutes } = getTimeUntilReset();
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
