/**
 * Conversation Capture - Multi-turn AI conversation for richer context
 * 
 * Instead of simple capture, users have a back-and-forth with CLAW
 * to clarify and enrich their intentions
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '../theme';
import { apiRequest } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationCaptureProps {
  visible: boolean;
  initialContent: string;
  onClose: () => void;
  onComplete: (enrichedData: any) => void;
}

export default function ConversationCapture({
  visible,
  initialContent,
  onClose,
  onComplete,
}: ConversationCaptureProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Start conversation when modal opens
  useEffect(() => {
    if (visible && initialContent) {
      startConversation();
    }
  }, [visible, initialContent]);

  const startConversation = async () => {
    setIsLoading(true);
    try {
      const result = await apiRequest<any>('POST', '/conversation/start', {
        initial_content: initialContent,
      });
      
      setSessionId(result.session_id);
      setMessages(result.messages);
      
      if (result.is_complete) {
        setIsComplete(true);
        setEnrichedData(result.enriched_data);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Fallback to simple capture
      onComplete({ final_content: initialContent });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId || isLoading) return;

    const message = inputText.trim();
    setInputText('');
    setIsLoading(true);
    
    // Add user message locally
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await apiRequest<any>('POST', '/conversation/continue', {
        session_id: sessionId,
        message: message,
      });

      setMessages(result.messages);
      
      if (result.is_complete) {
        setIsComplete(true);
        setEnrichedData(result.enriched_data);
      }
    } catch (error) {
      console.error('Failed to continue conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const finalize = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const result = await apiRequest<any>('POST', '/conversation/finalize', {
        session_id: sessionId,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(result);
    } catch (error) {
      console.error('Failed to finalize:', error);
      onComplete({ final_content: initialContent });
    }
  };

  const skipConversation = () => {
    onComplete({ final_content: initialContent });
  };

  const cancel = async () => {
    if (sessionId) {
      try {
        await apiRequest('DELETE', `/conversation/session/${sessionId}`);
      } catch (e) {
        // Ignore error
      }
    }
    onClose();
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const getCategoryEmoji = (category?: string) => {
    const map: Record<string, string> = {
      book: '📚',
      movie: '🎬',
      restaurant: '🍽️',
      product: '🛒',
      task: '✅',
      idea: '💡',
      gift: '🎁',
      event: '📅',
    };
    return (category && map[category]) || '📝';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={cancel}
    >
      <LinearGradient
        colors={[...colors.gradient.background]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={cancel}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Ionicons name="chatbubbles" size={24} color={colors.primary.DEFAULT} />
              <Text style={styles.headerTitle}>Smart Capture</Text>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={skipConversation}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="sparkles" size={16} color={colors.gold.DEFAULT} />
            <Text style={styles.infoText}>
              Let's clarify your intention for better reminders
            </Text>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageContent,
                    msg.role === 'user' ? styles.userContent : styles.aiContent,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            
            {isLoading && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>CLAW is thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Completion Summary */}
          {isComplete && enrichedData && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryEmoji}>
                  {getCategoryEmoji(enrichedData.category)}
                </Text>
                <Text style={styles.summaryTitle}>Ready to Capture!</Text>
              </View>
              
              <Text style={styles.summaryContent}>
                {enrichedData.refined_title || enrichedData.original_content}
              </Text>
              
              {enrichedData.category && (
                <View style={styles.summaryTag}>
                  <Text style={styles.summaryTagText}>
                    {enrichedData.category}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.captureBtn} onPress={finalize}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.captureBtnText}>CLAW IT!</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          {!isComplete && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type your response..."
                placeholderTextColor={colors.text.muted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={200}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? '#fff' : colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  skipBtn: {
    padding: spacing.sm,
  },
  skipText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold.muted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.gold.DEFAULT,
    fontSize: typography.size.sm,
    marginLeft: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  messagesContent: {
    paddingVertical: spacing.md,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  messageContent: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userContent: {
    backgroundColor: colors.primary.DEFAULT,
    borderBottomRightRadius: spacing.xs,
  },
  aiContent: {
    backgroundColor: colors.surface.elevated,
    borderBottomLeftRadius: spacing.xs,
  },
  messageText: {
    fontSize: typography.size.base,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: colors.text.primary,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: spacing.xs,
  },
  loadingText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surface.DEFAULT,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderColor: colors.success.DEFAULT,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.success.DEFAULT,
  },
  summaryContent: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  summaryTag: {
    backgroundColor: colors.primary.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  summaryTagText: {
    color: colors.primary.DEFAULT,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    textTransform: 'capitalize',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success.DEFAULT,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  captureBtnText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginLeft: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.surface.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingRight: 50,
    color: colors.text.primary,
    fontSize: typography.size.base,
    maxHeight: 100,
    minHeight: 48,
  },
  sendBtn: {
    position: 'absolute',
    right: spacing.lg + 8,
    bottom: spacing.lg + 8,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surface.elevated,
  },
});
