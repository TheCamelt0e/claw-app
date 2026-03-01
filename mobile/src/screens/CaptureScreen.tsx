/**
 * Capture Screen - Beautiful voice-first capture
 * Using CLAW Design System
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  NativeEventEmitter,
  NativeModules,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useClawStore } from '../store/clawStore';
import VipSuccessModal from '../components/VipSuccessModal';
import DarkAlert from '../components/DarkAlert';
import DuplicateAlert from '../components/DuplicateAlert';
import ConversationCapture from '../components/ConversationCapture';
import { 
  smartAnalyze, 
  isRateLimitError, 
  getAIStatus, 
  getUrgencyLabel,
  getSentimentEmoji,
  SmartAnalysisResponse 
} from '../service/ai';
import AIEnergyMeter from '../components/AIEnergyMeter';
import { getAIUsage, incrementAIUsage, AIUsageData } from '../service/aiUsage';
import { useAudioStore } from '../store/audioStore';
import { playVocab } from '../utils/haptics';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import SmartSuggestionsWidget from '../features/SmartSuggestionsWidget';
import CameraCapture from '../camera/CameraCapture';
import { achievementEngine } from '../achievements/AchievementEngine';
import { patternTracker } from '../analytics/PatternTracker';
import { clawsAPI } from '../api/client';

const QUICK_SUGGESTIONS = [
  'Book Sarah recommended',
  'New restaurant downtown',
  'Buy batteries',
  'Call mom',
];

// Try to load speech recognition module
let SpeechModule: any = null;
let speechEmitter: any = null;

try {
  SpeechModule = require('expo-speech-recognition');
  if (SpeechModule.ExpoSpeechRecognitionModule) {
    speechEmitter = new NativeEventEmitter(SpeechModule.ExpoSpeechRecognitionModule);
  }
} catch (e) {
  console.log('Speech module not available:', e);
}

export default function CaptureScreen() {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [pressedChip, setPressedChip] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [inputKey, setInputKey] = useState(0); // Used to force TextInput re-render
  const [isPriority, setIsPriority] = useState(false); // VIP/Priority mode
  const [isSomeday, setIsSomeday] = useState(false); // Someday mode (no expiry)
  const [showVipModal, setShowVipModal] = useState(false);
  const [capturedClawId, setCapturedClawId] = useState<string | null>(null);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{
    suggestion: string;
    duplicates: Array<any>;
  } | null>(null);
  const [pendingCapture, setPendingCapture] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [conversationContent, setConversationContent] = useState('');
  const [showDeadlineAlert, setShowDeadlineAlert] = useState(false);
  const [showAlarmAlert, setShowAlarmAlert] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<SmartAnalysisResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'success' | 'fallback'>('idle');
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cameraAnalysisRef = useRef<any>(null);
  const subscriptionsRef = useRef<any[]>([]);
  const isRecordingRef = useRef(false); // Debounce flag
  const { captureClaw, error, clearError, syncStatus } = useClawStore();
  const { setLastCapture } = useAudioStore();
  
  const MAX_RECORDING_DURATION = 60; // 60 seconds max

  // Check speech availability on mount
  useEffect(() => {
    checkSpeechAvailability();
    checkAIStatus();
    loadAIUsage();
    achievementEngine.init();
    patternTracker.init();
    return () => {
      // Cleanup: Stop recording if component unmounts
      if (isRecordingRef.current) {
        stopRecording();
      }
      cleanupSubscriptions();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
      }
    };
  }, []);

  const loadAIUsage = async () => {
    const usage = await getAIUsage();
    setAiUsage(usage);
    // TODO: Load user subscription status from profile
    // setIsPro(user.subscription === 'pro');
  };

  const checkAIStatus = async () => {
    const status = await getAIStatus();
    setAiAvailable(status?.available ?? false);
  };

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error]);

  const checkSpeechAvailability = async () => {
    try {
      if (SpeechModule?.ExpoSpeechRecognitionModule) {
        const available = await SpeechModule.ExpoSpeechRecognitionModule.isRecognitionAvailable();
        setSpeechAvailable(available);
        console.log('Speech available:', available);
      } else {
        setSpeechAvailable(false);
      }
    } catch (e) {
      console.log('Speech check error:', e);
      setSpeechAvailable(false);
    }
  };

  const cleanupSubscriptions = () => {
    subscriptionsRef.current.forEach(sub => sub?.remove?.());
    subscriptionsRef.current = [];
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    // Haptic: Recording starts
    await playVocab('capture');
    
    if (!SpeechModule?.ExpoSpeechRecognitionModule) {
      Alert.alert('Voice Not Available', 'Speech recognition is not available on this device.');
      return;
    }

    try {
      // Request permissions
      const permResult = await SpeechModule.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice capture.');
        return;
      }

      // Clean up any existing subscriptions
      cleanupSubscriptions();

      // Set up event listeners
      const resultSub = speechEmitter.addListener('result', (event: any) => {
        console.log('Speech result:', event);
        const transcript = event.results?.[0]?.transcript || '';
        if (transcript) {
          setInterimText(transcript);
          setContent(transcript);
        }
      });

      const errorSub = speechEmitter.addListener('error', (event: any) => {
        console.error('Speech error:', event);
        cleanupSubscriptions();
        setIsRecording(false);
        stopPulse();
        const errorMessage = event?.message || event?.error?.message || 'Could not recognize speech. Please try again.';
        Alert.alert('Voice Error', errorMessage);
      });

      const endSub = speechEmitter.addListener('end', () => {
        console.log('Speech ended');
        cleanupSubscriptions();
        setIsRecording(false);
        stopPulse();
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }
      });

      subscriptionsRef.current = [resultSub, errorSub, endSub];

      // Start recognition with Icelandic support
      await SpeechModule.ExpoSpeechRecognitionModule.start({
        lang: 'is-IS',  // Icelandic language code
        interimResults: true,
        maxAlternatives: 1,
        addsPunctuation: true,
      });

      setIsRecording(true);
      isRecordingRef.current = true;
      setInterimText('');
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Start timer
      setRecordingDuration(0);
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          // Auto-stop at max duration
          if (next >= MAX_RECORDING_DURATION) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
      
      // Safety: Auto-stop after max duration
      maxDurationTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          console.log('[Voice] Max duration reached, auto-stopping');
          stopRecording();
        }
      }, MAX_RECORDING_DURATION * 1000);

    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Recording Error', 'Could not start voice recording. Please type instead.');
    }
  };

  const stopRecording = useCallback(async () => {
    try {
      if (SpeechModule?.ExpoSpeechRecognitionModule) {
        await SpeechModule.ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      console.log('Stop error:', e);
    }
    
    cleanupSubscriptions();
    setIsRecording(false);
    isRecordingRef.current = false;
    stopPulse();
    
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const handleVoiceCapture = () => {
    // Debounce: Prevent rapid taps
    if (isRecordingRef.current !== isRecording) {
      console.log('[Voice] Debounce: Ignoring rapid tap');
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      if (!speechAvailable) {
        Alert.alert(
          'Voice Not Available',
          'Voice transcription requires speech recognition. Please enable microphone permissions in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // @ts-ignore
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }
      startRecording();
    }
  };

  const checkForDuplicates = async () => {
    try {
      const result = await clawsAPI.checkDuplicates(content.trim(), 0.7);
      if (result.has_duplicates && result.duplicates.length > 0) {
        setDuplicateData({
          suggestion: result.suggestion,
          duplicates: result.duplicates,
        });
        setShowDuplicateAlert(true);
        return true;
      }
      return false;
    } catch (error) {
      console.log('[Duplicate Check] Error:', error);
      return false;
    }
  };

  const proceedWithCapture = useCallback(async () => {
    if (!content.trim()) return;
    
    // Clear interim text first to prevent UI mismatch during processing
    setInterimText('');
    
    // Haptic: Capture initiated
    await playVocab('captureSuccess');
    setIsCapturing(true);
    setAiStatus('processing');
    
    // Haptic: AI thinking
    setTimeout(() => playVocab('aiThinking'), 200);
    
    try {
      let aiResult: any;
      
      // Check if we have camera analysis data to use
      if (cameraAnalysisRef.current && content.startsWith('[Photo]')) {
        console.log('[Capture] Using camera AI analysis...');
        const cameraData = cameraAnalysisRef.current;
        
        aiResult = {
          title: cameraData.title,
          category: cameraData.category,
          tags: cameraData.tags,
          action_type: cameraData.action_type,
          app_suggestion: cameraData.type === 'book' ? 'amazon' : 
                         cameraData.type === 'restaurant' ? 'maps' : null,
          expiry_days: cameraData.expiry_days,
          urgency: cameraData.confidence > 0.8 ? 'high' : 'medium',
          context: {
            who_mentioned: null,
            where: cameraData.location_context,
            when_context: null,
            specific_item: cameraData.brand || cameraData.title,
          },
          sentiment: 'neutral',
          why_capture: cameraData.description || 'Captured via camera',
          related_ids: [],
          source: cameraData.source || 'gemini_vision',
        };
        
        setAiStatus('success');
        // Clear camera analysis after use
        cameraAnalysisRef.current = null;
      } else {
        // Step 1: Smart AI analysis
        console.log('[Capture] Getting smart AI analysis...');
        aiResult = await smartAnalyze(content.trim(), true);
        
        // Set AI status for UI feedback
        if (aiResult.source === 'gemini') {
          setAiStatus('success');
        } else {
          setAiStatus('fallback');
        }
      }
      
      console.log('[Capture] AI Result:', aiResult);
      
      // Step 2: Prepare enriched data
      const extraData: any = {
        // AI enrichment
        suggested_title: aiResult.title,
        suggested_category: aiResult.category,
        suggested_tags: aiResult.tags,
        suggested_action: aiResult.action_type,
        suggested_app: aiResult.app_suggestion,
        suggested_expiry_days: aiResult.expiry_days,
        ai_urgency: aiResult.urgency,
        ai_context: aiResult.context,
        ai_sentiment: aiResult.sentiment,
        ai_why: aiResult.why_capture,
        ai_related: aiResult.related_ids,
        ai_source: aiResult.source,
      };
      
      // Override with VIP if user explicitly set it
      if (isPriority) {
        extraData.priority = true;
        extraData.priority_level = 'high';
        extraData.extra_reminders = true;
        console.log('[Capture] VIP Mode: User override');
      } else if (isSomeday) {
        // Someday items don't expire
        extraData.someday = true;
        extraData.suggested_expiry_days = 3650; // 10 years = effectively never
        extraData.suggested_category = 'someday';
        console.log('[Capture] Someday Mode: No expiry');
      } else if (aiResult.urgency === 'high') {
        // Auto-suggest VIP for high urgency items
        extraData.suggested_priority = true;
        console.log('[Capture] AI suggests VIP (high urgency)');
      }
      
      console.log('[Capture] Sending with AI data:', { content: content.trim(), ...extraData });
      const newClaw = await captureClaw(content.trim(), 'text', extraData);
      
      // Track AI usage (if this was a Gemini-powered capture)
      if (aiResult.source === 'gemini') {
        const updatedUsage = await incrementAIUsage();
        setAiUsage(updatedUsage);
      }

      // Track capture in analytics
      await patternTracker.recordCapture();
      await achievementEngine.recordCapture();
      
      // Reset state
      setContent('');
      setInterimText('');
      setInputKey(prev => prev + 1);
      setLastAnalysis(aiResult);
      setIsSomeday(false);
      
      // Show appropriate success message
      if (isPriority) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCapturedClawId(newClaw?.id);
        setShowVipModal(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAnalysisModal(true);
        setIsPriority(false);
      }
      
    } catch (error: any) {
      console.error('Capture failed:', error);
      
      const rateLimit = isRateLimitError(error);
      if (rateLimit.isRateLimit) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'AI is Thinking Too Hard!',
          'Please wait 60 seconds and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Capture Failed', error.message || 'Something went wrong');
      }
    } finally {
      setIsCapturing(false);
      setAiStatus('idle');
    }
  }, [content, isPriority, isSomeday, captureClaw, setLastCapture, setLastAnalysis]);

  const handleCapture = useCallback(async () => {
    if (!content.trim()) return;
    
    // Check for duplicates first
    const hasDuplicates = await checkForDuplicates();
    if (hasDuplicates) {
      setPendingCapture(true);
      return;
    }
    
    // No duplicates, proceed with capture
    proceedWithCapture();
  }, [content, proceedWithCapture]);

  const handleSuggestionPress = useCallback((suggestion: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPressedChip(index);
    setContent(suggestion);
    setTimeout(() => setPressedChip(null), 150);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <LinearGradient
      colors={[...colors.gradient.background]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>What do you want to</Text>
            <Text style={styles.highlight}>remember?</Text>
          </View>

          {/* Smart Suggestions */}
          <SmartSuggestionsWidget
            onSuggestionCapture={(suggestion) => {
              if (suggestion.suggestedClaw) {
                setContent(suggestion.suggestedClaw.content);
              }
            }}
          />

          {/* Quick Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Quick ideas:</Text>
            <View style={styles.suggestionsRow}>
              {QUICK_SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip,
                    pressedChip === index && styles.suggestionChipPressed,
                    content === suggestion && styles.suggestionChipActive,
                  ]}
                  onPress={() => handleSuggestionPress(suggestion, index)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[
                    styles.suggestionText,
                    content === suggestion && styles.suggestionTextActive,
                  ]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Input Card */}
          <View style={styles.inputCard}>
            <TextInput
              key={inputKey} // Force re-render to reset height after capture
              style={styles.input}
              placeholder="Type or speak (Íslenska/English)..."
              placeholderTextColor="#666"
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={500}
              textAlignVertical="top"
              editable={!isRecording}
            />
            
            {/* Priority & Someday Toggles */}
            {content.trim().length > 0 && (
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isPriority && styles.priorityToggleActive,
                    isSomeday && styles.toggleDisabled,
                  ]}
                  onPress={() => {
                    if (!isSomeday) {
                      setIsPriority(!isPriority);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  disabled={isSomeday}
                >
                  <Ionicons 
                    name={isPriority ? "flame" : "flame-outline"} 
                    size={16} 
                    color={isPriority ? "#fff" : isSomeday ? "#666" : "#FF6B35"} 
                  />
                  <Text style={[
                    styles.toggleText,
                    isPriority && styles.toggleTextActive,
                    isSomeday && { color: '#666' },
                  ]}>
                    {isPriority ? '🔥 VIP' : '⚡ VIP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isSomeday && styles.somedayToggleActive,
                    isPriority && styles.toggleDisabled,
                  ]}
                  onPress={() => {
                    if (!isPriority) {
                      setIsSomeday(!isSomeday);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  disabled={isPriority}
                >
                  <Ionicons 
                    name={isSomeday ? "bookmark" : "bookmark-outline"} 
                    size={16} 
                    color={isSomeday ? colors.text.primary : isPriority ? colors.text.disabled : colors.someday.DEFAULT} 
                  />
                  <Text style={[
                    styles.toggleText,
                    isSomeday && styles.toggleTextActive,
                    isPriority && { color: '#666' },
                  ]}>
                    {isSomeday ? '🔮 SOMEDAY' : '🔮 Someday'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputActions}>
              <View style={styles.statusRow}>
                <Text style={styles.charCount}>{content.length}/500</Text>
                {syncStatus.pending > 0 && (
                  <View style={styles.syncBadge}>
                    <Ionicons name="cloud-upload" size={12} color="#4CAF50" />
                    <Text style={styles.syncText}>{syncStatus.pending} syncing</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.buttonRow}>
                {/* Camera Button */}
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setShowCamera(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={22} color={colors.primary.DEFAULT} />
                </TouchableOpacity>

                {/* Voice Button */}
                <TouchableOpacity
                  style={[styles.voiceButton, isRecording && styles.recordingActive, !speechAvailable && styles.voiceDisabled]}
                  onPress={handleVoiceCapture}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isRecording && (
                    <Animated.View
                      style={[
                        styles.pulseRing,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    />
                  )}
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={24}
                    color={isRecording ? '#fff' : speechAvailable ? colors.primary.DEFAULT : colors.text.muted}
                  />
                </TouchableOpacity>

                {/* Capture Button */}
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    (!content.trim() || isCapturing) && styles.captureButtonDisabled,
                    isPriority && styles.captureButtonPriority,
                  ]}
                  onPress={handleCapture}
                  onLongPress={() => {
                    if (content.trim()) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      setConversationContent(content.trim());
                      setShowConversation(true);
                    }
                  }}
                  disabled={!content.trim() || isCapturing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={content.trim() 
                      ? isPriority 
                        ? ['#FFD700', '#FF6B35'] // Gold/Orange for priority
                        : ['#FF6B35', '#e94560']
                      : ['#444', '#444']
                    }
                    style={styles.captureGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isCapturing ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.captureButtonText}>
                          {aiStatus === 'processing' ? '🤔 AI Thinking...' : 
                           aiStatus === 'success' ? '✨ AI Ready!' : 
                           'Saving...'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.captureButtonText}>
                          {isPriority ? '🔥 VIP CLAW' : 'CLAW IT'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Recording Indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Listening... {formatDuration(recordingDuration)}</Text>
              {interimText ? (
                <Text style={styles.interimText}>{interimText}</Text>
              ) : (
                <Text style={styles.recordingHint}>Speak now...</Text>
              )}
            </View>
          )}

          {/* AI Energy Meter */}
          <AIEnergyMeter 
            used={aiUsage?.count || 0}
            limit={5}
            isPro={isPro}
            onUpgrade={() => Alert.alert('Pro Feature', 'Upgrade to Pro for unlimited AI!')}
          />

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={20} color="#FF6B35" />
              <Text style={styles.tipText}>
                Be specific: "Book Sarah recommended" beats "that book"
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="location-outline" size={20} color="#FF6B35" />
              <Text style={styles.tipText}>
                CLAW will remind you at Bónus, Krónan, etc.
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons 
                name={aiAvailable === true ? "sparkles" : "sparkles-outline"} 
                size={20} 
                color={aiAvailable === true ? colors.gold.DEFAULT : colors.text.muted} 
              />
              <Text style={[
                styles.tipText, 
                { color: aiAvailable === true ? colors.gold.DEFAULT : colors.text.muted }
              ]}>
                {aiAvailable === false 
                  ? "AI offline - using keyword matching" 
                  : "AI-powered: Smart categorization for your intentions"}
              </Text>
            </View>
            {!speechAvailable && (
              <View style={styles.tipRow}>
                <Ionicons name="mic-off-outline" size={20} color="#666" />
                <Text style={[styles.tipText, { color: '#888' }]}>
                  Voice not available on this device - use quick suggestions or type
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* VIP Success Modal */}
      <VipSuccessModal
        visible={showVipModal}
        onClose={() => {
          setShowVipModal(false);
          setIsPriority(false);
          setCapturedClawId(null);
        }}
        onSetDeadline={() => {
          console.log('[Capture] Set Deadline pressed');
          setShowVipModal(false);
          setTimeout(() => setShowDeadlineAlert(true), 300);
        }}
        onSetAlarm={() => {
          console.log('[Capture] Set Alarm pressed');
          setShowVipModal(false);
          setTimeout(() => setShowAlarmAlert(true), 300);
        }}
        onDismiss={() => {
          setShowVipModal(false);
          setIsPriority(false);
          setIsSomeday(false);
          setCapturedClawId(null);
        }}
      />

      {/* Dark Deadline Alert */}
      <DarkAlert
        visible={showDeadlineAlert}
        title="⏰ Set VIP Deadline"
        message="How urgent is this item?"
        options={[
          { text: '24 hours', onPress: () => Alert.alert('✓ Set!', 'Deadline: 24 hours') },
          { text: '3 days', onPress: () => Alert.alert('✓ Set!', 'Deadline: 3 days') },
          { text: '7 days', onPress: () => Alert.alert('✓ Set!', 'Deadline: 7 days') },
          { text: 'Cancel', style: 'cancel' },
        ]}
        onDismiss={() => setShowDeadlineAlert(false)}
      />

      {/* Dark Alarm Alert */}
      <DarkAlert
        visible={showAlarmAlert}
        title="🔔 Set VIP Alarm"
        message="When should we remind you?"
        options={[
          { text: '1 hour', onPress: () => Alert.alert('✓ Alarm Set!', 'Reminder in 1 hour') },
          { text: '4 hours', onPress: () => Alert.alert('✓ Alarm Set!', 'Reminder in 4 hours') },
          { text: '8 hours', onPress: () => Alert.alert('✓ Alarm Set!', 'Reminder in 8 hours') },
          { text: '24 hours', onPress: () => Alert.alert('✓ Alarm Set!', 'Reminder in 24 hours') },
          { text: 'Cancel', style: 'cancel' },
        ]}
        onDismiss={() => setShowAlarmAlert(false)}
      />

      {/* AI Analysis Result Modal */}
      {lastAnalysis && (
        <DarkAlert
          visible={showAnalysisModal}
          title={`${getSentimentEmoji(lastAnalysis.sentiment)} AI Analysis`}
          message={`"${lastAnalysis.title}"\n\nCategory: ${lastAnalysis.category}\nUrgency: ${getUrgencyLabel(lastAnalysis.urgency)}\nExpires: ${lastAnalysis.expiry_days} days\n${lastAnalysis.why_capture ? `\nWhy: ${lastAnalysis.why_capture}` : ''}`}
          options={[
            { 
              text: '✓ Looks Good!', 
              onPress: () => {
                setShowAnalysisModal(false);
                setLastAnalysis(null);
              }
            },
            ...(lastAnalysis.related_ids?.length > 0 ? [{
              text: `⚠️ ${lastAnalysis.related_ids.length} Related Items`,
              onPress: () => {
                Alert.alert('Related Items Found', 'Check your vault for similar items!');
                setShowAnalysisModal(false);
                setLastAnalysis(null);
              }
            }] : []),
            { 
              text: 'Make VIP', 
              onPress: () => {
                setShowAnalysisModal(false);
                setLastAnalysis(null);
                // Re-capture the same content as VIP
                setTimeout(() => {
                  setIsPriority(true);
                  Alert.alert('VIP Mode Enabled', 'Tap CLAW IT to capture as VIP! 🔥');
                }, 300);
              }
            },
          ]}
          onDismiss={() => {
            setShowAnalysisModal(false);
            setLastAnalysis(null);
          }}
        />
      )}

      {/* Camera Capture Modal */}
      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(uri, analysis) => {
          setShowCamera(false);
          
          // Build rich content from AI analysis
          const extractedText = analysis.extracted_text 
            ? `\n\nExtracted text: "${analysis.extracted_text}"` 
            : '';
          const brandInfo = analysis.brand 
            ? ` (${analysis.brand})` 
            : '';
          const locationInfo = analysis.location_context 
            ? ` at ${analysis.location_context}` 
            : '';
          
          setContent(`[Photo] ${analysis.title}${brandInfo}${locationInfo}${extractedText}`);
          
          // Store AI analysis in a ref for use during actual capture
          // This will be used when user taps CLAW IT
          (cameraAnalysisRef as any).current = analysis;
          
          Alert.alert(
            '📸 Photo Analyzed',
            `AI identified: "${analysis.title}"\nCategory: ${analysis.category}\nConfidence: ${Math.round(analysis.confidence * 100)}%`,
            [{ text: 'Review & CLAW it!', style: 'default' }]
          );
        }}
      />

      {/* Duplicate Alert */}
      {duplicateData && (
        <DuplicateAlert
          visible={showDuplicateAlert}
          suggestion={duplicateData.suggestion}
          duplicates={duplicateData.duplicates}
          onClose={() => {
            setShowDuplicateAlert(false);
            setPendingCapture(false);
          }}
          onCaptureAnyway={() => {
            setShowDuplicateAlert(false);
            proceedWithCapture();
          }}
          onExtendExisting={async (clawId) => {
            setShowDuplicateAlert(false);
            setPendingCapture(false);
            // Extend the existing claw by 7 days
            try {
              await clawsAPI.extend(clawId, 7);
              Alert.alert('✓ Extended!', 'Existing item extended by 7 days.');
              setContent('');
              setInterimText('');
              setInputKey(prev => prev + 1);
            } catch (error) {
              Alert.alert('Error', 'Could not extend item');
            }
          }}
          onViewDuplicates={() => {
            setShowDuplicateAlert(false);
            setPendingCapture(false);
            // Navigate to vault (parent component should handle this)
            Alert.alert('Go to Vault', 'Check your vault to see all similar items');
          }}
        />
      )}

      {/* Conversation Capture Modal */}
      <ConversationCapture
        visible={showConversation}
        initialContent={conversationContent}
        onClose={() => {
          setShowConversation(false);
          setConversationContent('');
        }}
        onComplete={(enrichedData) => {
          setShowConversation(false);
          setConversationContent('');
          
          // Update content with enriched data
          if (enrichedData.final_content) {
            setContent(enrichedData.final_content);
          }
          
          // Store enriched data for capture
          (cameraAnalysisRef as any).current = {
            title: enrichedData.final_content,
            category: enrichedData.category,
            tags: enrichedData.tags || [],
            action_type: 'remember',
            app_suggestion: null,
            expiry_days: enrichedData.urgency === 'high' ? 3 : 7,
            urgency: enrichedData.urgency || 'medium',
            context: enrichedData.context || {},
            sentiment: 'neutral',
            why_capture: enrichedData.conversation_summary,
            related_ids: [],
            source: 'conversation',
          };
          
          // Proceed with capture
          setTimeout(() => proceedWithCapture(), 100);
        }}
      />
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
    padding: spacing.lg,
    paddingTop: spacing['6xl'],
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.presets.h1,
  },
  highlight: {
    ...typography.presets.h1,
    color: colors.primary.DEFAULT,
  },
  suggestionsContainer: {
    marginBottom: spacing.lg,
  },
  suggestionsLabel: {
    color: colors.text.muted,
    fontSize: typography.size.base,
    marginBottom: spacing.md,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: colors.primary.muted,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: spacing['5xl'],
    justifyContent: 'center',
  },
  suggestionChipPressed: {
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    transform: [{ scale: 0.95 }],
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.25)',
    borderColor: colors.primary.DEFAULT,
  },
  suggestionText: {
    color: colors.primary.DEFAULT,
    fontSize: typography.size.sm,
  },
  suggestionTextActive: {
    fontWeight: typography.weight.bold,
  },
  inputCard: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 120,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    lineHeight: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.muted,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.border,
    flex: 1,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  priorityToggleActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  somedayToggleActive: {
    backgroundColor: colors.someday.DEFAULT,
    borderColor: colors.someday.DEFAULT,
  },
  toggleText: {
    color: colors.primary.DEFAULT,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    marginLeft: spacing.sm,
  },
  toggleTextActive: {
    color: colors.text.primary,
  },
  inputActions: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  charCount: {
    color: colors.text.muted,
    fontSize: typography.size.xs,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  syncText: {
    color: colors.success.DEFAULT,
    fontSize: typography.size.xs,
    marginLeft: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cameraButton: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  voiceButton: {
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.border,
  },
  voiceDisabled: {
    backgroundColor: colors.surface.pressed,
    borderColor: colors.border.DEFAULT,
  },
  recordingActive: {
    backgroundColor: colors.danger.DEFAULT,
    borderColor: colors.danger.DEFAULT,
  },
  pulseRing: {
    position: 'absolute',
    width: spacing['5xl'],
    height: spacing['5xl'],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.danger.DEFAULT,
    backgroundColor: colors.danger.muted,
  },
  captureButton: {
    flex: 1,
    marginLeft: spacing.lg,
    borderRadius: borderRadius['3xl'],
    overflow: 'hidden',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonPriority: {
    ...shadows.gold,
  },
  captureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  captureButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  recordingIndicator: {
    alignItems: 'center',
    backgroundColor: colors.danger.muted,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  recordingDot: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.danger.DEFAULT,
    marginBottom: spacing.sm,
  },
  recordingText: {
    color: colors.danger.DEFAULT,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  interimText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  recordingHint: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
  tipsContainer: {
    gap: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
    flex: 1,
  },
});
