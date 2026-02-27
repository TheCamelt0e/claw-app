/**
 * Reset Password Screen - Enter new password after clicking email link
 */
import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAuthStore } from '../store/authStore';

export default function ResetPasswordScreen() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { resetPassword } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();

  // Extract token from deep link URL
  useEffect(() => {
    // Handle deep link: claw://reset-password?token=xxx
    // Or from navigation params
    const params = route.params as { token?: string };
    if (params?.token) {
      setToken(params.token);
    }
  }, [route.params]);

  const handleSubmit = async () => {
    if (!token) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      let errorMessage = 'Failed to reset password. Please try again.';
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
          <View style={[styles.iconCircle, { borderColor: '#4CAF50' }]}>
            <Ionicons name="checkmark" size={60} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successText}>
            Your password has been successfully reset.
          </Text>
          <Text style={styles.successSubtext}>
            You can now sign in with your new password.
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Auth' as never)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF6B35', '#e94560']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Sign In</Text>
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
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="key" size={40} color="#FF6B35" />
            </View>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 characters)"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarContainer}>
                  <View style={[
                    styles.strengthBar,
                    password.length >= 6 && styles.strengthBarWeak,
                    password.length >= 8 && styles.strengthBarMedium,
                    password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && styles.strengthBarStrong,
                  ]} />
                </View>
                <Text style={styles.strengthText}>
                  {password.length < 6 ? 'Too short' :
                   password.length < 8 ? 'Weak' :
                   password.length < 10 ? 'Good' : 'Strong'}
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
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading || !token}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B35', '#e94560']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {!token && (
              <View style={styles.noTokenContainer}>
                <Text style={styles.noTokenText}>
                  This reset link is invalid or has expired.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword' as never)}
                >
                  <Text style={styles.noTokenLink}>Request a new link</Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingHorizontal: 20,
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
    marginBottom: 16,
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
  strengthContainer: {
    marginBottom: 16,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    width: '20%',
    backgroundColor: '#e94560',
    borderRadius: 2,
  },
  strengthBarWeak: {
    width: '40%',
    backgroundColor: '#FF9800',
  },
  strengthBarMedium: {
    width: '70%',
    backgroundColor: '#FFD700',
  },
  strengthBarStrong: {
    width: '100%',
    backgroundColor: '#4CAF50',
  },
  strengthText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
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
  noTokenContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  noTokenText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  noTokenLink: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
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
});
