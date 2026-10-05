import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Leaf,
  MapPin,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  Sprout,
  CalendarCheck2,
  TriangleAlert,
  Send,
  Layers,
  PlusCircle,
  Wifi,
  Zap,
  CheckCircle,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { taskApi, managerApi } from '../../api/taskApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import type { ServiceTypeDTO, BookingHistory } from '../../types/api';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';
import { AddPillarsModal } from '../../components/customer/AddPillarsModal';
import { EarlyHarvestModal } from '../../components/customer/EarlyHarvestModal';

// ─── Helpers ────────────────────────────────────────────────────────────────
const QUICK_MONTHS = [1, 3, 6, 12, 24];

/** Handles both ISO ("2026-08-26T...") and formatted ("26/8/2026") date strings */
function parseDateFlexible(raw: string): Date | null {
  if (!raw) return null;
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
    }
    return null;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(isoOrFormatted: string): string {
  if (!isoOrFormatted) return '--';
  if (isoOrFormatted.includes('/')) return isoOrFormatted;
  try {
    const d = parseDateFlexible(isoOrFormatted);
    if (!d) return isoOrFormatted;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoOrFormatted;
  }
}

function parseToDate(isoOrFormatted: string): Date {
  if (!isoOrFormatted) return new Date();
  const d = parseDateFlexible(isoOrFormatted);
  return d ?? new Date();
}

