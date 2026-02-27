/**
 * AI Energy Meter - The Monetization Hook
 * 
 * Shows remaining AI-powered captures for the day.
 * Visual battery that depletes with each use.
 * When empty, users feel the constraint → upgrade to Pro.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIEnergyMeterProps {
  used: number;
  limit: number;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export default function AIEnergyMeter({ 
  used, 
  limit = 5, 
  isPro = false,
  onUpgrade 
}: AIEnergyMeterProps) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const remaining = isPro ? 999 : Math.max(0, limit - used);
  const percentage = isPro ? 100 : (remaining / limit) * 100;
  
  useEffect(() => {
    // Animate fill level
    Animated.spring(fillAnim, {
      toValue: percentage,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
    
    // Pulse animation when low
    if (remaining <= 1 && !isPro) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [remaining, percentage, isPro]);

  const getStatusColor = () => {
    if (isPro) return '#FFD700'; // Gold for Pro
    if (percentage > 60) return '#4CAF50'; // Green
    if (percentage > 30) return '#FFD700'; // Yellow
    return '#e94560'; // Red (low)
  };

  const getStatusText = () => {
    if (isPro) return '∞ Unlimited';
    if (remaining === 0) return 'AI Resting...';
    return `${remaining}/${limit} left today`;
  };

  const showUpgradePrompt = remaining === 0 && !isPro;

  return (
    <Animated.View 
      style={[
        styles.container,
        showUpgradePrompt && { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <View style={styles.row}>
        {/* Battery Icon */}
        <View style={styles.batteryContainer}>
          <View style={styles.batteryBody}>
            <Animated.View 
              style={[
                styles.batteryFill,
                { 
                  width: fillAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: getStatusColor()
                }
              ]} 
            />
          </View>
          <View style={styles.batteryCap} />
        </View>

        {/* Status Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {isPro ? '✨ ' : '🧠 '}{getStatusText()}
          </Text>
          {!isPro && remaining <= 2 && remaining > 0 && (
            <Text style={styles.warningText}>
              Running low on smart captures
            </Text>
          )}
        </View>

        {/* Upgrade Button (when empty) */}
        {showUpgradePrompt && onUpgrade && (
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={onUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty State Message */}
      {showUpgradePrompt && (
        <View style={styles.emptyMessage}>
          <Ionicons name="battery-dead" size={20} color="#e94560" />
          <Text style={styles.emptyText}>
            The AI is resting. Using keyword mode.
          </Text>
          <Text style={styles.emptySubtext}>
            Upgrade to Pro for unlimited smart captures.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    width: 32,
    height: 18,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    padding: 2,
    justifyContent: 'center',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 1,
  },
  batteryCap: {
    width: 4,
    height: 10,
    backgroundColor: '#666',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyMessage: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(233, 69, 96, 0.2)',
    alignItems: 'center',
  },
  emptyText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
