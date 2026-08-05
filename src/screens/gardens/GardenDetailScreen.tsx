import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
  AppState,
  type AppStateStatus,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Leaf, MapPin, Calendar, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const SHORT_MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  // Trừ 1 ngày để hiển thị ngày cuối kỳ
  result.setDate(result.getDate() - 1);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** Trả về danh sách ô ngày cho lưới calendar (có thể null = ô trống đầu tháng) */
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=CN
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Mini Calendar Component ───────────────────────────────────────────────
interface CalendarPickerProps {
  selectedDate: Date;
  minDate: Date;
  onSelect: (date: Date) => void;
}

function CalendarPicker({ selectedDate, minDate, onSelect }: CalendarPickerProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Disable navigation về tháng trước minDate
  const canGoPrev = viewYear > minDate.getFullYear() ||
    (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());

  return (
    <View style={calStyles.wrapper}>
      {/* Month / Year header */}
      <View style={calStyles.header}>
        <TouchableOpacity
          onPress={prevMonth}
          disabled={!canGoPrev}
          style={[calStyles.navBtn, !canGoPrev && calStyles.navBtnDisabled]}
        >
          <ChevronLeft size={20} color={canGoPrev ? colors.green[700] : colors.gray[300]} />
        </TouchableOpacity>
        <Text style={calStyles.monthTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <ChevronRight size={20} color={colors.green[700]} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={calStyles.weekRow}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={[calStyles.weekLabel, w === 'CN' && calStyles.weekLabelSun]}>
            {w}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.grid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={calStyles.dayCell} />;
          }
          const cellDate = new Date(viewYear, viewMonth, day);
          const isSelected = isSameDay(cellDate, selectedDate);
          const isToday = isSameDay(cellDate, minDate);
          const isDisabled = cellDate < minDate && !isSameDay(cellDate, minDate);
          const isSunday = cellDate.getDay() === 0;

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                calStyles.dayCell,
                isSelected && calStyles.dayCellSelected,
                isToday && !isSelected && calStyles.dayCellToday,
              ]}
              onPress={() => !isDisabled && onSelect(new Date(viewYear, viewMonth, day))}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  calStyles.dayText,
                  isSelected && calStyles.dayTextSelected,
                  isToday && !isSelected && calStyles.dayTextToday,
                  isDisabled && calStyles.dayTextDisabled,
                  isSunday && !isSelected && !isDisabled && calStyles.dayTextSun,
                ]}
              >
                {day}
              </Text>
              {isToday && !isSelected && <View style={calStyles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────────────
export default function GardenDetailScreen({ route, navigation }: CustomerStackProps<'GardenDetail'>) {
  const { slot } = route.params;
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // AppState ref để phát hiện khi user quay về app sau khi thanh toán
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingPaymentRef = useRef<boolean>(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [startDate, setStartDate] = useState<Date>(today);
  const endDate = useMemo(() => addMonths(startDate, selectedMonths), [startDate, selectedMonths]);
  const totalEstimate = slot.price * selectedMonths;

  const isStartToday = isSameDay(startDate, today);

  // Khi user quay lại app từ browser VNPay → kiểm tra kết quả đặt thuê
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const wasBackground =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';
      const nowActive = nextState === 'active';

      if (wasBackground && nowActive && pendingPaymentRef.current) {
        pendingPaymentRef.current = false;

        try {
          const history = await bookingApi.getHistory();
          // Tìm rental mới nhất của slot này
          const newRental = history.find(r => r.slotId === slot.id || r.slotNumber === slot.slotNumber);

          if (newRental?.status === 'ACTIVE') {
            Alert.alert(
              '🎉 Đặt thuê thành công!',
              `Ô vườn ${slot.slotNumber} đã được kích hoạt. Chúc bạn trồng trọt vui vẻ!`,
              [{
                text: 'OK',
                onPress: () => navigation.goBack(),
              }]
            );
          } else if (newRental?.status === 'PENDING_PAYMENT' || newRental?.status === 'PENDING') {
            Alert.alert(
              '⏳ Chưa ghi nhận thanh toán',
              'Giao dịch chưa được xác nhận. Nếu bạn đã thanh toán, vui lòng chờ vài phút rồi kiểm tra trong mục “Vườn đang thuê”.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              '❌ Thanh toán thất bại',
              'Giao dịch không thành công hoặc bị hủy. Vui lòng thử lại.',
              [{ text: 'OK' }]
            );
          }
        } catch {
          // Không làm gì nếu lỗi mạng
        }
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [slot.id, slot.slotNumber, navigation]);

  const handleBook = async () => {
    setLoading(true);
    try {
      const result = await bookingApi.bookSlot({
        slotId: slot.id,
        durationInMonths: selectedMonths,
        startTime: startDate.toISOString(),
      });

      if (result.paymentUrl) {
        Alert.alert(
          'Chuyển đến thanh toán',
          'Bạn sẽ được chuyển đến VNPay để hoàn tất thanh toán.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Thanh toán',
              onPress: async () => {
                // Đánh dấu đang chờ kết quả thanh toán
                pendingPaymentRef.current = true;
                await Linking.openURL(result.paymentUrl);
              },
            },
          ]
        );
      } else {
        Alert.alert('Thành công', 'Đặt vườn thành công!');
        navigation.goBack();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể đặt vườn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Leaf size={40} color={colors.green[600]} />
          </View>
          <Text style={styles.slotNumber}>Ô vườn {slot.slotNumber}</Text>
          <Text style={styles.price}>{formatCurrency(slot.price)}/tháng</Text>
        </View>

        {/* Info Card */}
        <Card>
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.green[600]} />
            <View>
              <Text style={styles.infoLabel}>Vị trí</Text>
              <Text style={styles.infoValue}>{slot.locationName}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Leaf size={18} color={colors.green[600]} />
            <View>
              <Text style={styles.infoLabel}>Cột vườn</Text>
              <Text style={styles.infoValue}>{slot.pillarCode}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Calendar size={18} color={colors.green[600]} />
            <View>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={styles.infoValue}>
                {slot.status === 'AVAILABLE' ? 'Sẵn sàng thuê' : slot.status}
              </Text>
            </View>
          </View>
        </Card>

        {/* Booking Card */}
        <Card style={styles.bookCard}>
          <Text style={styles.bookTitle}>Đặt thuê</Text>

          {/* ── Start Date Picker ── */}
          <Text style={styles.sectionLabel}>Ngày bắt đầu thuê</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Calendar size={20} color={colors.green[600]} />
            <Text style={styles.pickerButtonText}>
              {formatDate(startDate)}
            </Text>
            <View style={styles.pickerBadge}>
              <Text style={styles.pickerBadgeText}>
                {isStartToday ? 'Hôm nay' : 'Thay đổi'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ── Duration Picker ── */}
          <Text style={styles.sectionLabel}>Thời hạn thuê</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Calendar size={20} color={colors.green[600]} />
            <Text style={styles.pickerButtonText}>
              {selectedMonths} tháng
            </Text>
            <View style={styles.pickerBadge}>
              <Text style={styles.pickerBadgeText}>Thay đổi</Text>
            </View>
          </TouchableOpacity>

          {/* Date Range Display */}
          <View style={styles.dateRangeCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>📅 Ngày bắt đầu</Text>
              <Text style={styles.dateBlockValue}>{formatDate(startDate)}</Text>
            </View>
            <View style={styles.dateArrow}>
              <ChevronRight size={20} color={colors.green[400]} />
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>🏁 Ngày kết thúc</Text>
              <Text style={styles.dateBlockValue}>{formatDate(endDate)}</Text>
            </View>
          </View>

          {/* Duration summary */}
          <View style={styles.durationSummary}>
            <Text style={styles.durationSummaryText}>
              Tổng thời gian: <Text style={styles.durationHighlight}>{selectedMonths} tháng</Text>
            </Text>
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng ước tính</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalEstimate)}</Text>
          </View>

          <Button title="Xác nhận & Thanh toán VNPay" onPress={handleBook} loading={loading} />
        </Card>
      </ScrollView>

      {/* ════ Date Picker Modal ════ */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngày bắt đầu</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={styles.modalClose}>
                <X size={22} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <CalendarPicker
              selectedDate={startDate}
              minDate={today}
              onSelect={(date) => {
                setStartDate(date);
                setDatePickerVisible(false);
              }}
            />

            <View style={styles.modalNote}>
              <Calendar size={14} color={colors.green[600]} />
              <Text style={styles.modalNoteText}>
                Chỉ có thể chọn từ hôm nay trở về sau
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════ Duration Picker Modal ════ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn thời hạn thuê</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalClose}>
                <X size={22} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <FlatList
              data={DURATION_OPTIONS}
              numColumns={3}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={styles.monthGrid}
              renderItem={({ item }) => {
                const isSelected = item === selectedMonths;
                // Preview end date for this option (based on selected startDate)
                const previewEnd = addMonths(startDate, item);
                return (
                  <TouchableOpacity
                    style={[styles.monthOption, isSelected && styles.monthOptionSelected]}
                    onPress={() => {
                      setSelectedMonths(item);
                      setPickerVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <CheckCircle size={14} color={colors.white} style={styles.checkIcon} />
                    )}
                    <Text style={[styles.monthOptionNumber, isSelected && styles.monthOptionNumberSelected]}>
                      {item}
                    </Text>
                    <Text style={[styles.monthOptionLabel, isSelected && styles.monthOptionLabelSelected]}>
                      tháng
                    </Text>
                    <Text style={[styles.monthOptionDate, isSelected && styles.monthOptionDateSelected]}>
                      đến {SHORT_MONTHS[previewEnd.getMonth()]}/{previewEnd.getFullYear()}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Footer note */}
            <View style={styles.modalNote}>
              <Calendar size={14} color={colors.green[600]} />
              <Text style={styles.modalNoteText}>
                Bắt đầu thuê từ ngày <Text style={{ fontWeight: '700' }}>{formatDate(startDate)}</Text>
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Calendar Styles ─────────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: colors.gray[100],
  },
  monthTitle: {
    ...typography.heading3,
    color: colors.gray[900],
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.gray[500],
    fontWeight: '600',
  },
  weekLabelSun: {
    color: '#dc2626',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderRadius: 999,
  },
  dayCellSelected: {
    backgroundColor: colors.green[600],
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.green[400],
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[800],
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: colors.green[700],
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.gray[300],
  },
  dayTextSun: {
    color: '#dc2626',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.green[500],
    position: 'absolute',
    bottom: 4,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Hero
  hero: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  slotNumber: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.xs },
  price: { ...typography.heading3, color: colors.green[600] },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: { ...typography.caption, color: colors.gray[500] },
  infoValue: { ...typography.body, color: colors.gray[900] },

  // Booking card
  bookCard: { marginTop: spacing.md },
  bookTitle: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md },

  sectionLabel: {
    ...typography.caption,
    color: colors.gray[500],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Picker button
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.green[200],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickerButtonText: {
    flex: 1,
    ...typography.heading3,
    color: colors.green[700],
  },
  pickerBadge: {
    backgroundColor: colors.green[600],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pickerBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },

  // Date range
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dateBlock: { flex: 1, alignItems: 'center' },
  dateBlockLabel: { ...typography.caption, color: colors.gray[500], marginBottom: 4 },
  dateBlockValue: { ...typography.body, fontWeight: '700', color: colors.gray[900] },
  dateArrow: { paddingHorizontal: spacing.sm },

  // Duration summary
  durationSummary: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  durationSummaryText: { ...typography.caption, color: colors.gray[500] },
  durationHighlight: { color: colors.green[600], fontWeight: '700' },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  totalLabel: { ...typography.body, color: colors.gray[500] },
  totalValue: { ...typography.heading3, color: colors.green[600] },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: { ...typography.heading3, color: colors.gray[900] },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Month grid
  monthGrid: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  monthOption: {
    flex: 1,
    margin: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 90,
  },
  monthOptionSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  checkIcon: { marginBottom: 2 },
  monthOptionNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.gray[900],
  },
  monthOptionNumberSelected: { color: colors.white },
  monthOptionLabel: {
    ...typography.caption,
    color: colors.gray[500],
  },
  monthOptionLabelSelected: { color: colors.green[100] },
  monthOptionDate: {
    ...typography.caption,
    color: colors.gray[400],
    marginTop: 2,
    fontSize: 10,
  },
  monthOptionDateSelected: { color: colors.green[200] },

  // Modal note
  modalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.green[50],
    borderRadius: radius.md,
  },
  modalNoteText: {
    ...typography.caption,
    color: colors.green[700],
    flex: 1,
  },
});
