import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { PaymentTransactionInfo } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

interface PaymentItem extends PaymentTransactionInfo {
  slotNumber: string;
  rentalId: number;
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const history = await bookingApi.getHistory();
      const items: PaymentItem[] = [];
      history.forEach(r => {
        r.transactions?.forEach(tx => {
          items.push({ ...tx, slotNumber: r.slotNumber, rentalId: r.id });
        });
      });
      items.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setPayments(items);
    } catch {
      setPayments([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={payments}
      keyExtractor={item => `${item.rentalId}-${item.id}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
      ListEmptyComponent={<EmptyState title="Chưa có giao dịch" subtitle="Lịch sử thanh toán sẽ hiển thị tại đây" />}
      renderItem={({ item }) => {
        const badge = statusToBadge(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.icon}>
                <CreditCard size={20} color={colors.green[600]} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.title}>Ô {item.slotNumber}</Text>
                <Text style={styles.ref}>Mã GD: {item.vnpTxnRef || `#${item.id}`}</Text>
                <Text style={styles.date}>
                  {item.paymentDate ? new Date(item.paymentDate).toLocaleString('vi-VN') : '-'}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <Badge label={badge.label} variant={badge.variant} />
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  title: { ...typography.label, color: colors.gray[900] },
  ref: { ...typography.caption, color: colors.gray[500] },
  date: { ...typography.caption, color: colors.gray[400] },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { ...typography.label, color: colors.green[600] },
});
