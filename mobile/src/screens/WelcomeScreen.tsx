/**
 * Welcome Screen - Interactive Onboarding
 * 
 * First impression that converts. Shows the "wow" moment immediately.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    icon: 'flash',
    title: 'Capture in Seconds',
    description: 'Voice, text, or quick tap. Get ideas out before they fade.',
    color: '#FF6B35',
  },
  {
    icon: 'brain',
    title: 'AI Learns You',
    description: 'CLAW remembers when you shop, read, and complete tasks.',
    color: '#FFD700',
  },
  {
    icon: 'location',
    title: 'Smart Resurfacing',
    description: '"Buy milk" appears when you\'re near Bónus. No more forgotten items.',
    color: '#4CAF50',
  },
  {
    icon: 'people',
    title: 'Share with Family',
    description: 'Shared grocery lists. No more "I thought YOU got it!"',
    color: colors.someday.DEFAULT,
  },
];

export default function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      onGetStarted();
    }
  };

  const handleSkip = () => {
    onGetStarted();
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const step = Math.round(scrollPosition / width);
    setCurrentStep(step);
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="flash" size={50} color="#FF6B35" />
        </View>
        <Text style={styles.title}>CLAW</Text>
        <Text style={styles.tagline}>Capture now. Strike later.</Text>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={index} style={styles.slide}>
            <View style={[styles.stepIcon, { backgroundColor: `${step.color}20`, borderColor: step.color }]}>
              <Ionicons name={step.icon as any} size={40} color={step.color} />
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentStep && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6B35', '#e94560']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>CLAW v1.0 • Made in Iceland 🦀</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: '#888',
    fontSize: 16,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: height * 0.08,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#FF6B35',
    marginTop: 8,
    fontWeight: '500',
  },
  carousel: {
    flex: 1,
    marginTop: 20,
  },
  carouselContent: {
    alignItems: 'center',
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  stepIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: '#FF6B35',
    width: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
});
