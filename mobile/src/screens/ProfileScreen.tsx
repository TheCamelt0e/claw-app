/**
 * Profile Screen - User Stats & Settings
 * 
 * Shows:
 * - Streak stats with milestones
 * - AI usage analytics
 * - Pattern insights ("You shop on Thursdays")
 * - Subscription management
 * - Data export
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import { getAIUsage, getTimeUntilResetString } from '../service/aiUsage';
import { getUserPatterns, UserPatterns } from '../service/smartSurface';
import { EmailVerificationBanner } from './EmailVerificationScreen';

// Mock data - replace with API calls
const MOCK_USER = {
  display_name: 'Alex',
  email: 'alex@example.com',
  subscription_tier: 'free',
  current_streak: 12,
  longest_streak: 45,
  total_captures: 287,
  total_strikes: 234,
  strike_rate: 81,
  milestones: ['7_day', '30_day'],
};

const MILESTONE_REWARDS: { [key: string]: { icon: string; label: string; color: string } } = {
  '7_day': { icon: '🔥', label: 'Week Warrior', color: colors.primary.DEFAULT },
  '30_day': { icon: '🏆', label: 'Month Master', color: colors.gold.DEFAULT },
  '100_day': { icon: '💎', label: 'Century Club', color: colors.someday.DEFAULT },
  '365_day': { icon: '👑', label: 'Year Legend', color: colors.success.DEFAULT },
};

export default function ProfileScreen({ navigation }: any) {
  const { logout, user } = useAuthStore();
  const [aiUsage, setAiUsage] = useState({ count: 0 });
  const [patterns, setPatterns] = useState<UserPatterns | null>(null);
  const [isPro, setIsPro] = useState(user?.subscription_tier === 'pro');
  
  // Use real user data or fallback to mock
  const displayName = user?.display_name || MOCK_USER.display_name;
  const email = user?.email || MOCK_USER.email;
  const currentStreak = user?.current_streak || MOCK_USER.current_streak;
  const longestStreak = user?.longest_streak || MOCK_USER.longest_streak;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const usage = await getAIUsage();
    setAiUsage(usage);
    
    const userPatterns = await getUserPatterns();
    setPatterns(userPatterns);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout?',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleExportData = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const exportText = `
🦀 CLAW Export - ${new Date().toLocaleDateString()}

STREAKS
• Current: ${MOCK_USER.current_streak} days
• Longest: ${MOCK_USER.longest_streak} days
• Milestones: ${MOCK_USER.milestones.map(m => MILESTONE_REWARDS[m]?.label || m).join(', ')}

STATS
• Total Captures: ${MOCK_USER.total_captures}
• Total Strikes: ${MOCK_USER.total_strikes}
• Strike Rate: ${MOCK_USER.strike_rate}%

${patterns ? `PATTERNS
• Peak Day: ${patterns.peak_days?.[0]?.[0] || 'N/A'}
• Peak Hour: ${patterns.peak_hours?.[0]?.[0]}:00
• Preferred Store: ${patterns.preferred_stores?.[0]?.[0] || 'N/A'}` : ''}

Exported from CLAW - Capture now. Strike later.
    `.trim();

    try {
      await Share.share({
        message: exportText,
        title: 'My CLAW Stats',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const renderStreakCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🔥 Streak Stats</Text>
      
      <View style={styles.streakRow}>
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>Current</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{longestStreak}</Text>
          <Text style={styles.streakLabel}>Longest</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{MOCK_USER.strike_rate}%</Text>
          <Text style={styles.streakLabel}>Strike Rate</Text>
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.milestonesRow}>
        {MOCK_USER.milestones.map((milestone) => {
          const reward = MILESTONE_REWARDS[milestone];
          return (
            <View key={milestone} style={[styles.milestoneBadge, { borderColor: reward.color }]}>
              <Text style={styles.milestoneIcon}>{reward.icon}</Text>
              <Text style={[styles.milestoneLabel, { color: reward.color }]}>
                {reward.label}
              </Text>
            </View>
          );
        })}
        
        {/* Next milestone teaser */}
        {MOCK_USER.current_streak < 30 && !MOCK_USER.milestones.includes('30_day') && (
          <View style={[styles.milestoneBadge, styles.milestoneLocked]}>
            <Text style={styles.milestoneIcon}>🔒</Text>
            <Text style={styles.milestoneLabelLocked}>
              {30 - MOCK_USER.current_streak} days to 30
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderAIUsageCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🧠 AI Usage Today</Text>
      
      <View style={styles.aiUsageRow}>
        <View style={styles.aiUsageBar}>
          <View 
            style={[
              styles.aiUsageFill, 
              { 
                width: `${Math.min((aiUsage.count / 5) * 100, 100)}%`,
                backgroundColor: aiUsage.count >= 5 ? '#e94560' : '#4CAF50'
              }
            ]} 
          />
        </View>
        <Text style={styles.aiUsageText}>
          {isPro ? '∞' : `${aiUsage.count}/5`}
        </Text>
      </View>
      
      {!isPro && aiUsage.count >= 5 && (
        <TouchableOpacity 
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeBannerText}>
            You've used all AI captures. Upgrade for unlimited!
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFD700" />
        </TouchableOpacity>
      )}
      
      {!isPro && aiUsage.count < 5 && (
        <Text style={styles.aiResetText}>
          Resets in {getTimeUntilResetString()}
        </Text>
      )}
    </View>
  );

  const renderPatternInsights = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 Your Patterns</Text>
      
      {patterns && patterns.total_recorded > 0 ? (
        <>
          <View style={styles.insightRow}>
            <Ionicons name="calendar" size={20} color="#FF6B35" />
            <Text style={styles.insightText}>
              You strike items most often on <Text style={styles.insightHighlight}>{patterns.peak_days?.[0]?.[0]}s</Text>
            </Text>
          </View>
          
          <View style={styles.insightRow}>
            <Ionicons name="time" size={20} color="#FF6B35" />
            <Text style={styles.insightText}>
              Peak time: <Text style={styles.insightHighlight}>{patterns.peak_hours?.[0]?.[0]}:00</Text> ({patterns.peak_hours?.[0]?.[1]} strikes)
            </Text>
          </View>
          
          {patterns.preferred_stores && patterns.preferred_stores.length > 0 && (
            <View style={styles.insightRow}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.insightText}>
                Favorite store: <Text style={styles.insightHighlight}>{patterns.preferred_stores[0][0]}</Text>
              </Text>
            </View>
          )}
          
          <View style={styles.insightRow}>
            <Ionicons name="trending-up" size={20} color="#FF6B35" />
            <Text style={styles.insightText}>
              Avg time to strike: <Text style={styles.insightHighlight}>{Math.round(patterns.avg_time_to_strike_hours)} hours</Text>
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.emptyInsightText}>
          Keep striking items! CLAW is learning your patterns.
        </Text>
      )}
    </View>
  );

  const renderSubscriptionCard = () => (
    <View style={[styles.card, isPro && styles.proCard]}>
      <View style={styles.subscriptionHeader}>
        <Text style={styles.cardTitle}>
          {isPro ? '👑 Pro Member' : '⭐ Free Plan'}
        </Text>
        {isPro && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>
      
      <View style={styles.featuresList}>
        <FeatureCheck label="Unlimited captures" active={isPro} />
        <FeatureCheck label="Unlimited AI usage" active={isPro} />
        <FeatureCheck label="Shared lists (up to 4 people)" active={isPro} />
        <FeatureCheck label="Advanced insights" active={isPro} />
        <FeatureCheck label="Export data" active={true} />
      </View>
      
      {!isPro && (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#FF6B35']}
            style={styles.upgradeGradient}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro - $2.99/mo</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {MOCK_USER.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
        {!user?.email_verified && (
          <View style={styles.unverifiedBadge}>
            <Ionicons name="warning" size={12} color="#FF9800" />
            <Text style={styles.unverifiedText}>Unverified</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {!user?.email_verified && (
          <EmailVerificationBanner 
            onPress={() => navigation.navigate('EmailVerification')} 
          />
        )}
        {renderStreakCard()}
        {renderAIUsageCard()}
        {renderPatternInsights()}
        {renderSubscriptionCard()}

        {/* Actions */}
        <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
          <Ionicons name="download-outline" size={20} color="#FF6B35" />
          <Text style={styles.actionButtonText}>Export My Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Help')}>
          <Ionicons name="help-circle-outline" size={20} color="#FF6B35" />
          <Text style={styles.actionButtonText}>Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#e94560" />
          <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CLAW v1.0.0</Text>
          <Text style={styles.footerSubtext}>Capture now. Strike later.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function FeatureCheck({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons 
        name={active ? "checkmark-circle" : "close-circle"} 
        size={18} 
        color={active ? '#4CAF50' : '#666'} 
      />
      <Text style={[styles.featureText, !active && styles.featureTextInactive]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    gap: 4,
  },
  unverifiedText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  proCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  streakBox: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  streakLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    backgroundColor: '#444',
  },
  milestonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  milestoneLocked: {
    borderColor: '#444',
    opacity: 0.6,
  },
  milestoneIcon: {
    fontSize: 16,
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  milestoneLabelLocked: {
    fontSize: 12,
    color: '#666',
  },
  aiUsageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiUsageBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  aiUsageFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiUsageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 40,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  upgradeBannerText: {
    fontSize: 13,
    color: '#FFD700',
    flex: 1,
  },
  aiResetText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  insightText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  insightHighlight: {
    color: '#FFD700',
    fontWeight: '600',
  },
  emptyInsightText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  proBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#1a1a2e',
    fontSize: 11,
    fontWeight: 'bold',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
  },
  featureTextInactive: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 15,
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  logoutText: {
    color: '#e94560',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
});
