import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  bg?: string;
}

export function StatCard({ label, value, icon, color = colors.green[600], bg = colors.green[50] }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        {icon}
      </View>
      <Text style={[styles.value, { color: colors.gray[900] }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    minWidth: '45%',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: { ...typography.heading2, marginBottom: spacing.xs },
  label: { ...typography.bodySmall, color: colors.gray[500] },
});
