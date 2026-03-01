/**
 * Smart Suggestions Engine
 * 
 * Generates contextual suggestions based on:
 * - Current location
 * - Time patterns
 * - Weather
 * - App context
 * - User history
 */

import { patternTracker, LocationPattern } from './PatternTracker';

export interface SmartSuggestion {
  id: string;
  type: 'location' | 'time' | 'weather' | 'pattern' | 'duplicate';
  title: string;
  message: string;
  confidence: number; // 0-1
  action?: 'capture' | 'strike' | 'review';
  suggestedClaw?: {
    content: string;
    category: string;
    tags: string[];
  };
  dismissable: boolean;
}

class SmartSuggestionsEngine {
  private lastSuggestions: SmartSuggestion[] = [];
  private dismissedIds: Set<string> = new Set();

  async generateSuggestions(context: {
    location?: { lat: number; lng: number; chain?: string };
    activeApp?: string;
    weather?: { condition: string; temp: number };
    recentCaptures?: string[];
  }): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // 1. Location-based suggestions
    if (context.location?.chain) {
      const locSuggestion = await this.getLocationSuggestion(context.location.chain);
      if (locSuggestion) suggestions.push(locSuggestion);
    }

    // 2. Time-based suggestions
    const timeSuggestion = await this.getTimeSuggestion();
    if (timeSuggestion) suggestions.push(timeSuggestion);

    // 3. Weather-based suggestions
    if (context.weather) {
      const weatherSuggestion = this.getWeatherSuggestion(context.weather);
      if (weatherSuggestion) suggestions.push(weatherSuggestion);
    }

    // 4. Pattern-based "you usually..."
    const patternSuggestion = await this.getPatternSuggestion();
    if (patternSuggestion) suggestions.push(patternSuggestion);

    // 5. Duplicate detection
    if (context.recentCaptures) {
      const dupSuggestion = this.getDuplicateSuggestion(context.recentCaptures);
      if (dupSuggestion) suggestions.push(dupSuggestion);
    }

    // Filter dismissed and sort by confidence
    this.lastSuggestions = suggestions
      .filter(s => !this.dismissedIds.has(s.id))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Max 3 suggestions

