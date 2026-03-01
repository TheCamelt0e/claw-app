/**
 * Streak Management Screen
 * 
 * Manage streak features:
 * - View current streak status
 * - Use streak freeze (1 per month)
 * - Use streak recovery (one-time)
 * - Place/cancel streak bets
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { usersAPI, StreakStatus, StreakBet } from '../api/client';

const REWARD_TIERS: Record<string, { icon: string; label: string; color: string }> = {
  'common_badge': { icon: '🥉', label: 'Bronze', color: '#CD7F32' },
  'rare_badge': { icon: '🥈', label: 'Silver', color: '#C0C0C0' },
  'epic_badge': { icon: '🥇', label: 'Gold', color: '#FFD700' },
  'legendary_badge': { icon: '💎', label: 'Platinum', color: '#E5E4E2' },
};

export default function StreakManagementScreen({ navigation }: any) {
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [betModalVisible, setBetModalVisible] = useState(false);
  const [betTarget, setBetTarget] = useState('5');
  const [betDays, setBetDays] = useState('5');

  useEffect(() => {
    loadStreakStatus();
  }, []);

  const loadStreakStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await usersAPI.getStreakStatus();
      setStreakStatus(status);
    } catch (error: any) {
      console.error('Failed to load streak status:', error);
      Alert.alert('Error', 'Failed to load streak status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUseFreeze = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Use Streak Freeze?',
      'This will protect your streak for today. You get 1 free freeze per month.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Freeze',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const result = await usersAPI.useStreakFreeze();
              Alert.alert('✅ Freeze Activated', result.message);
              await loadStreakStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to use freeze');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUseRecovery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Use Streak Recovery?',
      '⚠️ This can only be used ONCE ever! It will restore up to 7 days of a broken streak.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Recovery',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const result = await usersAPI.useStreakRecovery();
              Alert.alert('✅ Streak Recovered!', result.message);
              await loadStreakStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to use recovery');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePlaceBet = async () => {
    const target = parseInt(betTarget, 10);
    const days = parseInt(betDays, 10);

    if (isNaN(target) || target < 3 || target > 50) {
      Alert.alert('Invalid Target', 'Target strikes must be between 3 and 50');
      return;
    }
    if (isNaN(days) || days < 3 || days > 14) {
      Alert.alert('Invalid Days', 'Days must be between 3 and 14');
      return;
    }
    if (target > days * 3) {
      Alert.alert('Too Ambitious!', 'Maximum 3 strikes per day allowed');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBetModalVisible(false);

    try {
      setActionLoading(true);
      const result = await usersAPI.placeStreakBet(target, days);
      Alert.alert('✅ Bet Placed!', result.message);
      await loadStreakStatus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place bet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBet = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Cancel Bet?',
      'You will lose all progress on your current bet. Are you sure?',
      [
        { text: 'Keep Bet', style: 'cancel' },
        {
          text: 'Cancel Bet',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const result = await usersAPI.cancelStreakBet();
              Alert.alert('Bet Cancelled', result.message);
              await loadStreakStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel bet');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderStreakHeader = () => (
    <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.header}>
      <View style={styles.streakIconContainer}>
        <Text style={styles.streakIcon}>🔥</Text>
      </View>
      <Text style={styles.streakNumber}>{streakStatus?.current_streak || 0}</Text>
      <Text style={styles.streakLabel}>day streak</Text>
      <Text style={styles.longestStreak}>
        Best: {streakStatus?.longest_streak || 0} days
      </Text>
      {streakStatus?.streak_expires_at && (
        <Text style={styles.expiresText}>
          Expires: {new Date(streakStatus.streak_expires_at).toLocaleDateString()}
        </Text>
      )}
    </LinearGradient>
  );

  const renderFreezeCard = () => {
    const freezesAvailable = streakStatus?.streak_freezes_available || 0;
    const canUseFreeze = freezesAvailable > 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>❄️</Text>
          <Text style={styles.cardTitle}>Streak Freeze</Text>
        </View>
        <Text style={styles.cardDescription}>
          Protect your streak when you can't strike. 1 free freeze per month.
        </Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Available:</Text>
          <Text style={[styles.statusValue, freezesAvailable > 0 ? styles.statusGood : styles.statusBad]}>
            {freezesAvailable} freeze{freezesAvailable !== 1 ? 's' : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, !canUseFreeze && styles.actionButtonDisabled]}
          onPress={handleUseFreeze}
          disabled={!canUseFreeze || actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="snow" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>
                Use Freeze
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecoveryCard = () => {
    const recoveryAvailable = streakStatus?.streak_recovery_available ?? false;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🆘</Text>
          <Text style={styles.cardTitle}>Streak Recovery</Text>
        </View>
        <Text style={styles.cardDescription}>
          One-time emergency recovery. Restores up to 7 days of a broken streak.
        </Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[
            styles.statusValue,
            recoveryAvailable ? styles.statusGood : styles.statusBad
          ]}>
            {recoveryAvailable ? '✅ Available' : '❌ Already Used'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.recoveryButton, !recoveryAvailable && styles.actionButtonDisabled]}
          onPress={handleUseRecovery}
          disabled={!recoveryAvailable || actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>
                {recoveryAvailable ? 'Use Recovery' : 'Already Used'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderBetCard = () => {
    const activeBet = streakStatus?.active_bet;

    if (activeBet && activeBet.status === 'active') {
      const rewardTier = REWARD_TIERS[activeBet.reward] || REWARD_TIERS.common_badge;
      const progress = (activeBet.current_strikes / activeBet.target_strikes) * 100;
      const daysRemaining = Math.ceil((new Date(activeBet.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return (
        <View style={[styles.card, styles.activeBetCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={styles.cardTitle}>Active Bet</Text>
            <View style={[styles.rewardBadge, { backgroundColor: rewardTier.color }]}>
              <Text style={styles.rewardBadgeText}>{rewardTier.icon} {rewardTier.label}</Text>
            </View>
          </View>

          <View style={styles.betTargetRow}>
            <View style={styles.betTargetItem}>
              <Text style={styles.betTargetNumber}>{activeBet.target_strikes}</Text>
              <Text style={styles.betTargetLabel}>Target Strikes</Text>
            </View>
            <Text style={styles.betDivider}>in</Text>
            <View style={styles.betTargetItem}>
              <Text style={styles.betTargetNumber}>{Math.max(0, daysRemaining)}</Text>
              <Text style={styles.betTargetLabel}>Days Left</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: rewardTier.color }]} />
            </View>
            <Text style={styles.progressText}>
              {activeBet.current_strikes}/{activeBet.target_strikes} ({Math.round(progress)}%)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBet}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel Bet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🎯</Text>
          <Text style={styles.cardTitle}>Streak Bet</Text>
        </View>
        <Text style={styles.cardDescription}>
          Bet on achieving strikes in a timeframe. Earn badges based on difficulty!
        </Text>

        <View style={styles.rewardTiersRow}>
          {Object.entries(REWARD_TIERS).map(([key, tier]) => (
            <View key={key} style={styles.tierBadge}>
              <Text style={styles.tierIcon}>{tier.icon}</Text>
              <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setBetModalVisible(true)}
          disabled={actionLoading}
        >
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Place a Bet</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBetModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={betModalVisible}
      onRequestClose={() => setBetModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🎯 Place a Bet</Text>
          <Text style={styles.modalSubtitle}>Challenge yourself to strike consistently!</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Strikes</Text>
              <TextInput
                style={styles.input}
                value={betTarget}
                onChangeText={setBetTarget}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="5"
              />
              <Text style={styles.inputHint}>3-50 strikes</Text>
            </View>

            <Text style={styles.inputDivider}>in</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Days</Text>
              <TextInput
                style={styles.input}
                value={betDays}
                onChangeText={setBetDays}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="5"
              />
              <Text style={styles.inputHint}>3-14 days</Text>
            </View>
          </View>

          <View style={styles.rewardPreview}>
            <Text style={styles.rewardPreviewLabel}>Potential Reward:</Text>
            {parseInt(betTarget) / parseInt(betDays) >= 2 ? (
              <Text style={styles.rewardPreviewValue}>💎 Platinum (2+ strikes/day)</Text>
            ) : parseInt(betTarget) / parseInt(betDays) >= 1.5 ? (
              <Text style={styles.rewardPreviewValue}>🥇 Gold (1.5+ strikes/day)</Text>
            ) : parseInt(betTarget) / parseInt(betDays) >= 1 ? (
              <Text style={styles.rewardPreviewValue}>🥈 Silver (1+ strike/day)</Text>
            ) : (
              <Text style={styles.rewardPreviewValue}>🥉 Bronze (&lt;1 strike/day)</Text>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setBetModalVisible(false)}
            >
              <Text style={styles.modalButtonCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={handlePlaceBet}
            >
              <Text style={styles.modalButtonConfirmText}>Place Bet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading streak status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streak Management</Text>
        <TouchableOpacity onPress={loadStreakStatus} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStreakHeader()}
        
        <View style={styles.content}>
          {renderFreezeCard()}
          {renderRecoveryCard()}
          {renderBetCard()}
        </View>
      </ScrollView>

      {renderBetModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  streakIconContainer: {
    position: 'relative',
  },
  streakIcon: {
    fontSize: 64,
  },
  freezeBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  freezeBadgeText: {
    fontSize: 16,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  longestStreak: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  expiresText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
  },
  activeBetCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#888',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusGood: {
    color: '#4CAF50',
  },
  statusBad: {
    color: '#e94560',
  },
  statusFrozen: {
    color: '#64B5F6',
  },
  statusActive: {
    color: '#FF6B35',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#444',
  },
  recoveryButton: {
    backgroundColor: '#e94560',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rewardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardBadgeText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  betTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  betTargetItem: {
    alignItems: 'center',
  },
  betTargetNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  betTargetLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  betDivider: {
    fontSize: 18,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  rewardTiersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  tierBadge: {
    alignItems: 'center',
  },
  tierIcon: {
    fontSize: 20,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2d2d44',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  inputGroup: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    width: 80,
    height: 60,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  inputDivider: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  rewardPreview: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  rewardPreviewLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  rewardPreviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF6B35',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
