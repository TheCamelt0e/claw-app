/**
 * Forgot Password Screen - Request password reset
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../store/authStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { forgotPassword } = useAuthStore();
  const navigation = useNavigation();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      let errorMessage = 'Something went wrong. Please try again.';
      if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            We've sent password reset instructions to:
          </Text>
          <Text style={styles.successEmail}>{email}</Text>
          <Text style={styles.successSubtext}>
            If you don't see it, check your spam folder.
          </Text>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Auth' as never)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#e94560']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open" size={40} color="#FF6B35" />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you instructions to reset your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#e94560" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B35', '#e94560']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>
              For security, the link expires in 1 hour
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backArrow: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
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
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: 'rgba(15, 52, 96, 0.5)',
    borderRadius: 24,
    padding: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
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
  button: {
    borderRadius: 12,
    overflow: 'hidden',
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
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
  },
  securityContainer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 6,
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
  successEmail: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 16,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '80%',
  },
});
