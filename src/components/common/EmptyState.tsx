import { View, Text, StyleSheet } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, spacing } from '../../theme/typography';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Leaf size={48} color={colors.green[300]} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  title: { ...typography.body, color: colors.gray[500], textAlign: 'center' },
  subtitle: { ...typography.bodySmall, color: colors.gray[400], textAlign: 'center' },
});
