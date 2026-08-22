import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
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
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { harvestApi } from '../../api/harvestApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';

// ─── Helpers ────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

function formatDate(isoOrFormatted: string): string {
  if (!isoOrFormatted) return '--';
  if (isoOrFormatted.includes('/')) return isoOrFormatted;
  try {
    const d = new Date(isoOrFormatted);
    if (isNaN(d.getTime())) return isoOrFormatted;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoOrFormatted;
  }
}

function parseToDate(isoOrFormatted: string): Date {
  if (!isoOrFormatted) return new Date();
  if (isoOrFormatted.includes('/')) {
    const [d, m, y] = isoOrFormatted.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(isoOrFormatted);
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
  const pricePerMonth = useMemo(() => rental.totalPrice / Math.max(1,
    (() => {
      const start = parseToDate(rental.startDate);
      const end = parseToDate(rental.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
    })()
  ), [rental]);
  const extensionCost = pricePerMonth * selectedMonths;

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
                navigation.navigate('PaymentResult', { status: settled.status, rentalId: rental.id, slotNumber: rental.slotNumber, amount: callback?.amount, txnRef: callback?.txnRef, orderInfo: callback?.orderInfo });
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

  const handleHarvestDecision = (decision: 'SELF' | 'STAFF') => {
    Alert.alert('Xác nhận lựa chọn', decision === 'SELF' ? 'Bạn sẽ tự thu hoạch vụ cây này?' : 'Bạn muốn nhân viên thu hoạch giúp?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: async () => { try { await harvestApi.recordDecision(rental.id, decision); setRental({ ...rental, harvestDecision: decision }); Alert.alert('Thành công', 'Đã ghi nhận lựa chọn thu hoạch.'); } catch { Alert.alert('Lỗi', 'Không thể ghi nhận lựa chọn.'); } } },
    ]);
  };

  const badge = statusToBadge(rental.status);
  const isActive = rental.status === 'ACTIVE';

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

          <View style={styles.infoRow}>
            <Leaf size={16} color={colors.green[600]} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Cột vườn</Text>
              <Text style={styles.infoValue}>{rental.pillarCode ?? '--'}</Text>
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

        {rental.harvestNotifiedAt && !rental.harvestDecision && (
          <View style={[styles.card, styles.extendCard]}>
            <Text style={styles.sectionTitle}>Cây đã sẵn sàng thu hoạch</Text>
            <Text style={styles.extendSubtitle}>Bạn muốn tự thu hoạch hay nhờ nhân viên hỗ trợ?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Tự thu hoạch" onPress={() => handleHarvestDecision('SELF')} style={{ flex: 1 }} />
              <Button title="Nhờ nhân viên" onPress={() => handleHarvestDecision('STAFF')} variant="outline" style={{ flex: 1 }} />
            </View>
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
