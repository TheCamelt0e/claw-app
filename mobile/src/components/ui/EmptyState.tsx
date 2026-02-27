/**
 * 📭 EmptyState Component
 * Consistent empty state styling using design system
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  action?: {
    title: string;
    onPress: () => void;
  };
  style?: ViewStyle;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={64} color={colors.surface.pressed} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['6xl'],
    paddingHorizontal: spacing['2xl'],
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.presets.h3,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.presets.bodySmall,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  actionButton: {
    marginTop: spacing.md,
  },
});

export default EmptyState;
