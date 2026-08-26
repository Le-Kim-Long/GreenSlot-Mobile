import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Leaf,
  MapPin,
  Calendar,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  Sprout,
  CalendarCheck2,
  TriangleAlert,
  Send,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { taskApi, managerApi } from '../../api/taskApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import type { ServiceTypeDTO } from '../../types/api';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';

// ─── Helpers ────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

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

// ─── Duration Picker Modal ───────────────────────────────────────────────────
interface DurationPickerProps {
  visible: boolean;
  current: number;
  onSelect: (months: number) => void;
  onClose: () => void;
}

function DurationPicker({ visible, current, onSelect, onClose }: DurationPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Chọn số tháng gia hạn</Text>
            <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
              <X size={22} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DURATION_OPTIONS}
            keyExtractor={item => item.toString()}
            numColumns={3}
            contentContainerStyle={pickerStyles.grid}
            renderItem={({ item }) => {
              const isSelected = item === current;
              return (
                <TouchableOpacity
                  style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[pickerStyles.optionNum, isSelected && pickerStyles.optionNumSelected]}>
                    {item}
                  </Text>
                  <Text style={[pickerStyles.optionLabel, isSelected && pickerStyles.optionLabelSelected]}>
                    tháng
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RentalDetailScreen({ route, navigation }: CustomerStackProps<'RentalDetail'>) {
  const { rental: initialRental } = route.params;
  const [rental, setRental] = useState(initialRental);
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [extending, setExtending] = useState(false);

  const currentEndDate = useMemo(() => parseToDate(rental.endDate), [rental.endDate]);
  const newEndDate = useMemo(() => addMonthsToDate(currentEndDate, selectedMonths), [currentEndDate, selectedMonths]);
  const pricePerMonth = useMemo(() => rental.monthlyPrice ?? rental.totalPrice / Math.max(1,
    (() => {
      const start = parseToDate(rental.startDate);
      const end = parseToDate(rental.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
    })()
  ), [rental.monthlyPrice, rental.totalPrice, rental.startDate, rental.endDate]);
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
                rentalId: rental.id,
                durationInMonths: selectedMonths,
                isMobile: true,
                mobileRedirectUrl: getMobileRedirectUrl(),
              });
              if (result.paymentUrl) {
                const settled = await openAndWaitForPayment(result.paymentUrl, bookingApi.getHistory, rental.id);
                const callback = 'callback' in settled ? settled.callback : undefined;
                navigation.replace('PaymentResult', {
                  status: settled.status,
                  rentalId: rental.id,
                  slotNumber: rental.slotNumber,
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

        {/* ── Quick Actions Row ─────────────────────────── */}
        {isActive && (
          <View style={[styles.card, { flexDirection: 'row', gap: spacing.sm, padding: spacing.md }]}>
            <TouchableOpacity
              style={[styles.btnPlant, { flex: 1, margin: 0 }]}
              onPress={() => navigation.navigate('CustomerTreePlanting', { rentalId: rental.id } as any)}
            >
              <Sprout size={15} color={colors.green[700]} />
              <Text style={styles.btnPlantText}>Trồng cây mới</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnIncident, { flex: 1, margin: 0 }]}
              onPress={openIncident}
            >
              <TriangleAlert size={15} color="#dc2626" strokeWidth={2} />
              <Text style={styles.btnIncidentText}>Báo sự cố</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pillar Info Card ──────────────────────────────────────────── */}
        {rental.pillars && rental.pillars.length > 0 && (
          <View style={styles.card}>
            <View style={styles.pillarCardHeader}>
              <Sprout size={18} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Chi tiết trụ canh tác</Text>
            </View>
            {rental.pillars.map((p, idx) => {
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
                      <Text style={styles.pillarTree}>🌱 {treeName}</Text>
                    ) : (
                      <Text style={styles.pillarEmpty}>Chưa chọn giống cây</Text>
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
                    📅 Dự kiến thu hoạch: {formatDate(rental.expectedHarvestAt)}
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

          {/* Date Range */}
          <View style={styles.dateRangeCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>📅 Ngày bắt đầu</Text>
              <Text style={styles.dateBlockValue}>{formatDate(rental.startDate)}</Text>
            </View>
            <View style={styles.dateArrow}>
              <ChevronRight size={20} color={colors.green[400]} />
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>🏁 Ngày kết thúc</Text>
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

            {/* Duration picker button */}
            <Text style={styles.fieldLabel}>Thời gian gia hạn</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Calendar size={18} color={colors.green[600]} />
              <Text style={styles.pickerButtonText}>{selectedMonths} tháng</Text>
              <View style={styles.pickerBadge}>
                <Text style={styles.pickerBadgeText}>Thay đổi</Text>
              </View>
            </TouchableOpacity>

            {/* New date range preview */}
            <View style={styles.dateRangeCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>📅 Bắt đầu gia hạn</Text>
                <Text style={styles.dateBlockValue}>{formatDate(rental.endDate)}</Text>
              </View>
              <View style={styles.dateArrow}>
                <ChevronRight size={20} color={colors.green[400]} />
              </View>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>🏁 Kết thúc mới</Text>
                <Text style={[styles.dateBlockValue, { color: colors.green[700] }]}>
                  {formatDateObj(newEndDate)}
                </Text>
              </View>
            </View>

            {/* Duration summary */}
            <View style={styles.durationSummary}>
              <Clock size={14} color={colors.green[600]} />
              <Text style={styles.durationText}>
                Gia hạn thêm{' '}
                <Text style={styles.durationHighlight}>{selectedMonths} tháng</Text>
              </Text>
            </View>

            {/* Cost estimate */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Phí gia hạn ước tính</Text>
              <Text style={styles.totalValue}>{formatCurrency(extensionCost)}</Text>
            </View>

            <Button
              title="Xác nhận & Thanh toán VNPay"
              onPress={handleExtend}
              loading={extending}
            />

            <Text style={styles.noteText}>
              💡 Hệ thống sẽ chuyển bạn đến VNPay để hoàn tất thanh toán.
            </Text>
          </View>
        )}



        {/* Padding bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Duration Picker Modal */}
      <DurationPicker
        visible={pickerVisible}
        current={selectedMonths}
        onSelect={setSelectedMonths}
        onClose={() => setPickerVisible(false)}
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

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.green[300],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  pickerButtonText: { ...typography.body, color: colors.gray[800], flex: 1 },
  pickerBadge: {
    backgroundColor: colors.green[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pickerBadgeText: { ...typography.caption, color: colors.green[700], fontWeight: '700' },

  durationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  durationText: { ...typography.bodySmall, color: colors.gray[600] },
  durationHighlight: { color: colors.green[700], fontWeight: '700' },

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
  btnIncident: {
    flex: 1,
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
});

// ─── Duration Picker Styles ───────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: { ...typography.label, color: colors.gray[900] },
  closeBtn: { padding: 4 },
  grid: { padding: spacing.md, gap: spacing.sm },
  option: {
    flex: 1,
    margin: 6,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.green[50],
    borderWidth: 1.5,
    borderColor: colors.green[100],
  },
  optionSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[700],
  },
  optionNum: { fontSize: 22, fontWeight: '700', color: colors.green[700] },
  optionNumSelected: { color: colors.white },
  optionLabel: { ...typography.caption, color: colors.green[500] },
  optionLabelSelected: { color: 'rgba(255,255,255,0.8)' },
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
