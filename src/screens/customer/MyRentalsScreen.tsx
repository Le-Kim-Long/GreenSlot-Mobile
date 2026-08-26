import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Leaf,
  Clock,
  CreditCard,
  ChevronRight,
  Bell,
  Sprout,
  RotateCw,
  TriangleAlert,
  X,
  Send,
  TrendingUp,
  CalendarClock,
  CalendarCheck2,
  Building2,
  MapPin,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { taskApi, managerApi } from '../../api/taskApi';
import { notificationApi } from '../../api/notificationApi';
import type { BookingHistory, ServiceTypeDTO } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';
import { openAndWaitForPayment } from '../../utils/paymentFlow';

type TabKey = 'ALL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'COMPLETED';

/** Parses both ISO ("2026-08-26T...") and formatted ("26/8/2026") date strings */
function fmtDate(raw?: string): string {
  if (!raw) return '---';
  if (raw.includes('/')) {
    // Already formatted dd/M/yyyy — validate parts
    const parts = raw.split('/');
    if (parts.length === 3) return raw; // return as-is
  }
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return raw;
  }
}

const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#fed7aa';

// ─── Incident Report Modal ─────────────────────────────────────────────────────
function IncidentReportModal({
  visible,
  rental,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  rental: BookingHistory | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDTO[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        setLoadingTypes(true);
        managerApi.getServiceTypes()
          .then(setServiceTypes)
          .catch(() => setServiceTypes([]))
          .finally(() => setLoadingTypes(false));
      }
    }, [visible])
  );

  const handleSubmit = async () => {
    if (!rental) return;
    if (!selectedTypeId) {
      Alert.alert('Vui lòng chọn loại sự cố!');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Mô tả cần ít nhất 10 ký tự để nhân viên nắm rõ vấn đề.');
      return;
    }
    setSubmitting(true);
    try {
      await taskApi.requestService({
        slotId: (rental.slotId || rental.id) as number,
        serviceTypeId: selectedTypeId,
        description: description.trim(),
      });
      Alert.alert('Đã gửi báo cáo!', 'Nhân viên sẽ xử lý sự cố trong thời gian sớm nhất.');
      setDescription('');
      setSelectedTypeId(null);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Gửi thất bại', err?.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          {/* Header */}
          <View style={mStyles.header}>
            <View style={mStyles.headerLeft}>
              <TriangleAlert size={18} color="#ef4444" />
              <Text style={mStyles.headerTitle}>Báo cáo sự cố</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={mStyles.closeBtn}>
              <X size={18} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {rental && (
            <View style={mStyles.rentalInfo}>
              <Building2 size={13} color={colors.green[600]} />
              <Text style={mStyles.rentalInfoText} numberOfLines={1}>
                Ô {rental.slotNumber} · {rental.locationName}
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={mStyles.body} showsVerticalScrollIndicator={false}>
            {/* Loại sự cố */}
            <Text style={mStyles.label}>Loại sự cố / dịch vụ yêu cầu <Text style={{ color: '#ef4444' }}>*</Text></Text>
            {loadingTypes ? (
              <ActivityIndicator size="small" color={colors.green[600]} style={{ marginVertical: 12 }} />
            ) : (
              <View style={mStyles.typeGrid}>
                {serviceTypes.length === 0 ? (
                  <Text style={mStyles.emptyTypes}>Không tải được danh sách. Hãy mô tả sự cố bên dưới.</Text>
                ) : (
                  serviceTypes.map(st => (
                    <TouchableOpacity
                      key={st.id}
                      style={[mStyles.typeChip, selectedTypeId === st.id && mStyles.typeChipActive]}
                      onPress={() => setSelectedTypeId(st.id ?? null)}
                    >
                      <Text style={[mStyles.typeChipText, selectedTypeId === st.id && mStyles.typeChipTextActive]}>
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Mô tả */}
            <Text style={mStyles.label}>Mô tả chi tiết <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <TextInput
              style={mStyles.textarea}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder="Mô tả sự cố bạn gặp phải (hệ thống tưới, giống cây, thiết bị IoT, v.v.)..."
              placeholderTextColor={colors.gray[400]}
              textAlignVertical="top"
            />
            <Text style={mStyles.charCount}>{description.length} / 500 ký tự</Text>
          </ScrollView>

          {/* Footer */}
          <View style={mStyles.footer}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
              <Text style={mStyles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mStyles.submitBtn, (submitting || !selectedTypeId) && mStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !selectedTypeId}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Send size={15} color={colors.white} />
              )}
              <Text style={mStyles.submitBtnText}>{submitting ? 'Đang gửi...' : 'Gửi báo cáo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Harvest Progress Bar ──────────────────────────────────────────────────────
function HarvestProgress({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return null;

  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const pct = Math.round(progress * 100);

  const barColor = pct >= 90 ? '#16a34a' : pct >= 60 ? '#65a30d' : colors.green[500];

  return (
    <View style={pStyles.container}>
      <View style={pStyles.labelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={11} color={barColor} />
          <Text style={[pStyles.label, { color: barColor }]}>
            {pct >= 90 ? '🌾 Sắp thu hoạch' : `Tiến trình hợp đồng: ${pct}%`}
          </Text>
        </View>
        <Text style={pStyles.daysLeft}>
          {daysLeft === 0 ? '⏰ Hết hạn hôm nay' : `Còn ${daysLeft}/${totalDays} ngày`}
        </Text>
      </View>
      <View style={pStyles.track}>
        <View style={[pStyles.bar, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function MyRentalsScreen({ navigation }: CustomerTabProps<'Rentals'>) {
  const [rentals, setRentals] = useState<BookingHistory[]>([]);
  const [tab, setTab] = useState<TabKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repayingId, setRepayingId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incidentTarget, setIncidentTarget] = useState<BookingHistory | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await bookingApi.getHistory();
      setRentals(data);
    } catch {
      setRentals([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
      notificationApi.getUnreadCount()
        .then(res => { if (typeof res?.unreadCount === 'number') setUnreadCount(res.unreadCount); })
        .catch(() =>
          notificationApi.getMyNotifications().then(list => {
            if (Array.isArray(list)) setUnreadCount(list.filter(n => !n.isRead).length);
          }).catch(() => {})
        );
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pendingPaymentCount = useMemo(
    () => rentals.filter(r => r.status === 'PENDING_PAYMENT' || r.status === 'PENDING').length,
    [rentals]
  );

  const filtered = useMemo(() => {
    let list: BookingHistory[];
    if (tab === 'ALL') list = rentals;
    else if (tab === 'PENDING_PAYMENT') list = rentals.filter(r => r.status === 'PENDING_PAYMENT' || r.status === 'PENDING');
    else list = rentals.filter(r => r.status === tab);
    // Push CANCELLED rentals to the bottom
    return [...list].sort((a, b) => {
      const aCancelled = a.status === 'CANCELLED' ? 1 : 0;
      const bCancelled = b.status === 'CANCELLED' ? 1 : 0;
      return aCancelled - bCancelled;
    });
  }, [rentals, tab]);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang thuê' },
    { key: 'PENDING_PAYMENT', label: 'Chờ TT', count: pendingPaymentCount },
    { key: 'COMPLETED', label: 'Hoàn thành' },
  ];

  const handleCancel = (rental: BookingHistory) => {
    Alert.alert(
      'Hủy đơn đặt vườn',
      `Bạn có chắc chắn muốn hủy đơn thuê ô ${rental.slotNumber} này không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.cancelBooking(rental.id);
              Alert.alert('Thành công', 'Đã hủy đơn đặt vườn thành công.');
              load();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy đơn. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleRepay = async (rental: BookingHistory) => {
    Alert.alert(
      'Tiếp tục thanh toán',
      `Bạn có muốn tiếp tục thanh toán cho ô vườn ${rental.slotNumber}?\nTổng: ${formatCurrency(rental.totalPrice)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thanh toán ngay', onPress: () => doRepay(rental) },
      ]
    );
  };

  const doRepay = async (rental: BookingHistory) => {
    setRepayingId(rental.id);
    try {
      const result = await bookingApi.repayBooking(rental.id);
      if (result.paymentUrl) {
        const settled = await openAndWaitForPayment(result.paymentUrl, bookingApi.getHistory, rental.id);
        const callback = 'callback' in settled ? settled.callback : undefined;
        await load();
        navigation.replace('PaymentResult', {
          status: settled.status,
          rentalId: rental.id,
          slotNumber: rental.slotNumber,
          amount: callback?.amount,
          txnRef: callback?.txnRef,
          orderInfo: callback?.orderInfo,
        });
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy link thanh toán. Vui lòng thử lại sau.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể lấy link thanh toán. Vui lòng thử lại.');
    } finally {
      setRepayingId(null);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Vườn đang thuê</Text>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.getParent()?.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={colors.gray[700]} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {pendingPaymentCount > 0 && (
          <View style={styles.pendingBanner}>
            <Clock size={14} color={ORANGE} />
            <Text style={styles.pendingBannerText}>
              Bạn có <Text style={styles.pendingBannerBold}>{pendingPaymentCount}</Text> đơn chờ thanh toán
            </Text>
          </View>
        )}
      </View>

      {/* ─── Tab Bar ────────────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            {(t.count ?? 0) > 0 && (
              <View style={[styles.tabBadge, tab === t.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, tab === t.key && styles.tabBadgeTextActive]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Rental List ────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        ListEmptyComponent={
          <EmptyState title="Chưa có đơn thuê" subtitle="Khám phá và thuê ô vườn để bắt đầu" />
        }
        renderItem={({ item }) => {
          const badge = statusToBadge(item.status);
          const isPending = item.status === 'PENDING_PAYMENT' || item.status === 'PENDING';
          const isActive = item.status === 'ACTIVE';
          const isRepaying = repayingId === item.id;
          const hasPillars = item.pillars && item.pillars.length > 0;

          return (
            <TouchableOpacity
              style={[styles.card, isPending && styles.cardPending]}
              onPress={() => navigation.navigate('RentalDetail', { rental: item })}
              activeOpacity={0.88}
            >
              {/* ── Pending warning strip ── */}
              {isPending && (
                <View style={styles.pendingBar}>
                  <Clock size={13} color={ORANGE} />
                  <Text style={styles.pendingBarText}>Chờ thanh toán • Đơn sẽ tự hủy sau 24h</Text>
                </View>
              )}

              {/* ── Card Header: icon + info + badge ── */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, isPending ? styles.cardIconPending : isActive && styles.cardIconActive]}>
                  <Leaf size={22} color={isPending ? ORANGE : colors.green[600]} />
                </View>

                <View style={styles.cardBody}>
                  {/* Tên ô & địa điểm */}
                  <Text style={styles.cardTitle}>Ô {item.slotNumber}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                    <MapPin size={11} color={colors.gray[400]} />
                    <Text style={styles.cardSub} numberOfLines={1}>{item.locationName}</Text>
                  </View>

                  {/* Cây trồng / Trụ */}
                  {hasPillars ? (
                    <View style={styles.pillarsRow}>
                      {item.pillars!.map((p, idx) => (
                        <View key={idx} style={styles.pillarBadge}>
                          <Text style={styles.pillarBadgeText}>
                            🌱 {p.pillarCode}
                            {p.treeName ? ` · ${p.treeName}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : item.treeName ? (
                    <Text style={styles.cardTree}>🌱 {item.treeName}</Text>
                  ) : null}

                  {/* Thời hạn hợp đồng */}
                  <View style={styles.dateRow}>
                    <CalendarCheck2 size={11} color={colors.gray[400]} />
                    <Text style={styles.cardDate}>{fmtDate(item.startDate)}</Text>
                    <Text style={styles.dateSep}>→</Text>
                    <CalendarClock size={11} color={colors.gray[400]} />
                    <Text style={styles.cardDate}>{fmtDate(item.endDate)}</Text>
                  </View>
                </View>

                <View style={styles.rightCol}>
                  <Badge label={badge.label} variant={badge.variant} />
                  <Text style={styles.cardPrice}>{formatCurrency(item.totalPrice)}</Text>
                </View>
              </View>

              {/* ── Harvest Progress (chỉ hiện khi ACTIVE) ── */}
              {isActive && <HarvestProgress startDate={item.startDate} endDate={item.endDate} />}

              {/* ── Action buttons: PENDING ── */}
              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnRepay, isRepaying && styles.btnDisabled]}
                    onPress={e => { e.stopPropagation?.(); !isRepaying && handleRepay(item); }}
                    disabled={isRepaying}
                  >
                    {isRepaying
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <CreditCard size={15} color={colors.white} />}
                    <Text style={styles.btnRepayText}>{isRepaying ? 'Đang xử lý...' : 'Thanh toán ngay'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={e => { e.stopPropagation?.(); handleCancel(item); }}
                  >
                    <Text style={styles.btnCancelText}>Hủy đơn</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Action buttons: ACTIVE ── */}
              {isActive && (
                <View style={styles.actionRow}>
                  {/* Trồng cây mới */}
                  <TouchableOpacity
                    style={styles.btnPlant}
                    onPress={e => {
                      e.stopPropagation?.();
                      navigation.navigate('CustomerTreePlanting', { rentalId: item.id } as any);
                    }}
                  >
                    <Sprout size={14} color={colors.green[700]} />
                    <Text style={styles.btnPlantText}>Trồng mới</Text>
                  </TouchableOpacity>

                  {/* Gia hạn */}
                  <TouchableOpacity
                    style={styles.btnExtend}
                    onPress={e => {
                      e.stopPropagation?.();
                      navigation.navigate('RentalDetail', { rental: item });
                    }}
                  >
                    <RotateCw size={14} color="#1d4ed8" />
                    <Text style={styles.btnExtendText}>Gia hạn</Text>
                  </TouchableOpacity>

                  {/* Báo cáo sự cố */}
                  <TouchableOpacity
                    style={styles.btnIncident}
                    onPress={e => {
                      e.stopPropagation?.();
                      setIncidentTarget(item);
                    }}
                  >
                    <TriangleAlert size={14} color="#dc2626" />
                    <Text style={styles.btnIncidentText}>Sự cố</Text>
                  </TouchableOpacity>

                  {/* Xem chi tiết */}
                  <TouchableOpacity
                    style={styles.btnDetail}
                    onPress={() => navigation.navigate('RentalDetail', { rental: item })}
                  >
                    <ChevronRight size={15} color={colors.gray[600]} />
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Completed hint ── */}
              {item.status === 'COMPLETED' && (
                <View style={styles.completedHint}>
                  <Text style={styles.completedHintText}>✅ Hợp đồng đã hoàn thành</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── Incident Report Modal ──────────────────────────────────────── */}
      <IncidentReportModal
        visible={!!incidentTarget}
        rental={incidentTarget}
        onClose={() => setIncidentTarget(null)}
        onSuccess={() => {
          setIncidentTarget(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Harvest Progress Styles ──────────────────────────────────────────────────
const pStyles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  daysLeft: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.gray[500] },
  track: {
    height: 6,
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: { height: 6, borderRadius: radius.full },
});

// ─── Incident Modal Styles ─────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
  },
  rentalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  rentalInfoText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.green[800] },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.gray[700] },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  typeChipActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  typeChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.gray[600] },
  typeChipTextActive: { color: '#dc2626', fontFamily: 'Inter_700Bold' },
  emptyTypes: { fontSize: 12, color: colors.gray[400], fontFamily: 'Inter_400Regular' },
  textarea: {
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[800],
    minHeight: 100,
    backgroundColor: colors.gray[50],
  },
  charCount: { fontSize: 10, color: colors.gray[400], fontFamily: 'Inter_400Regular', textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.gray[700] },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: '#dc2626',
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.white },
});

// ─── Main Screen Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { ...typography.heading2, color: colors.gray[900] },
  bellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: ORANGE_LIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ORANGE_BORDER,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pendingBannerText: { ...typography.caption, color: ORANGE, flex: 1 },
  pendingBannerBold: { fontWeight: '700', color: ORANGE },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  tabBadge: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  tabBadgeTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing.lg, paddingBottom: 80 },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPending: { borderColor: ORANGE_BORDER, borderWidth: 1.5 },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ORANGE_LIGHT,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: ORANGE_BORDER,
  },
  pendingBarText: { ...typography.caption, color: ORANGE, fontWeight: '600', flex: 1 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconPending: { backgroundColor: ORANGE_LIGHT },
  cardIconActive: { backgroundColor: colors.green[50] },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.label, color: colors.gray[900], fontSize: 14 },
  cardSub: { ...typography.caption, color: colors.gray[500] },

  pillarsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  pillarBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarBadgeText: { fontSize: 10, color: colors.green[800], fontFamily: 'Inter_600SemiBold' },
  cardTree: { ...typography.caption, color: colors.green[700], fontFamily: 'Inter_600SemiBold', marginTop: 3 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  cardDate: { ...typography.caption, color: colors.gray[400] },
  dateSep: { ...typography.caption, color: colors.gray[300] },

  rightCol: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  cardPrice: { ...typography.label, fontSize: 13, color: colors.green[600] },

  // Action row (shared container)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },

  // Pending actions
  btnRepay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: ORANGE,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnRepayText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.white },
  btnCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  btnCancelText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#dc2626' },

  // Active actions
  btnPlant: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.green[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[300],
    paddingVertical: 9,
  },
  btnPlantText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.green[700] },
  btnExtend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 9,
  },
  btnExtendText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#1d4ed8' },
  btnIncident: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 9,
  },
  btnIncidentText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#dc2626' },
  btnDetail: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Completed
  completedHint: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    alignItems: 'center',
  },
  completedHintText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[400] },
});
