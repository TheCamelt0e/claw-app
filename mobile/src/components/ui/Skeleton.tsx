/**
 * 💀 Skeleton Component
 * Loading placeholder using design system
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: br = borderRadius.md,
  style,
  testID,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius: br },
        style,
      ]}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      />
    </View>
  );
};

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="70%" height={20} style={styles.cardTitle} />
      <Skeleton width="40%" height={14} />
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number; style?: ViewStyle }> = ({
  count = 3,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.pressed,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  card: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
});

export default Skeleton;
