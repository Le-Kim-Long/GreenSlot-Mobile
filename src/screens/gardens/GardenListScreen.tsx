import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Search, MapPin } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { AvailableSlotDTO } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';

export default function GardenListScreen({ navigation }: CustomerTabProps<'Gardens'>) {
  const [slots, setSlots] = useState<AvailableSlotDTO[]>([]);
  const [filtered, setFiltered] = useState<AvailableSlotDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await bookingApi.getAvailableSlots();
      setSlots(data);
      setFiltered(data);
    } catch {
      setSlots([]);
      setFiltered([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(slots);
      return;
    }
    setFiltered(
      slots.filter(
        s =>
          s.slotNumber.toLowerCase().includes(q) ||
          s.locationName?.toLowerCase().includes(q) ||
          s.pillarCode?.toLowerCase().includes(q)
      )
    );
  }, [search, slots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const parentNav = navigation.getParent();

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Khám phá vườn</Text>
        <Text style={styles.sub}>{filtered.length} ô vườn khả dụng</Text>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã ô, vị trí..."
          placeholderTextColor={colors.gray[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        ListEmptyComponent={<EmptyState title="Không có ô vườn khả dụng" subtitle="Vui lòng thử lại sau" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => parentNav?.navigate('GardenDetail', { slot: item })}
          >
            <View style={styles.cardIcon}>
              <Leaf size={24} color={colors.green[600]} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Ô {item.slotNumber}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.gray[400]} />
                <Text style={styles.location}>{item.locationName} · {item.pillarCode}</Text>
              </View>
              <Text style={styles.price}>{formatCurrency(item.price)}/tháng</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status === 'AVAILABLE' ? 'Trống' : item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.heading2, color: colors.gray[900] },
  sub: { ...typography.bodySmall, color: colors.gray[500] },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[200],
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.gray[900], paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.label, color: colors.gray[900], marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  location: { ...typography.caption, color: colors.gray[500] },
  price: { ...typography.label, color: colors.green[600] },
  statusBadge: {
    backgroundColor: colors.green[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusText: { ...typography.caption, color: colors.green[800], fontFamily: 'Inter_500Medium' },
});
