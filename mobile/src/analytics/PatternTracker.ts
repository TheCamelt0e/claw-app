/**
 * Pattern Tracker - The Brain of CLAW
 * 
 * Tracks user behavior to enable:
 * - Smart context detection
 * - Personalized expiry suggestions
 * - Predictive capture suggestions
 * - Strike time predictions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PATTERNS_KEY = '@claw_patterns';
const LAST_VISITS_KEY = '@claw_last_visits';
const STRIKE_TIMES_KEY = '@claw_strike_times';

export interface LocationPattern {
  locationChain: string;
  visitCount: number;
  lastVisit: string;
  typicalDays: number[]; // 0-6 (Sun-Sat)
  typicalHours: number[]; // 0-23
  averageDwellTime: number; // minutes
}

export interface StrikePattern {
  category: string;
  actionType: string;
  averageTimeToStrike: number; // hours from capture to strike
  preferredDays: number[];
  preferredHours: number[];
  completionRate: number;
}

export interface TimePattern {
  hour: number;
  captureCount: number;
  strikeCount: number;
  completionRate: number;
}

export interface UserPatterns {
  locationPatterns: LocationPattern[];
  strikePatterns: StrikePattern[];
  timePatterns: TimePattern[];
  lastUpdated: string;
}

class PatternTracker {
  private patterns: UserPatterns = {
    locationPatterns: [],
    strikePatterns: [],
    timePatterns: [],
    lastUpdated: new Date().toISOString(),
  };

  async init(): Promise<void> {
    await this.loadPatterns();
  }

  private async loadPatterns(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PATTERNS_KEY);
      if (stored) {
        this.patterns = { ...this.patterns, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[PatternTracker] Load error:', error);
    }
  }

  private async savePatterns(): Promise<void> {
    try {
      this.patterns.lastUpdated = new Date().toISOString();
      await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(this.patterns));
    } catch (error) {
      console.error('[PatternTracker] Save error:', error);
    }
  }

  // Record a location visit
  async recordLocationVisit(chain: string, dwellTimeMinutes: number = 0): Promise<void> {
    const now = new Date();
    const existing = this.patterns.locationPatterns.find(p => p.locationChain === chain);

    if (existing) {
      existing.visitCount++;
      existing.lastVisit = now.toISOString();
      existing.typicalDays = this.addToTypical(existing.typicalDays, now.getDay());
      existing.typicalHours = this.addToTypical(existing.typicalHours, now.getHours());
      existing.averageDwellTime = this.updateAverage(
        existing.averageDwellTime, 
        dwellTimeMinutes, 
        existing.visitCount
      );
    } else {
      this.patterns.locationPatterns.push({
        locationChain: chain,
        visitCount: 1,
        lastVisit: now.toISOString(),
        typicalDays: [now.getDay()],
        typicalHours: [now.getHours()],
        averageDwellTime: dwellTimeMinutes,
      });
    }

    await this.savePatterns();
  }

  // Record a strike (completion)
  async recordStrike(
    category: string, 
    actionType: string, 
    capturedAt: string, 
    struckAt: string = new Date().toISOString()
  ): Promise<void> {
    const captured = new Date(capturedAt);
    const struck = new Date(struckAt);
    const hoursToStrike = (struck.getTime() - captured.getTime()) / (1000 * 60 * 60);

    const existing = this.patterns.strikePatterns.find(
      p => p.category === category && p.actionType === actionType
    );

    if (existing) {
      existing.averageTimeToStrike = this.updateAverage(
        existing.averageTimeToStrike,
        hoursToStrike,
        Math.round(existing.completionRate * 100) + 1
      );
      existing.preferredDays = this.addToTypical(existing.preferredDays, struck.getDay());
      existing.preferredHours = this.addToTypical(existing.preferredHours, struck.getHours());
      existing.completionRate = Math.min(1, existing.completionRate + 0.01);
    } else {
      this.patterns.strikePatterns.push({
        category,
        actionType,
        averageTimeToStrike: hoursToStrike,
        preferredDays: [struck.getDay()],
        preferredHours: [struck.getHours()],
        completionRate: 1.0,
      });
    }

    // Update time patterns
    this.updateTimePattern(struck.getHours(), true);
    await this.savePatterns();
  }

  // Record a capture (for time pattern analysis)
  async recordCapture(): Promise<void> {
    const hour = new Date().getHours();
    this.updateTimePattern(hour, false);
    await this.savePatterns();
  }

  private updateTimePattern(hour: number, isStrike: boolean): void {
    const existing = this.patterns.timePatterns.find(t => t.hour === hour);
    if (existing) {
      existing.captureCount++;
      if (isStrike) existing.strikeCount++;
      existing.completionRate = existing.strikeCount / existing.captureCount;
    } else {
      this.patterns.timePatterns.push({
        hour,
        captureCount: 1,
        strikeCount: isStrike ? 1 : 0,
        completionRate: isStrike ? 1.0 : 0.0,
      });
    }
  }

  private addToTypical(array: number[], value: number): number[] {
    // Keep most common 3 values
    const counts: Record<number, number> = {};
    [...array, value].forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([v]) => parseInt(v));
  }

  private updateAverage(current: number, newValue: number, count: number): number {
    return (current * (count - 1) + newValue) / count;
  }

  // Getters for smart suggestions
  getTopLocations(): LocationPattern[] {
    return [...this.patterns.locationPatterns]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }

  getSuggestedExpiry(category: string, actionType: string): number {
    const pattern = this.patterns.strikePatterns.find(
      p => p.category === category && p.actionType === actionType
    );
    if (pattern) {
      return Math.ceil(pattern.averageTimeToStrike / 24);
    }
    // Defaults based on category
    const defaults: Record<string, number> = {
      grocery: 3,
      book: 30,
      movie: 14,
      restaurant: 7,
      task: 7,
      product: 14,
    };
    return defaults[category] || 7;
  }

  getBestTimeToStrike(category: string): { day: number; hour: number } | null {
    const pattern = this.patterns.strikePatterns.find(p => p.category === category);
    if (!pattern || pattern.preferredDays.length === 0) return null;
    
    return {
      day: pattern.preferredDays[0],
      hour: pattern.preferredHours[0] || 18,
    };
  }

  shouldSuggestCapture(category: string): boolean {
    const now = new Date();
    const pattern = this.patterns.strikePatterns.find(p => p.category === category);
    
    if (!pattern) return false;
    
    // Suggest if it's a preferred day/hour and last capture was >7 days ago
    const isPreferredDay = pattern.preferredDays.includes(now.getDay());
    const isPreferredHour = pattern.preferredHours.includes(now.getHours());
    
    return isPreferredDay && isPreferredHour;
  }

  getInsights(): string[] {
    const insights: string[] = [];
    
    // Location insights
    this.patterns.locationPatterns.forEach(loc => {
      if (loc.visitCount >= 5) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayNames = loc.typicalDays.map(d => days[d]).join(', ');
        insights.push(`You usually visit ${loc.locationChain} on ${dayNames}`);
      }
    });

    // Strike pattern insights
    this.patterns.strikePatterns.forEach(pattern => {
      if (pattern.completionRate > 0.8) {
        insights.push(`You're great at completing ${pattern.category} tasks!`);
      } else if (pattern.completionRate < 0.3) {
        insights.push(`${pattern.category} tasks are harder for you - try shorter deadlines?`);
      }
    });

    return insights;
  }

  getAllPatterns(): UserPatterns {
    return this.patterns;
  }

  // Reset patterns (for testing or user request)
  async reset(): Promise<void> {
    this.patterns = {
      locationPatterns: [],
      strikePatterns: [],
      timePatterns: [],
      lastUpdated: new Date().toISOString(),
    };
    await this.savePatterns();
  }
}

export const patternTracker = new PatternTracker();
export default patternTracker;
