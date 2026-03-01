/**
 * Achievements Screen - The CLAWdex
 * 
 * Display all badges, progress, and stats
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { achievementEngine, Achievement, UserStats } from '../achievements/AchievementEngine';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'streak', label: 'Streaks', icon: 'flame' },
  { key: 'category', label: 'Categories', icon: 'folder' },
  { key: 'location', label: 'Locations', icon: 'location' },
  { key: 'special', label: 'Special', icon: 'star' },
];

const TIER_COLORS = {
  bronze: ['#CD7F32', '#8B4513'],
  silver: ['#C0C0C0', '#808080'],
  gold: ['#FFD700', '#DAA520'],
  platinum: ['#E5E4E2', '#A0A0A0'],
};

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newUnlocks, setNewUnlocks] = useState<string[]>([]);
  const scaleAnims = React.useRef<Record<string, Animated.Value>>({}).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await achievementEngine.init();
    setAchievements(achievementEngine.getAchievements());
    setStats(achievementEngine.getStats());

    // Check for new unlocks
    const unlocked = achievementEngine.getUnlockedAchievements();
    const recentlyUnlocked = unlocked.filter(a => {
      if (!a.unlockedAt) return false;
      const hoursSince = (Date.now() - new Date(a.unlockedAt).getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });
    
    if (recentlyUnlocked.length > 0) {
      setNewUnlocks(recentlyUnlocked.map(a => a.id));
      // Animate new unlocks
      recentlyUnlocked.forEach(a => {
        scaleAnims[a.id] = new Animated.Value(0.8);
        Animated.spring(scaleAnims[a.id], {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const filteredAchievements = achievements.filter(a => 
    activeCategory === 'all' || a.category === activeCategory
  );

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;
  const progress = Math.round((unlockedCount / totalCount) * 100);

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = !!item.unlockedAt;
    const isNew = newUnlocks.includes(item.id);
    const animStyle = scaleAnims[item.id] ? { transform: [{ scale: scaleAnims[item.id] }] } : {};

    return (
      <Animated.View style={[styles.card, isNew && styles.newCard, animStyle]}>
        <LinearGradient
          colors={isUnlocked ? TIER_COLORS[item.tier] : ['#2d2d44', '#1a1a2e']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW!</Text>
            </View>
          )}

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{item.icon}</Text>
            {!isUnlocked && (
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={20} color={colors.text.muted} />
              </View>
            )}
          </View>

          <Text style={[styles.name, !isUnlocked && styles.lockedText]}>
            {item.name}
          </Text>
          <Text style={styles.description}>{item.description}</Text>

          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${item.progress}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>{item.progress}%</Text>
            </View>
          )}

          {isUnlocked && item.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={[...colors.gradient.background]} style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The CLAWdex</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{unlockedCount}/{totalCount}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progress}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          {stats && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.overallProgress}>
          <View style={styles.overallProgressBar}>
            <View style={[styles.overallProgressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.filterTab,
              activeCategory === cat.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Ionicons 
              name={cat.icon as any} 
              size={16} 
              color={activeCategory === cat.key ? colors.primary.DEFAULT : colors.text.muted} 
            />
            <Text style={[
              styles.filterText,
              activeCategory === cat.key && styles.filterTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements Grid */}
      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievement}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.presets.h1,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.gold.DEFAULT,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
  },
  overallProgress: {
    marginTop: spacing.sm,
  },
  overallProgressBar: {
    height: 8,
    backgroundColor: colors.surface.pressed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: colors.gold.DEFAULT,
    borderRadius: 4,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.pressed,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary.muted,
  },
  filterText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  filterTextActive: {
    color: colors.primary.DEFAULT,
  },
  grid: {
    padding: spacing.md,
  },
  card: {
    flex: 1,
    margin: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  newCard: {
    ...shadows.gold,
    borderWidth: 2,
    borderColor: colors.gold.DEFAULT,
  },
  cardGradient: {
    padding: spacing.lg,
    minHeight: 160,
  },
  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.danger.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 28,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  lockedText: {
    color: colors.text.muted,
  },
  description: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size.xs,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold.DEFAULT,
    borderRadius: 2,
  },
  progressText: {
    color: colors.text.muted,
    fontSize: typography.size.xs,
    textAlign: 'right',
  },
  unlockedDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: typography.size.xs,
    marginTop: 'auto',
  },
});
