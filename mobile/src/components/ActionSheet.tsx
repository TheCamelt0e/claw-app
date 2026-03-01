/**
 * Custom Action Sheet - Dark themed, dismissible by tapping outside
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const { height } = Dimensions.get('window');

interface ActionSheetOption {
  text: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: string;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
  isLoading?: boolean;
}

export default function ActionSheet({ visible, title, options, onClose, isLoading }: ActionSheetProps) {
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleOptionPress = (onPress: () => void) => {
    onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              {title && (
                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={2}>{title}</Text>
                </View>
              )}
              
              <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.option,
                      index < options.length - 1 && styles.optionBorder,
                      option.destructive && styles.destructiveOption,
                      isLoading && { opacity: 0.5 },
                    ]}
                    onPress={() => !isLoading && handleOptionPress(option.onPress)}
                    activeOpacity={isLoading ? 1 : 0.7}
                    disabled={isLoading}
                  >
                    {option.icon && (
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={option.destructive ? colors.danger.DEFAULT : colors.text.primary} 
                        style={styles.optionIcon}
                      />
                    )}
                    <Text style={[
                      styles.optionText,
                      option.destructive && styles.destructiveText,
                    ]}>
                      {option.text}
                    </Text>
                    {isLoading ? (
                      <Ionicons name="hourglass" size={18} color={colors.text.muted} />
                    ) : !option.destructive && option.text !== 'Cancel' && (
                      <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'transparent',
    padding: 16,
    paddingBottom: 32,
  },
  titleContainer: {
    backgroundColor: colors.background.DEFAULT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: colors.background.elevated,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background.DEFAULT,
  },
  destructiveOption: {
    // No special styling needed
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  destructiveText: {
    color: colors.danger.DEFAULT,
  },
  cancelButton: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: colors.primary.DEFAULT,
    fontSize: 16,
    fontWeight: '600',
  },
});
