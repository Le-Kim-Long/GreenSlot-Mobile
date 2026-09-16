import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ShieldAlert,
  RefreshCw,
  MapPin,
  Trees,
  Gauge,
  Clock,
  ChevronRight,
  CheckCircle2,
  Search,
  X,
  Filter,
  AlertTriangle,
} from 'lucide-react-native';
import { alertApi } from '../../api/alertApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { AlertDTO } from '../../types/api';

const PAGE_SIZE = 10;

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} ${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export default function GardenStaffAlertScreen() {
  const navigation = useNavigation<any>();

  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await alertApi.getPendingAlerts();
      const list = Array.isArray(data) ? data : [];
      // Sắp xếp mới nhất lên đầu
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return b.id - a.id;
      });
      setAlerts(list);
    } catch (err) {
      console.log('Failed to fetch pending alerts:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tự động tải lại danh sách khi quay lại màn hình này (sau khi xử lý xong alert)
  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [fetchAlerts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchAlerts();
  };

  // Danh sách các loại cảm biến/loại cảnh báo có trong dữ liệu
  const availableTypes = useMemo(() => {
    const map = new Map<string, number>();
    alerts.forEach((a) => {
      const t = a.alertType || a.sensorType;
      if (t) {
        map.set(t, (map.get(t) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [alerts]);

  // Lọc cảnh báo theo tìm kiếm, loại cảm biến và mức độ nghiêm trọng
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // 1. Lọc theo Loại cảnh báo / Cảm biến
      if (selectedType !== 'ALL') {
        const t = a.alertType || a.sensorType;
        if (t !== selectedType) return false;
      }

      // 2. Lọc theo Mức độ nghiêm trọng (Severity)
      if (selectedSeverity !== 'ALL') {
        const sev = (a.severity || 'HIGH').toUpperCase();
        if (sev !== selectedSeverity) return false;
      }

      // 3. Lọc theo Từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = a.id.toString().includes(q);
        const matchMsg = (a.description || a.message || '').toLowerCase().includes(q);
        const matchSlot = (a.slotNumber || '').toLowerCase().includes(q);
        const matchPillar = (a.pillarCode || '').toLowerCase().includes(q);
        const matchTree = (a.treeName || '').toLowerCase().includes(q);
        const matchSensor = (a.sensorType || '').toLowerCase().includes(q);
        const matchType = (a.alertType || '').toLowerCase().includes(q);

        if (!matchId && !matchMsg && !matchSlot && !matchPillar && !matchTree && !matchSensor && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, selectedType, selectedSeverity, searchQuery]);

  // Danh sách hiển thị theo phân trang cuộn (mỗi lần 10 cái)
  const visibleAlerts = useMemo(() => {
    return filteredAlerts.slice(0, page * PAGE_SIZE);
  }, [filteredAlerts, page]);

  const hasMore = visibleAlerts.length < filteredAlerts.length;

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setIsLoadingMore(false);
    }, 250);
  };

  const handleSelectType = (t: string) => {
    setSelectedType(t);
    setPage(1);
  };

  const handleSelectSeverity = (sev: string) => {
    setSelectedSeverity(sev);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedSeverity('ALL');
    setPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedType !== 'ALL' || selectedSeverity !== 'ALL';

  const handleProcessNow = (item: AlertDTO) => {
    navigation.navigate('GardenStaffAlertProcess', { alert: item });
  };

  const renderAlertCard = ({ item }: { item: AlertDTO }) => {
    return (
      <View style={styles.card}>
        {/* Top row: Icon + Type Badge + ID */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.shieldBox}>
              <ShieldAlert size={18} color="#d97706" />
            </View>
            <View style={styles.badgeContainer}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.alertType || 'CẢNH BÁO'}</Text>
              </View>
              <Text style={styles.cardIdText}>#{item.id}</Text>
            </View>
          </View>

          {/* Button Xử lý ngay */}
          <TouchableOpacity
            style={styles.processBtn}
            onPress={() => handleProcessNow(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.processBtnText}>Xử lý ngay</Text>
            <ChevronRight size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Nội dung thông báo sự cố */}
        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description || item.message || 'Cảnh báo thông số kỹ thuật ô đất vượt ngưỡng sinh trưởng'}
        </Text>

        {/* Chi tiết Metadata */}
        <View style={styles.metaRow}>
          {item.pillarCode && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.gray[400]} />
              <Text style={styles.metaItemText}>Trụ: {item.pillarCode}</Text>
            </View>
          )}

          {item.slotNumber && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.gray[400]} />
              <Text style={styles.metaItemText}>Ô: {item.slotNumber}</Text>
            </View>
          )}

          {item.treeName && (
            <View style={styles.metaItem}>
              <Trees size={12} color={colors.green[600]} />
              <Text style={styles.metaItemText}>Cây: {item.treeName}</Text>
            </View>
          )}

          {item.actualValue != null && item.thresholdValue != null && (
            <View style={styles.metaItem}>
              <Gauge size={12} color="#d97706" />
              <Text style={styles.metaItemText}>
                {item.sensorType || 'Trị số'}: <Text style={{ fontWeight: '700', color: colors.gray[800] }}>{item.actualValue}</Text> (ngưỡng {item.thresholdValue})
              </Text>
            </View>
          )}

          <View style={styles.metaItem}>
            <Clock size={12} color={colors.gray[400]} />
            <Text style={styles.metaItemText}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Top Bar Thống kê & Làm mới */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <ShieldAlert size={18} color={colors.green[600]} />
          <Text style={styles.topBarTitle}>
            Cảnh báo đang chờ: <Text style={styles.topBarCount}>{alerts.length}</Text>
            {hasActiveFilters && (
              <Text style={styles.filteredCountText}> (khớp lọc: {filteredAlerts.length})</Text>
            )}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing || isLoading}>
          <RefreshCw size={13} color={colors.gray[700]} />
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER SECTION */}
      <View style={styles.filterSection}>
        {/* Ô Tìm Kiếm */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã #, trụ, ô vườn, cây, mô tả..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setPage(1);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setPage(1);
              }}
              style={styles.clearSearchBtn}
            >
              <X size={14} color={colors.gray[500]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Thanh Cuộn Ngang: Filter Pills Loại Cảm Biến */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilterScroll}
        >
          {/* Nút Tất cả */}
          <TouchableOpacity
            style={[
              styles.typeChip,
              selectedType === 'ALL' && styles.typeChipActive,
            ]}
            onPress={() => handleSelectType('ALL')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.typeChipText,
                selectedType === 'ALL' && styles.typeChipTextActive,
              ]}
            >
              Tất cả ({alerts.length})
            </Text>
          </TouchableOpacity>

          {/* Các nút loại cảm biến động */}
          {availableTypes.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.typeChip,
                  isSelected && styles.typeChipActive,
                ]}
                onPress={() => handleSelectType(item.type)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    isSelected && styles.typeChipTextActive,
                  ]}
                >
                  {item.type} ({item.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dòng Lọc Mức Độ & Nút Xóa Lọc (Khi có lọc) */}
        <View style={styles.secondaryFilterRow}>
          <View style={styles.severityTabs}>
            {[
              { val: 'ALL', label: 'Tất cả mức độ' },
              { val: 'HIGH', label: 'Cao / Khẩn' },
              { val: 'MEDIUM', label: 'Trung bình' },
              { val: 'LOW', label: 'Thấp' },
            ].map((sev) => {
              const isSelected = selectedSeverity === sev.val;
              return (
                <TouchableOpacity
                  key={sev.val}
                  style={[
                    styles.sevTab,
                    isSelected && styles.sevTabActive,
                  ]}
                  onPress={() => handleSelectSeverity(sev.val)}
                >
                  <Text
                    style={[
                      styles.sevTabText,
                      isSelected && styles.sevTabTextActive,
                    ]}
                  >
                    {sev.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearFilters}>
              <X size={12} color={colors.red[600]} />
              <Text style={styles.clearAllBtnText}>Xóa lọc</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải danh sách cảnh báo...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <CheckCircle2 size={48} color={colors.green[500]} />
          </View>
          <Text style={styles.emptyTitle}>Tất cả ô đất đều bình thường!</Text>
          <Text style={styles.emptySubtitle}>Hiện tại không có cảnh báo nào đang chờ xử lý.</Text>
        </View>
      ) : filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: '#fef3c7' }]}>
            <Filter size={40} color="#d97706" />
          </View>
          <Text style={styles.emptyTitle}>Không tìm thấy cảnh báo phù hợp</Text>
          <Text style={styles.emptySubtitle}>
            Không có cảnh báo nào khớp với từ khóa "{searchQuery}" hoặc bộ lọc đã chọn.
          </Text>
          <TouchableOpacity style={styles.resetFilterBtn} onPress={handleClearFilters}>
            <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleAlerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAlertCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.green[600]}
              colors={[colors.green[600]]}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.green[600]} />
                <Text style={styles.footerLoaderText}>Đang tải thêm 10 cảnh báo tiếp theo...</Text>
              </View>
            ) : filteredAlerts.length > 10 ? (
              <View style={styles.footerEnd}>
                <Text style={styles.footerEndText}>Đã tải hết {filteredAlerts.length} cảnh báo</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[700],
  },
  topBarCount: {
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  filteredCountText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.green[600],
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  refreshBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[900],
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  typeFilterScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  typeChipActive: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[500],
  },
  typeChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  typeChipTextActive: {
    fontFamily: 'Inter_700Bold',
    color: colors.green[700],
  },
  secondaryFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  severityTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  sevTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.gray[100],
  },
  sevTabActive: {
    backgroundColor: colors.gray[800],
  },
  sevTabText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  sevTabTextActive: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#fef2f2',
  },
  clearAllBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.red[600],
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#b45309',
  },
  cardIdText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[400],
  },
  processBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.green[600],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    shadowColor: colors.green[600],
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  processBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[800],
    lineHeight: 18,
    marginVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[50],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  metaItemText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[600],
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: 40,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  resetFilterBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
  },
  footerLoaderText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  footerEnd: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  footerEndText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[400],
  },
});
