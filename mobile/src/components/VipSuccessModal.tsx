/**
 * VIP Success Modal - Dark themed celebration modal
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface VipSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onSetDeadline: () => void;
  onSetAlarm: () => void;
  onDismiss: () => void;
}

export default function VipSuccessModal({ 
  visible, 
  onClose, 
  onSetDeadline, 
  onSetAlarm,
  onDismiss 
}: VipSuccessModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { 
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim 
            }
          ]}
        >
          <LinearGradient
            colors={['#1a1a00', '#0f0f00']}
            style={styles.gradient}
          >
            {/* Flame Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="flame" size={50} color="#FFD700" />
            </View>

            {/* Title */}
            <Text style={styles.title}>🔥 VIP CAPTURED! 🔥</Text>
            
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              This important item will get EXTRA reminders and priority treatment!
            </Text>

            {/* VIP Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="time-outline" size={18} color="#FFD700" />
                <Text style={styles.featureText}>Shorter deadline (3 days)</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="notifications-outline" size={18} color="#FFD700" />
                <Text style={styles.featureText}>Extra notifications</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flame-outline" size={18} color="#FFD700" />
                <Text style={styles.featureText}>Gold VIP styling</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.deadlineButton}
                onPress={onSetDeadline}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFD700', '#FF6B35']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#000" />
                  <Text style={styles.deadlineButtonText}>Set Deadline</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.alarmButton}
                onPress={onSetAlarm}
                activeOpacity={0.8}
              >
                <Ionicons name="alarm-outline" size={18} color="#FFD700" />
                <Text style={styles.alarmButtonText}>Set Alarm</Text>
              </TouchableOpacity>
            </View>

            {/* Dismiss Button */}
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissText}>Great! Dismiss</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  gradient: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  featuresList: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  deadlineButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  deadlineButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alarmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 8,
  },
  alarmButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    color: '#666',
    fontSize: 14,
  },
});
