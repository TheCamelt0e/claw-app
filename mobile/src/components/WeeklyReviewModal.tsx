/**
 * Weekly Review Modal - The Sunday Archive
 * 
 * Weekly summary with insights and goals
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WeeklyReview } from '../analytics/WeeklyReview';
import { colors, spacing, borderRadius, typography } from '../theme';

interface WeeklyReviewModalProps {
  visible: boolean;
  review: WeeklyReview | null;
  onClose: () => void;
  onSetGoal: (goal: string) => void;
}

export default function WeeklyReviewModal({
  visible,
  review,
  onClose,
  onSetGoal,
}: WeeklyReviewModalProps) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && review) {
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
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [visible, review]);

  if (!review) return null;

  const strikeRatePercent = Math.round(review.strikeRate * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
        
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar" size={32} color={colors.gold.DEFAULT} />
              </View>
              <Text style={styles.title}>Your Week in Review</Text>
              <Text style={styles.subtitle}>
                Week of {new Date(review.weekStarting).toLocaleDateString()}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{review.captures}</Text>
                  <Text style={styles.statLabel}>Captured</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{review.strikes}</Text>
                  <Text style={styles.statLabel}>Struck</Text>
                </View>
                <View style={[styles.statCard, strikeRatePercent >= 70 && styles.goodStat]}>
                  <Text style={styles.statValue}>{strikeRatePercent}%</Text>
                  <Text style={styles.statLabel}>Strike Rate</Text>
                </View>
              </View>

              {/* Insights */}
              {review.insights.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 Insights</Text>
                  {review.insights.map((insight, idx) => (
                    <View key={idx} style={styles.insightRow}>
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Goals for Next Week */}
              {review.goalsForNextWeek.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🎯 Goals for Next Week</Text>
                  {review.goalsForNextWeek.map((goal, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.goalRow}
                      onPress={() => onSetGoal(goal)}
                    >
                      <Ionicons name="checkbox-outline" size={20} color={colors.primary.DEFAULT} />
                      <Text style={styles.goalText}>{goal}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>Ready for Next Week!</Text>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  container: {
    maxHeight: '85%',
  },
  gradient: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 500,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  goodStat: {
    backgroundColor: colors.success.muted,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold.DEFAULT,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  insightRow: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.info.DEFAULT,
  },
  insightText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  goalText: {
    color: colors.text.primary,
    fontSize: 14,
    flex: 1,
  },
  closeBtn: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
