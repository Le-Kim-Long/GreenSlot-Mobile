import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout,
  MapPin,
  Calendar,
  History,
  Search,
  User,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { harvestHistoryApi } from '../../api/harvestHistoryApi';
import type { HarvestHistoryItem } from '../../types/api';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

export default function GardenStaffHarvestHistoryScreen() {
  const [items, setItems] = useState<HarvestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      const data = await harvestHistoryApi.getManagerHistory();
      const sorted = (data || []).sort((a, b) => {
        const timeA = new Date(a.harvestedAt || a.plantedAt || 0).getTime();
        const timeB = new Date(b.harvestedAt || b.plantedAt || 0).getTime();
        return timeB - timeA;
      });
      setItems(sorted);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      item =>
        item.treeName?.toLowerCase().includes(q) ||
        item.slotNumber?.toLowerCase().includes(q) ||
        item.locationName?.toLowerCase().includes(q) ||
        item.staffName?.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử thu hoạch</Text>
        <Text style={styles.headerSub}>
          Nhật ký các đợt thu hoạch đã hoàn tất tại cơ sở
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo giống cây, ô vườn, nhân viên, khách hàng..."
          placeholderTextColor={colors.gray[400]}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
        ListEmptyComponent={
          <EmptyState
            title={search ? 'Không tìm thấy kết quả' : 'Chưa có lượt thu hoạch'}
            subtitle={
              search
                ? 'Thử tìm kiếm với từ khóa khác'
                : 'Chưa có lượt thu hoạch nào được ghi nhận tại cơ sở của bạn.'
            }
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Card Header: tree + slot info + method badge */}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.treeRow}>
                  <Sprout size={16} color={colors.green[600]} />
                  <Text style={styles.treeName}>{item.treeName || 'Chưa rõ giống cây'}</Text>
                </View>
                <View style={styles.slotRow}>
                  <MapPin size={13} color={colors.gray[500]} />
                  <Text style={styles.slotText}>Ô: {item.slotNumber || '—'}</Text>
                  {item.locationName ? (
                    <Text style={styles.locationText}>· {item.locationName}</Text>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.methodBadge,
                  item.harvestMethod === 'SELF' ? styles.methodSelf : styles.methodStaff,
                ]}
              >
                <Text
                  style={[
                    styles.methodText,
                    item.harvestMethod === 'SELF' ? styles.methodTextSelf : styles.methodTextStaff,
                  ]}
                >
                  {item.harvestMethod === 'SELF' ? 'Khách tự thu' : 'NV thu hoạch'}
                </Text>
              </View>
            </View>

            {/* Dates & People Row */}
            <View style={styles.datesRow}>
              {item.plantedAt ? (
                <View style={styles.dateItem}>
                  <Calendar size={12} color={colors.gray[400]} />
                  <Text style={styles.dateText}>
                    Gieo: {new Date(item.plantedAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              ) : null}

              {item.harvestedAt ? (
                <View style={styles.dateItem}>
                  <History size={12} color={colors.green[600]} />
                  <Text style={[styles.dateText, { color: colors.green[700], fontWeight: '600' }]}>
                    Thu: {new Date(item.harvestedAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              ) : null}

              {item.customerName ? (
                <View style={styles.dateItem}>
                  <User size={12} color={colors.gray[500]} />
                  <Text style={styles.dateText}>KH: {item.customerName}</Text>
                </View>
              ) : null}

              {item.staffName ? (
                <View style={styles.dateItem}>
                  <AlertCircle size={12} color={colors.gray[500]} />
                  <Text style={styles.dateText}>NV: {item.staffName}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.green[600],
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.gray[900] },

  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  treeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treeName: { fontSize: 15, fontWeight: '700', color: colors.gray[900] },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  slotText: { fontSize: 12, color: colors.gray[600], fontWeight: '500' },
  locationText: { fontSize: 12, color: colors.green[700], fontWeight: '600' },

  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  methodSelf: { backgroundColor: '#f0fdf4' },
  methodStaff: { backgroundColor: '#eff6ff' },
  methodText: { fontSize: 11, fontWeight: '600' },
  methodTextSelf: { color: '#16a34a' },
  methodTextStaff: { color: '#2563eb' },

  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: colors.gray[500] },
});
