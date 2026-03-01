/**
 * Nudge Settings - Configure notification intensity levels
 * 
 * AI Nudges: Gentle → Assertive → Urgent → Alarm
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NudgeSettingsProps {
  visible: boolean;
  onClose: () => void;
}

type NudgeLevel = 'gentle' | 'assertive' | 'urgent' | 'alarm';

interface NudgeConfig {
  level: NudgeLevel;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultExpiryDays: number;
}

const NUDGE_LEVELS: NudgeConfig[] = [
  {
    level: 'gentle',
    label: 'Gentle Nudge',
    description: 'Soft reminders in the app. No push notifications.',
    icon: 'leaf',
    color: colors.success.DEFAULT,
    defaultExpiryDays: 14,
  },
  {
    level: 'assertive',
    label: 'Assertive',
    description: 'Push notifications at optimal times.',
    icon: 'notifications',
    color: colors.primary.DEFAULT,
    defaultExpiryDays: 7,
  },
  {
    level: 'urgent',
    label: 'Urgent',
    description: 'Immediate push + persistent notification.',
    icon: 'warning',
    color: colors.warning.DEFAULT,
    defaultExpiryDays: 3,
  },
  {
    level: 'alarm',
    label: 'Alarm Mode',
    description: 'Alarm sound + vibration. Like a deadline.',
    icon: 'alarm',
    color: colors.danger.DEFAULT,
    defaultExpiryDays: 1,
  },
];

export default function NudgeSettings({ visible, onClose }: NudgeSettingsProps) {
  const [selectedLevel, setSelectedLevel] = useState<NudgeLevel>('assertive');
  const [smartNudges, setSmartNudges] = useState(true);
  const [quietHours, setQuietHours] = useState(true);

  const saveSettings = async () => {
    await AsyncStorage.setItem('nudge_level', selectedLevel);
    await AsyncStorage.setItem('smart_nudges', JSON.stringify(smartNudges));
    await AsyncStorage.setItem('quiet_hours', JSON.stringify(quietHours));
    onClose();
  };

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
          <Text style={styles.headerTitle}>Nudge Settings</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={styles.infoCard}>
            <Ionicons name="notifications-circle" size={32} color={colors.primary.DEFAULT} />
            <Text style={styles.infoTitle}>AI Nudges</Text>
            <Text style={styles.infoText}>
              CLAW adapts its reminder style based on urgency and your patterns.
              Choose your default intensity level.
            </Text>
          </View>

          {/* Nudge Levels */}
          <Text style={styles.sectionTitle}>Default Intensity</Text>
          {NUDGE_LEVELS.map((nudge) => (
            <TouchableOpacity
              key={nudge.level}
              style={[
                styles.nudgeCard,
                selectedLevel === nudge.level && styles.nudgeCardSelected,
                { borderLeftColor: nudge.color },
              ]}
              onPress={() => setSelectedLevel(nudge.level)}
            >
              <View style={styles.nudgeHeader}>
                <View style={[styles.iconContainer, { backgroundColor: nudge.color + '20' }]}>
                  <Ionicons name={nudge.icon as any} size={20} color={nudge.color} />
                </View>
                <View style={styles.nudgeInfo}>
                  <Text style={styles.nudgeLabel}>{nudge.label}</Text>
                  <Text style={styles.nudgeDescription}>{nudge.description}</Text>
                </View>
                {selectedLevel === nudge.level && (
                  <Ionicons name="checkmark-circle" size={24} color={nudge.color} />
                )}
              </View>
              <View style={styles.expiryBadge}>
                <Ionicons name="time" size={12} color={colors.text.muted} />
                <Text style={styles.expiryText}>
                  Default expiry: {nudge.defaultExpiryDays} days
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Smart Nudges Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <Ionicons name="bulb" size={24} color={colors.primary.DEFAULT} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Smart Nudges</Text>
                <Text style={styles.toggleDescription}>
                  AI learns when you're most likely to complete tasks
                </Text>
              </View>
            </View>
            <Switch
              value={smartNudges}
              onValueChange={setSmartNudges}
              trackColor={{ false: colors.surface.elevated, true: colors.primary.DEFAULT }}
            />
          </View>

          {/* Quiet Hours Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <Ionicons name="moon" size={24} color={colors.primary.DEFAULT} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Quiet Hours</Text>
                <Text style={styles.toggleDescription}>
                  No notifications 10 PM - 8 AM
                </Text>
              </View>
            </View>
            <Switch
              value={quietHours}
              onValueChange={setQuietHours}
              trackColor={{ false: colors.surface.elevated, true: colors.primary.DEFAULT }}
            />
          </View>

          {/* Per-Item Override Note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle" size={20} color={colors.text.muted} />
            <Text style={styles.noteText}>
              You can override the nudge level for individual items when capturing.
              Look for the ⚡ intensity selector.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export async function getNudgeSettings(): Promise<{
  level: NudgeLevel;
  smartNudges: boolean;
  quietHours: boolean;
}> {
  const level = (await AsyncStorage.getItem('nudge_level')) as NudgeLevel || 'assertive';
  const smartNudges = JSON.parse(await AsyncStorage.getItem('smart_nudges') || 'true');
  const quietHours = JSON.parse(await AsyncStorage.getItem('quiet_hours') || 'true');
  return { level, smartNudges, quietHours };
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
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  saveBtn: {
    padding: spacing.sm,
  },
  saveText: {
    color: colors.primary.DEFAULT,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  infoTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  nudgeCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  nudgeCardSelected: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  nudgeInfo: {
    flex: 1,
  },
  nudgeLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  nudgeDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginLeft: 56,
  },
  expiryText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginLeft: spacing.xs,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: spacing.md,
  },
  toggleTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  noteText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
});
