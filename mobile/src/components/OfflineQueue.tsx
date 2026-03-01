/**
 * Offline Queue - Visualize and manage pending sync items
 * 
 * Shows what's waiting to sync, retry failed items, resolve conflicts
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedItem {
  id: string;
  type: 'capture' | 'strike' | 'release' | 'extend';
  content?: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
}

interface OfflineQueueProps {
  visible: boolean;
  onClose: () => void;
}

const QUEUE_STORAGE_KEY = '@claw_offline_queue';

export default function OfflineQueue({ visible, onClose }: OfflineQueueProps) {
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueuedItem | null>(null);

  useEffect(() => {
    if (visible) {
      loadQueue();
    }
  }, [visible]);

  const loadQueue = async () => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        setQueue(JSON.parse(data));
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  };

  const saveQueue = async (newQueue: QueuedItem[]) => {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    setQueue(newQueue);
  };

  const retryItem = async (item: QueuedItem) => {
    setIsLoading(true);
    // Simulate retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedQueue = queue.map(q => 
      q.id === item.id 
        ? { ...q, status: 'syncing' as const, retryCount: q.retryCount + 1 }
        : q
    );
    await saveQueue(updatedQueue);
    setIsLoading(false);
    setSelectedItem(null);
  };

  const removeItem = async (itemId: string) => {
    const updatedQueue = queue.filter(q => q.id !== itemId);
    await saveQueue(updatedQueue);
    setSelectedItem(null);
  };

  const clearCompleted = async () => {
    const updatedQueue = queue.filter(q => q.status !== 'failed');
    await saveQueue(updatedQueue);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'capture': return 'add-circle';
      case 'strike': return 'checkmark-circle';
      case 'release': return 'close-circle';
      case 'extend': return 'time';
      default: return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.text.muted;
      case 'syncing': return colors.primary.DEFAULT;
      case 'failed': return colors.danger.DEFAULT;
      case 'conflict': return colors.warning.DEFAULT;
      default: return colors.text.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting';
      case 'syncing': return 'Syncing...';
      case 'failed': return 'Failed';
      case 'conflict': return 'Conflict';
      default: return status;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Offline Queue</Text>
            {pendingCount > 0 && (
              <Text style={styles.headerSubtitle}>{pendingCount} items waiting</Text>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="cloud-offline" size={24} color={colors.text.muted} />
            <Text style={styles.summaryNumber}>{queue.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          
          <View style={[styles.summaryCard, pendingCount > 0 && styles.summaryCardActive]}>
            <Ionicons name="time" size={24} color={pendingCount > 0 ? colors.primary.DEFAULT : colors.text.muted} />
            <Text style={[styles.summaryNumber, pendingCount > 0 && styles.summaryNumberActive]}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          
          <View style={[styles.summaryCard, failedCount > 0 && styles.summaryCardError]}>
            <Ionicons name="alert-circle" size={24} color={failedCount > 0 ? colors.danger.DEFAULT : colors.text.muted} />
            <Text style={[styles.summaryNumber, failedCount > 0 && styles.summaryNumberError]}>{failedCount}</Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
        </View>

        {/* Queue List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {queue.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-done" size={64} color={colors.success.DEFAULT} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>Everything is synced and ready.</Text>
            </View>
          ) : (
            queue.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.queueItem,
                  item.status === 'failed' && styles.queueItemFailed,
                  item.status === 'conflict' && styles.queueItemConflict,
                ]}
                onPress={() => setSelectedItem(item)}
              >
                <View style={[styles.iconContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Ionicons name={getItemIcon(item.type)} size={20} color={getStatusColor(item.status)} />
                </View>
                
                <View style={styles.itemContent}>
                  <Text style={styles.itemType}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                  {item.content && (
                    <Text style={styles.itemContentText} numberOfLines={1}>
                      {item.content}
                    </Text>
                  )}
                  <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
                </View>
                
                <View style={styles.statusContainer}>
                  {item.status === 'syncing' ? (
                    <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                  ) : (
                    <>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Actions */}
        {failedCount > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.retryAllButton} onPress={clearCompleted}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryAllText}>Retry All Failed</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Item Detail Modal */}
        {selectedItem && (
          <View style={styles.detailOverlay}>
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Item Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>
                  {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: getStatusColor(selectedItem.status) }]}>
                  {getStatusLabel(selectedItem.status)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Retries</Text>
                <Text style={styles.detailValue}>{selectedItem.retryCount}</Text>
              </View>
              
              {selectedItem.lastError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorText}>{selectedItem.lastError}</Text>
                </View>
              )}
              
              <View style={styles.detailActions}>
                {selectedItem.status === 'failed' && (
                  <TouchableOpacity 
                    style={styles.detailButton}
                    onPress={() => retryItem(selectedItem)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={styles.detailButtonText}>Retry</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.detailButton, styles.detailButtonSecondary]}
                  onPress={() => removeItem(selectedItem.id)}
                >
                  <Ionicons name="trash" size={18} color={colors.danger.DEFAULT} />
                  <Text style={[styles.detailButtonText, styles.detailButtonTextSecondary]}>
                    Remove
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.detailButton, styles.detailButtonCancel]}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.detailButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  closeBtn: {
    padding: spacing.sm,
    width: 50,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  placeholder: {
    width: 50,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  summaryCardActive: {
    backgroundColor: colors.primary.muted,
  },
  summaryCardError: {
    backgroundColor: colors.danger.muted,
  },
  summaryNumber: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  summaryNumberActive: {
    color: colors.primary.DEFAULT,
  },
  summaryNumberError: {
    color: colors.danger.DEFAULT,
  },
  summaryLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  list: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  queueItemFailed: {
    borderWidth: 1,
    borderColor: colors.danger.DEFAULT + '40',
  },
  queueItemConflict: {
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT + '40',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  itemContentText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  itemTime: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  actions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  retryAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  retryAllText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginLeft: spacing.sm,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  detailCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    width: '100%',
  },
  detailTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  detailLabel: {
    fontSize: typography.size.base,
    color: colors.text.muted,
  },
  detailValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  errorContainer: {
    backgroundColor: colors.danger.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.danger.DEFAULT,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  detailActions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  detailButtonSecondary: {
    backgroundColor: colors.danger.muted,
  },
  detailButtonCancel: {
    backgroundColor: colors.surface.elevated,
  },
  detailButtonText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  detailButtonTextSecondary: {
    color: colors.danger.DEFAULT,
  },
});
