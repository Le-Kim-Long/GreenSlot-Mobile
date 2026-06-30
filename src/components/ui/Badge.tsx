import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: colors.green[100], text: colors.green[800] },
  yellow: { bg: colors.yellow[100], text: colors.yellow[800] },
  red: { bg: colors.red[100], text: colors.red[800] },
  blue: { bg: colors.blue[100], text: colors.blue[800] },
  gray: { bg: colors.gray[100], text: colors.gray[700] },
};

export function Badge({ label, variant = 'green' }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  text: { ...typography.caption, fontFamily: 'Inter_500Medium' },
});

export function statusToBadge(status: string): { label: string; variant: BadgeVariant } {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    ACTIVE: { label: 'Đang thuê', variant: 'green' },
    PENDING: { label: 'Chờ thanh toán', variant: 'yellow' },
    COMPLETED: { label: 'Đã hoàn thành', variant: 'gray' },
    CANCELLED: { label: 'Đã hủy', variant: 'red' },
    SUCCESS: { label: 'Thành công', variant: 'green' },
    PAID: { label: 'Đã thanh toán', variant: 'green' },
    FAILED: { label: 'Thất bại', variant: 'red' },
    PENDING_PAYMENT: { label: 'Chờ TT', variant: 'yellow' },
  };
  return map[status] || { label: status, variant: 'gray' };
}
