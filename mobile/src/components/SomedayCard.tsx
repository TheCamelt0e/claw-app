/**
 * Someday Card - The "Guilt-Free" Aspirational Item
 * 
 * Items like "Learn Spanish" or "Read War and Peace" live here.
 * They don't expire. They just... marinate.
 * Once a month, CLAW surfaces 3 Someday items for review.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface SomedayCardProps {
  item: {
    id: string;
    content: string;
    category?: string;
    created_at: string;
    ai_context?: {
      who_mentioned?: string;
      where?: string;
    };
  };
  onActivate?: (id: string) => void;  // Move to active list
  onDismiss?: (id: string) => void;   // "Bury forever"
  onRemindLater?: (id: string) => void; // "Remind me next month"
}

export default function SomedayCard({ 
  item, 
  onActivate, 
  onDismiss, 
  onRemindLater 
}: SomedayCardProps) {
  
  // Calculate how long it's been marinating
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const getMarinadeText = () => {
    if (daysAgo < 30) return 'Freshly captured';
    if (daysAgo < 90) return `Marinating for ${Math.floor(daysAgo / 30)} months`;
    if (daysAgo < 365) return `Aged ${Math.floor(daysAgo / 30)} months`;
    return `Vintage ${Math.floor(daysAgo / 365)} year${daysAgo >= 730 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      {/* Icon based on category */}
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getCategoryIcon(item.category)} 
          size={24} 
          color={colors.someday.DEFAULT}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.content}</Text>
        <Text style={styles.marinadeText}>
          {getMarinadeText()}
          {item.ai_context?.who_mentioned && ` • Mentioned by ${item.ai_context.who_mentioned}`}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.activateButton]}
          onPress={() => onActivate?.(item.id)}
        >
          <Ionicons name="sunny" size={18} color="#4CAF50" />
        <Text style={[styles.actionText, { color: '#4CAF50' }]}>
          Let's do it!
        </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.remindButton]}
          onPress={() => onRemindLater?.(item.id)}
        >
          <Ionicons name="time" size={18} color="#FFD700" />
          <Text style={[styles.actionText, { color: '#FFD700' }]}>
            Next month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dismissButton]}
          onPress={() => onDismiss?.(item.id)}
        >
          <Ionicons name="close" size={18} color="#888" />
          <Text style={[styles.actionText, { color: '#888' }]}>
            Not anymore
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getCategoryIcon(category?: string): any {
  const icons: { [key: string]: any } = {
    'book': 'book-outline',
    'movie': 'film-outline',
    'restaurant': 'restaurant-outline',
    'product': 'cube-outline',
    'task': 'checkbox-outline',
    'idea': 'bulb-outline',
    'event': 'calendar-outline',
    'gift': 'gift-outline',
    'travel': 'airplane-outline',
    'skill': 'school-outline',
  };
  return icons[category || ''] || 'bookmark-outline';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.someday.DEFAULT,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  marinadeText: {
    fontSize: 13,
    color: colors.someday.DEFAULT,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  activateButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  remindButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  dismissButton: {
    backgroundColor: 'rgba(136, 136, 136, 0.15)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
