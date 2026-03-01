/**
 * Weekly Review - The Sunday Archive
 * 
 * Weekly summary of captures vs strikes with insights
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { achievementEngine, UserStats } from '../achievements/AchievementEngine';

const WEEKLY_REVIEW_KEY = '@claw_weekly_reviews';
const LAST_REVIEW_KEY = '@claw_last_review_date';

export interface WeeklyReview {
  weekStarting: string;
  captures: number;
  strikes: number;
  strikeRate: number;
  topCategory: string;
  fastestStrike: number; // hours
  longestPending: number; // days
  newAchievements: string[];
  insights: string[];
  goalsForNextWeek: string[];
}

class WeeklyReviewSystem {
  async shouldShowReview(): Promise<boolean> {
    const lastReview = await AsyncStorage.getItem(LAST_REVIEW_KEY);
    if (!lastReview) return true;

    const lastDate = new Date(lastReview);
    const now = new Date();
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

    // Show if it's been 7+ days and it's Sunday
    return diffDays >= 7 && now.getDay() === 0;
  }

  async generateReview(): Promise<WeeklyReview> {
    const stats = achievementEngine.getStats();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get weekly data from pattern tracker
    const patterns = await this.getWeeklyData(oneWeekAgo);

    const review: WeeklyReview = {
      weekStarting: oneWeekAgo.toISOString(),
      captures: patterns.captures,
      strikes: patterns.strikes,
      strikeRate: patterns.captures > 0 ? patterns.strikes / patterns.captures : 0,
      topCategory: patterns.topCategory,
      fastestStrike: patterns.fastestStrike,
      longestPending: patterns.longestPending,
      newAchievements: [],
      insights: [],
      goalsForNextWeek: [],
    };

    // Generate insights
    review.insights = this.generateInsights(review, stats);
    review.goalsForNextWeek = this.generateGoals(review, stats);

    // Save review
    await this.saveReview(review);
    await AsyncStorage.setItem(LAST_REVIEW_KEY, new Date().toISOString());

    return review;
  }

  private async getWeeklyData(since: Date): Promise<any> {
    // This would integrate with the claw store to get actual weekly data
    // For now, return placeholder
    return {
      captures: 12,
      strikes: 8,
      topCategory: 'product',
      fastestStrike: 2,
      longestPending: 5,
    };
  }

  private generateInsights(review: WeeklyReview, stats: UserStats): string[] {
    const insights: string[] = [];

    if (review.strikeRate >= 0.8) {
      insights.push('🔥 Amazing week! You completed 80%+ of your intentions.');
    } else if (review.strikeRate < 0.3) {
      insights.push('📊 Lower completion rate this week. Try shorter deadlines?');
    }

    if (review.topCategory) {
      insights.push(`🎯 Most captured: ${review.topCategory}. You're focusing well!`);
    }

    if (review.fastestStrike < 1) {
      insights.push('⚡ Speed demon! You struck something within an hour.');
    }

    if (review.longestPending > 7) {
      insights.push(`⏰ You have items pending for ${review.longestPending} days. Time to review?`);
    }

    if (stats.currentStreak > 3) {
      insights.push(`🔥 ${stats.currentStreak} day streak! Keep it going!`);
    }

    return insights;
  }

  private generateGoals(review: WeeklyReview, stats: UserStats): string[] {
    const goals: string[] = [];

    if (review.strikeRate < 0.7) {
      goals.push('Aim for 70% strike rate next week');
    }

    if (review.longestPending > 3) {
      goals.push('Clear all items older than 3 days');
    }

    if (stats.currentStreak < 7) {
      goals.push('Build a 7-day streak');
    }

    goals.push('Capture 3 new intentions');

    return goals;
  }

  private async saveReview(review: WeeklyReview): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(WEEKLY_REVIEW_KEY);
      const reviews: WeeklyReview[] = stored ? JSON.parse(stored) : [];
      reviews.push(review);
      // Keep last 12 weeks
      if (reviews.length > 12) reviews.shift();
      await AsyncStorage.setItem(WEEKLY_REVIEW_KEY, JSON.stringify(reviews));
    } catch (error) {
      console.error('[WeeklyReview] Save error:', error);
    }
  }

  async getPastReviews(): Promise<WeeklyReview[]> {
    try {
      const stored = await AsyncStorage.getItem(WEEKLY_REVIEW_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async markReviewSeen(): Promise<void> {
    await AsyncStorage.setItem(LAST_REVIEW_KEY, new Date().toISOString());
  }
}

export const weeklyReview = new WeeklyReviewSystem();
export default weeklyReview;
