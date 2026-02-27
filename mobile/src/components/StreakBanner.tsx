/**
 * Streak Banner - In-App Loss Aversion
 * 
 * Shows at the top of Strike screen when user's streak is at risk.
 * Escalating urgency based on time until midnight UTC.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeUntilExpiry } from '../service/streakGuardian';

interface StreakBannerProps {
  streakDays: number;
  hoursUntilExpiry: number;
  onStrikeNow?: () => void;
}

export default function StreakBanner({ 
  streakDays, 
  hoursUntilExpiry, 
  onStrikeNow 
}: StreakBannerProps) {
  
  // Don't show if no streak or plenty of time
  if (streakDays === 0 || hoursUntilExpiry > 8) {
    return null;
  }
  
  // Determine urgency level
  const getUrgency = () => {
    if (hoursUntilExpiry <= 1) return 'critical';
    if (hoursUntilExpiry <= 4) return 'urgent';
    return 'gentle';
  };
  
  const urgency = getUrgency();
  
  const getStyles = () => {
    switch (urgency) {
      case 'critical':
        return {
          container: styles.criticalContainer,
          icon: 'flame' as const,
          iconColor: '#e94560',
          pulse: true,
        };
      case 'urgent':
        return {
          container: styles.urgentContainer,
          icon: 'time' as const,
          iconColor: '#FFD700',
          pulse: false,
        };
      default:
        return {
          container: styles.gentleContainer,
          icon: 'sunny' as const,
          iconColor: '#4CAF50',
          pulse: false,
        };
    }
  };
  
  const styleConfig = getStyles();
  
  const getMessage = () => {
    switch (urgency) {
      case 'critical':
        return `🔥 ${streakDays}-day streak expires in ${formatTimeUntilExpiry(hoursUntilExpiry)}!`;
      case 'urgent':
        return `⏰ Don't lose your ${streakDays}-day streak! ${formatTimeUntilExpiry(hoursUntilExpiry)} remaining.`;
      default:
        return `💪 Keep your ${streakDays}-day streak alive! Strike something today.`;
    }
  };
  
  const getSubtext = () => {
    switch (urgency) {
      case 'critical':
        return 'Strike NOW or lose it all!';
      case 'urgent':
        return 'Just one strike keeps your streak going.';
      default:
        return 'You\'ve got time, but don\'t forget!';
    }
  };

  return (
    <View style={[styles.container, styleConfig.container]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={styleConfig.icon} 
          size={28} 
          color={styleConfig.iconColor}
          style={styleConfig.pulse && styles.pulseIcon}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.message}>{getMessage()}</Text>
        <Text style={styles.subtext}>{getSubtext()}</Text>
      </View>
      
      {urgency !== 'gentle' && (
        <TouchableOpacity 
          style={styles.strikeButton}
          onPress={onStrikeNow}
          activeOpacity={0.8}
        >
          <Text style={styles.strikeButtonText}>Strike!</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  criticalContainer: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    borderLeftColor: '#e94560',
  },
  urgentContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderLeftColor: '#FFD700',
  },
  gentleContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderLeftColor: '#4CAF50',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pulseIcon: {
    transform: [{ scale: 1 }],
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  subtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  strikeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 12,
  },
  strikeButtonText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
