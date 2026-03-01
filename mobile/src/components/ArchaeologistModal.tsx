/**
 * Archaeologist Modal - Monthly Someday Resurfacing
 * 
 * Once a month, CLAW surfaces 3 random Someday items:
 * "Still curious about these?"
 * 
 * Actions:
 * - "Let's do it!" → Move to active list
 * - "Next month" → Dismiss, show again in 30 days
 * - "Not anymore" → Archive/delete
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

interface SomedayItem {
  id: string;
  content: string;
  category?: string;
  created_at: string;
  ai_context?: {
    who_mentioned?: string;
    where?: string;
  };
}

interface ArchaeologistModalProps {
  visible: boolean;
  items: SomedayItem[];
  onActivate: (id: string) => void;
  onDismiss: (id: string) => void;
  onRemindLater: (id: string) => void;
  onCloseAll: () => void;
}

export default function ArchaeologistModal({
  visible,
  items,
  onActivate,
  onDismiss,
  onRemindLater,
  onCloseAll,
}: ArchaeologistModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible && items.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, items]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onCloseAll);
  };

  if (!visible || items.length === 0) return null;

  const formatAge = (createdAt: string) => {
    const days = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 30) return 'Fresh';
    if (days < 90) return `${Math.floor(days / 30)} months old`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} old`;
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="time" size={32} color="#FFD700" />
          </View>
          <Text style={styles.title}>🦀 The Archaeologist</Text>
          <Text style={styles.subtitle}>
            You captured {items.length} item{items.length !== 1 ? 's' : ''}{items[0]?.created_at ? `, oldest is ${formatAge(items[0].created_at)}` : ''}. Still curious?
          </Text>
        </View>

        {/* Items */}
        <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Ionicons 
                  name={getCategoryIcon(item.category)} 
                  size={20} 
                  color={colors.someday.DEFAULT} 
                />
                <Text style={styles.itemAge}>{formatAge(item.created_at)}</Text>
              </View>
              
              <Text style={styles.itemContent}>{item.content}</Text>
              
              {item.ai_context?.who_mentioned && (
                <Text style={styles.itemContext}>
                  Mentioned by {item.ai_context.who_mentioned}
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.activateBtn]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onActivate(item.id);
                  }}
                >
                  <Ionicons name="sunny" size={16} color="#4CAF50" />
                  <Text style={[styles.actionText, { color: '#4CAF50' }]}>
                    Let's do it!
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.laterBtn]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onRemindLater(item.id);
                  }}
                >
                  <Ionicons name="time" size={16} color="#FFD700" />
                  <Text style={[styles.actionText, { color: '#FFD700' }]}>
                    Next month
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onDismiss(item.id);
                  }}
                >
                  <Ionicons name="close" size={16} color="#888" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Text style={styles.closeText}>Maybe later</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
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
    'someday': 'bookmark-outline',
  };
  return icons[category || ''] || 'bookmark-outline';
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    backgroundColor: colors.background.DEFAULT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold.DEFAULT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  itemsContainer: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  itemCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.someday.DEFAULT,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemAge: {
    fontSize: 12,
    color: colors.someday.DEFAULT,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  itemContent: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  itemContext: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  activateBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    flex: 2,
  },
  laterBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    flex: 2,
  },
  dismissBtn: {
    backgroundColor: 'rgba(136, 136, 136, 0.15)',
    width: 44,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeText: {
    color: '#666',
    fontSize: 15,
  },
});
