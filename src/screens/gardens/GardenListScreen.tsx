import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronRight, Grid3X3, MapPin, Search, SlidersHorizontal, Sprout } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { locationApi } from '../../api/locationApi';
import type { AvailableSlotDTO, LocationDTO } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';

function getSlotStatusLabel(status?: string): string {
  switch (status) {
    case 'AVAILABLE': return 'Còn trống';
    case 'PENDING_PAYMENT': return 'Chờ thanh toán';
    case 'RENTED': return 'Đã cho thuê';
    default: return status || 'Đang cập nhật';
  }
}

export default function GardenListScreen({ navigation }: CustomerTabProps<'Gardens'>) {
  const [slots, setSlots] = useState<AvailableSlotDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [locationId, setLocationId] = useState<number | undefined>();
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [available, locationData] = await Promise.all([bookingApi.getAvailableSlots(locationId), locationApi.getAll().catch(() => [])]);
      setSlots(available); setLocations(locationData);
    } catch { setSlots([]); }
  }, [locationId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return slots.filter(slot => {
      const matchesQuery = !query || [slot.slotNumber, slot.pillarCode, slot.locationName, slot.locationAddress].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
      return matchesQuery && (!maxPrice || slot.price <= maxPrice);
    });
  }, [slots, search, maxPrice]);

  const parentNav = navigation.getParent();
  const selectedLocation = locations.find(location => location.id === locationId);
  if (loading) return <LoadingScreen />;
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}>
      <View style={styles.eyebrow}><Sprout size={14} color={colors.green[700]} /><Text style={styles.eyebrowText}>HỆ THỐNG CƠ SỞ GREENSLOT</Text></View>
      <Text style={styles.title}>Chọn cơ sở & thuê ô vườn</Text>
      <Text style={styles.subtitle}>Lựa chọn cơ sở gần bạn và đặt thuê ô vườn thông minh theo nhu cầu</Text>
    </View>
    <Text style={styles.sectionLabel}>CHỌN CƠ SỞ VƯỜN</Text>
    <View style={styles.locationSelectWrapper}>
      <TouchableOpacity style={styles.locationSelect} activeOpacity={0.8} onPress={() => setLocationMenuOpen(open => !open)}>
        <View style={styles.locationSelectContent}>
          {selectedLocation ? <MapPin size={17} color={colors.green[600]} /> : <Grid3X3 size={17} color={colors.green[600]} />}
          <Text style={styles.locationSelectText} numberOfLines={1}>{selectedLocation?.name || 'Tất cả cơ sở'}</Text>
          {!selectedLocation ? <Text style={styles.locationCount}>{slots.length}</Text> : null}
        </View>
        <ChevronDown size={19} color={colors.gray[600]} />
      </TouchableOpacity>
      {locationMenuOpen ? <View style={styles.locationMenu}>
        <TouchableOpacity style={[styles.locationOption, !locationId && styles.locationOptionActive]} onPress={() => { setLocationId(undefined); setLocationMenuOpen(false); }}>
          <Grid3X3 size={16} color={colors.green[600]} />
          <Text style={[styles.locationOptionText, !locationId && styles.locationOptionTextActive]}>Tất cả cơ sở</Text>
          <Text style={styles.locationCount}>{slots.length}</Text>
          {!locationId ? <Check size={17} color={colors.green[600]} /> : null}
        </TouchableOpacity>
        {locations.map(location => <TouchableOpacity key={location.id} style={[styles.locationOption, locationId === location.id && styles.locationOptionActive]} onPress={() => { setLocationId(location.id); setLocationMenuOpen(false); }}>
          <MapPin size={16} color={colors.green[600]} />
          <Text style={[styles.locationOptionText, locationId === location.id && styles.locationOptionTextActive]} numberOfLines={1}>{location.name}</Text>
          {locationId === location.id ? <Check size={17} color={colors.green[600]} /> : null}
        </TouchableOpacity>)}
      </View> : null}
    </View>
    <View style={styles.toolbar}><View style={styles.searchBox}><Search size={18} color={colors.gray[400]} /><TextInput style={styles.searchInput} placeholder="Tìm theo mã ô, mã trụ, địa chỉ cơ sở..." placeholderTextColor={colors.gray[400]} value={search} onChangeText={setSearch} /></View><TouchableOpacity style={styles.filterButton} onPress={() => setMaxPrice(maxPrice ? undefined : 500000)}><SlidersHorizontal size={17} color={colors.gray[700]} /><Text style={styles.filterText}>{maxPrice ? 'Bỏ lọc' : 'Bộ lọc'}</Text></TouchableOpacity></View>
    <View style={styles.resultRow}><Text style={styles.resultText}>Tìm thấy <Text style={styles.resultStrong}>{filtered.length}</Text> ô vườn trống</Text>{maxPrice ? <Text style={styles.filterHint}>≤ {formatCurrency(maxPrice)}/tháng</Text> : null}</View>
    <FlatList data={filtered} numColumns={2} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list} columnWrapperStyle={styles.columns} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.green[600]} />} ListEmptyComponent={<EmptyState title="Không có ô vườn phù hợp" subtitle="Hãy thay đổi cơ sở, từ khóa hoặc bộ lọc." />} renderItem={({ item }) => <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => parentNav?.navigate('GardenDetail', { slot: item })}>
      <View style={styles.cardTop}><View style={styles.iconBox}><Grid3X3 size={22} color={colors.green[700]} /></View><View style={styles.availableBadge}><Text style={styles.availableText}>● {getSlotStatusLabel(item.status)}</Text></View></View>
      <Text style={styles.cardTitle}>Ô {item.slotNumber}</Text>
      <View style={styles.tagRow}><View style={styles.greenTag}><Sprout size={12} color={colors.green[700]} /><Text style={styles.greenTagText}>{item.totalHoles || item.pillars?.reduce((sum, pillar) => sum + (pillar.capacityHoles || 0), 0) || '--'} hốc rau</Text></View><Text style={styles.grayTag}>{item.area ? `${item.area} m²` : `${item.pillarCount || item.pillars?.length || 0} trụ`}</Text></View>
      <View style={styles.locationBox}><MapPin size={14} color={colors.green[600]} /><Text style={styles.locationText} numberOfLines={1}>{item.locationName || 'Chưa xác định'}</Text></View><View style={styles.cardDivider} /><Text style={styles.priceCaption}>Giá thuê trọn gói từ</Text><View style={styles.priceRow}><Text style={styles.price}>{formatCurrency(item.price)}<Text style={styles.per}>/tháng</Text></Text><View style={styles.arrow}><ChevronRight size={18} color={colors.green[700]} /></View></View>
    </TouchableOpacity>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  locationSelectWrapper: { marginHorizontal: spacing.lg, marginBottom: spacing.md, zIndex: 10, elevation: 10 },
  locationSelect: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.green[200], backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md },
  locationSelectContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationSelectText: { ...typography.label, color: colors.gray[800], flex: 1 },
  locationCount: { ...typography.caption, color: colors.green[700], backgroundColor: colors.green[50], paddingHorizontal: 7, borderRadius: radius.full },
  locationMenu: { position: 'absolute', top: 50, left: 0, right: 0, borderWidth: 1, borderColor: colors.gray[200], backgroundColor: colors.white, borderRadius: radius.md, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 12 },
  locationOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  locationOptionActive: { backgroundColor: colors.green[50] },
  locationOptionText: { ...typography.bodySmall, color: colors.gray[700], flex: 1 },
  locationOptionTextActive: { color: colors.green[700], fontFamily: 'Inter_600SemiBold' },
  safe: { flex: 1, backgroundColor: '#f8fafb' }, header: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100] }, eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.green[50], borderColor: colors.green[200], borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, marginBottom: spacing.sm }, eyebrowText: { ...typography.caption, color: colors.green[700], fontFamily: 'Inter_600SemiBold', fontSize: 10 }, title: { ...typography.heading1, color: colors.gray[900], fontSize: 25 }, subtitle: { ...typography.bodySmall, color: colors.gray[500], marginTop: 3 }, sectionLabel: { ...typography.caption, color: colors.gray[600], fontFamily: 'Inter_700Bold', marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs }, chips: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm, alignItems: 'center' }, chip: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.gray[200], backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.md }, chipActive: { backgroundColor: colors.green[600], borderColor: colors.green[600] }, chipText: { ...typography.caption, color: colors.gray[700], fontFamily: 'Inter_600SemiBold' }, chipTextActive: { color: colors.white }, chipCount: { ...typography.caption, color: colors.green[700], backgroundColor: colors.green[50], paddingHorizontal: 5, borderRadius: radius.full }, chipCountActive: { color: colors.green[700], backgroundColor: colors.white }, toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100] }, searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.green[200], borderRadius: radius.md, paddingHorizontal: spacing.sm, backgroundColor: colors.white }, searchInput: { flex: 1, color: colors.gray[900], paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, fontSize: 12 }, filterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.gray[300], borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 11 }, filterText: { ...typography.caption, color: colors.gray[700], fontFamily: 'Inter_600SemiBold' }, resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }, resultText: { ...typography.bodySmall, color: colors.gray[600] }, resultStrong: { color: colors.gray[900], fontFamily: 'Inter_700Bold' }, filterHint: { ...typography.caption, color: colors.green[700] }, list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }, columns: { justifyContent: 'space-between' }, card: { width: '48%', minWidth: 0, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray[200], padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }, iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.green[50], borderWidth: 1, borderColor: colors.green[100] }, availableBadge: { maxWidth: '66%', backgroundColor: colors.green[100], borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 4 }, availableText: { ...typography.caption, color: colors.green[700], fontSize: 9, fontFamily: 'Inter_700Bold' }, cardTitle: { ...typography.heading3, color: colors.gray[900], fontSize: 16, marginBottom: spacing.xs }, tagRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm }, greenTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.green[50], borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 3, flexShrink: 1 }, greenTagText: { ...typography.caption, color: colors.green[700], fontSize: 9, fontFamily: 'Inter_600SemiBold' }, grayTag: { ...typography.caption, color: colors.gray[600], backgroundColor: colors.gray[100], paddingHorizontal: 5, paddingVertical: 3, borderRadius: radius.full, fontSize: 9 }, locationBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gray[50], borderRadius: radius.md, padding: spacing.sm }, locationText: { ...typography.caption, color: colors.gray[700], flex: 1 }, cardDivider: { height: 1, backgroundColor: colors.gray[100], marginVertical: spacing.md }, priceCaption: { ...typography.caption, color: colors.gray[400], fontSize: 9 }, priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }, price: { ...typography.heading3, color: colors.green[700], fontSize: 16 }, per: { ...typography.caption, color: colors.gray[400], fontFamily: 'Inter_400Regular' }, arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.green[50], alignItems: 'center', justifyContent: 'center' },
});
