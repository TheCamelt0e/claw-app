/**
 * Simple Toast Notification
 * Shows temporary messages without blocking UI
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onHide?: () => void;
}

export default function Toast({ visible, message, type = 'success', onHide }: ToastProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onHide?.());
    }
  }, [visible]);

  if (!visible) return null;

  const colors = {
    success: '#4CAF50',
    error: '#e94560',
    info: '#FF6B35',
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: colors[type] }
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
