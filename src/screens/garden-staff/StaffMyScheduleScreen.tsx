import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  RefreshCw,
  CheckCircle2,
  CalendarDays,
  Briefcase,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { staffScheduleApi } from '../../api/staffScheduleApi';
import type { StaffScheduleDTO } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

type FilterType = 'ALL' | 'UPCOMING' | 'PAST';

export default function StaffMyScheduleScreen() {
  const navigation = useNavigation();
  const [schedules, setSchedules] = useState<StaffScheduleDTO[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<StaffScheduleDTO | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await staffScheduleApi.getMySchedules();
      const sorted = (data || []).sort((a, b) => {
        const timeA = new Date(a.scheduleDate || 0).getTime();
        const timeB = new Date(b.scheduleDate || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || 0) - (a.id || 0);
      });
      setSchedules(sorted);
    } catch {
      setSchedules([]);
    }
  }, []);

  useEffect(() => {
    fetchSchedules().finally(() => setLoading(false));
  }, [fetchSchedules]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedules();
    setRefreshing(false);
  };

  const getShiftCategory = (dateStr?: string): 'TODAY' | 'UPCOMING' | 'PAST' => {
    if (!dateStr) return 'PAST';
    const today = new Date().toISOString().split('T')[0];
    const target = dateStr.split('T')[0];
    if (target === today) return 'TODAY';
    if (target > today) return 'UPCOMING';
    return 'PAST';
  };

  const formatDateDetails = (dateStr?: string) => {
    if (!dateStr) {
      return {
        dayOfWeek: 'Chưa rõ',
        dayNumber: '--',
        monthStr: 'Th--',
        yearStr: '',
        fullDateStr: 'Chưa xác định ngày',
      };
    }
    try {
      const d = new Date(dateStr);
      const dayIndex = d.getDay();
      const dayOfWeek = dayIndex === 0 ? 'Chủ nhật' : `Thứ ${dayIndex + 1}`;
      const dayOfWeekMini = dayIndex === 0 ? 'CN' : `T${dayIndex + 1}`;
      const dayNumber = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return {
        dayOfWeek,
        dayOfWeekMini,
        dayNumber,
        monthStr: `Th${month}`,
        yearStr: year.toString(),
        fullDateStr: `${dayOfWeek}, ${dayNumber}/${month}/${year}`,
      };
    } catch {
      return {
        dayOfWeek: 'Chưa rõ',
        dayOfWeekMini: '--',
        dayNumber: '--',
        monthStr: 'Th--',
        yearStr: '',
        fullDateStr: dateStr,
      };
    }
  };

  const todayCount = useMemo(
    () => schedules.filter(s => getShiftCategory(s.scheduleDate) === 'TODAY').length,
    [schedules]
  );
  const upcomingCount = useMemo(
    () => schedules.filter(s => getShiftCategory(s.scheduleDate) === 'UPCOMING').length,
    [schedules]
  );
  const pastCount = useMemo(
    () => schedules.filter(s => getShiftCategory(s.scheduleDate) === 'PAST').length,
    [schedules]
  );

  const filteredSchedules = useMemo(() => {
    if (filter === 'UPCOMING') {
      return schedules.filter(
        s => getShiftCategory(s.scheduleDate) === 'TODAY' || getShiftCategory(s.scheduleDate) === 'UPCOMING'
      );
    }
    if (filter === 'PAST') {
      return schedules.filter(s => getShiftCategory(s.scheduleDate) === 'PAST');
    }
    return schedules;
  }, [schedules, filter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Lịch trực của tôi</Text>
          <Text style={styles.topBarSub}>Theo dõi ca làm việc phân công tại nhà vườn</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardAll]}>
          <View style={styles.statIconBox}>
            <CalendarDays size={16} color="#047857" />
          </View>
          <Text style={styles.statNumber}>{schedules.length}</Text>
          <Text style={styles.statLabel}>Tổng ca</Text>
        </View>

        <View style={[styles.statCard, styles.statCardToday]}>
          <View style={[styles.statIconBox, { backgroundColor: '#dcfce7' }]}>
            <Sparkles size={16} color="#15803d" />
          </View>
          <Text style={[styles.statNumber, { color: '#15803d' }]}>{todayCount}</Text>
          <Text style={styles.statLabel}>Hôm nay</Text>
        </View>

        <View style={[styles.statCard, styles.statCardUpcoming]}>
          <View style={[styles.statIconBox, { backgroundColor: '#e0f2fe' }]}>
            <Clock size={16} color="#0369a1" />
          </View>
          <Text style={[styles.statNumber, { color: '#0369a1' }]}>{upcomingCount}</Text>
          <Text style={styles.statLabel}>Sắp tới</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
            Tất cả ({schedules.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'UPCOMING' && styles.filterTabActive]}
          onPress={() => setFilter('UPCOMING')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterTabText, filter === 'UPCOMING' && styles.filterTabTextActive]}>
            Sắp tới ({todayCount + upcomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'PAST' && styles.filterTabActive]}
          onPress={() => setFilter('PAST')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterTabText, filter === 'PAST' && styles.filterTabTextActive]}>
            Đã qua ({pastCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Schedule List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải lịch trực...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Calendar size={42} color={colors.gray[400]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có ca trực nào</Text>
              <Text style={styles.emptySub}>
                {filter === 'UPCOMING'
                  ? 'Bạn hiện không có ca trực nào sắp tới.'
                  : filter === 'PAST'
                  ? 'Chưa có lịch sử ca trực nào đã hoàn thành.'
                  : 'Bạn chưa được phân công ca trực nào tại nhà vườn.'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={onRefresh} activeOpacity={0.8}>
                <RefreshCw size={14} color={colors.green[700]} style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Làm mới dữ liệu</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const category = getShiftCategory(item.scheduleDate);
            const dateDetails = formatDateDetails(item.scheduleDate);
            const isToday = category === 'TODAY';
            const isUpcoming = category === 'UPCOMING';

            return (
              <TouchableOpacity
                style={[styles.card, isToday && styles.cardToday]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedSchedule(item);
                  setDetailVisible(true);
                }}
              >
                {/* Today banner */}
                {isToday && (
                  <View style={styles.todayBanner}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.todayBannerText}>CA TRỰC HÔM NAY</Text>
                  </View>
                )}

                <View style={styles.cardMainRow}>
                  <View style={styles.detailsCol}>
                    {/* Header: day name + date + status pill */}
                    <View style={styles.detailsHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayOfWeekTitle}>{dateDetails.dayOfWeek}</Text>
                        <Text style={styles.fullDateSub}>{`${dateDetails.dayNumber}/${dateDetails.monthStr.replace('Th', '')}/${dateDetails.yearStr}`}</Text>
                      </View>
                      {isToday ? (
                        <View style={[styles.statusPill, { backgroundColor: '#dcfce7' }]}>
                          <Text style={[styles.statusPillText, { color: '#15803d' }]}>Đang diễn ra</Text>
                        </View>
                      ) : isUpcoming ? (
                        <View style={[styles.statusPill, { backgroundColor: '#e0f2fe' }]}>
                          <Text style={[styles.statusPillText, { color: '#0369a1' }]}>Sắp tới</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, { backgroundColor: '#f1f5f9' }]}>
                          <Text style={[styles.statusPillText, { color: '#64748b' }]}>Đã qua</Text>
                        </View>
                      )}
                    </View>

                    {/* Time */}
                    <View style={styles.infoRow}>
                      <Clock size={15} color={isToday ? '#15803d' : '#0284c7'} />
                      <Text style={styles.timeText}>
                        {item.startTime ? item.startTime.substring(0, 5) : '08:00'} -{' '}
                        {item.endTime ? item.endTime.substring(0, 5) : '17:00'}{' '}
                        <Text style={styles.shiftDuration}>(Ca trực cả ngày)</Text>
                      </Text>
                    </View>

                    {/* Location */}
                    <View style={styles.infoRow}>
                      <MapPin size={15} color={colors.green[600]} />
                      <Text style={styles.locText} numberOfLines={1}>
                        {item.locationName || 'Cơ sở Vườn Quận 1'}
                      </Text>
                    </View>

                    {/* Notes */}
                    {item.notes ? (
                      <View style={styles.noteBox}>
                        <View style={styles.noteHeader}>
                          <FileText size={12} color="#b45309" />
                          <Text style={styles.noteLabel}>Ghi chú phân công:</Text>
                        </View>
                        <Text style={styles.noteText}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Today shortcut */}
                    {isToday && (
                      <TouchableOpacity
                        style={styles.todayTaskLink}
                        onPress={() => navigation.navigate('GardenStaffDashboard' as never)}
                        activeOpacity={0.8}
                      >
                        <Briefcase size={14} color="#15803d" />
                        <Text style={styles.todayTaskLinkText}>Vào danh sách nhiệm vụ hôm nay</Text>
                        <ChevronRight size={14} color="#15803d" style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedSchedule && (() => {
        const dd = formatDateDetails(selectedSchedule.scheduleDate);
        const cat = getShiftCategory(selectedSchedule.scheduleDate);
        const isT = cat === 'TODAY';
        const isU = cat === 'UPCOMING';
        return (
          <Modal
            visible={detailVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setDetailVisible(false)}
          >
            <SafeAreaView style={styles.modalSafe}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{dd.dayOfWeek}</Text>
                  <Text style={styles.modalSubTitle}>{dd.fullDateStr}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setDetailVisible(false)}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={20} color={colors.gray[600]} />
                  <Text style={styles.modalCloseTxt}>Đóng</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent}>
                {/* Status */}
                <View style={[styles.detailStatusBanner,
                  isT ? { backgroundColor: '#f0fdf4', borderColor: '#86efac' } :
                  isU ? { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' } :
                        { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }
                ]}>
                  <View style={[styles.detailStatusDot, { backgroundColor: isT ? '#16a34a' : isU ? '#0284c7' : '#94a3b8' }]} />
                  <Text style={[styles.detailStatusText, { color: isT ? '#15803d' : isU ? '#0369a1' : '#64748b' }]}>
                    {isT ? 'Ca trực đang diễn ra hôm nay' : isU ? 'Ca trực sắp tới' : 'Ca trực đã kết thúc'}
                  </Text>
                </View>

                {/* Info rows */}
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={colors.green[600]} />
                    <Text style={styles.detailRowLabel}>Ngày làm việc</Text>
                    <Text style={styles.detailRowValue}>{dd.fullDateStr}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#0284c7" />
                    <Text style={styles.detailRowLabel}>Giờ làm</Text>
                    <Text style={styles.detailRowValue}>
                      {selectedSchedule.startTime
                        ? selectedSchedule.startTime.substring(0, 5)
                        : '08:00'}{' '}–{' '}
                      {selectedSchedule.endTime
                        ? selectedSchedule.endTime.substring(0, 5)
                        : '17:00'}
                    </Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={colors.green[600]} />
                    <Text style={styles.detailRowLabel}>Địa điểm</Text>
                    <Text style={styles.detailRowValue}>
                      {selectedSchedule.locationName || 'Cơ sở Vườn Quận 1'}
                    </Text>
                  </View>
                  {selectedSchedule.id && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailRow}>
                        <CalendarDays size={16} color="#64748b" />
                        <Text style={styles.detailRowLabel}>Mã lịch trực</Text>
                        <Text style={styles.detailRowValue}>#{selectedSchedule.id}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Notes */}
                {selectedSchedule.notes ? (
                  <View style={styles.detailNoteBox}>
                    <View style={styles.noteHeader}>
                      <FileText size={14} color="#b45309" />
                      <Text style={styles.noteLabel}>Ghi chú phân công</Text>
                    </View>
                    <Text style={styles.noteText}>{selectedSchedule.notes}</Text>
                  </View>
                ) : null}

                {/* Today shortcut */}
                {isT && (
                  <TouchableOpacity
                    style={[styles.todayTaskLink, { marginTop: 4 }]}
                    onPress={() => {
                      setDetailVisible(false);
                      navigation.navigate('GardenStaffDashboard' as never);
                    }}
                    activeOpacity={0.8}
                  >
                    <Briefcase size={15} color="#15803d" />
                    <Text style={styles.todayTaskLinkText}>Xem nhiệm vụ hôm nay</Text>
                    <ChevronRight size={15} color="#15803d" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Top App Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.green[600],
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  topBarSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Overview
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statCardAll: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statCardToday: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  statCardUpcoming: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: colors.green[600],
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // List content
  listContent: {
    padding: spacing.md,
    gap: 12,
    paddingBottom: 32,
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray[500],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green[700],
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardToday: {
    borderColor: '#22c55e',
    borderWidth: 1.5,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  todayBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },

  // Card Content
  cardMainRow: {
    padding: 14,
  },

  fullDateSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },

  // Details Column
  detailsCol: {
    flex: 1,
    gap: 8,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayOfWeekTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  shiftDuration: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '400',
  },
  locText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },

  // Notes Box
  noteBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginTop: 2,
    gap: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },

  // Today Task Link
  todayTaskLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  todayTaskLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },

  // Detail Modal
  modalSafe: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubTitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  modalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCloseTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
  modalContent: { padding: 16, gap: 12, paddingBottom: 40 },

  detailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailStatusDot: { width: 8, height: 8, borderRadius: 4 },
  detailStatusText: { fontSize: 13, fontWeight: '600' },

  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  detailRowLabel: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    maxWidth: '55%',
  },
  detailDivider: { height: 1, backgroundColor: '#f1f5f9' },
  detailNoteBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
    gap: 6,
  },
});
