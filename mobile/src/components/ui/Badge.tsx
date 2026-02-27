/**
 * 🏷️ Badge Component
 * Consistent badge styling using design system
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'gold';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  testID?: string;
}

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  default: {
    backgroundColor: colors.surface.pressed,
  },
  primary: {
    backgroundColor: colors.primary.muted,
  },
  success: {
    backgroundColor: colors.success.muted,
  },
  danger: {
    backgroundColor: colors.danger.muted,
  },
  warning: {
    backgroundColor: colors.warning.muted,
  },
  gold: {
    backgroundColor: colors.gold.DEFAULT,
  },
};

const variantTextColors: Record<BadgeVariant, string> = {
  default: colors.text.muted,
  primary: colors.primary.DEFAULT,
  success: colors.success.DEFAULT,
  danger: colors.danger.DEFAULT,
  warning: colors.warning.DEFAULT,
  gold: colors.text.inverse,
};

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'default',
  style,
  testID,
}) => {
  return (
    <View style={[styles.base, variantStyles[variant], style]} testID={testID}>
      <Text style={[styles.text, { color: variantTextColors[variant] }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default Badge;
