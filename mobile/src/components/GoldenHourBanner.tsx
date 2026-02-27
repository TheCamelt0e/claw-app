/**
 * 🌅 GOLDEN HOUR BANNER
 * 
 * Displays active Golden Hour status
 * Creates urgency and FOMO with countdown
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface GoldenHourBannerProps {
  timeRemaining: number; // minutes
  onPress?: () => void;
}

export const GoldenHourBanner: React.FC<GoldenHourBannerProps> = ({
  timeRemaining,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [lastTick, setLastTick] = useState(timeRemaining);

  // Pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Tick haptic every minute
  useEffect(() => {
    if (timeRemaining !== lastTick && timeRemaining < 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLastTick(timeRemaining);
    }
  }, [timeRemaining, lastTick]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      
      <LinearGradient
        colors={['#FFD700', '#FF6B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Animated sparkles */}
        <View style={styles.sparkles}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={[styles.sparkle, styles.sparkle2]}>✨</Text>
          <Text style={[styles.sparkle, styles.sparkle3]}>✨</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <Text style={styles.title}>🌅 GOLDEN HOUR</Text>
            <Text style={styles.subtitle}>2x Strike Points Active!</Text>
          </View>
          
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>ENDS IN</Text>
            <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
          </View>
        </View>
        
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: `${(timeRemaining / 60) * 100}%`,
              },
            ]}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Mini version for compact spaces
export const GoldenHourMini: React.FC<{ timeRemaining: number }> = ({
  timeRemaining,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={miniStyles.container}>
      <Animated.View style={[miniStyles.dot, { transform: [{ scale: pulseAnim }] }]} />
      <Text style={miniStyles.text}>2x</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#FFD700',
    borderRadius: 26,
    opacity: 0.3,
  },
  gradient: {
    padding: 16,
    borderRadius: 16,
  },
  sparkles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.6,
    top: 8,
    left: 12,
  },
  sparkle2: {
    top: 'auto',
    bottom: 8,
    left: 'auto',
    right: 12,
  },
  sparkle3: {
    top: 12,
    left: '50%',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#1a1a2e',
    opacity: 0.8,
    marginTop: 2,
  },
  timerSection: {
    alignItems: 'flex-end',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    opacity: 0.7,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(26,26,46,0.2)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
  },
});

const miniStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a2e',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});

export default GoldenHourBanner;
