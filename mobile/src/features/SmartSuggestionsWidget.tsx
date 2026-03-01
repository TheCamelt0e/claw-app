/**
 * Smart Suggestions Widget
 * 
 * Shows contextual suggestions based on patterns, location, time, weather
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { smartSuggestions, SmartSuggestion } from '../analytics/SmartSuggestions';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface SmartSuggestionsWidgetProps {
  location?: { lat: number; lng: number; chain?: string };
  weather?: { condition: string; temp: number };
  onSuggestionCapture?: (suggestion: SmartSuggestion) => void;
  onDismiss?: (id: string) => void;
}

export default function SmartSuggestionsWidget({
  location,
  weather,
  onSuggestionCapture,
  onDismiss,
}: SmartSuggestionsWidgetProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSuggestions();
  }, [location, weather]);

  const loadSuggestions = async () => {
    setLoading(true);
    const context = {
      location,
      weather,
    };
    const newSuggestions = await smartSuggestions.generateSuggestions(context);
    setSuggestions(newSuggestions);
    setLoading(false);

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleDismiss = (id: string) => {
    smartSuggestions.dismissSuggestion(id);
    onDismiss?.(id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const getIconForType = (type: SmartSuggestion['type']) => {
    switch (type) {
      case 'location': return 'location';
      case 'time': return 'time';
      case 'weather': return 'cloudy';
      case 'pattern': return 'trending-up';
      case 'duplicate': return 'copy';
      default: return 'bulb';
    }
  };

  const getGradientForConfidence = (confidence: number) => {
    if (confidence > 0.8) return ['#FFD700', '#FF6B35'];
    if (confidence > 0.5) return ['#4CAF50', '#45a049'];
    return ['#2196F3', '#1976D2'];
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={colors.gold.DEFAULT} />
        <Text style={styles.headerTitle}>Smart Suggestions</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion) => (
          <LinearGradient
            key={suggestion.id}
            colors={getGradientForConfidence(suggestion.confidence)}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardHeader}>
              <Ionicons name={getIconForType(suggestion.type)} size={18} color="#fff" />
              <Text style={styles.cardType}>{suggestion.type}</Text>
              {suggestion.dismissable && (
                <TouchableOpacity 
                  style={styles.dismissBtn}
                  onPress={() => handleDismiss(suggestion.id)}
                >
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.cardTitle}>{suggestion.title}</Text>
            <Text style={styles.cardMessage}>{suggestion.message}</Text>

            {suggestion.action && (
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => onSuggestionCapture?.(suggestion)}
              >
                <Text style={styles.actionText}>
                  {suggestion.action === 'capture' ? 'Add it' : 
                   suggestion.action === 'strike' ? 'Strike now' : 'Review'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}

            <View style={styles.confidenceBar}>
              <View 
                style={[styles.confidenceFill, { width: `${suggestion.confidence * 100}%` }]} 
              />
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.presets.h4,
    marginLeft: spacing.sm,
    fontSize: typography.size.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 280,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardType: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
    flex: 1,
  },
  dismissBtn: {
    padding: spacing.xs,
  },
  cardTitle: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  cardMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  actionText: {
    color: '#fff',
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },
  confidenceBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
