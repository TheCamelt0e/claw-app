/**
 * Permissions Screen - Request all permissions at startup
 * Clean, one-time setup experience
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

interface PermissionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: 'pending' | 'granted' | 'denied';
}

export default function PermissionsScreen({ onComplete }: { onComplete: () => void }) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'location',
      icon: 'location',
      title: 'Location',
      description: 'To know when you\'re near Bónus, Krónan, etc.',
      status: 'pending',
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Notifications',
      description: 'To surface intentions at the right moment',
      status: 'pending',
    },
    {
      id: 'microphone',
      icon: 'mic',
      title: 'Microphone',
      description: 'To capture voice intentions',
      status: 'pending',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Also request background for geofencing
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        
        updatePermissionStatus('location', 'granted');
        setCurrentStep(1);
      } else {
        updatePermissionStatus('location', 'denied');
        Alert.alert(
          'Location Required',
          'CLAW needs location to remind you when you\'re near stores. You can enable it in Settings later.',
          [{ text: 'Continue', onPress: () => setCurrentStep(1) }]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setCurrentStep(1);
    }
  };

  const requestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (status === 'granted') {
        updatePermissionStatus('notifications', 'granted');
      } else {
        updatePermissionStatus('notifications', 'denied');
      }
      setCurrentStep(2);
    } catch (error) {
      console.error('Notification permission error:', error);
      setCurrentStep(2);
    }
  };

  const requestMicrophone = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();

      if (status === 'granted') {
        updatePermissionStatus('microphone', 'granted');
      } else {
        updatePermissionStatus('microphone', 'denied');
        Alert.alert(
          'Microphone Access',
          'You can still type intentions manually, but voice capture won\'t work without microphone access.',
          [{ text: 'OK' }]
        );
      }
      
      // Complete setup
      setTimeout(onComplete, 500);
    } catch (error) {
      console.error('Microphone permission error:', error);
      onComplete();
    }
  };

  const updatePermissionStatus = (id: string, status: 'granted' | 'denied') => {
    setPermissions(prev => 
      prev.map(p => p.id === id ? { ...p, status } : p)
    );
  };

  const handleContinue = () => {
    if (currentStep === 0) {
      requestLocation();
    } else if (currentStep === 1) {
      requestNotifications();
    } else if (currentStep === 2) {
      requestMicrophone();
    }
  };

  const handleSkip = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const currentPermission = permissions[currentStep];
  const grantedCount = permissions.filter(p => p.status === 'granted').length;

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Setup CLAW</Text>
        <Text style={styles.subtitle}>
          Grant permissions for the best experience
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        {permissions.map((p, index) => (
          <View
            key={p.id}
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
              p.status === 'granted' && styles.progressDotGranted,
            ]}
          />
        ))}
      </View>

      {/* Main Permission Card */}
      <View style={styles.card}>
        <View style={[
          styles.iconContainer,
          currentPermission?.status === 'granted' && styles.iconGranted
        ]}>
          <Ionicons
            name={currentPermission?.icon as any}
            size={48}
            color={currentPermission?.status === 'granted' ? '#4CAF50' : '#FF6B35'}
          />
        </View>

        <Text style={styles.permissionTitle}>
          {currentPermission?.title}
        </Text>
        
        <Text style={styles.permissionDescription}>
          {currentPermission?.description}
        </Text>

        {currentPermission?.status === 'granted' && (
          <View style={styles.grantedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.grantedText}>Granted</Text>
          </View>
        )}
      </View>

      {/* Why This Matters */}
      <View style={styles.whyContainer}>
        <Ionicons name="information-circle" size={20} color="#7ee8fa" />
        <Text style={styles.whyText}>
          {currentStep === 0 && "Without location, CLAW can't remind you at Bónus or Krónan"}
          {currentStep === 1 && "Without notifications, you'll miss the perfect moments"}
          {currentStep === 2 && "Without microphone, you can only type (slower)"}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B35', '#e94560']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {currentStep === 2 ? 'Finish Setup' : 'Allow'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>
            {currentStep === 2 ? 'Complete' : 'Skip for now'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary if some granted */}
      {grantedCount > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {grantedCount} of {permissions.length} permissions granted
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#FF6B35',
    transform: [{ scale: 1.2 }],
  },
  progressDotGranted: {
    backgroundColor: '#4CAF50',
  },
  card: {
    backgroundColor: '#0f3460',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  iconGranted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: '#4CAF50',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  permissionDescription: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  grantedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  whyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(126, 232, 250, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#7ee8fa',
  },
  whyText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  skipText: {
    color: '#666',
    fontSize: 16,
  },
  summary: {
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryText: {
    color: '#4CAF50',
    fontSize: 14,
  },
});
