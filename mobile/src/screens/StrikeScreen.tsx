/**
 * Strike Screen - Complete your intentions
 * Using CLAW Design System
 */
import React, { useEffect, useState } from 'react';
import OracleMoment from '../components/OracleMoment';
import OracleChestModal from '../components/OracleChestModal';
import StreakBanner from '../components/StreakBanner';
import { initializeStreakGuardian, onStrikeOccurred } from '../service/streakGuardian';
import { rollOracleChest, OracleReward, getActiveMultiplier } from '../service/oracleChest';
import { checkGoldenHourStatus, recordGoldenHourStrike } from '../service/goldenHour';
import { GoldenHourBanner } from '../components/GoldenHourBanner';
import { playVocab, getContextualStrikeHaptic } from '../utils/haptics';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClawStore } from '../store/clawStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { formatDistanceToNow } from '../utils/dateUtils';
import { requestGeofencePermissions, startGeofencing } from '../service/geofence';
import { 
  getSmartSurface, 
  SmartSurfaceItem, 
  getScoreColor, 
  getScoreLabel,
  formatPatterns,
  UserPatterns,
  getUserPatterns
} from '../service/smartSurface';
import { EmptyState, SkeletonList } from '../components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

export default function StrikeScreen({ navigation }: any) {
  const { activeClaws, fetchActiveClaws, strikeClaw, isLoading } = useClawStore();
  const {
    suggestions,
    fetchSuggestions,
    setAlarm,
    addToCalendar,
    checkAllNotifications,
    locationEnabled,
  } = useNotificationsStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAlarmPicker, setShowAlarmPicker] = useState<string | null>(null);
  const [geofenceActive, setGeofenceActive] = useState(false);
  
  // Smart Surface (CLAW 3.0)
  const [smartClaws, setSmartClaws] = useState<SmartSurfaceItem[]>([]);
  const [patterns, setPatterns] = useState<UserPatterns | null>(null);
  const [useSmartOrder, setUseSmartOrder] = useState(true);
  
  // Oracle Moment (Dopamine hit)
  const [showOracle, setShowOracle] = useState(false);
  const [oracleItem, setOracleItem] = useState<SmartSurfaceItem | null>(null);
  
  // Oracle Chest (Variable Reward)
  const [showOracleChest, setShowOracleChest] = useState(false);
  const [oracleReward, setOracleReward] = useState<OracleReward | null>(null);
  const [isPityReward, setIsPityReward] = useState(false);
  const [activeStreakMultiplier, setActiveStreakMultiplier] = useState(1);
  
  // Golden Hour
  const [goldenHourActive, setGoldenHourActive] = useState(false);
  const [goldenHourTimeRemaining, setGoldenHourTimeRemaining] = useState(0);
  const [nextGoldenHour, setNextGoldenHour] = useState<Date | null>(null);
  
  // Streak data
  const [streakDays, setStreakDays] = useState(5);
  const [hoursUntilExpiry, setHoursUntilExpiry] = useState(12);
  const [showStreakBanner, setShowStreakBanner] = useState(true);
  
  // Check Golden Hour on mount and periodically
  useEffect(() => {
    checkGoldenHour();
    const interval = setInterval(checkGoldenHour, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const checkGoldenHour = async () => {
    const status = await checkGoldenHourStatus();
    setGoldenHourActive(status.isActive);
    setGoldenHourTimeRemaining(status.timeRemaining);
    setNextGoldenHour(status.nextGoldenHour);
  };

  const enableLocationAlerts = async () => {
    try {
      const granted = await requestGeofencePermissions();
      if (granted) {
        const started = await startGeofencing();
        setGeofenceActive(true);
        await refreshSuggestions();
        alert('✅ Location alerts enabled!\n\nYou\'ll now get notified when near Bónus, Krónan, and other stores.');
      } else {
        alert('❌ Permission denied\n\nPlease enable location permissions in Settings to get store alerts.');
      }
    } catch (error) {
      console.error('[Strike] Error enabling location:', error);
      alert('❌ Error enabling location alerts. Please try again.');
    }
  };

  // Load smart surface data
  const loadSmartSurface = async () => {
    const [claws, userPatterns] = await Promise.all([
      getSmartSurface(true, 20),
      getUserPatterns()
    ]);
    setSmartClaws(claws);
    setPatterns(userPatterns);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchActiveClaws();
      await refreshSuggestions();
      await checkAllNotifications();
      await loadSmartSurface();
      
      initializeStreakGuardian({
        currentStreak: streakDays,
        longestStreak: 12,
        lastStrikeDate: new Date().toISOString(),
        streakExpiresAt: new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000).toISOString(),
      });
    };
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActiveClaws(),
      refreshSuggestions(),
      checkAllNotifications(),
      loadSmartSurface(),
    ]);
    setRefreshing(false);
  };

  const handleStrike = async (id: string) => {
    try {
      const item = smartClaws.find(c => c.id === id) || activeClaws.find(c => c.id === id);
      
      const isVip = item && 'resurface_score' in item && (item as SmartSurfaceItem).resurface_score > 0.8;
      const hapticType = goldenHourActive || streakDays >= 7 ? 'strikeSatisfying' 
        : isVip ? 'vipUnlock' 
        : 'strike';
      playVocab(hapticType).catch(() => {});
      
      if (item && 'resurface_score' in item && (item as SmartSurfaceItem).resurface_score! > 0.7) {
        setOracleItem(item as SmartSurfaceItem);
        setShowOracle(true);
      }
      
      await strikeClaw(id);
      
      if (goldenHourActive) {
        await recordGoldenHourStrike(10);
      }
      
      try {
        const { reward, isPityReward: pity, chestState } = await rollOracleChest(streakDays);
        
        if (reward) {
          setOracleReward(reward);
          setIsPityReward(pity);
          setActiveStreakMultiplier(chestState.activeMultiplier);
          
          setTimeout(() => {
            setShowOracleChest(true);
          }, 500);
        }
      } catch (chestError) {
        console.error('[Strike] Oracle Chest error:', chestError);
      }
      
      await onStrikeOccurred();
      setShowStreakBanner(false);
    } catch (error) {
      console.error('[Strike] Error:', error);
      alert('Failed to strike item. Please try again.');
    }
  };

  const handleSetAlarm = async (clawId: string, hoursFromNow: number) => {
    try {
      const alarmDate = new Date();
      alarmDate.setHours(alarmDate.getHours() + hoursFromNow);
      await setAlarm(clawId, alarmDate);
      setShowAlarmPicker(null);
      alert(`⏰ Reminder set for ${hoursFromNow} hours from now`);
    } catch (error) {
      console.error('[Strike] Alarm error:', error);
      alert('Failed to set reminder. Please try again.');
    }
  };

  const handleAddToCalendar = async (clawId: string) => {
    try {
      await addToCalendar(clawId);
      alert('📅 Added to calendar');
    } catch (error) {
      console.error('[Strike] Calendar error:', error);
      alert('Failed to add to calendar. Please try again.');
    }
  };

  // Filter for store-related items
  const storeItems = activeClaws.filter(
    (item) =>
      item.category?.toLowerCase().includes('shopping') ||
      item.category?.toLowerCase().includes('groceries') ||
      item.category?.toLowerCase().includes('bonus') ||
      item.category?.toLowerCase().includes('kronan') ||
      item.content.toLowerCase().includes('buy') ||
      item.content.toLowerCase().includes('shop') ||
      item.content.toLowerCase().includes('get')
  );

  const otherItems = activeClaws.filter((item) => !storeItems.includes(item));

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚡ Strike</Text>
          <Text style={styles.headerSubtitle}>Loading...</Text>
        </View>
        <SkeletonList count={5} style={styles.skeletonContainer} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Strike</Text>
        <Text style={styles.headerSubtitle}>
          {activeClaws.length} active intentions
        </Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        {/* Golden Hour Banner */}
        {goldenHourActive && (
          <GoldenHourBanner
            timeRemaining={goldenHourTimeRemaining}
            onPress={() => console.log('[Strike] Golden Hour pressed')}
          />
        )}
        
        {/* Streak Guardian Banner */}
        {showStreakBanner && !goldenHourActive && (
          <StreakBanner 
            streakDays={streakDays}
            hoursUntilExpiry={hoursUntilExpiry}
            onStrikeNow={() => console.log('[Strike] Strike now pressed')}
          />
        )}

        {/* Smart Suggestions Section */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>💡 Smart Suggestions</Text>
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                style={styles.suggestionCard}
                onPress={() => {
                  if (suggestion.action === 'capture') {
                    navigation.jumpTo?.('Capture') || navigation.navigate('Capture');
                  } else if (suggestion.action === 'vault') {
                    navigation.jumpTo?.('Vault') || navigation.navigate('Vault');
                  } else if (suggestion.action === 'strike') {
                    onRefresh();
                  }
                }}
              >
                <View style={styles.suggestionIcon}>
                  <Text style={styles.suggestionEmoji}>
                    {suggestion.type === 'time' && '⏰'}
                    {suggestion.type === 'location' && '📍'}
                    {suggestion.type === 'pattern' && '🧠'}
                    {suggestion.type === 'onboarding' && '💡'}
                  </Text>
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionMessage}>
                    {suggestion.message}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Enable Location Banner */}
        {locationEnabled === false && storeItems.length > 0 && (
          <TouchableOpacity 
            style={styles.enableLocationBanner}
            onPress={enableLocationAlerts}
          >
            <Ionicons name="location-outline" size={28} color={colors.text.primary} />
            <View style={styles.enableLocationText}>
              <Text style={styles.enableLocationTitle}>
                🔔 Enable Location Alerts
              </Text>
              <Text style={styles.enableLocationSubtitle}>
                Get notified when near Bónus, Krónan & other stores
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        )}

        {/* Store Alert Banner */}
        {storeItems.length > 0 && locationEnabled !== false && (
          <View style={[styles.storeBanner, geofenceActive && styles.storeBannerActive]}>
            <Ionicons name={geofenceActive ? "notifications" : "location"} size={24} color={colors.gold.DEFAULT} />
            <View style={styles.storeBannerText}>
              <Text style={styles.storeBannerTitle}>
                🛒 {storeItems.length} shopping items ready
              </Text>
              <Text style={styles.storeBannerSubtitle}>
                {geofenceActive 
                  ? "✅ Location alerts active - we'll notify you near stores!"
                  : "⏳ Starting location alerts..."}
              </Text>
            </View>
            {!geofenceActive && (
              <TouchableOpacity onPress={enableLocationAlerts}>
                <Ionicons name="refresh" size={20} color={colors.gold.DEFAULT} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Smart Surface Toggle */}
        <View style={styles.smartToggleContainer}>
          <TouchableOpacity
            style={[styles.smartToggle, useSmartOrder && styles.smartToggleActive]}
            onPress={() => setUseSmartOrder(!useSmartOrder)}
          >
            <Ionicons 
              name={useSmartOrder ? "sparkles" : "sparkles-outline"} 
              size={18} 
              color={useSmartOrder ? colors.gold.DEFAULT : colors.text.muted} 
            />
            <Text style={[styles.smartToggleText, useSmartOrder && styles.smartToggleTextActive]}>
              {useSmartOrder ? '🧠 Smart Order: ON' : 'Smart Order: OFF'}
            </Text>
          </TouchableOpacity>
          
          {patterns && patterns.total_recorded > 0 && (
            <Text style={styles.patternsText}>
              {formatPatterns(patterns)}
            </Text>
          )}
        </View>

        {/* Smart Surface Section (CLAW 3.0) */}
        {useSmartOrder && smartClaws.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Smart Strike Order</Text>
            <Text style={styles.sectionSubtitle}>
              Based on when you typically complete these
            </Text>
            {smartClaws.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                {/* Score Badge */}
                <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.resurface_score) }]}>
                  <Text style={styles.scoreText}>{Math.round(item.resurface_score * 100)}%</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.strikeButton}
                  onPress={() => handleStrike(item.id)}
                >
                  <View style={styles.checkbox}>
                    <Ionicons name="checkmark" size={20} color={colors.background.DEFAULT} />
                  </View>
                </TouchableOpacity>
                
                <View style={styles.itemContent}>
                  <Text style={styles.itemText}>{item.content}</Text>
                  <Text style={styles.itemMeta}>
                    {item.resurface_reason}
                  </Text>
                  <Text style={[styles.scoreLabel, { color: getScoreColor(item.resurface_score) }]}>
                    {getScoreLabel(item.resurface_score)}
                  </Text>
                </View>
                
                {index === 0 && (
                  <View style={styles.topPickBadge}>
                    <Text style={styles.topPickText}>TOP PICK</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Shopping List Section */}
        {storeItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛒 Shopping List</Text>
            {storeItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.strikeButton}
                  onPress={() => handleStrike(item.id)}
                >
                  <View style={styles.checkbox}>
                    <Ionicons name="checkmark" size={20} color={colors.background.DEFAULT} />
                  </View>
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={styles.itemText}>{item.content}</Text>
                  <Text style={styles.itemMeta}>
                    Expires {formatDistanceToNow(item.expires_at)} •{' '}
                    {item.category || 'Uncategorized'}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowAlarmPicker(showAlarmPicker === item.id ? null : item.id)}
                  >
                    <Ionicons name="alarm" size={20} color={colors.gold.DEFAULT} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddToCalendar(item.id)}
                  >
                    <Ionicons name="calendar" size={20} color={colors.success.DEFAULT} />
                  </TouchableOpacity>
                </View>

                {/* Alarm Picker Dropdown */}
                {showAlarmPicker === item.id && (
                  <View style={styles.alarmPicker}>
                    <Text style={styles.alarmPickerTitle}>Set Reminder:</Text>
                    <View style={styles.alarmOptions}>
                      {[1, 2, 4, 8, 24].map((hours) => (
                        <TouchableOpacity
                          key={hours}
                          style={styles.alarmOption}
                          onPress={() => handleSetAlarm(item.id, hours)}
                        >
                          <Text style={styles.alarmOptionText}>
                            {hours < 24 ? `${hours}h` : '1 day'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Other Tasks Section */}
        {otherItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Tasks</Text>
            {otherItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.strikeButton}
                  onPress={() => handleStrike(item.id)}
                >
                  <View style={styles.checkbox}>
                    <Ionicons name="checkmark" size={20} color={colors.background.DEFAULT} />
                  </View>
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={styles.itemText}>{item.content}</Text>
                  <Text style={styles.itemMeta}>
                    Expires {formatDistanceToNow(item.expires_at)} •{' '}
                    {item.category || 'Uncategorized'}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowAlarmPicker(showAlarmPicker === item.id ? null : item.id)}
                  >
                    <Ionicons name="alarm" size={20} color={colors.gold.DEFAULT} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleAddToCalendar(item.id)}
                  >
                    <Ionicons name="calendar" size={20} color={colors.success.DEFAULT} />
                  </TouchableOpacity>
                </View>

                {/* Alarm Picker Dropdown */}
                {showAlarmPicker === item.id && (
                  <View style={styles.alarmPicker}>
                    <Text style={styles.alarmPickerTitle}>Set Reminder:</Text>
                    <View style={styles.alarmOptions}>
                      {[1, 2, 4, 8, 24].map((hours) => (
                        <TouchableOpacity
                          key={hours}
                          style={styles.alarmOption}
                          onPress={() => handleSetAlarm(item.id, hours)}
                        >
                          <Text style={styles.alarmOptionText}>
                            {hours < 24 ? `${hours}h` : '1 day'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {activeClaws.length === 0 && !isLoading && (
          <EmptyState
            icon="checkmark-done"
            title="All caught up!"
            message="You have no active intentions. Go to Capture to add some."
            action={{
              title: 'Capture Something',
              onPress: () => navigation.navigate('Capture')
            }}
          />
        )}

        {/* Bottom Padding */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Oracle Moment - AI Prediction Celebration */}
      <OracleMoment
        visible={showOracle}
        item={oracleItem}
        streakDays={streakDays}
        onClose={() => setShowOracle(false)}
      />
      
      {/* Oracle Chest - Variable Reward Modal */}
      <OracleChestModal
        visible={showOracleChest}
        reward={oracleReward}
        isPityReward={isPityReward}
        onClose={() => {
          setShowOracleChest(false);
          setOracleReward(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.DEFAULT,
  },
  headerTitle: {
    ...typography.presets.h1,
  },
  headerSubtitle: {
    ...typography.presets.bodySmall,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  suggestionsSection: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.presets.h4,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.presets.bodySmall,
    marginBottom: spacing.md,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold.DEFAULT,
    ...shadows.sm,
  },
  suggestionIcon: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  suggestionEmoji: {
    fontSize: 20,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    ...typography.presets.body,
    fontWeight: typography.weight.semibold,
  },
  suggestionMessage: {
    ...typography.presets.bodySmall,
    marginTop: spacing.xs,
  },
  enableLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  enableLocationText: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  enableLocationTitle: {
    ...typography.presets.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  enableLocationSubtitle: {
    ...typography.presets.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  storeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  storeBannerActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: colors.success.DEFAULT,
  },
  storeBannerText: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  storeBannerTitle: {
    ...typography.presets.body,
    fontWeight: typography.weight.semibold,
  },
  storeBannerSubtitle: {
    ...typography.presets.bodySmall,
    marginTop: spacing.xs,
  },
  smartToggleContainer: {
    marginBottom: spacing.lg,
  },
  smartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.pressed,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  smartToggleActive: {
    backgroundColor: colors.gold.muted,
    borderWidth: 1,
    borderColor: colors.gold.DEFAULT,
  },
  smartToggleText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  smartToggleTextActive: {
    color: colors.gold.DEFAULT,
  },
  patternsText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  scoreBadge: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  scoreText: {
    color: colors.background.DEFAULT,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  strikeButton: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: spacing.xl + spacing.sm,
    height: spacing.xl + spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface.pressed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    ...typography.presets.body,
    fontSize: typography.size.base,
  },
  itemMeta: {
    ...typography.presets.caption,
    marginTop: spacing.xs,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: spacing['3xl'],
    height: spacing['3xl'],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmPicker: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing['5xl'],
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    zIndex: 100,
    ...shadows.lg,
    minWidth: 150,
  },
  alarmPickerTitle: {
    ...typography.presets.caption,
    marginBottom: spacing.sm,
  },
  alarmOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alarmOption: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  alarmOptionText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
  },
  scoreLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xs,
  },
  topPickBadge: {
    position: 'absolute',
    top: -spacing.sm,
    right: spacing.md,
    backgroundColor: colors.gold.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  topPickText: {
    color: colors.text.inverse,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  skeletonContainer: {
    padding: spacing.lg,
  },
});
