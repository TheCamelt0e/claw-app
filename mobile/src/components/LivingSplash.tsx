/**
 * 🌸 LIVING SPLASH SCREEN - Voice Bloom Animation
 * 
 * The 30-second "Wow" factor:
 * 1. Voice waveform animates from center
 * 2. Words transcribe in real-time
 * 3. Words bloom into category icons
 * 4. Icons orbit and form CLAW logo
 * 5. Streak number pulses in gold
 * 
 * Creates instant intimacy - user sees/hears THEMSELVES
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Note: react-native-svg not installed, using View-based animations instead
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface LivingSplashProps {
  onAnimationComplete: () => void;
  streakDays?: number;
}

// Category icons that bloom from words
const CATEGORY_ICONS: Record<string, string> = {
  grocery: '🛒',
  book: '📚',
  movie: '🎬',
  restaurant: '🍽️',
  product: '📦',
  task: '✅',
  idea: '💡',
  someday: '🔮',
};

// Mock waveform data - in production, extract from actual audio
const generateWaveformData = (): number[] => {
  const points = 60;
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    // Create interesting wave pattern
    const base = Math.sin(i * 0.2) * 0.5 + 0.5;
    const noise = Math.random() * 0.3;
    const spike = Math.random() > 0.9 ? Math.random() * 0.5 : 0;
    data.push(Math.min(1, Math.max(0.1, base + noise + spike)));
  }
  return data;
};

export const LivingSplash: React.FC<LivingSplashProps> = ({
  onAnimationComplete,
  streakDays = 0,
}) => {
  // Animation phases
  const [phase, setPhase] = useState<'voice' | 'transcribe' | 'bloom' | 'orbit' | 'logo'>('voice');
  const [lastCapture, setLastCapture] = useState<string>('');
  const [detectedCategory, setDetectedCategory] = useState<string>('task');
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const voiceScale = useRef(new Animated.Value(0.5)).current;
  const voiceOpacity = useRef(new Animated.Value(1)).current;
  const waveformProgress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconOrbit = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const streakPulse = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  
  const waveformData = useRef(generateWaveformData()).current;

  // Load last capture from storage
  useEffect(() => {
    const loadLastCapture = async () => {
      try {
        const saved = await AsyncStorage.getItem('@last_capture');
        if (saved) {
          const parsed = JSON.parse(saved);
          setLastCapture(parsed.content || 'Buy milk');
          setDetectedCategory(parsed.category || 'grocery');
        } else {
          setLastCapture('Buy milk at Bónus');
          setDetectedCategory('grocery');
        }
      } catch (e) {
        setLastCapture('Buy milk at Bónus');
        setDetectedCategory('grocery');
      }
    };
    loadLastCapture();
  }, []);

  // Main animation sequence
  useEffect(() => {
    if (!lastCapture) return;
    
    const runAnimation = async () => {
      // Initial haptic - subtle entry
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Phase 1: Voice waveform appears
      setPhase('voice');
      
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(voiceScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate waveform drawing
      Animated.timing(waveformProgress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Phase 2: Text transcribes
      setPhase('transcribe');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Phase 3: Words bloom into icons
      setPhase('bloom');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Fade out waveform and text
      Animated.parallel([
        Animated.timing(voiceOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Icon blooms in
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Phase 4: Icons orbit
      setPhase('orbit');
      
      Animated.loop(
        Animated.timing(iconOrbit, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: 2 }
      ).start();
      
      // Ring expansion
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 3,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Phase 5: CLAW logo + Streak reveal
      setPhase('logo');
      
      // Stop orbit, scale down icon
      iconOrbit.stopAnimation();
      
      Animated.parallel([
        Animated.timing(iconScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Start streak pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(streakPulse, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(streakPulse, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
      
      // Final haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Fade out and complete
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete();
      });
    };
    
    runAnimation();
  }, [lastCapture]);

  // Generate waveform bars for View-based rendering
  const renderWaveformBars = () => {
    return waveformData.map((value, index) => {
      const height = Math.max(4, value * 60);
      
      return (
        <Animated.View
          key={index}
          style={[
            styles.waveformBar,
            {
              height,
              backgroundColor: waveformProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,255,255,0.2)', '#FF6B35'],
              }),
              opacity: waveformProgress.interpolate({
                inputRange: [index / waveformData.length, (index + 1) / waveformData.length],
                outputRange: [0.3, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      );
    });
  };

  // Orbit calculations
  const orbitRotation = iconOrbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f1a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Voice Waveform Phase */}
      {phase === 'voice' || phase === 'transcribe' ? (
        <Animated.View style={[styles.waveformContainer, { opacity: voiceOpacity }]}>
          <Animated.View
            style={[
              styles.waveformBars,
              {
                transform: [{ scale: voiceScale }],
              },
            ]}
          >
            {renderWaveformBars()}
          </Animated.View>
          
          <Animated.Text
            style={[
              styles.transcribedText,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            "{lastCapture}"
          </Animated.Text>
        </Animated.View>
      ) : null}
      
      {/* Blooming Icon Phase */}
      {phase === 'bloom' || phase === 'orbit' ? (
        <Animated.View
          style={[
            styles.bloomContainer,
            {
              transform: [
                { scale: iconScale },
                { rotate: phase === 'orbit' ? orbitRotation : '0deg' },
              ],
            },
          ]}
        >
          <Text style={styles.bloomIcon}>
            {CATEGORY_ICONS[detectedCategory] || '💡'}
          </Text>
          
          {/* Orbiting particles */}
          {phase === 'orbit' && (
            <>
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <View
                  key={i}
                  style={[
                    styles.orbitParticle,
                    {
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateX: 80 },
                      ],
                    },
                  ]}
                />
              ))}
            </>
          )}
        </Animated.View>
      ) : null}
      
      {/* Expanding Ring */}
      <Animated.View
        style={[
          styles.expandingRing,
          {
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
            borderColor: CATEGORY_ICONS[detectedCategory] 
              ? '#FF6B35' 
              : '#FFD700',
          },
        ]}
      />
      
      {/* CLAW Logo + Streak Phase */}
      {phase === 'logo' ? (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* CLAW Text Logo */}
          <Text style={styles.logoText}>🦀 CLAW</Text>
          
          {/* Tagline */}
          <Text style={styles.tagline}>Capture now. Strike later.</Text>
          
          {/* Streak Badge */}
          {streakDays > 0 && (
            <Animated.View
              style={[
                styles.streakBadge,
                {
                  transform: [{ scale: streakPulse }],
                },
              ]}
            >
              <Text style={styles.streakNumber}>{streakDays}</Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </Animated.View>
          )}
        </Animated.View>
      ) : null}
      
      {/* Phase indicator (subtle) */}
      <View style={styles.phaseIndicator}>
        {['voice', 'transcribe', 'bloom', 'orbit', 'logo'].map((p, i) => (
          <View
            key={p}
            style={[
              styles.phaseDot,
              phase === p && styles.phaseDotActive,
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    alignItems: 'center',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 120,
    width: 240,
    justifyContent: 'space-between',
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  transcribedText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 40,
    textAlign: 'center',
    paddingHorizontal: 40,
    fontStyle: 'italic',
  },
  bloomContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloomIcon: {
    fontSize: 80,
  },
  orbitParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  expandingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    letterSpacing: 2,
  },
  streakBadge: {
    marginTop: 32,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  phaseIndicator: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  phaseDotActive: {
    backgroundColor: '#FF6B35',
    width: 24,
  },
});

export default LivingSplash;
