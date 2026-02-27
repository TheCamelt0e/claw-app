/**
 * 🪟 Modal Component
 * Consistent modal styling using design system
 */
import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ModalProps as RNModalProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../../theme';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  containerStyle?: ViewStyle;
  testID?: string;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  children,
  onClose,
  showCloseButton = true,
  containerStyle,
  testID,
  ...props
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
      {...props}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, containerStyle]}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {showCloseButton && onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.background.DEFAULT,
    borderRadius: borderRadius['2xl'],
    width: '100%',
    maxWidth: 400,
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  title: {
    ...typography.presets.h4,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
  content: {
    padding: spacing.lg,
  },
});

export default Modal;
