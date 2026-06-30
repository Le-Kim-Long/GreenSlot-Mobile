import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

type Variant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.green[600]} />
      ) : (
        <Text style={[styles.text, textVariantStyles[variant]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: { opacity: 0.5 },
  text: { ...typography.button },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.green[600] },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.green[200] },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.green[600] },
};

const textVariantStyles: Record<Variant, TextStyle> = {
  primary: { color: colors.white },
  secondary: { color: colors.green[800] },
  outline: { color: colors.green[700] },
};
