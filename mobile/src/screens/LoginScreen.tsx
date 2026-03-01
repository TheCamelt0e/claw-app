/**
 * Login Screen - Beautiful authentication
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
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [info, setInfo] = useState('');

  const { login, register, error: authError } = useAuthStore();
  
  // Use auth store error if available (for server wake messages), otherwise local
  const error = authError || localError;
  const navigation = useNavigation();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // Use console first (more reliable than Alert)
    console.log('[LOGIN] Step 1: handleSubmit called');
    
    try {
      // Validation
      if (!isLogin && !displayName.trim()) {
        console.log('[LOGIN] Validation failed: no display name');
        setLocalError('Please enter your name');
        return;
      }
      if (!email.trim()) {
        console.log('[LOGIN] Validation failed: no email');
        setLocalError('Please enter your email');
        return;
      }
      if (!validateEmail(email)) {
        console.log('[LOGIN] Validation failed: invalid email');
        setLocalError('Please enter a valid email address');
        return;
      }
      if (password.length < 8) {
        console.log('[LOGIN] Validation failed: password too short');
        setLocalError('Password must be at least 8 characters');
        return;
      }

      console.log('[LOGIN] Step 2: Validation passed');
      setIsLoading(true);
      setLocalError('');
      setInfo('Starting login...');
      
      console.log('[LOGIN] Step 3: About to call login function');
      if (isLogin) {
        console.log('[LOGIN] Calling login API...');
        await login(email.trim(), password);
        console.log('[LOGIN] Login function completed successfully');
      } else {
        console.log('[LOGIN] Calling register API...');
        await register(email.trim(), password, displayName.trim());
      }
      setInfo('');
    } catch (err: any) {
      // Debug: Log full error details
      console.error('[LOGIN] CATCH BLOCK - Error:', err);
      console.error('[LOGIN] Error type:', typeof err);
      console.error('[LOGIN] Error keys:', Object.keys(err || {}));
      console.error('[LOGIN] Error message:', err?.message);
      console.error('[LOGIN] Error stack:', err?.stack);
      
      // Show error in Alert (but not for server wake messages)
      const errorMsg = err?.message || err?.detail || String(err) || 'Unknown error';
      
      // Check if it's a server wake timeout - show nicer message
      if (errorMsg.includes('waking up') || errorMsg.includes('timed out')) {
        setInfo('');
        setLocalError('Server was sleeping. Please tap Sign In again!');
        // Don't show Alert - let them retry immediately
      } else {
        setInfo('');
        Alert.alert('Login Error', errorMsg);
        setLocalError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError('');
  };

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="flash" size={50} color="#FF6B35" />
            </View>
            <Text style={styles.title}>CLAW</Text>
            <Text style={styles.tagline}>Capture now. Strike later.</Text>
          </View>

          {/* Mode Toggle Tabs */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeTab, isLogin && styles.modeTabActive]}
              onPress={() => !isLogin && toggleMode()}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, !isLogin && styles.modeTabActive]}
              onPress={() => isLogin && toggleMode()}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor="#666"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

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
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isLogin ? 'password' : 'new-password'}
              />
            </View>

            {info ? (
              <View style={styles.infoContainer}>
                <ActivityIndicator size="small" color="#FF6B35" style={styles.infoIcon} />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorContainer, error.includes('ready') || error.includes('Waking') ? styles.infoErrorContainer : null]}>
                <Ionicons 
                  name={error.includes('ready') ? "checkmark-circle" : "alert-circle"} 
                  size={18} 
                  color={error.includes('ready') ? "#4CAF50" : "#e94560"} 
                />
                <Text style={[styles.errorText, error.includes('ready') ? styles.infoErrorText : null]}>{error}</Text>
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
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password Link - Only show in login mode */}
            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate('ForgotPassword' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Alternative Toggle */}
            <TouchableOpacity
              style={styles.switchButton}
              onPress={toggleMode}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 40, right: 40 }}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </Text>
              <Text style={styles.switchHighlight}>
                {isLogin ? 'Sign up here' : 'Sign in here'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>
              Your data is encrypted and secure
            </Text>
          </View>

          {/* Demo hint - only in development */}
          {__DEV__ && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoText}>
                Test account: test@example.com / password123
              </Text>
              <Text style={styles.demoText}>
                Note: Password must be 8+ characters
              </Text>
            </View>
          )}
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    color: colors.primary.DEFAULT,
    marginTop: 8,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    marginBottom: 20,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  modeTabText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: colors.primary.DEFAULT,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: '#FF6B35',
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    color: '#FF6B35',
    flex: 1,
    fontSize: 14,
  },
  infoErrorContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  infoErrorText: {
    color: '#4CAF50',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  switchText: {
    color: '#888',
    fontSize: 14,
  },
  switchHighlight: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 14,
  },
  securityContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 6,
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  demoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  demoText: {
    color: '#666',
    fontSize: 12,
  },
});
