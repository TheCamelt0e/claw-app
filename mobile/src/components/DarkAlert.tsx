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
import { colors } from '../theme';

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
  icon?: 'flame' | 'warning' | 'success' | 'info';
}

const iconNameMap: Record<'flame' | 'warning' | 'success' | 'info', React.ComponentProps<typeof Ionicons>['name']> = {
  flame: 'flame',
  warning: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
};

const iconColorMap: Record<'flame' | 'warning' | 'success' | 'info', string> = {
  flame: colors.gold.DEFAULT,
  warning: colors.danger.DEFAULT,
  success: colors.success.DEFAULT,
  info: colors.info.DEFAULT,
};

export default function DarkAlert({ visible, title, message, options, onDismiss, icon = 'flame' }: DarkAlertProps) {
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
          <View style={[
            styles.iconContainer,
            icon === 'warning' && { backgroundColor: 'rgba(233, 69, 96, 0.15)', borderColor: colors.danger.DEFAULT },
            icon === 'success' && { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: colors.success.DEFAULT },
            icon === 'info' && { backgroundColor: 'rgba(33, 150, 243, 0.15)', borderColor: colors.info.DEFAULT },
          ]}>
            <Ionicons 
              name={iconNameMap[icon]} 
              size={32} 
              color={iconColorMap[icon]} 
            />
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
                onPress={async () => {
                  if (option.onPress) {
                    await option.onPress();
                  }
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
    backgroundColor: colors.background.DEFAULT,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.gold.DEFAULT,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold.DEFAULT,
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
