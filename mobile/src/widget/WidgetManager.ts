/**
 * Widget Manager - Bridge between React Native and Android Widgets
 * 
 * Allows the app to update widget data from JavaScript
 */
import { NativeModules, Platform } from 'react-native';

interface ClawWidgetData {
  id: string;
  title: string;
  context?: string;
  category?: string;
  expires_at?: string;
  streak?: number;
}

// Native module interface (only available on Android)
const { ClawWidgetModule } = NativeModules;

export class WidgetManager {
  static isAvailable(): boolean {
    return Platform.OS === 'android' && !!ClawWidgetModule;
  }

  /**
   * Update the Strike Now widget with a claw to display
   */
  static async updateStrikeWidget(claw: ClawWidgetData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('[Widget] Not available on this platform');
      return false;
    }

    try {
      const widgetData = {
        id: claw.id,
        title: claw.title,
        context: this.buildContextString(claw),
        streak: claw.streak || 0,
      };

      await ClawWidgetModule.updateStrikeWidget(JSON.stringify(widgetData));
      return true;
    } catch (error) {
      console.error('[Widget] Failed to update strike widget:', error);
      return false;
    }
  }

  /**
   * Clear the Strike Now widget (no items to show)
   */
  static async clearStrikeWidget(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await ClawWidgetModule.clearStrikeWidget();
      return true;
    } catch (error) {
      console.error('[Widget] Failed to clear strike widget:', error);
      return false;
    }
  }

  /**
   * Update streak counter on Quick Capture widget
   */
  static async updateStreakCounter(streak: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await ClawWidgetModule.updateStreakCounter(streak);
      return true;
    } catch (error) {
      console.error('[Widget] Failed to update streak:', error);
      return false;
    }
  }

  /**
   * Build context string for widget display
   */
  private static buildContextString(claw: ClawWidgetData): string {
    const parts: string[] = [];

    if (claw.category) {
      const emoji = this.getCategoryEmoji(claw.category);
      parts.push(`${emoji} ${claw.category}`);
    }

    if (claw.expires_at) {
      const days = this.getDaysUntil(claw.expires_at);
      if (days <= 1) {
        parts.push('⚠️ Expires today');
      } else if (days <= 3) {
        parts.push(`⏰ ${days} days left`);
      }
    }

    return parts.join(' • ') || 'Ready to strike!';
  }

  private static getCategoryEmoji(category: string): string {
    const map: Record<string, string> = {
      book: '📚',
      movie: '🎬',
      restaurant: '🍽️',
      product: '🛒',
      task: '✅',
      idea: '💡',
      gift: '🎁',
      event: '📅',
    };
    return map[category] || '📝';
  }

  private static getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

// Hook for easy widget updates
export function useWidgetUpdater(claws: ClawWidgetData[], streak: number) {
  if (!WidgetManager.isAvailable()) return;

  // Update Strike widget with top priority claw
  const topClaw = claws.find(c => c.category !== 'someday');
  if (topClaw) {
    WidgetManager.updateStrikeWidget({ ...topClaw, streak });
  } else {
    WidgetManager.clearStrikeWidget();
  }

  // Update streak on Quick Capture widget
  WidgetManager.updateStreakCounter(streak);
}
