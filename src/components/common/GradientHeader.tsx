import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
}

export function GradientHeader({ title, subtitle }: GradientHeaderProps) {
  return (
    <View style={[styles.wrapper, { backgroundColor: colors.green[600] }]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading3, color: colors.white, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.green[100] },
});
