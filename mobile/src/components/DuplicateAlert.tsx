/**
 * Duplicate Alert - Warns user about similar existing items
 * 
 * Shows when user is about to capture something similar to existing claws
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

interface DuplicateItem {
  id: string;
  title: string;
  category?: string;
  similarity: number;
  expires_at?: string;
}

interface DuplicateAlertProps {
  visible: boolean;
  suggestion: string;
  duplicates: DuplicateItem[];
  onClose: () => void;
  onCaptureAnyway: () => void;
  onExtendExisting: (clawId: string) => void;
  onViewDuplicates: () => void;
}

export default function DuplicateAlert({
  visible,
  suggestion,
  duplicates,
  onClose,
  onCaptureAnyway,
  onExtendExisting,
  onViewDuplicates,
}: DuplicateAlertProps) {
  const getSimilarityColor = (score: number) => {
    if (score > 0.9) return colors.danger.DEFAULT;
    if (score > 0.8) return colors.warning.DEFAULT;
    return colors.gold.DEFAULT;
  };

  const getSimilarityLabel = (score: number) => {
    if (score > 0.9) return 'Very Similar';
    if (score > 0.8) return 'Similar';
    return 'Somewhat Similar';
  };

  const topDuplicate = duplicates[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={32} color={colors.warning.DEFAULT} />
            </View>
            <Text style={styles.title}>Similar Items Found</Text>
            <Text style={styles.subtitle}>{suggestion}</Text>
          </View>

          {/* Top Duplicate */}
          {topDuplicate && (
            <View style={styles.topDuplicate}>
              <View style={styles.topDuplicateHeader}>
                <Text style={styles.topDuplicateLabel}>Most Similar:</Text>
                <View style={[
                  styles.similarityBadge,
                  { backgroundColor: getSimilarityColor(topDuplicate.similarity) + '30' }
                ]}>
                  <Text style={[
                    styles.similarityText,
                    { color: getSimilarityColor(topDuplicate.similarity) }
                  ]}>
                    {Math.round(topDuplicate.similarity * 100)}% {getSimilarityLabel(topDuplicate.similarity)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.clawCard}>
                <View style={styles.clawHeader}>
                  <Text style={styles.clawTitle} numberOfLines={2}>
                    {topDuplicate.title}
                  </Text>
                  {topDuplicate.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{topDuplicate.category}</Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.extendButton}
                  onPress={() => onExtendExisting(topDuplicate.id)}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.extendText}>Extend This Item Instead</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* More Duplicates */}
          {duplicates.length > 1 && (
            <View style={styles.moreSection}>
              <Text style={styles.moreTitle}>
                +{duplicates.length - 1} more similar {duplicates.length - 1 === 1 ? 'item' : 'items'}
              </Text>
              <ScrollView style={styles.moreList} showsVerticalScrollIndicator={false}>
                {duplicates.slice(1).map((dup) => (
                  <View key={dup.id} style={styles.moreItem}>
                    <Text style={styles.moreItemTitle} numberOfLines={1}>
                      {dup.title}
                    </Text>
                    <Text style={[
                      styles.moreItemScore,
                      { color: getSimilarityColor(dup.similarity) }
                    ]}>
                      {Math.round(dup.similarity * 100)}%
                    </Text>
                  </View>
                ))}
              </ScrollView>
              
              <TouchableOpacity style={styles.viewAllButton} onPress={onViewDuplicates}>
                <Text style={styles.viewAllText}>View All in Vault</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.captureButton} onPress={onCaptureAnyway}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.captureButtonText}>Capture Anyway</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius['2xl'],
    width: '100%',
    maxHeight: '80%',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  topDuplicate: {
    marginBottom: spacing.lg,
  },
  topDuplicateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topDuplicateLabel: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  similarityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  similarityText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  clawCard: {
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  clawHeader: {
    marginBottom: spacing.md,
  },
  clawTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: typography.size.xs,
    color: colors.primary.DEFAULT,
    fontWeight: typography.weight.medium,
    textTransform: 'capitalize',
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
  },
  extendText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  moreSection: {
    marginBottom: spacing.lg,
  },
  moreTitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    fontWeight: typography.weight.medium,
  },
  moreList: {
    maxHeight: 120,
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  moreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  moreItemTitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  moreItemScore: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewAllText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginRight: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  captureButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
  },
});
