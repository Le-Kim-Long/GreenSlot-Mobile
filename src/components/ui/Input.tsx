import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.gray[400]}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    ...typography.label,
    color: colors.green[900],
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.green[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.gray[900],
  },
  inputError: { borderColor: colors.red[600] },
  error: {
    ...typography.caption,
    color: colors.red[600],
    marginTop: spacing.xs,
  },
});
