/**
 * Achievement Engine - The CLAWdex
 * 
 * Gamification system with badges, streaks, and milestones
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { patternTracker } from '../analytics/PatternTracker';

const ACHIEVEMENTS_KEY = '@claw_achievements';
const USER_STATS_KEY = '@claw_user_stats';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'category' | 'location' | 'social' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'strikes' | 'streak' | 'category_strikes' | 'location_visits' | 'special';
    count?: number;
    category?: string;
    location?: string;
  };
  unlockedAt?: string;
  progress: number; // 0-100
}

export interface UserStats {
  totalCaptures: number;
  totalStrikes: number;
  currentStreak: number;
  longestStreak: number;
  categoryStrikes: Record<string, number>;
  locationVisits: Record<string, number>;
  weeklyStrikes: number;
  lastStrikeDate?: string;
}

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Streak achievements
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Strike 3 days in a row',
    icon: '🔥',
    category: 'streak',
    tier: 'bronze',
    requirement: { type: 'streak', count: 3 },
    progress: 0,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Strike 7 days in a row',
    icon: '📅',
    category: 'streak',
    tier: 'silver',
    requirement: { type: 'streak', count: 7 },
    progress: 0,
  },
  {
    id: 'streak_30',
    name: 'Month Master',
    description: 'Strike 30 days in a row',
    icon: '🏆',
    category: 'streak',
    tier: 'gold',
    requirement: { type: 'streak', count: 30 },
    progress: 0,
  },
  {
    id: 'streak_100',
    name: 'Centurion',
    description: 'Strike 100 days in a row',
    icon: '👑',
    category: 'streak',
    tier: 'platinum',
    requirement: { type: 'streak', count: 100 },
    progress: 0,
  },
  
  // Category achievements
  {
    id: 'cat_book_5',
    name: 'Bookworm',
    description: 'Read 5 books',
    icon: '📚',
    category: 'category',
    tier: 'bronze',
    requirement: { type: 'category_strikes', category: 'book', count: 5 },
    progress: 0,
  },
  {
    id: 'cat_book_20',
    name: 'Librarian',
    description: 'Read 20 books',
    icon: '📖',
    category: 'category',
    tier: 'gold',
    requirement: { type: 'category_strikes', category: 'book', count: 20 },
    progress: 0,
  },
  {
    id: 'cat_grocery_10',
    name: 'Regular',
    description: '10 grocery runs',
    icon: '🛒',
    category: 'category',
    tier: 'bronze',
    requirement: { type: 'category_strikes', category: 'product', count: 10 },
    progress: 0,
  },
  {
    id: 'cat_grocery_50',
    name: 'Shopper Supreme',
    description: '50 grocery runs',
    icon: '🥇',
    category: 'category',
    tier: 'silver',
    requirement: { type: 'category_strikes', category: 'product', count: 50 },
    progress: 0,
  },
  {
    id: 'cat_restaurant_10',
    name: 'Foodie',
    description: 'Try 10 restaurants',
    icon: '🍽️',
    category: 'category',
    tier: 'silver',
    requirement: { type: 'category_strikes', category: 'restaurant', count: 10 },
    progress: 0,
  },
  {
    id: 'cat_movie_10',
    name: 'Cinephile',
    description: 'Watch 10 movies',
    icon: '🎬',
    category: 'category',
    tier: 'bronze',
    requirement: { type: 'category_strikes', category: 'movie', count: 10 },
    progress: 0,
  },
  
  // Location achievements
  {
    id: 'loc_bonus_10',
    name: 'Bónus VIP',
    description: 'Visit Bónus 10 times',
    icon: '🦀',
    category: 'location',
    tier: 'bronze',
    requirement: { type: 'location_visits', location: 'bonus', count: 10 },
    progress: 0,
  },
  {
    id: 'loc_kronan_10',
    name: 'Krónan Regular',
    description: 'Visit Krónan 10 times',
    icon: '💚',
    category: 'location',
    tier: 'bronze',
    requirement: { type: 'location_visits', location: 'kronan', count: 10 },
    progress: 0,
  },
  {
    id: 'loc_costco_5',
    name: 'Bulk Buyer',
    description: 'Visit Costco 5 times',
    icon: '📦',
    category: 'location',
    tier: 'silver',
    requirement: { type: 'location_visits', location: 'costco', count: 5 },
    progress: 0,
  },
  
  // Special achievements
  {
    id: 'special_someday_5',
    name: 'Dreamer',
    description: 'Strike 5 Someday items',
    icon: '🔮',
    category: 'special',
    tier: 'silver',
    requirement: { type: 'special' },
    progress: 0,
  },
  {
    id: 'special_vip_10',
    name: 'Priority Player',
    description: 'Strike 10 VIP items',
    icon: '⚡',
    category: 'special',
    tier: 'gold',
    requirement: { type: 'special' },
    progress: 0,
  },
  {
    id: 'special_first_capture',
    name: 'First Capture',
    description: 'Capture your first intention',
    icon: '🎯',
    category: 'special',
    tier: 'bronze',
    requirement: { type: 'strikes', count: 1 },
    progress: 0,
  },
  {
    id: 'special_speed_strike',
    name: 'Quick Strike',
    description: 'Strike within 1 hour of capture',
    icon: '⚡',
    category: 'special',
    tier: 'silver',
    requirement: { type: 'special' },
    progress: 0,
  },
  {
    id: 'special_night_owl',
    name: 'Night Owl',
    description: 'Capture after midnight',
    icon: '🦉',
    category: 'special',
    tier: 'bronze',
    requirement: { type: 'special' },
    progress: 0,
  },
  {
    id: 'special_early_bird',
    name: 'Early Bird',
    description: 'Strike before 7am',
    icon: '🐦',
    category: 'special',
    tier: 'bronze',
    requirement: { type: 'special' },
    progress: 0,
  },
];

class AchievementEngine {
  private achievements: Achievement[] = [];
  private stats: UserStats = {
    totalCaptures: 0,
    totalStrikes: 0,
    currentStreak: 0,
    longestStreak: 0,
    categoryStrikes: {},
    locationVisits: {},
    weeklyStrikes: 0,
  };

  async init(): Promise<void> {
    await this.loadData();
    this.updateProgress();
  }

  private async loadData(): Promise<void> {
    try {
      const [achievementsStored, statsStored] = await Promise.all([
        AsyncStorage.getItem(ACHIEVEMENTS_KEY),
        AsyncStorage.getItem(USER_STATS_KEY),
      ]);

      if (achievementsStored) {
        this.achievements = JSON.parse(achievementsStored);
      } else {
        // Initialize with definitions
        this.achievements = ACHIEVEMENT_DEFINITIONS.map(a => ({ ...a }));
      }

      if (statsStored) {
        this.stats = { ...this.stats, ...JSON.parse(statsStored) };
      }
    } catch (error) {
      console.error('[AchievementEngine] Load error:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.achievements)),
        AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(this.stats)),
      ]);
    } catch (error) {
      console.error('[AchievementEngine] Save error:', error);
    }
  }

  // Record a strike and check achievements
  async recordStrike(category?: string, isVIP: boolean = false): Promise<Achievement[]> {
    const today = new Date().toISOString().split('T')[0];
    const lastStrike = this.stats.lastStrikeDate;

    // Update streak
    if (lastStrike) {
      const lastDate = new Date(lastStrike);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        this.stats.currentStreak++;
      } else if (diffDays > 1) {
        this.stats.currentStreak = 1;
      }
    } else {
      this.stats.currentStreak = 1;
    }

    this.stats.lastStrikeDate = today;
    this.stats.totalStrikes++;
    this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);

    // Update category strikes
    if (category) {
      this.stats.categoryStrikes[category] = (this.stats.categoryStrikes[category] || 0) + 1;
    }

    // Update weekly strikes
    this.stats.weeklyStrikes++;

    await this.saveData();
    const unlocked = this.checkUnlocks();
    return unlocked;
  }

  // Record location visit
  async recordLocationVisit(location: string): Promise<void> {
    this.stats.locationVisits[location] = (this.stats.locationVisits[location] || 0) + 1;
    await this.saveData();
    this.checkUnlocks();
  }

  // Record capture
  async recordCapture(): Promise<void> {
    this.stats.totalCaptures++;
    await this.saveData();
    this.checkUnlocks();
  }

  private checkUnlocks(): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    this.achievements.forEach(achievement => {
      if (achievement.unlockedAt) return; // Already unlocked

      let unlocked = false;
      const req = achievement.requirement;

      switch (req.type) {
        case 'streak':
          if (this.stats.currentStreak >= (req.count || 0)) {
            unlocked = true;
          }
          break;
        case 'strikes':
          if (this.stats.totalStrikes >= (req.count || 0)) {
            unlocked = true;
          }
          break;
        case 'category_strikes':
          if (req.category && this.stats.categoryStrikes[req.category] >= (req.count || 0)) {
            unlocked = true;
          }
          break;
        case 'location_visits':
          if (req.location && this.stats.locationVisits[req.location] >= (req.count || 0)) {
            unlocked = true;
          }
          break;
      }

      if (unlocked) {
        achievement.unlockedAt = new Date().toISOString();
        achievement.progress = 100;
        newlyUnlocked.push(achievement);
      }
    });

    if (newlyUnlocked.length > 0) {
      this.saveData();
    }

    return newlyUnlocked;
  }

  private updateProgress(): void {
    this.achievements.forEach(achievement => {
      if (achievement.unlockedAt) {
        achievement.progress = 100;
        return;
      }

      const req = achievement.requirement;
      let current = 0;
      let target = req.count || 1;

      switch (req.type) {
        case 'streak':
          current = this.stats.currentStreak;
          break;
        case 'strikes':
          current = this.stats.totalStrikes;
          break;
        case 'category_strikes':
          current = req.category ? this.stats.categoryStrikes[req.category] || 0 : 0;
          break;
        case 'location_visits':
          current = req.location ? this.stats.locationVisits[req.location] || 0 : 0;
          break;
      }

      achievement.progress = Math.min(100, Math.round((current / target) * 100));
    });
  }

  // Getters
  getAchievements(): Achievement[] {
    return this.achievements;
  }

  getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.unlockedAt);
  }

  getLockedAchievements(): Achievement[] {
    return this.achievements.filter(a => !a.unlockedAt);
  }

  getStats(): UserStats {
    return this.stats;
  }

  getStatsForCategory(category: 'streak' | 'category' | 'location' | 'social' | 'special'): Achievement[] {
    return this.achievements.filter(a => a.category === category);
  }

  // Streak freeze (Duolingo-style)
  async useStreakFreeze(): Promise<boolean> {
    const freezes = await this.getStreakFreezes();
    if (freezes <= 0) return false;

    // Don't decrease streak if they missed a day
    await AsyncStorage.setItem('@claw_streak_freezes', String(freezes - 1));
    return true;
  }

  async getStreakFreezes(): Promise<number> {
    const stored = await AsyncStorage.getItem('@claw_streak_freezes');
    return parseInt(stored || '0');
  }

  async addStreakFreeze(): Promise<void> {
    const current = await this.getStreakFreezes();
    await AsyncStorage.setItem('@claw_streak_freezes', String(current + 1));
  }

  // Weekly reset
  async resetWeeklyStats(): Promise<void> {
    this.stats.weeklyStrikes = 0;
    await this.saveData();
  }
}

export const achievementEngine = new AchievementEngine();
export default achievementEngine;
