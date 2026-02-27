/**
 * 🃏 Card Component
 * Consistent card styling using design system
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

type CardVariant = 'default' | 'elevated' | 'vip' | 'outlined';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: colors.surface.DEFAULT,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.surface.elevated,
    ...shadows.md,
  },
  vip: {
    backgroundColor: colors.gold.card,
    borderWidth: 2,
    borderColor: colors.gold.DEFAULT,
    ...shadows.gold,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  testID,
}) => {
  const baseStyles = [
    styles.base,
    variantStyles[variant],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={baseStyles}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={baseStyles} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
});

export default Card;
