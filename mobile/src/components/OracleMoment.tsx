/**
 * Oracle Moment - The Dopamine Hit
 * 
 * When a user strikes an item with high resurface_score,
 * this component celebrates the AI's correct prediction.
 * 
 * This creates the variable reward loop that keeps users engaged.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface OracleMomentProps {
  visible: boolean;
  item: {
    content: string;
    resurface_score: number;
    resurface_reason: string;
    category?: string;
  } | null;
  streakDays: number;
  onClose: () => void;
}

export default function OracleMoment({ visible, item, streakDays, onClose }: OracleMomentProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeYAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible && item) {
      // Haptic celebration
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Staggered animation
      Animated.sequence([
        // Scale in
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Badge slides up
        Animated.spring(badgeYAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, item]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !item) return null;

  // Parse the resurface reason for display
  const reasons = item.resurface_reason.split(' • ').filter(r => r.length > 0);
  const mainReason = reasons[0] || 'Right place, right time';
  
  // Calculate accuracy badge
  const accuracy = Math.round(item.resurface_score * 100);
  const accuracyColor = accuracy >= 80 ? '#4CAF50' : accuracy >= 60 ? '#FFD700' : '#FF6B35';

  return (
    <Animated.View 
      style={[
        styles.overlay,
        { opacity: opacityAnim }
      ]}
    >
      <Animated.View 
        style={[
          styles.container,
          { 
            transform: [
              { scale: scaleAnim },
            ] 
          }
        ]}
      >
        {/* Target Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={40} color="#FFD700" />
          <View style={styles.targetRing} />
        </View>

        {/* Main Message */}
        <Text style={styles.title}>🎯 The AI Was Right!</Text>
        
        <Text style={styles.subtitle}>
          You struck "{item.content.substring(0, 40)}{item.content.length > 40 ? '...' : ''}"
        </Text>

        {/* Accuracy Badge */}
        <View style={[styles.accuracyBadge, { borderColor: accuracyColor }]}>
          <Text style={[styles.accuracyText, { color: accuracyColor }]}>
            {accuracy}% Match
          </Text>
        </View>

        {/* Why it worked */}
        <View style={styles.reasonContainer}>
          <Ionicons name="bulb" size={16} color="#FF6B35" />
          <Text style={styles.reasonText}>{mainReason}</Text>
        </View>

        {/* Streak Celebration */}
        {streakDays > 0 && (
          <Animated.View 
            style={[
              styles.streakBadge,
              { transform: [{ translateY: badgeYAnim }] }
            ]}
          >
            <Ionicons name="flame" size={20} color="#FFD700" />
            <Text style={styles.streakText}>
              {streakDays} Day Streak! 🔥
            </Text>
          </Animated.View>
        )}

        {/* Pattern Insight */}
        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>📊 Your Pattern</Text>
          <Text style={styles.insightText}>
            You tend to complete {item.category || 'items'} on {getDayName()}s
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Awesome! ✨</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function getDayName(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 28,
    margin: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  targetRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
    opacity: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  accuracyBadge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  accuracyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  reasonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 16,
  },
  streakText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  insightBox: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  insightLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  insightText: {
    color: '#fff',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  closeText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
