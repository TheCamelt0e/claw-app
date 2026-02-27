/**
 * 🎲 ORACLE CHEST MODAL
 * 
 * Dramatic reveal animation when user wins a reward
 * Creates dopamine spike through anticipation + celebration
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { OracleReward, RewardRarity } from '../service/oracleChest';

const { width, height } = Dimensions.get('window');

interface OracleChestModalProps {
  visible: boolean;
  reward: OracleReward | null;
  isPityReward: boolean;
  onClose: () => void;
}

// Rarity-specific styling
const RARITY_STYLES: Record<RewardRarity, { gradient: [string, string]; glow: string; particleCount: number }> = {
  common: {
    gradient: ['#3B82F6', '#1E40AF'] as [string, string],
    glow: '#60A5FA',
    particleCount: 20,
  },
  uncommon: {
    gradient: ['#8B5CF6', '#5B21B6'] as [string, string],
    glow: '#A78BFA',
    particleCount: 35,
  },
  rare: {
    gradient: ['#EC4899', '#9D174D'] as [string, string],
    glow: '#F472B6',
    particleCount: 50,
  },
  epic: {
    gradient: ['#F59E0B', '#B45309'] as [string, string],
    glow: '#FBBF24',
    particleCount: 75,
  },
  legendary: {
    gradient: ['#FF6B35', '#FF8C42'] as [string, string],
    glow: '#FFD700',
    particleCount: 100,
  },
};

export const OracleChestModal: React.FC<OracleChestModalProps> = ({
  visible,
  reward,
  isPityReward,
  onClose,
}) => {
  const [phase, setPhase] = useState<'opening' | 'revealing' | 'revealed'>('opening');
  
  // Animation values
  const chestScale = useRef(new Animated.Value(0.3)).current;
  const chestRotation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  const particleAnimations = useRef<Animated.Value[]>([]).current;
  
  const styles = reward ? RARITY_STYLES[reward.rarity] : RARITY_STYLES.common;

  useEffect(() => {
    if (visible && reward) {
      resetAnimations();
      startOpeningSequence();
    }
  }, [visible, reward]);

  const resetAnimations = () => {
    setPhase('opening');
    chestScale.setValue(0.3);
    chestRotation.setValue(0);
    glowOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(50);
    particleAnimations.length = 0;
  };

  const startOpeningSequence = async () => {
    // Phase 1: Chest appears with anticipation
    setPhase('opening');
    
    // Initial haptic - build anticipation
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Chest scales up with bounce
    Animated.spring(chestScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Glow pulses
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    ).start();
    
    // Shaking anticipation
    Animated.loop(
      Animated.sequence([
        Animated.timing(chestRotation, {
          toValue: -0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(chestRotation, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 6 }
    ).start();
    
    // Wait for anticipation buildup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Phase 2: The Reveal
    setPhase('revealing');
    
    // Stop shaking, start explosion
    chestRotation.setValue(0);
    
    // Big haptic for reveal
    if (reward!.rarity === 'legendary') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
    } else if (reward!.rarity === 'epic') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Chest bursts open animation
    Animated.parallel([
      Animated.timing(chestScale, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Chest settles
      Animated.timing(chestScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    
    // Show content
    await new Promise(resolve => setTimeout(resolve, 300));
    setPhase('revealed');
    
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Initialize particles
    initParticles();
  };

  const initParticles = () => {
    const count = styles.particleCount;
    for (let i = 0; i < count; i++) {
      particleAnimations.push(new Animated.Value(0));
    }
    
    // Animate particles exploding outward
    particleAnimations.forEach((anim, index) => {
      const delay = Math.random() * 300;
      const duration = 800 + Math.random() * 600;
      
      setTimeout(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start();
      }, delay);
    });
  };

  // Generate particles
  const renderParticles = () => {
    return particleAnimations.map((anim, index) => {
      const angle = (index / particleAnimations.length) * Math.PI * 2;
      const distance = 100 + Math.random() * 200;
      const size = 4 + Math.random() * 8;
      
      const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(angle) * distance],
      });
      
      const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(angle) * distance - 50],
      });
      
      const opacity = anim.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 1, 0],
      });
      
      const scale = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1.5, 0.5],
      });

      return (
        <Animated.View
          key={index}
          style={[
            particleStyles.particle,
            {
              width: size,
              height: size,
              backgroundColor: styles.glow,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
            },
          ]}
        />
      );
    });
  };

  const getRarityLabel = (rarity: RewardRarity): string => {
    switch (rarity) {
      case 'common': return 'Common';
      case 'uncommon': return 'Uncommon';
      case 'rare': return 'RARE!';
      case 'epic': return 'EPIC!!';
      case 'legendary': return 'LEGENDARY!!!';
    }
  };

  if (!reward) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={stylesModal.container}>
        {/* Background gradient */}
        <LinearGradient
          colors={['rgba(26,26,46,0.98)', 'rgba(26,26,46,0.95)']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Glow effect */}
        <Animated.View
          style={[
            stylesModal.glowContainer,
            {
              opacity: glowOpacity,
              backgroundColor: styles.glow,
            },
          ]}
        />
        
        {/* Particles */}
        {phase === 'revealed' && (
          <View style={stylesModal.particlesContainer} pointerEvents="none">
            {renderParticles()}
          </View>
        )}
        
        {/* Chest (shown during opening phase) */}
        {phase !== 'revealed' && (
          <Animated.View
            style={[
              stylesModal.chestContainer,
              {
                transform: [
                  { scale: chestScale },
                  { rotate: chestRotation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  })},
                ],
              },
            ]}
          >
            <LinearGradient
              colors={styles.gradient}
              style={stylesModal.chest}
            >
              <Text style={stylesModal.chestIcon}>🎲</Text>
              {isPityReward && (
                <View style={stylesModal.pityBadge}>
                  <Text style={stylesModal.pityText}>PITY!</Text>
                </View>
              )}
            </LinearGradient>
            
            {/* Glow ring */}
            <Animated.View
              style={[
                stylesModal.glowRing,
                { borderColor: styles.glow },
              ]}
            />
          </Animated.View>
        )}
        
        {/* Revealed content */}
        {phase === 'revealed' && (
          <Animated.View
            style={[
              stylesModal.contentContainer,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            {/* Rarity badge */}
            <View style={[stylesModal.rarityBadge, { backgroundColor: styles.glow }]}>
              <Text style={stylesModal.rarityText}>{getRarityLabel(reward.rarity)}</Text>
            </View>
            
            {/* Reward icon */}
            <Text style={stylesModal.rewardIcon}>{reward.icon}</Text>
            
            {/* Title */}
            <Text style={stylesModal.title}>{reward.title}</Text>
            
            {/* Description */}
            <Text style={stylesModal.description}>{reward.description}</Text>
            
            {/* Benefit highlight */}
            <View style={[stylesModal.benefitBox, { borderColor: styles.glow }]}>
              <Text style={[stylesModal.benefitText, { color: styles.glow }]}>
                +{reward.benefit.value} {reward.benefit.type.replace('_', ' ').toUpperCase()}
                {reward.benefit.duration && ` (${reward.benefit.duration}h)`}
              </Text>
            </View>
            
            {/* Close button */}
            <TouchableOpacity
              style={[stylesModal.closeButton, { backgroundColor: styles.glow }]}
              onPress={() => {
                console.log('[OracleChest] Claim pressed');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={stylesModal.closeButtonText}>CLAIM REWARD</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {/* Pity counter (subtle) */}
        {phase === 'opening' && !isPityReward && (
          <View style={stylesModal.pityContainer}>
            <Text style={stylesModal.pityLabel}>Opening Oracle Chest...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const stylesModal = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.3,
    transform: [{ scale: 1.5 }],
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chestContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chest: {
    width: 150,
    height: 150,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  chestIcon: {
    fontSize: 60,
  },
  pityBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pityText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    opacity: 0.5,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  rarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  rarityText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  rewardIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitBox: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 32,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  pityContainer: {
    position: 'absolute',
    bottom: 100,
  },
  pityLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});

const particleStyles = StyleSheet.create({
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },
});

export default OracleChestModal;
