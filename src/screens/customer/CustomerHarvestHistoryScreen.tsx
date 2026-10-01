import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  Calendar,
  MapPin,
  User,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  Clock,
  Zap,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react-native';
import { harvestHistoryApi } from '../../api/harvestHistoryApi';
import type { HarvestHistoryItem } from '../../types/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { HarvestHistoryDetailModal } from '../../components/harvest/HarvestHistoryDetailModal';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

interface PillarHarvestGroup {
  pillarCode: string;
  items: HarvestHistoryItem[];
}

interface SlotHarvestGroup {
  key: string;
  slotNumber: string;
  rentalId: number;
  locationName: string;
  totalHarvests: number;
  pillars: PillarHarvestGroup[];
  treeNames: string[];
  latestHarvestDate: string;
}

export default function CustomerHarvestHistoryScreen({
  route,
  navigation,
}: CustomerStackProps<'CustomerHarvestHistory'>) {
  const [items, setItems] = useState<HarvestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<string>('ALL');
  const [selectedDetailItem, setSelectedDetailItem] = useState<HarvestHistoryItem | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Dropdown filter ô vườn
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [filteredSlotKey, setFilteredSlotKey] = useState<string>('ALL');

  // Dropdown filter trụ (View 2)
  const [pillarDropdownVisible, setPillarDropdownVisible] = useState(false);

  // Filter theo cơ sở
  const [filteredLocation, setFilteredLocation] = useState<string>('ALL');

  // Extract navigation route params
  const filterRentalId = (route.params as any)?.rentalId as number | undefined;
  const filterSlotNumber = (route.params as any)?.slotNumber as string | undefined;
  const harvestId = (route.params as any)?.harvestId as number | undefined;

  const loadData = useCallback(async () => {
    try {
      const data = await harvestHistoryApi.getMyHistory();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Compute grouped slot structure: Ô Vườn -> Trụ -> Các đợt thu hoạch
  const slotGroups = useMemo<SlotHarvestGroup[]>(() => {
    if (!items.length) return [];

    const map = new Map<string, {
      slotNumber: string;
      rentalId: number;
      locationName: string;
      items: HarvestHistoryItem[];
    }>();

    for (const item of items) {
      const slotKey = item.slotNumber
        ? String(item.slotNumber).trim().toUpperCase()
        : item.rentalId
          ? `RENTAL_${item.rentalId}`
          : 'UNKNOWN';

      if (!map.has(slotKey)) {
        map.set(slotKey, {
          slotNumber: item.slotNumber || (item.rentalId ? `#${item.rentalId}` : 'Chung'),
          rentalId: item.rentalId,
          locationName: item.locationName || 'GreenSlot Farm',
          items: [],
        });
      }
      map.get(slotKey)!.items.push(item);
    }

    const groups: SlotHarvestGroup[] = [];

    map.forEach((value, key) => {
      // Group items by pillar
      const pillarMap = new Map<string, HarvestHistoryItem[]>();

      for (const item of value.items) {
        if (item.pillarCodes) {
          const codes = item.pillarCodes.split(',').map(s => s.trim()).filter(Boolean);
          if (codes.length > 0) {
            codes.forEach(code => {
              if (!pillarMap.has(code)) pillarMap.set(code, []);
              pillarMap.get(code)!.push(item);
            });
            continue;
          }
        }
        const fallbackCode = 'Chung';
        if (!pillarMap.has(fallbackCode)) pillarMap.set(fallbackCode, []);
        pillarMap.get(fallbackCode)!.push(item);
      }

      const pillars: PillarHarvestGroup[] = [];
      pillarMap.forEach((pItems, pCode) => {
        // Sort batches newest to oldest
        pItems.sort((a, b) => new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime());
        pillars.push({
          pillarCode: pCode,
          items: pItems,
        });
      });

      // Sort pillars alphabetically
      pillars.sort((a, b) => a.pillarCode.localeCompare(b.pillarCode));

      // Tree names
      const trees = Array.from(new Set(value.items.map(i => i.treeName).filter(Boolean))) as string[];

      // Latest date
      const sortedByDate = [...value.items].sort(
        (a, b) => new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime()
      );
      const latestHarvestDate = sortedByDate[0]?.harvestedAt || '';

      groups.push({
        key,
        slotNumber: value.slotNumber,
        rentalId: value.rentalId,
        locationName: value.locationName,
        totalHarvests: value.items.length,
        pillars,
        treeNames: trees,
        latestHarvestDate,
      });
    });

    return groups;
  }, [items]);

  // Direct matching: Auto select slot if passed via route params
  useEffect(() => {
    if (slotGroups.length === 0) return;

    if (filterSlotNumber) {
      const match = slotGroups.find(
        g => g.slotNumber.toLowerCase() === filterSlotNumber.toLowerCase()
      );
      if (match) {
        setSelectedSlotKey(match.key);
        return;
      }
    }

    if (filterRentalId) {
      const match = slotGroups.find(g => g.rentalId === filterRentalId);
      if (match) {
        setSelectedSlotKey(match.key);
        return;
      }
    }
  }, [slotGroups, filterSlotNumber, filterRentalId]);

  // Handle direct link from notification with harvestId
  useEffect(() => {
    if (items.length > 0 && harvestId) {
      const found = items.find(i => i.id === harvestId);
      if (found) {
        setHighlightId(found.id);
        setSelectedDetailItem(found);

        // Also select its slot
        const slotKey = found.slotNumber
          ? String(found.slotNumber).trim().toUpperCase()
          : found.rentalId
            ? `RENTAL_${found.rentalId}`
            : null;
        if (slotKey) {
          setSelectedSlotKey(slotKey);
        }

        navigation.setParams({ harvestId: undefined } as any);
        setTimeout(() => setHighlightId(null), 5000);
      }
    }
  }, [items, harvestId, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Active selected slot
  const currentSlotGroup = slotGroups.find(g => g.key === selectedSlotKey) || null;

  // Unique locations from all slot groups
  const locationFilters = useMemo(() => {
    const locs = Array.from(new Set(slotGroups.map(g => g.locationName).filter(Boolean)));
    return locs;
  }, [slotGroups]);

  // Pillars to display for current slot (must be before any conditional return)
  const displayedPillars = useMemo(() => {
    if (!currentSlotGroup) return [];
    if (selectedPillarFilter === 'ALL') return currentSlotGroup.pillars;
    return currentSlotGroup.pillars.filter(p => p.pillarCode === selectedPillarFilter);
  }, [currentSlotGroup, selectedPillarFilter]);

  // Slots to display in VIEW 1 (filtered by location + dropdown slot)
  const displayedSlotGroups = useMemo(() => {
    let groups = slotGroups;
    if (filteredLocation !== 'ALL') {
      groups = groups.filter(g => g.locationName === filteredLocation);
    }
    if (filteredSlotKey !== 'ALL') {
      groups = groups.filter(g => g.key === filteredSlotKey);
    }
    return groups;
  }, [slotGroups, filteredLocation, filteredSlotKey]);

  // Configure navigation header dynamically for View 1 vs View 2
  useLayoutEffect(() => {
    if (selectedSlotKey && currentSlotGroup) {
      navigation.setOptions({
        headerShown: true,
        headerTitle: () => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.gray[900] }}>
              Lịch sử Ô {currentSlotGroup.slotNumber}
            </Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10.5, color: colors.green[700], marginTop: 1 }}>
              {currentSlotGroup.locationName.toUpperCase()} · {currentSlotGroup.totalHarvests} đợt
            </Text>
          </View>
        ),
        headerLeft: () => (
          <TouchableOpacity
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
            onPress={() => {
              if (filterSlotNumber || filterRentalId) {
                navigation.goBack();
              } else {
                setSelectedSlotKey(null);
              }
            }}
          >
            <ChevronLeft size={20} color={colors.gray[700]} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.green[50], borderRadius: 20, borderWidth: 1, borderColor: colors.green[200] }}
            onPress={() => setSelectedSlotKey(null)}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.green[700] }}>Đổi ô</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerShown: true,
        headerTitle: 'Lịch sử thu hoạch',
        headerLeft: undefined,
        headerRight: undefined,
      });
    }
  }, [navigation, selectedSlotKey, currentSlotGroup, filterSlotNumber, filterRentalId]);

  if (loading) return <LoadingScreen />;

  // Helper date formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: All garden slots view (when no slot is selected)
  // ──────────────────────────────────────────────────────────────────────────
  if (!currentSlotGroup) {
    const selectedSlotInfo = slotGroups.find(g => g.key === filteredSlotKey);
    const locationFilterCount = displayedSlotGroups.length;

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Location Filter Chips Bar - giống PaymentHistoryScreen */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterChip, filteredLocation === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilteredLocation('ALL')}
            >
              <Text style={[styles.filterChipText, filteredLocation === 'ALL' && styles.filterChipTextActive]}>
                Tất cả ({slotGroups.length})
              </Text>
            </TouchableOpacity>
            {locationFilters.map(loc => {
              const count = slotGroups.filter(g => g.locationName === loc).length;
              const isActive = filteredLocation === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilteredLocation(isActive ? 'ALL' : loc)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {loc.toUpperCase()} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={displayedSlotGroups}
          keyExtractor={item => item.key}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.dropdownSection}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setDropdownVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownTriggerLeft}>
                    <View style={styles.dropdownIconBox}>
                      <Layers size={16} color="#15803d" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownSubLabel}>Lọc theo ô vườn:</Text>
                      <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                        {filteredSlotKey === 'ALL'
                          ? filteredLocation !== 'ALL'
                            ? `Tất cả ô tại ${filteredLocation} (${displayedSlotGroups.length} ô)`
                            : `Tất cả ô vườn (${slotGroups.length} ô)`
                          : `Ô ${selectedSlotInfo?.slotNumber || filteredSlotKey} · ${selectedSlotInfo?.locationName || ''}`}
                      </Text>
                    </View>
                  </View>
                  <ChevronDown size={18} color={colors.gray[600]} />
                </TouchableOpacity>

                {filteredSlotKey !== 'ALL' && (
                  <TouchableOpacity
                    style={styles.resetFilterBtn}
                    onPress={() => setFilteredSlotKey('ALL')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetFilterText}>✕ Xem tất cả ({slotGroups.length} ô)</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Chưa có lịch sử thu hoạch"
              subtitle="Các đợt thu hoạch hoàn tất trên các ô vườn bạn thuê sẽ hiển thị tại đây."
            />
          }
          renderItem={({ item: slot }) => (
            <TouchableOpacity
              style={styles.slotCard}
              onPress={() => {
                setSelectedSlotKey(slot.key);
                setSelectedPillarFilter('ALL');
              }}
              activeOpacity={0.88}
            >
              {/* Card Header (Đã xóa chỗ đợt ở ô vườn theo yêu cầu) */}
              <View style={styles.slotCardHeader}>
                <View style={styles.slotIconBox}>
                  <Sprout size={22} color="#15803d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotCardTitle}>Ô vườn {slot.slotNumber}</Text>
                  <View style={styles.slotLocationBadge}>
                    <MapPin size={11} color="#2563eb" />
                    <Text style={styles.slotLocationText}>{slot.locationName.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.slotArrowBtn}>
                  <ChevronRight size={18} color="#15803d" />
                </View>
              </View>

              {/* Pillars chips preview - max 2 + overflow badge */}
              <View style={styles.slotPillarsPreview}>
                <Text style={styles.slotPillarsLabel}>Trụ canh tác:</Text>
                <View style={styles.slotPillarsChipsWrap}>
                  {slot.pillars.slice(0, 2).map(p => (
                    <View key={p.pillarCode} style={styles.slotPillarMiniChip}>
                      <Layers size={11} color="#059669" />
                      <Text style={styles.slotPillarMiniChipText}>
                        Trụ {p.pillarCode}
                      </Text>
                    </View>
                  ))}
                  {slot.pillars.length > 2 && (
                    <View style={styles.slotPillarOverflowChip}>
                      <Text style={styles.slotPillarOverflowText}>+{slot.pillars.length - 2}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Bottom footer (Không hiển thị cây trồng ở card ngoài theo yêu cầu) */}
              <View style={styles.slotCardFooter}>
                <View style={styles.slotLatestDate}>
                  <Clock size={12} color="#64748b" />
                  <Text style={styles.slotLatestDateText}>
                    Gần nhất: {formatDate(slot.latestHarvestDate)}
                  </Text>
                </View>
                <View style={styles.slotCardCta}>
                  <Text style={styles.slotCardCtaText}>Xem chi tiết trụ & đợt</Text>
                  <ChevronRight size={13} color="#15803d" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Modal Dropdown chọn ô vườn */}
        <Modal
          visible={dropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity
            style={styles.dropdownModalBg}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdownModalCard}>
              <View style={styles.dropdownModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Layers size={18} color="#15803d" />
                  <Text style={styles.dropdownModalTitle}>Lọc theo ô vườn</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDropdownVisible(false)}
                  style={styles.dropdownModalClose}
                >
                  <Text style={styles.dropdownModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                {/* Option: Tất cả */}
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    filteredSlotKey === 'ALL' && styles.dropdownOptionActive,
                  ]}
                  onPress={() => {
                    setFilteredSlotKey('ALL');
                    setDropdownVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionLeft}>
                    <Sprout size={16} color={filteredSlotKey === 'ALL' ? '#15803d' : colors.gray[500]} />
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        filteredSlotKey === 'ALL' && styles.dropdownOptionTextActive,
                      ]}
                    >
                      Tất cả ô vườn ({slotGroups.length} ô)
                    </Text>
                  </View>
                  {filteredSlotKey === 'ALL' && <Check size={16} color="#15803d" />}
                </TouchableOpacity>

                {/* Option: Từng ô vườn */}
                {slotGroups.map(g => {
                  const isSelected = filteredSlotKey === g.key;
                  return (
                    <TouchableOpacity
                      key={g.key}
                      style={[
                        styles.dropdownOption,
                        isSelected && styles.dropdownOptionActive,
                      ]}
                      onPress={() => {
                        setFilteredSlotKey(g.key);
                        setDropdownVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownOptionLeft}>
                        <Layers size={16} color={isSelected ? '#15803d' : colors.gray[500]} />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              isSelected && styles.dropdownOptionTextActive,
                            ]}
                          >
                            Ô vườn {g.slotNumber}
                          </Text>
                          <Text style={styles.dropdownOptionSub}>
                            {g.locationName.toUpperCase()} · {g.pillars.length} trụ canh tác
                          </Text>
                        </View>
                      </View>
                      {isSelected && <Check size={16} color="#15803d" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal chi tiết đợt thu hoạch */}
        <HarvestHistoryDetailModal
          visible={!!selectedDetailItem}
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
        />
      </SafeAreaView>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: Selected Garden Slot -> Show Pillars & Harvest Batches per Pillar
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Pillar Dropdown Trigger */}
      <View style={styles.dropdownSection}>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setPillarDropdownVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownTriggerLeft}>
            <View style={styles.dropdownIconBox}>
              <Layers size={16} color="#15803d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownSubLabel}>Lọc theo trụ:</Text>
              <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                {selectedPillarFilter === 'ALL'
                  ? `Tất cả trụ`
                  : `Trụ ${selectedPillarFilter} (${currentSlotGroup.pillars.find(p => p.pillarCode === selectedPillarFilter)?.items.length ?? 0} đợt)`}
              </Text>
            </View>
          </View>
          <ChevronDown size={18} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Modal Dropdown chọn trụ */}
      <Modal
        visible={pillarDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPillarDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBg}
          activeOpacity={1}
          onPress={() => setPillarDropdownVisible(false)}
        >
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={18} color="#15803d" />
                <Text style={styles.dropdownModalTitle}>Lọc theo trụ canh tác</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPillarDropdownVisible(false)}
                style={styles.dropdownModalClose}
              >
                <Text style={styles.dropdownModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Tất cả trụ */}
              <TouchableOpacity
                style={[
                  styles.dropdownOption,
                  selectedPillarFilter === 'ALL' && styles.dropdownOptionActive,
                ]}
                onPress={() => { setSelectedPillarFilter('ALL'); setPillarDropdownVisible(false); }}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownOptionLeft}>
                  <Layers size={16} color={selectedPillarFilter === 'ALL' ? '#15803d' : colors.gray[500]} />
                  <Text style={[styles.dropdownOptionText, selectedPillarFilter === 'ALL' && styles.dropdownOptionTextActive]}>
                    Tất cả trụ ({currentSlotGroup.totalHarvests} đợt)
                  </Text>
                </View>
                {selectedPillarFilter === 'ALL' && <Check size={16} color="#15803d" />}
              </TouchableOpacity>

              {/* Từng trụ */}
              {currentSlotGroup.pillars.map(p => {
                const isSelected = selectedPillarFilter === p.pillarCode;
                return (
                  <TouchableOpacity
                    key={p.pillarCode}
                    style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                    onPress={() => { setSelectedPillarFilter(p.pillarCode); setPillarDropdownVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownOptionLeft}>
                      <Layers size={16} color={isSelected ? '#15803d' : colors.gray[500]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                          Trụ {p.pillarCode}
                        </Text>
                        <Text style={styles.dropdownOptionSub}>
                          {p.items.length} đợt thu hoạch
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={16} color="#15803d" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* List of Pillars and Batches */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
      >
        {displayedPillars.map(pillar => (
          <View key={pillar.pillarCode} style={styles.pillarGroupCard}>
            {/* Pillar Section Header */}
            <View style={styles.pillarGroupHeader}>
              <View style={styles.pillarIconCircle}>
                <Layers size={16} color={colors.green[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pillarGroupTitle}>Trụ {pillar.pillarCode}</Text>
                <Text style={styles.pillarGroupSubtitle}>
                  Lịch sử canh tác & thu hoạch
                </Text>
              </View>
              <View style={styles.pillarBadgeRight}>
                <Text style={styles.pillarBadgeRightText}>{pillar.items.length} đợt</Text>
              </View>
            </View>

            {/* List of Batches for this Pillar */}
            <View style={styles.batchList}>
              {pillar.items.map((batch, bIdx) => {
                const isSelf = batch.harvestMethod === 'SELF';
                const isHighlighted = highlightId === batch.id;
                const batchOrder = batch.pillarHarvestCount || pillar.items.length - bIdx;

                return (
                  <TouchableOpacity
                    key={batch.id}
                    style={[
                      styles.batchCard,
                      isHighlighted && styles.batchCardHighlighted,
                    ]}
                    onPress={() => setSelectedDetailItem(batch)}
                    activeOpacity={0.88}
                  >
                    {/* Highlight banner from direct notification */}
                    {isHighlighted && (
                      <View style={styles.highlightBanner}>
                        <Text style={styles.highlightBannerText}>🔔 Vừa thu hoạch xong</Text>
                      </View>
                    )}

                    {/* Batch Header */}
                    <View style={styles.batchCardTop}>
                      <View style={styles.batchOrderBadge}>
                        <Text style={styles.batchOrderText}>Đợt {batchOrder}</Text>
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text style={styles.batchTreeName} numberOfLines={1}>
                          {batch.treeName || 'Rau sạch GreenSlot'}
                        </Text>
                        <Text style={styles.batchCodeText}>Mã phiếu #{batch.id}</Text>
                      </View>

                      {/* Method & Early Badges */}
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        {batch.isEarlyHarvest && (
                          <View style={styles.earlyBadge}>
                            <Zap size={10} color="#b45309" strokeWidth={2.5} />
                            <Text style={styles.earlyBadgeText}>Thu hoạch sớm</Text>
                          </View>
                        )}
                        <View style={[styles.methodBadge, isSelf ? styles.selfBadge : styles.staffBadge]}>
                          <Text style={isSelf ? styles.selfText : styles.staffText}>
                            {isSelf ? 'Tự thu hoạch' : 'Nhân viên hỗ trợ'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Dates & Growth timeline */}
                    <View style={styles.batchTimeline}>
                      {batch.plantedAt && (
                        <View style={styles.timelineItem}>
                          <Text style={styles.timelineLabel}>🌱 Ngày gieo:</Text>
                          <Text style={styles.timelineValue}>{formatDate(batch.plantedAt)}</Text>
                        </View>
                      )}
                      <View style={styles.timelineItem}>
                        <Text style={styles.timelineLabel}>🌾 Thu hoạch:</Text>
                        <Text style={styles.timelineValueBold}>{formatDate(batch.harvestedAt)}</Text>
                      </View>
                      {batch.daysGrown != null && (
                        <View style={styles.timelineItem}>
                          <Clock size={11} color="#2563eb" />
                          <Text style={styles.timelineDays}>{batch.daysGrown} ngày</Text>
                        </View>
                      )}
                    </View>

                    {/* Evidence & Staff info */}
                    <View style={styles.batchCardBottom}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        {batch.evidenceImageUrl ? (
                          <View style={styles.evidenceHint}>
                            <ImageIcon size={12} color="#059669" />
                            <Text style={styles.evidenceHintText}>Có ảnh nghiệm thu</Text>
                          </View>
                        ) : null}

                        {!isSelf && batch.staffName ? (
                          <View style={styles.staffHint}>
                            <User size={11} color="#2563eb" />
                            <Text style={styles.staffHintText} numberOfLines={1}>
                              NV: {batch.staffName}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.detailLink}>
                        <Text style={styles.detailLinkText}>Chi tiết</Text>
                        <ChevronRight size={13} color={colors.green[700]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal chi tiết đầy đủ */}
      <HarvestHistoryDetailModal
        visible={!!selectedDetailItem}
        item={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Location Filter Bar (giống PaymentHistoryScreen)
  filterScrollWrapper: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.green[600],
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.green[700],
    marginTop: 1,
  },
  switchSlotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.green[50],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  switchSlotText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },

  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },

  // Dropdown Filter Bar (Thay thế cho 3 box tổng quan)
  dropdownSection: {
    marginBottom: spacing.xs,
    gap: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  dropdownSubLabel: {
    fontSize: 10.5,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[500],
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  resetFilterBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.green[50],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  resetFilterText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },

  // Modal Dropdown
  dropdownModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownModalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    marginBottom: 6,
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  dropdownModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownModalCloseText: {
    fontSize: 13,
    color: colors.gray[600],
    fontWeight: '700',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    marginVertical: 2,
  },
  dropdownOptionActive: {
    backgroundColor: '#f0fdf4',
  },
  dropdownOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  dropdownOptionTextActive: {
    color: '#15803d',
    fontFamily: 'Inter_700Bold',
  },
  dropdownOptionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 1,
  },

  // VIEW 1: Slot Cards (Đầy đủ màu sắc, sinh động, bỏ chữ đợt)
  slotCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4.5,
    borderLeftColor: '#16a34a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  slotLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.full,
  },
  slotLocationText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#1d4ed8',
  },
  slotArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },

  slotPillarsPreview: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  slotPillarsLabel: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[700],
    marginBottom: 6,
  },
  slotPillarsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotPillarMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  slotPillarMiniChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#065f46',
  },
  slotPillarOverflowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  slotPillarOverflowText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#047857',
  },
  slotTreesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  slotTreesLabel: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  slotTreesText: {
    fontSize: 11.5,
    fontFamily: 'Inter_500Medium',
    color: '#78350f',
    flex: 1,
  },
  slotCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  slotLatestDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotLatestDateText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#64748b',
  },
  slotCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  slotCardCtaText: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: '#15803d',
  },

  // VIEW 2: Pillar Filters
  pillarFilterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingVertical: 8,
  },
  pillarFilterContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  pillarFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pillarFilterChipActive: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  pillarFilterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },
  pillarFilterChipTextActive: {
    color: colors.white,
  },

  // Pillar Group Card
  pillarGroupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  pillarGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  pillarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarGroupTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  pillarGroupSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  pillarBadgeRight: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.green[50],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarBadgeRightText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },

  // Batches
  batchList: {
    marginTop: 10,
    gap: 10,
  },
  batchCard: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  batchCardHighlighted: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    backgroundColor: '#fffbeb',
  },
  highlightBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  highlightBannerText: {
    fontSize: 10.5,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  batchCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  batchOrderBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: colors.gray[200],
    borderRadius: radius.sm,
  },
  batchOrderText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[700],
  },
  batchTreeName: {
    fontSize: 13.5,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  batchCodeText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[400],
    marginTop: 1,
  },
  earlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  earlyBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  methodBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  selfBadge: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
  },
  staffBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  selfText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  staffText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#1d4ed8',
  },

  batchTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  timelineValue: {
    fontSize: 11.5,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[700],
  },
  timelineValueBold: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
  },
  timelineDays: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563eb',
  },

  batchCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
  },
  evidenceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  evidenceHintText: {
    fontSize: 10.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#065f46',
  },
  staffHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  staffHintText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#1d4ed8',
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLinkText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
});