    return this.lastSuggestions;
  }

  private async getLocationSuggestion(chain: string): Promise<SmartSuggestion | null> {
    const patterns = patternTracker.getTopLocations();
    const match = patterns.find(p => 
      p.locationChain.toLowerCase() === chain.toLowerCase()
    );

    if (!match || match.visitCount < 3) return null;

    // Generate contextual suggestion based on chain
    const suggestions: Record<string, string[]> = {
      'bonus': ['Milk', 'Bread', 'Eggs', 'Cheese'],
      'kronan': ['Vegetables', 'Snacks', 'Toilet paper'],
      'hagkaup': ['Household items', 'Cosmetics', 'Clothing'],
      'costco': ['Bulk items', 'Frozen food', 'Gas'],
    };

    const chainKey = chain.toLowerCase();
    const items = suggestions[chainKey] || ['items'];
    const randomItem = items[Math.floor(Math.random() * items.length)];

    return {
      id: `loc_${chain}_${Date.now()}`,
      type: 'location',
      title: `At ${chain}`,
      message: `You usually buy ${randomItem} here. Add it?`,
      confidence: Math.min(0.9, match.visitCount * 0.1),
      action: 'capture',
      suggestedClaw: {
        content: `Buy ${randomItem} at ${chain}`,
        category: 'product',
        tags: [chain.toLowerCase(), 'shopping'],
      },
      dismissable: true,
    };
  }

  private async getTimeSuggestion(): Promise<SmartSuggestion | null> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Lunch time restaurant suggestion
    if (hour >= 11 && hour <= 13) {
      return {
        id: `time_lunch_${Date.now()}`,
        type: 'time',
        title: 'Lunch time',
        message: 'Looking for a place to eat? Check your saved restaurants.',
        confidence: 0.6,
        action: 'review',
        dismissable: true,
      };
    }

    // Evening wind-down reading suggestion
    if (hour >= 20 && hour <= 22) {
      return {
        id: `time_reading_${Date.now()}`,
        type: 'time',
        title: 'Wind-down time',
        message: 'Perfect time to read. Strike a book from your list?',
        confidence: 0.5,
        action: 'strike',
        dismissable: true,
      };
    }

    // Weekend task suggestion
    if ((day === 0 || day === 6) && hour >= 9 && hour <= 12) {
      return {
        id: `time_weekend_${Date.now()}`,
        type: 'time',
        title: 'Weekend morning',
        message: 'Good time to tackle those weekend tasks!',
        confidence: 0.55,
        action: 'review',
        dismissable: true,
      };
    }

    return null;
  }

  private getWeatherSuggestion(weather: { condition: string; temp: number }): SmartSuggestion | null {
    const condition = weather.condition.toLowerCase();

    if (condition.includes('rain') || condition.includes('drizzle')) {
      return {
        id: `weather_rain_${Date.now()}`,
        type: 'weather',
        title: 'Rainy day',
        message: 'It\'s raining! Do you have an umbrella?',
        confidence: 0.8,
        action: 'capture',
        suggestedClaw: {
          content: 'Buy an umbrella',
          category: 'product',
          tags: ['weather', 'rain'],
        },
        dismissable: true,
      };
    }

    if (weather.temp > 25) {
      return {
        id: `weather_hot_${Date.now()}`,
        type: 'weather',
        title: 'Hot day!',
        message: 'It\'s hot out. Need sunscreen or water?',
        confidence: 0.6,
        action: 'capture',
        dismissable: true,
      };
    }

    if (weather.temp < 0) {
      return {
        id: `weather_cold_${Date.now()}`,
        type: 'weather',
        title: 'Freezing!',
        message: 'Bundle up! Need ice scraper or winter gear?',
        confidence: 0.6,
        action: 'capture',
        dismissable: true,
      };
    }

    return null;
  }

  private async getPatternSuggestion(): Promise<SmartSuggestion | null> {
    const patterns = patternTracker.getAllPatterns();
    
    // Find categories with high completion that haven't been done recently
    const goodHabits = patterns.strikePatterns.filter(p => p.completionRate > 0.7);
    
    if (goodHabits.length === 0) return null;

    const habit = goodHabits[Math.floor(Math.random() * goodHabits.length)];
    
    return {
      id: `pattern_${habit.category}_${Date.now()}`,
      type: 'pattern',
      title: 'Your pattern',
      message: `You're great at ${habit.category} tasks. Ready for another?`,
      confidence: habit.completionRate,
      action: 'capture',
      dismissable: true,
    };
  }

  private getDuplicateSuggestion(recentCaptures: string[]): SmartSuggestion | null {
    // Simple duplicate detection - same words
    const contentCounts: Record<string, number> = {};
    
    recentCaptures.forEach(content => {
      const normalized = content.toLowerCase().trim();
      contentCounts[normalized] = (contentCounts[normalized] || 0) + 1;
    });

    const duplicates = Object.entries(contentCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length === 0) return null;

    const [content] = duplicates[0];

    return {
      id: `dup_${Date.now()}`,
      type: 'duplicate',
      title: 'Duplicate detected',
      message: `You captured "${content}" multiple times. Merge them?`,
      confidence: 0.9,
      action: 'review',
      dismissable: true,
    };
  }

  dismissSuggestion(id: string): void {
    this.dismissedIds.add(id);
    // Clear after 24 hours
    setTimeout(() => this.dismissedIds.delete(id), 24 * 60 * 60 * 1000);
  }

  getLastSuggestions(): SmartSuggestion[] {
    return this.lastSuggestions;
  }
}

export const smartSuggestions = new SmartSuggestionsEngine();
export default smartSuggestions;
