/**
 * 🔘 Button Component
 * Consistent button styling using design system
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'vip';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const variantGradients: Record<ButtonVariant, readonly [string, string]> = {
  primary: colors.gradient.primary,
  secondary: [colors.surface.DEFAULT, colors.surface.DEFAULT] as const,
  ghost: ['transparent', 'transparent'] as const,
  vip: colors.gradient.vip,
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  md: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
  },
  lg: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing['3xl'],
  },
};

const sizeTextStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: typography.size.sm },
  md: { fontSize: typography.size.md },
  lg: { fontSize: typography.size.lg },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;
  const gradientColors = variantGradients[variant];
  
  const containerStyles = [
    styles.base,
    sizeStyles[size],
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    variant === 'vip' && styles.vip,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    sizeTextStyles[size],
    variant === 'secondary' && styles.secondaryText,
    variant === 'ghost' && styles.ghostText,
    isDisabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
      style={variant === 'ghost' ? containerStyles : undefined}
    >
      {variant === 'ghost' ? (
        loading ? (
          <ActivityIndicator color={colors.primary.DEFAULT} />
        ) : (
          <Text style={textStyles}>{title}</Text>
        )
      ) : (
        <LinearGradient
          colors={gradientColors}
          style={containerStyles}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator 
              color={variant === 'secondary' ? colors.primary.DEFAULT : colors.text.primary} 
            />
          ) : (
            <Text style={textStyles}>{title}</Text>
          )}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {
    // Primary uses gradient, no additional styles needed
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  vip: {
    // VIP uses gradient, no additional styles needed
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  secondaryText: {
    color: colors.primary.DEFAULT,
  },
  ghostText: {
    color: colors.primary.DEFAULT,
  },
  disabledText: {
    color: colors.text.disabled,
  },
});

export default Button;
