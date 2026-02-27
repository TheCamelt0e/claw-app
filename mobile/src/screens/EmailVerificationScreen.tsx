/**
 * Email Verification Screen - Verify email after clicking link
 * Also shown as a banner in the app after registration
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuthStore } from '../store/authStore';

interface EmailVerificationScreenProps {
  // For use as a screen
}

export default function EmailVerificationScreen() {
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { verifyEmail, resendVerification, user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();

  // Handle verification
  const handleVerify = async (verifyToken: string) => {
    if (!verifyToken) return;

    setIsVerifying(true);
    setError('');

    try {
      await verifyEmail(verifyToken);
      setVerified(true);
    } catch (err: any) {
      let errorMessage = 'Failed to verify email. Please try again.';
      if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  // Extract token from deep link URL and auto-verify
  useEffect(() => {
    const params = route.params as { token?: string };
    if (params?.token && !verified && !isVerifying) {
      setToken(params.token);
      handleVerify(params.token);
    }
  }, [route.params]);

  const handleResend = async () => {
    if (!user?.email) {
      setError('No email address found. Please log in again.');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      await resendVerification(user.email);
      setResendSuccess(true);
    } catch (err: any) {
      let errorMessage = 'Failed to resend verification email.';
      if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Success State
  if (verified) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.successContainer}>
          <View style={[styles.iconCircle, { borderColor: '#4CAF50' }]}>
            <Ionicons name="checkmark" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Email Verified!</Text>
          <Text style={styles.successText}>
            Your email has been successfully verified.
          </Text>
          <Text style={styles.successSubtext}>
            You now have full access to all CLAW features.
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Main' as never)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#e94560']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue to App</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Manual Entry State (if no token in URL)
  if (!token) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={40} color="#FF6B35" />
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification email to:
            </Text>
            <Text style={styles.emailText}>{user?.email || 'your email'}</Text>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={24} color="#FF6B35" />
              <Text style={styles.infoText}>
                Click the link in the email to verify your account. The link expires in 24 hours.
              </Text>
            </View>

            {resendSuccess && (
              <View style={styles.successMessage}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.successMessageText}>
                  Verification email sent!
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#e94560" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isResending}
              activeOpacity={0.8}
            >
              {isResending ? (
                <ActivityIndicator color="#FF6B35" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#FF6B35" />
                  <Text style={styles.resendButtonText}>Resend Email</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.cooldownText}>
              You can request a new email every 5 minutes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('Main' as never)}
          >
            <Text style={styles.skipText}>I'll verify later</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Verifying State
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.verifyingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.verifyingText}>Verifying your email...</Text>
      </View>
    </LinearGradient>
  );
}

// Banner component for showing in Profile or other screens
export function EmailVerificationBanner({ 
  onPress 
}: { 
  onPress: () => void 
}) {
  return (
    <TouchableOpacity 
      style={styles.bannerContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['rgba(255, 107, 53, 0.2)', 'rgba(233, 69, 96, 0.1)']}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerIcon}>
            <Ionicons name="mail-outline" size={24} color="#FF6B35" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Verify your email</Text>
            <Text style={styles.bannerSubtitle}>
              Tap to verify and unlock all features
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 8,
  },
  cardContainer: {
    backgroundColor: 'rgba(15, 52, 96, 0.5)',
    borderRadius: 24,
    padding: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessageText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#e94560',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  resendButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cooldownText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  skipButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '80%',
  },
  buttonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Banner styles
  bannerContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
