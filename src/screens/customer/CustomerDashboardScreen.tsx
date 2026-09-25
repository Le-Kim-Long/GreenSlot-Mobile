import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Leaf,
  Clock,
  CheckCircle2,
  ChevronRight,
  MapPin,
  PlusCircle,
  CreditCard,
  Sprout,
  Sparkles,
  ArrowRight,
  Calendar,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';
import type { CustomerStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default function CustomerDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
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

  const goToMyRentals = () => {
    (navigation as any).navigate('CustomerTabs', { screen: 'Rentals' });
  };

  const goToGardens = () => {
    (navigation as any).navigate('CustomerTabs', { screen: 'Gardens' });
  };

  const goToPayments = () => {
    navigation.navigate('PaymentHistory');
  };

  const goToRentalDetail = (rental: BookingHistory) => {
    navigation.navigate('RentalDetail', { rental });
  };

  if (loading) return <LoadingScreen />;

  const active = rentals.filter(r => r.status === 'ACTIVE');
  const pending = rentals.filter(r => r.status === 'PENDING' || r.status === 'PENDING_PAYMENT');
  const completed = rentals.filter(r => r.status === 'COMPLETED');

  const displayName = user?.name || 'Khách hàng';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green[600]}
            colors={[colors.green[600]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Welcome Banner ─────────────────────────────────── */}
        <LinearGradient
          colors={['#047857', '#059669', '#10b981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative decorative shapes */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Sparkles size={12} color="#fef08a" />
                <Text style={styles.heroBadgeText}>GreenSlot VIP</Text>
              </View>
            </View>

            <Text style={styles.heroGreeting}>
              Xin chào, {displayName}!
            </Text>
            <Text style={styles.heroSubtitle}>
              {active.length > 0
                ? `Bạn đang vận hành ${active.length} ô vườn canh tác thông minh`
                : 'Khám phá các ô vườn thẳng đứng và bắt đầu canh tác'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── KPI Stats (3 Metrics: Đang thuê, Chờ TT, Hoàn thành) ── */}
        <View style={styles.statsRow}>
          {/* 1. Đang thuê */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.kpiCard, styles.kpiActive]}
            onPress={goToMyRentals}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Leaf size={18} color={colors.green[600]} />
            </View>
            <Text style={styles.kpiValue}>{active.length}</Text>
            <Text style={styles.kpiLabel}>Đang thuê</Text>
            <View style={[styles.kpiTag, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.kpiTagText, { color: colors.green[700] }]}>Hoạt động</Text>
            </View>
          </TouchableOpacity>

          {/* 2. Chờ thanh toán */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.kpiCard, styles.kpiPending]}
            onPress={goToMyRentals}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: '#fffbeb' }]}>
              <Clock size={18} color="#d97706" />
            </View>
            <Text style={styles.kpiValue}>{pending.length}</Text>
            <Text style={styles.kpiLabel}>Chờ TT</Text>
            <View style={[styles.kpiTag, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.kpiTagText, { color: '#b45309' }]}>Cần xử lý</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Hoàn thành */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.kpiCard, styles.kpiCompleted]}
            onPress={goToMyRentals}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: '#faf5ff' }]}>
              <CheckCircle2 size={18} color="#7c3aed" />
            </View>
            <Text style={styles.kpiValue}>{completed.length}</Text>
            <Text style={styles.kpiLabel}>Hoàn thành</Text>
            <View style={[styles.kpiTag, { backgroundColor: '#f3e8ff' }]}>
              <Text style={[styles.kpiTagText, { color: '#6b21a8' }]}>Lịch sử</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickActionBtn}
            onPress={goToGardens}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.green[50] }]}>
              <PlusCircle size={20} color={colors.green[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Thuê ô mới</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickActionBtn}
            onPress={goToPayments}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.blue[50] }]}>
              <CreditCard size={20} color={colors.blue[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Thanh toán</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.quickActionBtn}
            onPress={goToMyRentals}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.emerald[50] }]}>
              <Sprout size={20} color={colors.emerald[600]} />
            </View>
            <Text style={styles.quickActionLabel}>Vườn của tôi</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Gardens Section ──────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Vườn đang thuê</Text>
            {active.length > 0 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{active.length} ô</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            activeOpacity={0.7}
            onPress={goToMyRentals}
          >
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <ChevronRight size={16} color={colors.green[600]} />
          </TouchableOpacity>
        </View>

        {active.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Sprout size={36} color={colors.green[500]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có vườn đang thuê</Text>
            <Text style={styles.emptyDesc}>
              Khám phá danh sách các ô vườn nông nghiệp thẳng đứng và đăng ký thuê ngay hôm nay.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.emptyBtn}
              onPress={goToGardens}
            >
              <Text style={styles.emptyBtnText}>Khám phá ô vườn</Text>
              <ArrowRight size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.rentalList}>
            {active.slice(0, 5).map(r => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.75}
                style={styles.rentalCard}
                onPress={() => goToRentalDetail(r)}
              >
                <View style={styles.rentalIconWrap}>
                  <Leaf size={20} color={colors.green[600]} />
                </View>

                <View style={styles.rentalBody}>
                  <View style={styles.rentalTitleRow}>
                    <Text style={styles.rentalSlotNumber}>{r.slotNumber}</Text>
                    {r.treeName ? (
                      <View style={styles.treeTag}>
                        <Sprout size={11} color={colors.emerald[700]} />
                        <Text style={styles.treeTagText} numberOfLines={1}>
                          {r.treeName}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.rentalMetaRow}>
                    <MapPin size={12} color={colors.gray[400]} />
                    <Text style={styles.rentalLocation} numberOfLines={1}>
                      {r.locationName || 'Khu canh tác GreenSlot'}
                    </Text>
                  </View>

                  {(r.endDate || r.endTime) ? (
                    <View style={styles.rentalDateRow}>
                      <Calendar size={11} color={colors.gray[400]} />
                      <Text style={styles.rentalDateText}>
                        Đến: {formatDate(r.endDate || r.endTime)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.rentalAction}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>Đang thuê</Text>
                  </View>
                  <ChevronRight size={16} color={colors.gray[400]} style={styles.chevron} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 12,
  },

  // ── Hero Banner ──
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroContent: {
    zIndex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.white,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.white,
  },
  heroGreeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#d1fae5',
    lineHeight: 19,
  },

  // ── KPI Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  kpiActive: {
    borderColor: '#bbf7d0',
  },
  kpiPending: {
    borderColor: '#fde68a',
  },
  kpiCompleted: {
    borderColor: '#e9d5ff',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 20,
    color: colors.gray[900],
    marginBottom: 2,
  },
  kpiLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 6,
    textAlign: 'center',
  },
  kpiTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },

  // ── Quick Actions ──
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-around',
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.gray[700],
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: colors.gray[900],
  },
  counterBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  counterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.green[800],
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.green[600],
  },

  // ── Rental Cards List ──
  rentalList: {
    gap: 10,
  },
  rentalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rentalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rentalBody: {
    flex: 1,
  },
  rentalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rentalSlotNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.gray[900],
  },
  treeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 120,
  },
  treeTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.green[800],
  },
  rentalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  rentalLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.gray[500],
  },
  rentalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rentalDateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.gray[400],
  },
  rentalAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green[600],
  },
  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.green[800],
  },
  chevron: {
    marginTop: 6,
  },

  // ── Empty State ──
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: spacing.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: colors.gray[800],
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },
});
