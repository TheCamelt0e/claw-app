/**
 * Interactive Onboarding - First-time user experience
 * 
 * Guides users through their first capture with actual interaction
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Capture Now,\nStrike Later',
    subtitle: 'CLAW remembers so your brain doesn\'t have to.',
    icon: '🦖',
  },
  {
    id: 'concept',
    title: 'The Zeigarnik Effect',
    subtitle: 'Your brain obsesses over unfinished tasks. CLAW frees you by safely storing intentions.',
    icon: '🧠',
  },
  {
    id: 'demo',
    title: 'Try It Now',
    subtitle: 'Type anything you want to remember...',
    icon: '✍️',
  },
  {
    id: 'ai',
    title: 'AI Magic',
    subtitle: 'CLAW automatically categorizes, tags, and reminds you at the perfect time.',
    icon: '✨',
  },
  {
    id: 'ready',
    title: 'You\'re Ready!',
    subtitle: 'Your first CLAW is captured. Strike it when you\'re ready to act.',
    icon: '🎯',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [demoInput, setDemoInput] = useState('');
  const [capturedItem, setCapturedItem] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      animateTransition(() => {
        setCurrentStep(currentStep + 1);
        scrollRef.current?.scrollTo({ x: (currentStep + 1) * width, animated: true });
      });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('has_completed_onboarding', 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const handleDemoCapture = () => {
    if (!demoInput.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCapturedItem(demoInput);
    nextStep();
  };

  const step = ONBOARDING_STEPS[currentStep];

  const renderStep = (stepData: typeof ONBOARDING_STEPS[0], index: number) => {
    const isActive = index === currentStep;

    return (
      <View key={stepData.id} style={styles.stepContainer}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{stepData.icon}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{stepData.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{stepData.subtitle}</Text>

        {/* Demo Input (Step 2 only) */}
        {stepData.id === 'demo' && (
          <View style={styles.demoContainer}>
            <TextInput
              style={styles.demoInput}
              placeholder="e.g., 'Call mom about weekend'"
              placeholderTextColor={colors.text.muted}
              value={demoInput}
              onChangeText={setDemoInput}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.demoButton, !demoInput.trim() && styles.demoButtonDisabled]}
              onPress={handleDemoCapture}
              disabled={!demoInput.trim()}
            >
              <Text style={styles.demoButtonText}>CLAW IT</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* AI Demo (Step 3 only) */}
        {stepData.id === 'ai' && capturedItem && (
          <View style={styles.aiDemo}>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={20} color={colors.gold.DEFAULT} />
                <Text style={styles.aiTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.aiContent}>"{capturedItem}"</Text>
              <View style={styles.aiTags}>
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>📞 task</Text>
                </View>
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>⏰ 7 days</Text>
                </View>
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>👤 mom</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Ready Step (Step 4 only) */}
        {stepData.id === 'ready' && (
          <View style={styles.readyDemo}>
            <View style={styles.readyCard}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.DEFAULT} />
              <Text style={styles.readyText}>Captured!</Text>
              <Text style={styles.readySubtext}>{capturedItem}</Text>
            </View>
          </View>
        )}

        {/* Navigation */}
        {stepData.id !== 'demo' && (
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <LinearGradient
              colors={[colors.primary.DEFAULT, '#e94560']}
              style={styles.nextGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextText}>
                {index === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Skip Option */}
        {index < ONBOARDING_STEPS.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
            <Text style={styles.skipText}>Skip Tutorial</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={[...colors.gradient.background]} style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Steps */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {renderStep(step, currentStep)}
      </Animated.View>
    </LinearGradient>
  );
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem('has_completed_onboarding');
  return value === 'true';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.elevated,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: 24,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.xl,
  },
  demoContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  demoInput: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    marginBottom: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  demoButtonDisabled: {
    backgroundColor: colors.surface.elevated,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginRight: spacing.sm,
  },
  aiDemo: {
    width: '100%',
  },
  aiCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold.border,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.gold.DEFAULT,
    marginLeft: spacing.sm,
  },
  aiContent: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  aiTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiTag: {
    backgroundColor: colors.primary.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  aiTagText: {
    fontSize: typography.size.sm,
    color: colors.primary.DEFAULT,
  },
  readyDemo: {
    width: '100%',
  },
  readyCard: {
    backgroundColor: colors.success.muted,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success.light,
  },
  readyText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.success.DEFAULT,
    marginTop: spacing.md,
  },
  readySubtext: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  nextButton: {
    width: '100%',
    marginTop: spacing.xl,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  nextText: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginRight: spacing.sm,
  },
  skipButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  skipText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
  },
});
