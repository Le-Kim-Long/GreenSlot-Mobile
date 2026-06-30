import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Leaf } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';

type TabKey = 'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED';

export default function MyRentalsScreen({ navigation }: CustomerTabProps<'Rentals'>) {
  const [rentals, setRentals] = useState<BookingHistory[]>([]);
  const [tab, setTab] = useState<TabKey>('ALL');
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

  const filtered = tab === 'ALL' ? rentals : rentals.filter(r => r.status === tab);

  const handleExtend = (rental: BookingHistory) => {
    Alert.alert('Gia hạn thuê', 'Chọn số tháng muốn gia hạn:', [
      { text: 'Hủy', style: 'cancel' },
      { text: '1 tháng', onPress: () => doExtend(rental, 1) },
      { text: '3 tháng', onPress: () => doExtend(rental, 3) },
      { text: '6 tháng', onPress: () => doExtend(rental, 6) },
    ]);
  };

  const doExtend = async (rental: BookingHistory, months: number) => {
    try {
      const result = await bookingApi.extendBooking({ rentalId: rental.id, durationInMonths: months });
      if (result.paymentUrl) {
        await Linking.openURL(result.paymentUrl);
      }
      await load();
    } catch {
      Alert.alert('Lỗi', 'Không thể gia hạn. Vui lòng thử lại.');
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang thuê' },
    { key: 'PENDING', label: 'Chờ TT' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vườn đang thuê</Text>
      </View>

      <View style={styles.tabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        ListEmptyComponent={
          <EmptyState
            title="Chưa có đơn thuê"
            subtitle="Khám phá và thuê ô vườn để bắt đầu"
          />
        }
        renderItem={({ item }) => {
          const badge = statusToBadge(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Leaf size={22} color={colors.green[600]} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.slotNumber}</Text>
                  <Text style={styles.cardSub}>{item.locationName}</Text>
                  <Text style={styles.cardDate}>{item.startDate} — {item.endDate}</Text>
                </View>
                <Badge label={badge.label} variant={badge.variant} />
              </View>
              <Text style={styles.cardPrice}>{formatCurrency(item.totalPrice)}</Text>
              {item.status === 'ACTIVE' && (
                <Button title="Gia hạn" onPress={() => handleExtend(item)} variant="outline" style={styles.extendBtn} />
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.heading2, color: colors.gray[900] },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  tabActive: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  tabText: { ...typography.caption, color: colors.gray[500], fontFamily: 'Inter_500Medium' },
  tabTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.label, color: colors.gray[900] },
  cardSub: { ...typography.caption, color: colors.gray[500] },
  cardDate: { ...typography.caption, color: colors.gray[400], marginTop: 2 },
  cardPrice: { ...typography.label, color: colors.green[600], marginBottom: spacing.sm },
  extendBtn: { marginTop: spacing.xs },
});
