import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  AppState,
  TextInput,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  Leaf,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  CreditCard,
  Clock,
  CheckCircle2,
  RotateCcw,
  Cpu,
  Star,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { taskApi } from '../../api/taskApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import type { PaymentTransactionInfo } from '../../types/api';

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

function formatTxDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
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


// ─── Transaction Row ─────────────────────────────────────────────────────────
function TransactionRow({ tx }: { tx: PaymentTransactionInfo }) {
  const isSuccess = tx.status === 'SUCCESS';
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.dot, isSuccess ? txStyles.dotSuccess : txStyles.dotFail]} />
      <View style={txStyles.info}>
        <Text style={txStyles.ref}>{tx.vnpTxnRef}</Text>
        <Text style={txStyles.date}>{formatTxDate(tx.paymentDate)}</Text>
      </View>
      <View style={txStyles.right}>
        <Text style={txStyles.amount}>{formatCurrency(tx.amount)}</Text>
        <Text style={[txStyles.status, isSuccess ? txStyles.statusSuccess : txStyles.statusFail]}>
          {isSuccess ? 'Thành công' : tx.status}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RentalDetailScreen({ route, navigation }: CustomerStackProps<'RentalDetail'>) {
  const { rental: initialRental } = route.params;
  const [rental, setRental] = useState(initialRental);
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [extending, setExtending] = useState(false);

  // Feedback states (Phase 2.3)
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Service request states
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [description, setDescription] = useState('');

  const handleSendFeedback = async () => {
    if (!feedbackComment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập bình luận đánh giá!');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await bookingApi.submitFeedback({
        rentalId: rental.id,
        rating: feedbackRating,
        comments: feedbackComment.trim(),
      });
      Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá phản hồi!');
      setFeedbackSubmitted(true);
      setFeedbackComment('');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // AppState ref for payment result detection
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingExtendRef = useRef<boolean>(false);

  const currentEndDate = useMemo(() => parseToDate(rental.endDate), [rental.endDate]);
  const newEndDate = useMemo(() => addMonthsToDate(currentEndDate, selectedMonths), [currentEndDate, selectedMonths]);

  // Tổng tiền: ưu tiên totalPrice từ adapter; nếu = 0 thì tính lại từ transactions
  const displayTotal = useMemo(() => {
    if (rental.totalPrice && rental.totalPrice > 0) return rental.totalPrice;
    if (rental.transactions && rental.transactions.length > 0) {
      const sum = rental.transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      return sum > 0 ? sum : 0;
    }
    return 0;
  }, [rental.totalPrice, rental.transactions]);

  const pricePerMonth = useMemo(() => displayTotal / Math.max(1,
    (() => {
      const start = parseToDate(rental.startDate);
      const end = parseToDate(rental.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
    })()
  ), [displayTotal, rental.startDate, rental.endDate]);
  const extensionCost = pricePerMonth * selectedMonths;

  // Detect return from VNPay browser
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
      if (wasBackground && next === 'active' && pendingExtendRef.current) {
        pendingExtendRef.current = false;
        try {
          const history = await bookingApi.getHistory();
          const updated = history.find(r => r.id === rental.id);
          if (updated) setRental(updated);
          Alert.alert(
            updated?.status === 'ACTIVE' ? '🎉 Gia hạn thành công!' : '⏳ Chưa ghi nhận',
            updated?.status === 'ACTIVE'
              ? `Ô vườn ${rental.slotNumber} đã được gia hạn đến ${formatDate(updated.endDate)}.`
              : 'Giao dịch chưa được xác nhận. Vui lòng kéo để làm mới.',
            [{ text: 'OK' }]
          );
        } catch { /* silent */ }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [rental.id, rental.slotNumber]);

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
              });
              if (result.paymentUrl) {
                pendingExtendRef.current = true;
                await Linking.openURL(result.paymentUrl);
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

  const handleRequestService = async () => {
    if (!selectedServiceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại dịch vụ chăm sóc!');
      return;
    }
    setServiceSubmitting(true);
    try {
      // Use rental.slotId if defined, otherwise fallback to rental.id (rentalId)
      const targetSlotId = rental.slotId || rental.id;
      await taskApi.requestService({
        slotId: targetSlotId,
        serviceTypeId: selectedServiceId,
        description: description.trim() || undefined,
      });
      Alert.alert('Thành công', 'Yêu cầu dịch vụ chăm sóc đã được gửi thành công!');
      setDescription('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi yêu cầu dịch vụ. Vui lòng thử lại.');
    } finally {
      setServiceSubmitting(false);
    }
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
            <Text style={styles.totalValue}>{formatCurrency(displayTotal)}</Text>
          </View>
        </View>

        {/* ── IoT Monitoring Card (chỉ khi ACTIVE) ─── */}
        {isActive && (
          <View style={[styles.card, { borderColor: colors.green[300], borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
              <Cpu size={20} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Giám sát IoT thời gian thực</Text>
            </View>
            <Text style={{ ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md }}>
              Xem độ ẩm đất, nhiệt độ, độ pH và cường độ ánh sáng hiện tại của ô vườn {rental.slotNumber}.
            </Text>
            <Button
              title="Xem thông số cảm biến"
              onPress={() => navigation.navigate('IoTMonitoring', { slotId: rental.slotId || rental.id })}
              variant="outline"
            />
          </View>
        )}

        {/* ── Transaction History ──────────────────────── */}
        {rental.transactions && rental.transactions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
            {rental.transactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </View>
        )}



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

        {/* ── Feedback Card (chỉ hiển thị khi Hợp đồng đã hoàn thành/hết hạn và chưa gửi feedback) ─── */}
        {!isActive && rental.status !== 'PENDING' && !feedbackSubmitted && (
          <View style={[styles.card, { borderColor: colors.yellow[300], borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
              <Star size={20} color={colors.yellow[600]} fill={colors.yellow[500]} />
              <Text style={styles.sectionTitle}>Đánh giá dịch vụ</Text>
            </View>
            <Text style={{ ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md }}>
              Hãy chia sẻ trải nghiệm của bạn về dịch vụ thuê ô vườn {rental.slotNumber} này.
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.md }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Star
                    size={32}
                    color={star <= feedbackRating ? colors.yellow[500] : colors.gray[300]}
                    fill={star <= feedbackRating ? colors.yellow[400] : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Bình luận / Phản hồi của bạn</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Nhập ý kiến đóng góp của bạn về chất lượng vườn, nhân viên chăm sóc..."
              placeholderTextColor={colors.gray[400]}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Gửi đánh giá"
              onPress={handleSendFeedback}
              loading={submittingFeedback}
            />
          </View>
        )}

        {/* ── Feedback Submitted Success Card ─── */}
        {feedbackSubmitted && (
          <View style={[styles.card, { borderColor: colors.green[300], borderWidth: 1.5, alignItems: 'center', padding: spacing.xl }]}>
            <CheckCircle2 size={40} color={colors.green[600]} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.label, { color: colors.green[800] }]}>Đã gửi đánh giá thành công!</Text>
            <Text style={[typography.bodySmall, { color: colors.gray[500], textAlign: 'center', marginTop: 4 }]}>
              Cảm ơn đóng góp ý kiến quý báu từ bạn để giúp GreenSlot ngày một hoàn thiện hơn.
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
  serviceCard: {
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

  // Service specific
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  serviceSubtitle: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md },
  serviceStatusBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  serviceStatusText: { ...typography.bodySmall, color: colors.gray[500], textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green[100],
    borderRadius: radius.full,
  },
  retryBtnText: { ...typography.caption, color: colors.green[700], fontWeight: '700' },
  servicePriceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  servicePriceLabel: { ...typography.bodySmall, color: colors.gray[600] },
  servicePriceValue: { ...typography.label, color: colors.green[700], fontWeight: '700' },
  textArea: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 14,
    color: colors.gray[800],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },

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

// ─── Transaction Styles ───────────────────────────────────────────────────────
const txStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSuccess: { backgroundColor: colors.green[500] },
  dotFail: { backgroundColor: '#ef4444' },
  info: { flex: 1 },
  ref: { ...typography.caption, color: colors.gray[800], fontWeight: '600' },
  date: { ...typography.caption, color: colors.gray[400] },
  right: { alignItems: 'flex-end' },
  amount: { ...typography.label, color: colors.gray[900] },
  status: { ...typography.caption },
  statusSuccess: { color: colors.green[600] },
  statusFail: { color: '#ef4444' },
});
