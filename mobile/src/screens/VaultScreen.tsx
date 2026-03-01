/**
 * Vault Screen - All your captured intentions
 * Using CLAW Design System
 */
import React, { useEffect, useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useClawStore } from '../store/clawStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { formatRelativeTime, formatDistanceToNow } from '../utils/dateUtils';
import { isVipClaw, getVipBadgeText, cleanVipTitle } from '../utils/vip';
import ActionSheet from '../components/ActionSheet';
import DarkAlert from '../components/DarkAlert';
import ArchaeologistModal from '../components/ArchaeologistModal';
import WeeklyReviewModal from '../components/WeeklyReviewModal';
import { EmptyState } from '../components/ui';
import { Claw } from '../store/clawStore';
import { achievementEngine } from '../achievements/AchievementEngine';
import { weeklyReview, WeeklyReview } from '../analytics/WeeklyReview';
import { 
  shouldShowArchaeologist, 
  getSomedayItemsForArchaeologist,
  recordArchaeologistShown,
  activateItem,
  buryItem,
  dismissItemForMonth,
  dismissAllItems,
} from '../service/archaeologist';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const FILTERS = [
  { key: 'active', label: 'Active', icon: 'flash' as const, color: colors.primary.DEFAULT },
  { key: 'completed', label: 'Struck', icon: 'checkmark-done' as const, color: colors.success.DEFAULT },
  { key: 'expired', label: 'Expired', icon: 'time' as const, color: colors.text.muted },
  { key: 'someday', label: 'Someday', icon: 'bookmark' as const, color: colors.someday.DEFAULT },
];

const CATEGORY_ICONS: Record<string, string> = {
  book: 'book-outline',
  movie: 'film-outline',
  restaurant: 'restaurant-outline',
  product: 'cart-outline',
  task: 'checkbox-outline',
  idea: 'bulb-outline',
  someday: 'bookmark-outline',
};

// Memoized Claw Card Component for performance
interface ClawCardProps {
  item: Claw;
  activeFilter: string;
  onMoreOptions: (item: Claw) => void;
}