function addMonthsToDate(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDateObj(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}



// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RentalDetailScreen({ route, navigation }: CustomerStackProps<'RentalDetail'>) {
  const { rental: initialRental, rentalId, slotNumber } = (route.params || {}) as any;
  const [rental, setRental] = useState<BookingHistory | null>(initialRental || null);
  const [loading, setLoading] = useState<boolean>(!initialRental && !!(rentalId || slotNumber));
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [monthsInput, setMonthsInput] = useState('1');
  const [monthsError, setMonthsError] = useState('');
  const [extending, setExtending] = useState(false);
  const [addPillarsVisible, setAddPillarsVisible] = useState(false);
  const [decidingHarvest, setDecidingHarvest] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [earlyHarvestVisible, setEarlyHarvestVisible] = useState(false);
  const [earlyHarvestPillarCode, setEarlyHarvestPillarCode] = useState<string>('');

  const reloadRental = async () => {
    try {
      const history = await bookingApi.getHistory();
      const currentId = rental?.id || rentalId;
      const found = history.find(r => r.id === currentId);
      if (found) setRental(found);
    } catch (err) {
      console.error('Failed to reload rental:', err);
    }
  };

  const handleHarvestDecision = async (decision: 'SELF' | 'STAFF') => {
    if (!rental) return;
    setDecidingHarvest(true);
    try {
      await bookingApi.recordHarvestDecision(rental.id, decision);
      setRental(prev => prev ? { ...prev, harvestDecision: decision } : null);
      if (decision === 'SELF') {
        Alert.alert(
          'Đã ghi nhận!',
          'Bạn đã chọn tự thu hoạch. Dữ liệu đã được lưu vào lịch sử thu hoạch.'
        );
      } else {
        Alert.alert(
          'Đã gửi yêu cầu!',
          'Nhân viên sẽ tiến hành thu hoạch và bàn giao cho bạn trong thời gian sớm nhất.'
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể ghi nhận quyết định thu hoạch.');
    } finally {
      setDecidingHarvest(false);
    }
  };


  useEffect(() => {
    if (!rental && (rentalId || slotNumber)) {
      setLoading(true);
      bookingApi.getHistory()
        .then(history => {
          const found = history.find(r =>
            (rentalId && r.id === rentalId) ||
            (slotNumber && r.slotNumber?.toLowerCase() === slotNumber.toLowerCase())
          );
          if (found) {
            setRental(found);
          } else if (history.length > 0) {
            setRental(history[0]);
          }
        })
        .catch(err => {
          console.error('Failed to load rental:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [rentalId, slotNumber]);

  const slotArea = rental?.slotArea || 10.0;
  const currentUsedArea = useMemo(() => {
    if (!rental) return 0;
    let used = (rental.pillars || []).reduce((sum: number, p: any) => {
      const req = p.requiredArea || (p.capacityHoles && p.capacityHoles >= 48 ? 2.0 : (p.capacityHoles && p.capacityHoles >= 36 ? 1.5 : 1.0));
      return sum + req;
    }, 0);
    if (used === 0 && rental.pillarCode && rental.pillarCode !== 'N/A' && rental.pillarCode !== 'arduino-greenhouse-01') {
      used = 1.0;
    }
    return used;
  }, [rental]);
  const availableArea = Math.max(0, Number((slotArea - currentUsedArea).toFixed(1)));
  const hasPlantedTree = Boolean(
    rental?.treeName || (rental?.pillars && rental.pillars.some((p: any) => p.treeName))
  );

  const extLandPrice = rental?.landPrice ?? 0;
  const extPillarsPrice =
    rental?.monthlyPillarsPrice ??
    (rental?.pillars?.reduce((sum: number, p: any) => sum + (p.price ?? 0), 0) ?? 0);
  const pillarsCount = rental?.pillars?.length || rental?.pillarCodes?.length || 1;

  const currentEndDate = useMemo(() => parseToDate(rental?.endDate || ''), [rental?.endDate]);
  const newEndDate = useMemo(() => addMonthsToDate(currentEndDate, selectedMonths), [currentEndDate, selectedMonths]);
  const pricePerMonth = useMemo(() => {
    if (!rental) return 0;
    if (rental.monthlyPrice && rental.monthlyPrice > 0) {
      return rental.monthlyPrice;
    }
    if (extLandPrice + extPillarsPrice > 0) {
      return extLandPrice + extPillarsPrice;
    }

    const initialBookingTx = rental.transactions?.find((t: any) => t.vnpTxnRef?.startsWith('BOOK_')) ?? rental.transactions?.[0];
    const durationMonths = (() => {
      if (!rental.startDate || !rental.endDate) return 1;
      const start = parseToDate(rental.startDate);
      const end = parseToDate(rental.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
    })();

    return initialBookingTx
      ? Math.round(Number(initialBookingTx.amount) / durationMonths)
      : Math.round(rental.totalPrice / durationMonths);
  }, [rental, extLandPrice, extPillarsPrice]);
  const extensionCost = pricePerMonth * selectedMonths;

  // ── Incident report state ────────────────────────────────────────────────
  const [incidentVisible, setIncidentVisible] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDTO[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [incidentDesc, setIncidentDesc] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submittingIncident, setSubmittingIncident] = useState(false);

  const openIncident = async () => {
    setIncidentVisible(true);
    setLoadingTypes(true);
    try {
      const types = await managerApi.getServiceTypes();
      setServiceTypes(types);
    } catch {
      setServiceTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleIncidentSubmit = async () => {
    if (!rental) return;
    if (!selectedTypeId) { Alert.alert('Vui lòng chọn loại sự cố!'); return; }
    if (!incidentDesc.trim() || incidentDesc.trim().length < 10) {
      Alert.alert('Mô tả cần ít nhất 10 ký tự.');
      return;
    }
    setSubmittingIncident(true);
    try {
      await taskApi.requestService({
        slotId: (rental.slotId || rental.id) as number,
        serviceTypeId: selectedTypeId,
        description: incidentDesc.trim(),
      });
      Alert.alert('Đã gửi!', 'Nhân viên sẽ xử lý sự cố trong thời gian sớm nhất.');
      setIncidentDesc('');
      setSelectedTypeId(null);
      setIncidentVisible(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi báo cáo.');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleCancelBooking = () => {
    if (!rental) return;
    Alert.alert(
      'Hủy hợp đồng thuê',
      `Bạn có chắc chắn muốn hủy đơn thuê ô vườn ${rental.slotNumber} này không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.cancelBooking(rental.id);
              Alert.alert('Thành công', 'Đã hủy đơn đặt vườn thành công.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy đơn. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };


  const handleExtend = async () => {
    if (!rental) return;
    const currentRental = rental;
    Alert.alert(
      'Xác nhận gia hạn',
      `Gia hạn thêm ${selectedMonths} tháng?\nĐến ngày: ${formatDateObj(newEndDate)}\nPhí ước tính: ${formatCurrency(extensionCost)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán VNPay',
          onPress: async () => {
            setExtending(true);
            try {
              const result = await bookingApi.extendBooking({
                rentalId: currentRental.id,
                durationInMonths: selectedMonths,
                isMobile: true,
                mobileRedirectUrl: getMobileRedirectUrl(),
              });
              if (result.paymentUrl) {
                const settled = await openAndWaitForPayment(result.paymentUrl, bookingApi.getHistory, currentRental.id);
                const callback = 'callback' in settled ? settled.callback : undefined;
                navigation.replace('PaymentResult', {
                  status: settled.status,
                  type: 'extend',
                  rentalId: currentRental.id,
                  rental: currentRental,
                  slotNumber: currentRental.slotNumber,
                  amount: callback?.amount,
                  txnRef: callback?.txnRef,
                  orderInfo: callback?.orderInfo
                });
              }
            } catch (e: unknown) {
              const err = e as { response?: { data?: { message?: string } } };
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gia hạn. Vui lòng thử lại.');
            } finally {
              setExtending(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !rental) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={{ marginTop: 12, color: colors.gray[600], fontSize: 13 }}>
            Đang tải thông tin ô vườn...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const badge = statusToBadge(rental.status);
  const isActive = rental.status === 'ACTIVE';
  const isPending = rental.status === 'PENDING' || rental.status === 'PENDING_PAYMENT';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Leaf size={36} color={colors.green[600]} />
          </View>
          <Text style={styles.slotTitle}>Ô vườn {rental.slotNumber}</Text>
          <View style={{ marginTop: 6 }}>
            <Badge label={badge.label} variant={badge.variant} />
          </View>
        </View>

        {/* ── Harvest Decision Banner ─────────────────────── */}
        {isActive && rental.harvestNotifiedAt && !rental.harvestDecision && (
          <View style={styles.harvestBanner}>
            <View style={styles.harvestBannerHeader}>
              <Sprout size={18} color="#d97706" />
              <Text style={styles.harvestBannerTitle}>
                Cây {rental.treeName || ''} đã sẵn sàng thu hoạch!
              </Text>
            </View>

            {rental.expectedHarvestAt && new Date(rental.expectedHarvestAt).getTime() > Date.now() && (
              <View style={styles.earlyHarvestBadge}>
                <Text style={styles.earlyHarvestText}>Thu hoạch sớm</Text>
              </View>
            )}

            <View style={styles.harvestPillarRow}>
              <Layers size={14} color="#b45309" />
              <Text style={styles.harvestPillarText}>
                Vị trí: <Text style={styles.harvestPillarBold}>Trụ {rental.harvestPillarCode || (rental.pillarCodes && rental.pillarCodes.length > 0 ? rental.pillarCodes.join(', ') : rental.pillarCode || 'Tất cả trụ')}</Text>
              </Text>
            </View>

            {/* Evidence image & staff notes */}
            {rental.harvestEvidenceImageUrl && (
              <View style={styles.harvestEvidenceCard}>
                <Text style={styles.harvestEvidenceLabel}>Ảnh cây thực tế (Nhân viên gửi):</Text>
                <TouchableOpacity
                  style={styles.harvestImageWrapper}
                  onPress={() => setPreviewImage(rental.harvestEvidenceImageUrl!)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: rental.harvestEvidenceImageUrl }}
                    style={styles.harvestImage}
                    resizeMode="cover"
                  />
                  <View style={styles.harvestImageOverlay}>
                    <Text style={styles.harvestImageOverlayText}>Bấm để phóng to</Text>
                  </View>
                </TouchableOpacity>

                {rental.harvestStaffNotes && (
                  <View style={styles.harvestNotesBox}>
                    <Text style={styles.harvestNotesText}>
                      <Text style={{ fontWeight: '700' }}>Ghi chú nhân viên: </Text>
                      {rental.harvestStaffNotes}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.harvestQuestion}>
              Bạn muốn tự thu hoạch hay nhờ nhân viên hỗ trợ thu hoạch và bàn giao?
            </Text>

            <View style={styles.harvestBtnRow}>
              <TouchableOpacity
                style={[styles.btnHarvestSelf, decidingHarvest && styles.btnDisabled]}
                onPress={() => handleHarvestDecision('SELF')}
                disabled={decidingHarvest}
              >
                <Text style={styles.btnHarvestSelfText}>Tôi tự thu hoạch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnHarvestStaff, decidingHarvest && styles.btnDisabled]}
                onPress={() => handleHarvestDecision('STAFF')}
                disabled={decidingHarvest}
              >
                {decidingHarvest ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.btnHarvestStaffText}>Nhờ nhân viên giúp</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Đang chờ nhân viên thu hoạch (Hiển thị chi tiết rõ ràng trong Detail) ── */}
        {isActive && rental.harvestDecision === 'STAFF' && (
          <View style={styles.harvestWaitingCardDetail}>
            <View style={styles.harvestWaitingDetailHeader}>
              <View style={styles.harvestWaitingIconWrap}>
                <Clock size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.harvestWaitingDetailTitle}>Đang chờ nhân viên thu hoạch</Text>
                  <View style={styles.waitingBadge}>
                    <Text style={styles.waitingBadgeText}>Đang xử lý</Text>
                  </View>
                </View>
                <Text style={styles.harvestWaitingDetailSubtitle}>
                  Vị trí: Trụ {rental.harvestPillarCode || (rental.pillarCodes && rental.pillarCodes.length > 0 ? rental.pillarCodes.join(', ') : 'Tất cả các trụ canh tác')}
                </Text>
              </View>
            </View>

            <View style={styles.harvestWaitingDetailBody}>
              <Text style={styles.harvestWaitingDetailDesc}>
                Yêu cầu thu hoạch đã được gửi đến nhân viên làm vườn ca trực. Nhân viên sẽ tiến hành thu hoạch theo quy chuẩn, chụp ảnh nghiệm thu và bàn giao nông sản cho bạn.
              </Text>
              <View style={styles.harvestWaitingDetailSteps}>
                <View style={styles.stepItem}>
                  <CheckCircle size={14} color="#16a34a" />
                  <Text style={styles.stepText}>Đã tiếp nhận yêu cầu thu hoạch của bạn</Text>
                </View>
                <View style={styles.stepItem}>
                  <Clock size={14} color="#2563eb" />
                  <Text style={styles.stepText}>Nhân viên làm vườn đang chuẩn bị thu hoạch tại vườn</Text>
                </View>
                <View style={styles.stepItem}>
                  <Sprout size={14} color={colors.gray[400]} />
                  <Text style={[styles.stepText, { color: colors.gray[500] }]}>
                    Nghiệm thu, chụp ảnh bằng chứng và cập nhật Lịch sử
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btnGoToHistory}
              onPress={() => navigation.navigate('CustomerHarvestHistory' as any, { rentalId: rental.id, slotNumber: rental.slotNumber })}
            >
              <Text style={styles.btnGoToHistoryText}>Xem Lịch sử thu hoạch</Text>
              <ChevronRight size={14} color="#2563eb" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick Actions Row (Đã xóa button Cảm biến theo ô vườn, cảm biến hiển thị tại từng trụ) ── */}
        {isActive && (
          <View style={[styles.card, { padding: spacing.sm, gap: spacing.xs }]}>
            {/* Dòng 1: Thu hoạch sớm & Trồng mới (chia đôi đều nhau) */}
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {rental.harvestDecision !== 'STAFF' && (
                <TouchableOpacity
                  style={[
                    styles.btnQuickActionRow,
                    hasPlantedTree ? styles.btnQuickEarlyActive : styles.btnQuickEarlyDisabled,
                  ]}
                  onPress={() => {
                    if (!hasPlantedTree) {
                      Alert.alert(
                        'Chưa thể thu hoạch sớm',
                        'Trụ cây trong ô vườn đã được thu hoạch và chưa gieo giống mới. Vui lòng gieo trồng cây trước.'
                      );
                      return;
                    }
                    setEarlyHarvestPillarCode('');
                    setEarlyHarvestVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Zap size={15} color={hasPlantedTree ? '#b45309' : colors.gray[400]} strokeWidth={2.2} />
                  <Text style={[styles.btnQuickActionText, { color: hasPlantedTree ? '#b45309' : colors.gray[400] }]}>
                    Thu hoạch sớm
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.btnQuickActionRow, styles.btnQuickPlant]}
                onPress={() => navigation.navigate('CustomerTreePlanting', { rentalId: rental.id } as any)}
                activeOpacity={0.8}
              >
                <Sprout size={15} color={colors.green[700]} />
                <Text style={[styles.btnQuickActionText, { color: colors.green[700] }]}>
                  Trồng mới
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dòng 2: Thuê thêm & Sự cố (chia đôi đều nhau) */}
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <TouchableOpacity
                style={[
                  styles.btnQuickActionRow,
                  styles.btnQuickAddPillars,
                  availableArea < 1.0 && styles.btnQuickDisabled,
                ]}
                onPress={() => {
                  if (availableArea < 1.0) {
                    Alert.alert('Thông báo', 'Ô vườn đã hết diện tích trống để đặt thêm trụ.');
                    return;
                  }
                  setAddPillarsVisible(true);
                }}
                activeOpacity={0.8}
              >
                <PlusCircle size={15} color={availableArea >= 1.0 ? colors.emerald[700] : colors.gray[400]} />
                <Text style={[styles.btnQuickActionText, availableArea < 1.0 && { color: colors.gray[400] }]}>
                  Thuê thêm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnQuickActionRow, styles.btnQuickIncident]}
                onPress={openIncident}
                activeOpacity={0.8}
              >
                <TriangleAlert size={15} color="#dc2626" strokeWidth={2} />
                <Text style={[styles.btnQuickActionText, { color: '#dc2626' }]}>
                  Sự cố
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Pillar Info Card (Cảm biến gắn theo trụ) ──────────────────────────────────────────── */}
        {rental.pillars && rental.pillars.length > 0 && (
          <View style={styles.card}>
            <View style={styles.pillarCardHeader}>
              <Sprout size={18} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Chi tiết trụ canh tác</Text>
            </View>
            {rental.pillars.map((p: any, idx: number) => {
              const treeName = p.treeName;
              const harvestDate = p.expectedHarvestDate || p.expectedHarvestAt || (treeName ? rental.expectedHarvestAt : undefined);
              return (
                <View key={idx} style={[
                  styles.pillarRow,
                  idx < rental.pillars!.length - 1 && styles.pillarRowBorder,
                ]}>
                  <View style={styles.pillarIconWrap}>
                    <Leaf size={14} color={colors.green[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pillarCode}>Trụ {p.pillarCode}</Text>
                    {treeName ? (
                      <Text style={styles.pillarTree}>{treeName}</Text>
                    ) : (
                      <Text style={styles.pillarEmpty}>Chưa chọn giống cây (Đã thu hoạch)</Text>
                    )}
                    {harvestDate && (
                      <View style={styles.harvestDateRow}>
                        <CalendarCheck2 size={11} color={colors.gray[400]} />
                        <Text style={styles.harvestDateText}>
                          Dự kiến thu hoạch: {formatDate(harvestDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* Nút thu hoạch sớm riêng cho trụ này nếu đang có cây */}
                    {treeName && rental.harvestDecision !== 'STAFF' && (
                      <TouchableOpacity
                        style={styles.pillarEarlyHarvestBtnIcon}
                        onPress={() => {
                          setEarlyHarvestPillarCode(p.pillarCode);
                          setEarlyHarvestVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Zap size={14} color="#b45309" strokeWidth={2.2} />
                      </TouchableOpacity>
                    )}

                    {/* Nút cảm biến theo trụ - chỉ hiện icon */}
                    <TouchableOpacity
                      style={styles.pillarSensorBtnIcon}
                      onPress={() => {
                        navigation.navigate('IoTDetail', {
                          slotId: rental.slotId || rental.id,
                          pillarId: p.id,
                          pillarCode: p.pillarCode,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Wifi size={15} color="#2563EB" />
                    </TouchableOpacity>

                    <View style={[
                      styles.pillarSizeBadge,
                      p.pillarType === 'LARGE' ? styles.pillarSizeLarge :
                        p.pillarType === 'SMALL' ? styles.pillarSizeSmall : styles.pillarSizeMedium,
                    ]}>
                      <Text style={styles.pillarSizeText}>
                        {p.pillarTypeName ?? p.pillarType ?? 'Vừa'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Info Card ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin hợp đồng</Text>

          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.green[600]} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Cơ sở</Text>
              <Text style={styles.infoValue}>{rental.locationName ?? '--'}</Text>
            </View>
          </View>

          {/* {rental.treeName && (
            <View style={styles.infoRow}>
              <Sprout size={16} color={colors.green[600]} />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Giống rau canh tác</Text>
                <Text style={[styles.infoValue, { color: colors.green[700], fontWeight: '700' }]}>
                  {rental.treeName}
                </Text>
                {rental.expectedHarvestAt && (
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[500], marginTop: 2 }}>
                    Dự kiến thu hoạch: {formatDate(rental.expectedHarvestAt)}
                  </Text>
                )}
              </View>
            </View>
          )} */}

          <View style={styles.infoRow}>
            <Leaf size={16} color={colors.green[600]} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Số trụ canh tác</Text>
              <Text style={styles.infoValue}>
                {rental.pillars && rental.pillars.length > 0
                  ? `${rental.pillars.length} trụ`
                  : rental.pillarCode ?? '--'}
              </Text>
            </View>
          </View>

          {/* Diện tích ô vườn */}
          <View style={styles.infoRow}>
            <Layers size={16} color={colors.green[600]} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Diện tích ô vườn</Text>
              <Text style={styles.infoValue}>
                {slotArea}m² (Đã dùng {currentUsedArea.toFixed(1)}m² · Trống{' '}
                <Text style={{ color: availableArea >= 1.0 ? colors.emerald[700] : colors.orange[600], fontWeight: '700' }}>
                  {availableArea.toFixed(1)}m²
                </Text>)
              </Text>
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateRangeCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>Ngày bắt đầu</Text>
              <Text style={styles.dateBlockValue}>{formatDate(rental.startDate)}</Text>
            </View>
            <View style={styles.dateArrow}>
              <ChevronRight size={20} color={colors.green[400]} />
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>Ngày kết thúc</Text>
              <Text style={styles.dateBlockValue}>{formatDate(rental.endDate)}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng tiền hợp đồng</Text>
            <Text style={styles.totalValue}>{formatCurrency(rental.totalPrice)}</Text>
          </View>

          {/* Cancel button if pending */}
          {isPending && (
            <TouchableOpacity
              style={styles.cancelFullBtn}
              onPress={handleCancelBooking}
            >
              <Text style={styles.cancelFullBtnText}>Hủy đơn đặt vườn này</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Extension Card (chỉ khi ACTIVE) ─────────── */}
        {isActive && (
          <View style={[styles.card, styles.extendCard]}>
            <View style={styles.extendHeader}>
              <RotateCcw size={20} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Gia hạn hợp đồng</Text>
            </View>
            <Text style={styles.extendSubtitle}>
              Chọn số tháng bạn muốn gia hạn thêm từ ngày{' '}
              <Text style={{ fontWeight: '700', color: colors.green[700] }}>
                {formatDate(rental.endDate)}
              </Text>
            </Text>

            {/* Duration — inline input + quick chips */}
            <Text style={styles.fieldLabel}>Thời gian gia hạn</Text>

            <View style={[styles.monthInputWrapper, monthsError ? styles.monthInputError : null]}>
              <TextInput
                style={styles.monthTextInput}
                keyboardType="number-pad"
                value={monthsInput}
                onChangeText={raw => {
                  const cleaned = raw.replace(/\D/g, '');
                  setMonthsInput(cleaned);
                  if (!cleaned) {
                    setSelectedMonths(0);
                    setMonthsError('Vui lòng nhập số tháng (tối thiểu 1).');
                  } else {
                    const n = parseInt(cleaned, 10);
                    if (n < 1) { setSelectedMonths(0); setMonthsError('Tối thiểu 1 tháng.'); }
                    else if (n > 120) { setSelectedMonths(n); setMonthsError('Tối đa 120 tháng.'); }
                    else { setSelectedMonths(n); setMonthsError(''); }
                  }
                }}
                placeholder="Nhập số tháng..."
                placeholderTextColor={colors.gray[400]}
              />
              <Text style={styles.monthInputSuffix}>tháng</Text>
            </View>

            {monthsError ? (
              <Text style={styles.monthInputErrText}>{monthsError}</Text>
            ) : null}

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {QUICK_MONTHS.map(m => {
                const isSelected = selectedMonths === m && !monthsError;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.quickChip, isSelected && styles.quickChipActive]}
                    onPress={() => { setMonthsInput(m.toString()); setSelectedMonths(m); setMonthsError(''); }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}
                      numberOfLines={1}
                    >
                      {m} tháng
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* New date range preview */}
            <View style={styles.dateRangeCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>Bắt đầu gia hạn</Text>
                <Text style={styles.dateBlockValue}>{formatDate(rental.endDate)}</Text>
              </View>
              <View style={styles.dateArrow}>
                <ChevronRight size={20} color={colors.green[400]} />
              </View>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>Kết thúc mới</Text>
                <Text style={[styles.dateBlockValue, { color: colors.green[700] }]}>
                  {formatDateObj(newEndDate)}
                </Text>
              </View>
            </View>

            {/* Cost breakdown giống FE (Bóc tách minh bạch) */}
            <View style={styles.extendBreakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tiền thuê đất ô vườn:</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(extLandPrice)}/tháng</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tiền thuê trụ ({pillarsCount} trụ):</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(extPillarsPrice)}/tháng</Text>
              </View>

              {rental.pillars && rental.pillars.length > 0 && (
                <View style={styles.pillarsDetailList}>
                  {rental.pillars.map((p: any, idx: number) => {
                    const type = p.pillarType?.toUpperCase();
                    const holes = p.capacityHoles || (type === 'LARGE' ? 48 : type === 'MEDIUM' ? 36 : 24);
                    const label =
                      type === 'LARGE' || holes >= 48
                        ? `Trụ Lớn (${holes} hốc)`
                        : type === 'MEDIUM' || holes >= 36
                        ? `Trụ Vừa (${holes} hốc)`
                        : `Trụ Nhỏ (${holes} hốc)`;
                    return (
                      <View key={p.id || idx} style={styles.pillarDetailLine}>
                        <Text style={styles.pillarDetailLineCode}>
                          • {p.pillarCode} - {label}
                        </Text>
                        <Text style={styles.pillarDetailLinePrice}>
                          {formatCurrency(p.price || 0)}/tháng
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: '600' }]}>Tổng đơn giá thuê ô & trụ:</Text>
                <Text style={[styles.breakdownValue, { color: colors.emerald[800] }]}>{formatCurrency(pricePerMonth)}/tháng</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Thời gian gia hạn:</Text>
                <Text style={styles.breakdownValue}>{selectedMonths} tháng</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={styles.breakdownTotalLabel}>Tổng tiền cần thanh toán:</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(extensionCost)}</Text>
              </View>
            </View>

            <Button
              title={extending ? 'Đang xử lý...' : `Xác nhận & Thanh toán (${formatCurrency(extensionCost)})`}
              onPress={handleExtend}
              loading={extending}
              disabled={extending || !selectedMonths || selectedMonths < 1 || Boolean(monthsError)}
            />

            <Text style={styles.noteText}>
              Hệ thống sẽ chuyển bạn đến VNPay để hoàn tất thanh toán.
            </Text>
          </View>
        )}



        {/* Padding bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>


      {/* Add Pillars Modal */}
      <AddPillarsModal
        visible={addPillarsVisible}
        rental={rental}
        onClose={() => setAddPillarsVisible(false)}
        onPaymentSettled={async (status, callback, rentalId) => {
          navigation.replace('PaymentResult', {
            status,
            type: 'add_pillar',
            rentalId: rentalId || rental.id,
            rental,
            slotNumber: rental.slotNumber,
            amount: callback?.amount,
            txnRef: callback?.txnRef,
            orderInfo: callback?.orderInfo,
          });
        }}
      />

      {/* Incident Report Modal */}
      <Modal visible={incidentVisible} transparent animationType="slide" onRequestClose={() => setIncidentVisible(false)}>
        <View style={incStyles.overlay}>
          <View style={incStyles.sheet}>
            <View style={incStyles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TriangleAlert size={18} color="#ef4444" />
                <Text style={incStyles.title}>Báo cáo sự cố</Text>
              </View>
              <TouchableOpacity onPress={() => setIncidentVisible(false)} style={incStyles.closeBtn}>
                <X size={18} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            <View style={incStyles.rentalTag}>
              <Text style={incStyles.rentalTagText}>Ô {rental.slotNumber} · {rental.locationName}</Text>
            </View>
            <ScrollView contentContainerStyle={incStyles.body} showsVerticalScrollIndicator={false}>
              <Text style={incStyles.label}>Loại sự cố <Text style={{ color: '#ef4444' }}>*</Text></Text>
              {loadingTypes
                ? <ActivityIndicator size="small" color={colors.green[600]} style={{ marginVertical: 12 }} />
                : <View style={incStyles.typeGrid}>
                  {serviceTypes.length === 0
                    ? <Text style={incStyles.emptyTypes}>Không tải được danh sách. Mô tả sự cố bên dưới.</Text>
                    : serviceTypes.map(st => (
                      <TouchableOpacity
                        key={st.id}
                        style={[incStyles.chip, selectedTypeId === st.id && incStyles.chipActive]}
                        onPress={() => setSelectedTypeId(st.id ?? null)}
                      >
                        <Text style={[incStyles.chipText, selectedTypeId === st.id && incStyles.chipTextActive]}>
                          {st.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  }
                </View>
              }
              <Text style={incStyles.label}>Mô tả chi tiết <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                style={incStyles.textarea}
                value={incidentDesc}
                onChangeText={setIncidentDesc}
                multiline
                numberOfLines={4}
                placeholder="Mô tả sự cố (hệ thống tưới, giống cây, thiết bị, v.v.)..."
                placeholderTextColor={colors.gray[400]}
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={incStyles.footer}>
              <TouchableOpacity style={incStyles.cancelBtn} onPress={() => setIncidentVisible(false)}>
                <Text style={incStyles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[incStyles.submitBtn, (submittingIncident || !selectedTypeId) && incStyles.submitDisabled]}
                onPress={handleIncidentSubmit}
                disabled={submittingIncident || !selectedTypeId}
              >
                {submittingIncident
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Send size={15} color={colors.white} />}
                <Text style={incStyles.submitText}>{submittingIncident ? 'Đang gửi...' : 'Gửi báo cáo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
              <Text style={styles.modalCloseText}>✕ Đóng</Text>
            </TouchableOpacity>
            <Image source={{ uri: previewImage }} style={styles.modalFullImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Early Harvest Modal */}
      <EarlyHarvestModal
        visible={earlyHarvestVisible}
        rental={rental}
        initialPillarCode={earlyHarvestPillarCode}
        onClose={() => setEarlyHarvestVisible(false)}
        onSuccess={msg => {
          reloadRental();
          if (msg) Alert.alert('Thành công', msg);
        }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  slotTitle: {
    ...typography.heading1,
    color: colors.gray[900],
    textAlign: 'center',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  extendCard: {
    borderColor: colors.green[300],
    borderWidth: 1.5,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoTexts: { flex: 1 },
  infoLabel: { ...typography.caption, color: colors.gray[400] },
  infoValue: { ...typography.body, color: colors.gray[800], marginTop: 2 },

  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  dateBlock: { flex: 1, alignItems: 'center' },
  dateBlockLabel: { ...typography.caption, color: colors.gray[500] },
  dateBlockValue: { ...typography.label, color: colors.gray[900], marginTop: 4 },
  dateArrow: { paddingHorizontal: spacing.xs },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: spacing.xs,
  },
  totalLabel: { ...typography.body, color: colors.gray[600] },
  totalValue: { ...typography.heading2, color: colors.green[700] },

  // Extension specific
  extendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  extendSubtitle: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md },

  fieldLabel: { ...typography.caption, color: colors.gray[700], marginBottom: 6, fontWeight: '600' },

  monthInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    marginBottom: spacing.xs,
  },
  monthInputError: {
    borderColor: colors.red[500],
  },
  monthTextInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  monthInputSuffix: {
    fontSize: 13,
    color: colors.gray[500],
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  monthInputErrText: {
    fontSize: 11,
    color: colors.red[600],
    marginBottom: spacing.xs,
    fontWeight: '500',
  },

  extendBreakdownCard: {
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    ...typography.caption,
    color: colors.gray[600],
  },
  breakdownValue: {
    ...typography.caption,
    color: colors.gray[900],
    fontFamily: 'Inter_600SemiBold',
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.green[200],
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    ...typography.bodySmall,
    color: colors.gray[900],
    fontFamily: 'Inter_700Bold',
  },
  breakdownTotalValue: {
    ...typography.label,
    color: colors.green[700],
    fontFamily: 'Inter_700Bold',
  },

  noteText: {
    ...typography.caption,
    color: colors.gray[400],
    marginTop: spacing.md,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Service picker custom card styles
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.green[100],
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  serviceOptionCardSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  serviceOptionName: { ...typography.label, color: colors.gray[800] },
  serviceOptionNameSelected: { color: colors.green[700], fontWeight: '700' },
  serviceOptionDesc: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  serviceOptionDescSelected: { color: colors.green[600] },
  serviceOptionPrice: { ...typography.label, color: colors.green[700] },
  serviceOptionPriceSelected: { fontWeight: '700' },

  // Pillar detail card
  pillarCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pillarRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  pillarIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  pillarCode: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  pillarTree: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
    marginTop: 2,
  },
  pillarEmpty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[400],
    fontStyle: 'italic',
    marginTop: 2,
  },
  harvestDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  harvestDateText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  pillarSizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pillarSizeLarge: { backgroundColor: '#fef3c7' },
  pillarSizeMedium: { backgroundColor: colors.green[50] },
  pillarSizeSmall: { backgroundColor: '#f0f9ff' },
  pillarSizeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },

  pillarBadgeFull: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarBadgeFullText: {
    fontSize: 11,
    color: colors.green[800],
    fontFamily: 'Inter_600SemiBold',
  },

  cancelFullBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFullBtnText: {
    fontSize: 13,
    color: '#dc2626',
    fontFamily: 'Inter_600SemiBold',
  },

  // Active action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  btnPlant: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[300],
    paddingVertical: 12,
  },
  btnPlantText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.green[700] },
  btnAddPillarQuick: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.emerald[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.emerald[300],
    paddingVertical: 12,
  },
  btnAddPillarQuickDisabled: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.6,
  },
  btnAddPillarQuickText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.emerald[700] },
  btnIncident: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 12,
  },
  btnIncidentText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#dc2626' },

  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipActive: {
    backgroundColor: colors.emerald[600],
    borderColor: colors.emerald[600],
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[700],
    textAlign: 'center',
  },
  quickChipTextActive: {
    color: colors.white,
  },

  pillarsDetailList: {
    borderLeftWidth: 2,
    borderLeftColor: colors.emerald[300],
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
    gap: 3,
    backgroundColor: 'rgba(209, 250, 229, 0.35)',
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillarDetailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarDetailLineCode: {
    fontSize: 11,
    color: colors.gray[700],
    flex: 1,
  },
  pillarDetailLinePrice: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[800],
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.emerald[200],
    marginVertical: 4,
  },
  harvestBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  harvestBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  harvestBannerTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#78350f',
    flex: 1,
  },
  earlyHarvestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 6,
  },
  earlyHarvestText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  harvestPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  harvestPillarText: {
    fontSize: 13,
    color: '#92400e',
    fontFamily: 'Inter_500Medium',
  },
  harvestPillarBold: {
    fontFamily: 'Inter_700Bold',
    color: '#78350f',
  },
  harvestEvidenceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  harvestEvidenceLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
    marginBottom: 6,
  },
  harvestImageWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 160,
    backgroundColor: colors.gray[900],
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  harvestImage: {
    width: '100%',
    height: '100%',
  },
  harvestImageOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  harvestImageOverlayText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  harvestNotesBox: {
    marginTop: spacing.xs,
    backgroundColor: '#fffbeb',
    borderRadius: radius.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  harvestNotesText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },
  harvestQuestion: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: spacing.sm,
    fontFamily: 'Inter_400Regular',
  },
  harvestBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnHarvestSelf: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHarvestSelfText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  btnHarvestStaff: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHarvestStaffText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPlantDisabled: {
    opacity: 0.65,
  },
  // 2-line Quick Actions
  btnQuickActionRow: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  btnQuickEarlyActive: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  btnQuickEarlyDisabled: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.65,
  },
  btnQuickPlant: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
  },
  btnQuickAddPillars: {
    backgroundColor: colors.emerald[50],
    borderColor: colors.emerald[200],
  },
  btnQuickIncident: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  btnQuickDisabled: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.6,
  },
  btnQuickActionText: {
    fontSize: 12.5,
    fontFamily: 'Inter_700Bold',
  },

  // Pillar buttons icon-only
  pillarEarlyHarvestBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarSensorBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarEarlyHarvestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillarEarlyHarvestBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  harvestWaitingCardDetail: {
    backgroundColor: '#eff6ff',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  harvestWaitingDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  harvestWaitingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestWaitingDetailTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1e3a8a',
  },
  waitingBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  waitingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#1d4ed8',
  },
  harvestWaitingDetailSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563eb',
    marginTop: 2,
  },
  harvestWaitingDetailBody: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    gap: spacing.xs,
  },
  harvestWaitingDetailDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#1d4ed8',
    lineHeight: 18,
  },
  harvestWaitingDetailSteps: {
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepText: {
    fontSize: 11.5,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[800],
    flex: 1,
  },
  btnGoToHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 4,
  },
  btnGoToHistoryText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#1d4ed8',
  },
  harvestWaitingCard: {
    backgroundColor: '#eff6ff',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  harvestWaitingTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1e3a8a',
    marginBottom: 2,
  },
  harvestWaitingDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#1d4ed8',
    lineHeight: 17,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    zIndex: 10,
  },
  modalCloseText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  modalFullImage: {
    width: '100%',
    height: '80%',
  },
});

// ─── Incident Modal Styles ────────────────────────────────────────────────────
const incStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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
  title: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  closeBtn: { padding: 6, backgroundColor: colors.gray[100], borderRadius: radius.full },
  rentalTag: {
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  rentalTagText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.green[800] },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.gray[700] },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  chipActive: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.gray[600] },
  chipTextActive: { color: '#dc2626', fontFamily: 'Inter_700Bold' },
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
  cancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.gray[700] },
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
  submitDisabled: { opacity: 0.55 },
  submitText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.white },
});
