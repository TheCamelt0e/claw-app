/**
 * Dark Themed Alert - Replaces ugly white system alerts
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DarkAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  options: {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
  onDismiss?: () => void;
}

export default function DarkAlert({ visible, title, message, options, onDismiss }: DarkAlertProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="flame" size={32} color="#FFD700" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  index < options.length - 1 && styles.optionBorder,
                  option.style === 'destructive' && styles.destructiveOption,
                  option.style === 'cancel' && styles.cancelOption,
                ]}
                onPress={() => {
                  option.onPress?.();
                  onDismiss?.();
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  option.style === 'destructive' && styles.destructiveText,
                  option.style === 'cancel' && styles.cancelText,
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    width: '100%',
  },
  option: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  destructiveOption: {
    // No special styling
  },
  destructiveText: {
    color: '#e94560',
  },
  cancelOption: {
    // No special styling
  },
  cancelText: {
    color: '#888',
  },
});
