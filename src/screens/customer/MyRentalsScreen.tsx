import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Leaf, Clock, CreditCard, ChevronRight, Bell } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { notificationApi } from '../../api/notificationApi';
import type { BookingHistory } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';
import { openAndWaitForPayment } from '../../utils/paymentFlow';

type TabKey = 'ALL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'COMPLETED';

export default function MyRentalsScreen({ navigation }: CustomerTabProps<'Rentals'>) {
  const [rentals, setRentals] = useState<BookingHistory[]>([]);
  const [tab, setTab] = useState<TabKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repayingId, setRepayingId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useFocusEffect(
    useCallback(() => {
      load();
      // Also refresh unread notifications
      notificationApi.getUnreadCount()
        .then(res => { if (typeof res?.unreadCount === 'number') setUnreadCount(res.unreadCount); })
        .catch(() => notificationApi.getMyNotifications().then(list => {
          if (Array.isArray(list)) setUnreadCount(list.filter(n => !n.isRead).length);
        }).catch(() => {}));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Đếm số đơn chờ thanh toán để hiện badge
  const pendingPaymentCount = rentals.filter(
    r => r.status === 'PENDING_PAYMENT' || r.status === 'PENDING'
  ).length;

  const filtered =
    tab === 'ALL'
      ? rentals
      : tab === 'PENDING_PAYMENT'
      ? rentals.filter(r => r.status === 'PENDING_PAYMENT' || r.status === 'PENDING')
      : rentals.filter(r => r.status === tab);

  // Hủy đơn thuê đang chờ thanh toán
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

  // Tiếp tục thanh toán
  const handleRepay = async (rental: BookingHistory) => {
    Alert.alert(
      'Tiếp tục thanh toán',
      `Bạn có muốn tiếp tục thanh toán cho ô vườn ${rental.slotNumber}?\nTổng: ${formatCurrency(rental.totalPrice)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán ngay',
          onPress: () => doRepay(rental),
        },
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
        if (settled.status === 'success' && settled.rental) {
          navigation.replace('RentalDetail', { rental: settled.rental });
        } else {
          navigation.navigate('PaymentResult', {
            status: settled.status,
            rentalId: rental.id,
            slotNumber: rental.slotNumber,
            amount: callback?.amount,
            txnRef: callback?.txnRef,
            orderInfo: callback?.orderInfo,
          });
        }
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy link thanh toán. Vui lòng thử lại sau.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể lấy link thanh toán. Vui lòng thử lại.');
    } finally {
      setRepayingId(null);
    }
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang thuê' },
    { key: 'PENDING_PAYMENT', label: 'Chờ TT', count: pendingPaymentCount },
    { key: 'COMPLETED', label: 'Hoàn thành' },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {pendingPaymentCount > 0 && (
          <View style={styles.pendingBanner}>
            <Clock size={14} color={colors.orange[600] ?? '#ea580c'} />
            <Text style={styles.pendingBannerText}>
              Bạn có <Text style={styles.pendingBannerBold}>{pendingPaymentCount}</Text> đơn chờ thanh toán
            </Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            {(t.count ?? 0) > 0 && (
              <View style={[styles.tabBadge, tab === t.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, tab === t.key && styles.tabBadgeTextActive]}>
                  {t.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Chưa có đơn thuê"
            subtitle="Khám phá và thuê ô vườn để bắt đầu"
          />
        }
        renderItem={({ item }) => {
          const badge = statusToBadge(item.status);
          const isPendingPayment = item.status === 'PENDING_PAYMENT' || item.status === 'PENDING';
          const isRepaying = repayingId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, isPendingPayment && styles.cardPending]}
              onPress={() => navigation.navigate('RentalDetail', { rental: item })}
              activeOpacity={0.85}
            >
              {/* Pending payment warning bar */}
              {isPendingPayment && (
                <View style={styles.pendingBar}>
                  <Clock size={13} color={colors.orange[600] ?? '#ea580c'} />
                  <Text style={styles.pendingBarText}>Chờ thanh toán</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, isPendingPayment && styles.cardIconPending]}>
                  <Leaf size={22} color={isPendingPayment ? (colors.orange[600] ?? '#ea580c') : colors.green[600]} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.slotNumber}</Text>
                  <Text style={styles.cardSub}>{item.locationName}</Text>
                  
                  {item.treeName && (
                    <Text style={styles.cardTree}>🌱 {item.treeName}</Text>
                  )}

                  {item.pillars && item.pillars.length > 0 && (
                    <View style={styles.pillarsRow}>
                      {item.pillars.map((p, idx) => (
                        <View key={idx} style={styles.pillarBadge}>
                          <Text style={styles.pillarBadgeText}>{p.pillarCode}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Full date range */}
                  <View style={styles.dateRow}>
                    <Text style={styles.cardDate}>📅 {item.startDate}</Text>
                    <Text style={styles.dateSep}> → </Text>
                    <Text style={styles.cardDate}>🏁 {item.endDate}</Text>
                  </View>
                </View>
                <Badge label={badge.label} variant={badge.variant} />
              </View>

              <Text style={styles.cardPrice}>{formatCurrency(item.totalPrice)}</Text>

              {/* Action Buttons for Pending */}
              {isPendingPayment && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.repayBtn, isRepaying && styles.repayBtnDisabled]}
                    onPress={(e) => { e.stopPropagation?.(); !isRepaying && handleRepay(item); }}
                    activeOpacity={0.8}
                    disabled={isRepaying}
                  >
                    {isRepaying ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <CreditCard size={15} color={colors.white} />
                    )}
                    <Text style={styles.repayBtnText}>
                      {isRepaying ? 'Đang xử lý...' : 'Thanh toán ngay'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={(e) => { e.stopPropagation?.(); handleCancel(item); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Hủy đơn</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Gia hạn hint */}
              {item.status === 'ACTIVE' && (
                <View style={styles.extendHint}>
                  <ChevronRight size={14} color={colors.green[600]} />
                  <Text style={styles.extendHintText}>Xem chi tiết & Gia hạn</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const ORANGE = '#ea580c';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { ...typography.heading2, color: colors.gray[900], flex: 1 },
  bellButton: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.gray[100] },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },

  // Pending banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: '#fff7ed',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fed7aa',
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

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardPending: {
    borderColor: '#fed7aa',
    borderWidth: 1.5,
  },

  // Pending bar (top strip)
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  pendingBarText: {
    ...typography.caption,
    color: ORANGE,
    fontWeight: '600',
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
  cardIconPending: { backgroundColor: '#fff7ed' },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.label, color: colors.gray[900] },
  cardSub: { ...typography.caption, color: colors.gray[500] },

  // Date row
  dateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  cardDate: { ...typography.caption, color: colors.gray[400] },
  dateSep: { ...typography.caption, color: colors.gray[300] },

  cardPrice: { ...typography.label, color: colors.green[600], marginBottom: spacing.sm },

  cardTree: {
    ...typography.caption,
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  pillarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  pillarBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarBadgeText: {
    fontSize: 10,
    color: colors.green[800],
    fontFamily: 'Inter_600SemiBold',
  },

  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // Repay button
  repayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: ORANGE,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  repayBtnDisabled: { opacity: 0.6 },
  repayBtnText: {
    ...typography.label,
    fontSize: 12,
    color: colors.white,
    fontWeight: '700',
  },

  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: 'Inter_600SemiBold',
  },

  extendHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.green[100],
  },
  extendHintText: {
    ...typography.caption,
    color: colors.green[600],
    fontWeight: '600',
  },
});
