/**
 * 📱 Header Component
 * Consistent screen header using design system
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  style?: ViewStyle;
  testID?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      )}
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      
      {rightAction ? (
        <TouchableOpacity
          style={styles.rightButton}
          onPress={rightAction.onPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={rightAction.icon as any} size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.DEFAULT,
  },
  backButton: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.presets.h2,
  },
  subtitle: {
    ...typography.presets.bodySmall,
    marginTop: spacing.xs,
  },
  rightButton: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  rightPlaceholder: {
    width: spacing['5xl'],
    marginLeft: spacing.md,
  },
});

export default Header;