const ClawCard = memo(({ item, activeFilter, onMoreOptions }: ClawCardProps) => {
  const isVip = isVipClaw(item);
  const badgeText = getVipBadgeText(item);
  const displayTitle = cleanVipTitle(item.title) || item.content;
  
  const getCategoryIcon = (category?: string) => {
    return CATEGORY_ICONS[category || ''] || 'document-text';
  };
  
  const handlePress = useCallback(async () => {
    try {
      await onMoreOptions(item);
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('Error', 'Could not perform action');
    }
  }, [item, onMoreOptions]);
  
  return (
    <View style={[
      styles.clawCard,
      isVip && styles.vipClawCard
    ]}>
      {/* VIP Badge - Absolute positioned */}
      {isVip && (
        <View style={styles.vipBadgeContainer}>
          <Text style={styles.vipBadgeText}>{badgeText}</Text>
        </View>
      )}
      
      <View style={[
        styles.iconContainer,
        isVip && styles.vipIconContainer
      ]}>
        {isVip ? (
          <Ionicons name="flame" size={28} color={colors.text.inverse} />
        ) : (
          <Ionicons
            name={getCategoryIcon(item.category) as any}
            size={24}
            color={colors.primary.DEFAULT}
          />
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={[
            styles.clawTitle, 
            isVip && styles.vipClawTitle
          ]} numberOfLines={2}>
            {displayTitle}
          </Text>
        </View>
        
        <View style={styles.metaRow}>
          {item.category && (
            <View style={[
              styles.categoryBadge,
              isVip && styles.vipCategoryBadge
            ]}>
              <Text style={[
                styles.categoryText,
                isVip && styles.vipCategoryText
              ]}>{item.category}</Text>
            </View>
          )}
          <Text style={styles.timeText}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        
        {activeFilter === 'active' && (
          <Text style={[
            styles.expiryText,
            isVip && styles.vipExpiryText
          ]}>
            {isVip ? '🔥 ' : ''}Expires {formatDistanceToNow(item.expires_at)}
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.moreButton} 
        activeOpacity={0.7}
        onPress={handlePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name="ellipsis-vertical" 
          size={20} 
          color={isVip ? colors.gold.DEFAULT : colors.text.muted} 
        />
      </TouchableOpacity>
    </View>
  );
});

export default function VaultScreen() {
  const [activeFilter, setActiveFilter] = useState('active');
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { claws, fetchClaws, isLoading, error, clearError, strikeClaw, releaseClaw, extendClaw } = useClawStore();
  const { setAlarm } = useNotificationsStore();
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [showRecurringPicker, setShowRecurringPicker] = useState(false);
  
  // Archaeologist (Someday Pile) state
  const [showArchaeologist, setShowArchaeologist] = useState(false);
  const [archaeologistItems, setArchaeologistItems] = useState<any[]>([]);

  // Weekly Review state
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [weeklyReviewData, setWeeklyReviewData] = useState<WeeklyReview | null>(null);

  useEffect(() => {
    fetchClaws(activeFilter);
    checkWeeklyReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, fetchClaws]);

  const checkWeeklyReview = async () => {
    const shouldShow = await weeklyReview.shouldShowReview();
    if (shouldShow) {
      const review = await weeklyReview.generateReview();
      setWeeklyReviewData(review);
      setShowWeeklyReview(true);
    }
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error]);
  
  // Check if we should show the Archaeologist (monthly Someday resurfacing)
  useEffect(() => {
    const checkArchaeologist = async () => {
      const shouldShow = await shouldShowArchaeologist();
      if (shouldShow) {
        const items = await getSomedayItemsForArchaeologist();
        if (items.length > 0) {
          setArchaeologistItems(items);
          setShowArchaeologist(true);
          await recordArchaeologistShown();
        }
      }
    };
    checkArchaeologist();
  }, []);

  const handleMoreOptions = useCallback((item: any) => {
    setSelectedItem(item);
    setActionSheetVisible(true);
  }, []);

  const handleCloseActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedItem(null);
  };

  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleExtend = async (days: number) => {
    if (!selectedItem || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await extendClaw(selectedItem.id, days);
      setActionSheetVisible(false);
      Alert.alert('✓ Extended', `Added ${days} days to this item`);
    } catch (error) {
      Alert.alert('Error', 'Could not extend item');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStrike = async () => {
    if (!selectedItem || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await strikeClaw(selectedItem.id);
      
      // Track achievement
      const unlocked = await achievementEngine.recordStrike(selectedItem.category, selectedItem.is_vip);
      if (unlocked.length > 0) {
        Alert.alert(
          '🏆 Achievement Unlocked!',
          unlocked.map(a => `${a.icon} ${a.name}`).join('\n')
        );
      }
      
      setActionSheetVisible(false);
      Alert.alert('✓ Struck!', 'Item marked as complete');
    } catch (error) {
      Alert.alert('Error', 'Could not strike item');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedItem || isActionLoading) return;
    setActionSheetVisible(false);
    Alert.alert(
      'Delete Item?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await releaseClaw(selectedItem.id);
              Alert.alert('✓ Deleted', 'Item removed from vault');
            } catch (error) {
              Alert.alert('Error', 'Could not delete item');
            }
          }
        },
      ]
    );
  };

  const handleSetAlarm = async (hours: number) => {
    if (!selectedItem) return;
    try {
      const alarmDate = new Date();
      alarmDate.setHours(alarmDate.getHours() + hours);
      await setAlarm(selectedItem.id, alarmDate);
      Alert.alert('✓ Alarm Set', `Reminder set for ${hours} hours from now`);
    } catch (error) {
      Alert.alert('Error', 'Could not set alarm');
    }
  };

  const handleSetDeadline = async (days: number) => {
    if (!selectedItem) return;
    try {
      await extendClaw(selectedItem.id, days);
      Alert.alert('✓ Deadline Set', `New deadline: ${days} days`);
    } catch (error) {
      Alert.alert('Error', 'Could not set deadline');
    }
  };

  const getActionSheetOptions = () => {
    const isVip = selectedItem && isVipClaw(selectedItem);
    
    const options: any[] = [];

    // VIP-specific options first
    if (isVip && activeFilter === 'active') {
      options.push(
        { 
          text: '🔥 VIP: Configure Deadline', 
          onPress: () => setShowDeadlinePicker(true),
          icon: 'time-outline',
        },
        { 
          text: '⏰ VIP: Set Alarm', 
          onPress: () => setShowAlarmPicker(true),
          icon: 'alarm-outline',
        },
        { 
          text: '🔔 VIP: Recurring Reminders', 
          onPress: () => setShowRecurringPicker(true),
          icon: 'repeat-outline',
        }
      );
    }

    // Standard options
    options.push(
      { 
        text: 'Extend 7 days', 
        onPress: () => handleExtend(7),
        icon: 'time-outline',
      },
      { 
        text: 'Extend 30 days', 
        onPress: () => handleExtend(30),
        icon: 'calendar-outline',
      }
    );

    if (activeFilter === 'active') {
      options.push({ 
        text: 'Strike (Complete)', 
        onPress: handleStrike,
        icon: 'checkmark-circle-outline',
      });
    }

    options.push({ 
      text: 'Delete', 
      onPress: handleDelete,
      destructive: true,
      icon: 'trash-outline',
    });

    return options;
  };

  return (
    <LinearGradient colors={[...colors.gradient.background]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Vault</Text>
        <Text style={styles.headerSubtitle}>{claws.length} items</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filter.icon}
              size={18}
              color={activeFilter === filter.key ? filter.color : colors.text.muted}
            />
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && { color: filter.color },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={claws}
        renderItem={({ item }) => (
          <ClawCard 
            item={item} 
            activeFilter={activeFilter}
            onMoreOptions={handleMoreOptions}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={() => fetchClaws(activeFilter)}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <EmptyState
            icon="archive-outline"
            title={`No ${activeFilter} claws yet`}
            message="Capture your first intention to get started"
          />
        }
      />

      {/* Custom Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        title={selectedItem?.title || selectedItem?.content}
        options={getActionSheetOptions()}
        onClose={handleCloseActionSheet}
        isLoading={isActionLoading}
      />

      {/* VIP Dark Alerts */}
      <DarkAlert
        visible={showDeadlinePicker}
        title="🔥 VIP: Configure Deadline"
        message="How urgent is this priority item?"
        options={[
          { text: '24 hours', onPress: () => { handleSetDeadline(1); setShowDeadlinePicker(false); } },
          { text: '3 days', onPress: () => { handleSetDeadline(3); setShowDeadlinePicker(false); } },
          { text: '7 days', onPress: () => { handleSetDeadline(7); setShowDeadlinePicker(false); } },
          { text: 'Cancel', style: 'cancel', onPress: () => setShowDeadlinePicker(false) },
        ]}
        onDismiss={() => setShowDeadlinePicker(false)}
      />

      <DarkAlert
        visible={showAlarmPicker}
        title="⏰ VIP: Set Alarm"
        message="When should we remind you about this VIP item?"
        options={[
          { text: '1 hour', onPress: () => { handleSetAlarm(1); setShowAlarmPicker(false); } },
          { text: '4 hours', onPress: () => { handleSetAlarm(4); setShowAlarmPicker(false); } },
          { text: '8 hours', onPress: () => { handleSetAlarm(8); setShowAlarmPicker(false); } },
          { text: '24 hours', onPress: () => { handleSetAlarm(24); setShowAlarmPicker(false); } },
          { text: 'Cancel', style: 'cancel', onPress: () => setShowAlarmPicker(false) },
        ]}
        onDismiss={() => setShowAlarmPicker(false)}
      />

      <DarkAlert
        visible={showRecurringPicker}
        title="🔔 VIP: Recurring Reminders"
        message="How often should we remind you?"
        options={[
          { text: 'Every hour', onPress: () => { Alert.alert('Set!', 'Hourly VIP reminders enabled'); setShowRecurringPicker(false); } },
          { text: 'Every 3 hours', onPress: () => { Alert.alert('Set!', '3-hour VIP reminders enabled'); setShowRecurringPicker(false); } },
          { text: 'Every 6 hours', onPress: () => { Alert.alert('Set!', '6-hour VIP reminders enabled'); setShowRecurringPicker(false); } },
          { text: 'Cancel', style: 'cancel', onPress: () => setShowRecurringPicker(false) },
        ]}
        onDismiss={() => setShowRecurringPicker(false)}
      />

      {/* Archaeologist Modal - Monthly Someday Resurfacing */}
      <ArchaeologistModal
        visible={showArchaeologist}
        items={archaeologistItems}
        onActivate={async (id) => {
          await activateItem(id);
          setArchaeologistItems(prev => prev.filter(item => item.id !== id));
          if (archaeologistItems.length <= 1) {
            setShowArchaeologist(false);
          }
          fetchClaws();
        }}
        onDismiss={async (id) => {
          await buryItem(id);
          setArchaeologistItems(prev => prev.filter(item => item.id !== id));
          if (archaeologistItems.length <= 1) {
            setShowArchaeologist(false);
          }
          fetchClaws();
        }}
        onRemindLater={async (id) => {
          await dismissItemForMonth(id);
          setArchaeologistItems(prev => prev.filter(item => item.id !== id));
          if (archaeologistItems.length <= 1) {
            setShowArchaeologist(false);
          }
        }}
        onCloseAll={async () => {
          await dismissAllItems();
          setShowArchaeologist(false);
        }}
      />

      {/* Weekly Review Modal */}
      <WeeklyReviewModal
        visible={showWeeklyReview}
        review={weeklyReviewData}
        onClose={() => {
          setShowWeeklyReview(false);
          weeklyReview.markReviewSeen();
        }}
        onSetGoal={(goal) => {
          Alert.alert('Goal Set!', `Goal: ${goal}`);
        }}
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
  },
  headerSubtitle: {
    ...typography.presets.bodySmall,
    marginTop: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.pressed,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary.muted,
  },
  filterText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  list: {
    padding: spacing.lg,
  },
  clawCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  vipClawCard: {
    backgroundColor: colors.gold.card,
    borderWidth: 2,
    borderColor: colors.gold.DEFAULT,
    ...shadows.gold,
  },
  iconContainer: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  vipIconContainer: {
    backgroundColor: colors.gold.DEFAULT,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vipBadgeContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing['5xl'],
    backgroundColor: colors.gold.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    zIndex: 10,
    borderWidth: 2,
    borderColor: colors.text.inverse,
  },
  vipBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  clawTitle: {
    ...typography.presets.body,
    flex: 1,
  },
  vipClawTitle: {
    color: colors.gold.DEFAULT,
    fontWeight: typography.weight.bold,
    fontSize: typography.size.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.primary.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  vipCategoryBadge: {
    backgroundColor: colors.gold.muted,
  },
  categoryText: {
    color: colors.primary.DEFAULT,
    fontSize: typography.size.xs,
    textTransform: 'capitalize',
    fontWeight: typography.weight.semibold,
  },
  vipCategoryText: {
    color: colors.gold.DEFAULT,
  },
  timeText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  expiryText: {
    fontSize: typography.size.xs,
    color: colors.danger.DEFAULT,
    marginTop: spacing.xs,
  },
  vipExpiryText: {
    color: colors.gold.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  moreButton: {
    padding: spacing.sm,
    minWidth: spacing['5xl'],
    minHeight: spacing['5xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
