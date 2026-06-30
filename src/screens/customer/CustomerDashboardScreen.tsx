import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Clock, CheckCircle, TrendingUp } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { GradientHeader } from '../../components/common/GradientHeader';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';

export default function CustomerDashboardScreen() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await bookingApi.getHistory();
      setRentals(data);
    } catch {
      setRentals([]);
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

  const active = rentals.filter(r => r.status === 'ACTIVE');
  const pending = rentals.filter(r => r.status === 'PENDING');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
      >
        <GradientHeader
          title={`Xin chào, ${user?.name}!`}
          subtitle={active.length > 0 ? `Bạn đang thuê ${active.length} ô vườn` : 'Khám phá và thuê ô vườn để bắt đầu'}
        />

        <View style={styles.statsRow}>
          <StatCard label="Đang thuê" value={active.length} icon={<Leaf size={20} color={colors.green[600]} />} />
          <StatCard label="Chờ TT" value={pending.length} icon={<Clock size={20} color={colors.yellow[600]} />} bg={colors.yellow[50]} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Tổng đơn" value={rentals.length} icon={<TrendingUp size={20} color={colors.blue[600]} />} bg={colors.blue[50]} />
          <StatCard label="Hoàn thành" value={rentals.filter(r => r.status === 'COMPLETED').length} icon={<CheckCircle size={20} color={colors.purple[600]} />} bg={colors.purple[50]} />
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Vườn đang thuê</Text>
          {active.length === 0 ? (
            <Text style={styles.empty}>Chưa có vườn đang thuê</Text>
          ) : (
            active.slice(0, 5).map(r => {
              const badge = statusToBadge(r.status);
              return (
                <View key={r.id} style={styles.rentalRow}>
                  <View style={styles.rentalIcon}>
                    <Leaf size={18} color={colors.green[600]} />
                  </View>
                  <View style={styles.rentalBody}>
                    <Text style={styles.rentalTitle}>{r.slotNumber}</Text>
                    <Text style={styles.rentalSub}>{r.locationName}</Text>
                  </View>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md },
  empty: { ...typography.body, color: colors.gray[400], textAlign: 'center', paddingVertical: spacing.lg },
  rentalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  rentalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentalBody: { flex: 1 },
  rentalTitle: { ...typography.label, color: colors.gray[900] },
  rentalSub: { ...typography.caption, color: colors.gray[500] },
});
