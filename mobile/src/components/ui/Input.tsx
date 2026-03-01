/**
 * 📝 Input Component
 * Consistent text input styling using design system
 */
import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Text,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, helper, containerStyle, inputStyle, testID, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        {label && (
          <Text style={styles.label}>{label}</Text>
        )}
        <View style={[
          styles.inputContainer,
          error ? styles.inputError : undefined,
          props.editable === false ? styles.inputDisabled : undefined,
        ]}>
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor={colors.text.muted}
            {...props}
          />
        </View>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helper ? (
          <Text style={styles.helperText}>{helper}</Text>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.presets.label,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  input: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.md,
    color: colors.text.primary,
    minHeight: 56,
  },
  inputError: {
    borderColor: colors.danger.DEFAULT,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surface.pressed,
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.danger.DEFAULT,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
});

export default Input;
