import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Leaf, MapPin, Calendar, ChevronLeft, ChevronRight, X, CheckCircle, Minus, Plus, Ruler, Droplets, Sprout } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { treeApi } from '../../api/treeApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import type { TreeDTO } from '../../types/api';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const SHORT_MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];
const PILLAR_DEFAULTS = {
  LARGE: { holes: 48, area: 2, price: 300000 },
  MEDIUM: { holes: 36, area: 1.5, price: 200000 },
  SMALL: { holes: 24, area: 1, price: 150000 },
} as const;

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
  const availablePillars = useMemo(
    () => (slot.pillars || []).filter(p => !p.isRented && p.status !== 'RENTED'),
    [slot.pillars]
  );
  const [trees, setTrees] = useState<TreeDTO[]>([]);
  type PillarSize = 'LARGE' | 'MEDIUM' | 'SMALL';
  const [pillarCounts, setPillarCounts] = useState<Record<PillarSize, number>>(() => {
    const firstType = (availablePillars[0]?.pillarType as PillarSize) || 'LARGE';
    return { LARGE: firstType === 'LARGE' ? 1 : 0, MEDIUM: firstType === 'MEDIUM' ? 1 : 0, SMALL: firstType === 'SMALL' ? 1 : 0 };
  });
  const [selectedTreeId, setSelectedTreeId] = useState<number | undefined>(availablePillars[0]?.defaultTreeId);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [startDate, setStartDate] = useState<Date>(today);
  const endDate = useMemo(() => addMonths(startDate, selectedMonths), [startDate, selectedMonths]);
  const pillarGroups = useMemo(() => ({
    LARGE: availablePillars.filter(p => p.pillarType === 'LARGE'),
    MEDIUM: availablePillars.filter(p => p.pillarType === 'MEDIUM'),
    SMALL: availablePillars.filter(p => p.pillarType === 'SMALL'),
  }), [availablePillars]);
  const pillarOptions = useMemo(() => (['LARGE', 'MEDIUM', 'SMALL'] as PillarSize[]).reduce((result, size) => {
    const fallback = PILLAR_DEFAULTS[size];
    const sample = pillarGroups[size][0];
    const unitArea = sample?.requiredArea || fallback.area;
    const maxByArea = Math.floor((slot.area || 3) / unitArea);
    result[size] = {
      sample,
      holes: sample?.capacityHoles || fallback.holes,
      area: unitArea,
      price: sample?.price || fallback.price,
      maxCount: Math.max(0, Math.min(slot.maxPillars || maxByArea, maxByArea)),
    };
    return result;
  }, {} as Record<PillarSize, { sample?: typeof availablePillars[number]; holes: number; area: number; price: number; maxCount: number }>), [pillarGroups, slot.area, slot.maxPillars]);
  const selectedPillarIds = (['LARGE', 'MEDIUM', 'SMALL'] as PillarSize[]).flatMap(size => pillarGroups[size].slice(0, pillarCounts[size]).map(p => p.id));
  const selectedCount = pillarCounts.LARGE + pillarCounts.MEDIUM + pillarCounts.SMALL;
  const selectedPillars = Array.from({ length: selectedCount });
  const selectedArea = (['LARGE', 'MEDIUM', 'SMALL'] as PillarSize[]).reduce((sum, size) => sum + pillarCounts[size] * pillarOptions[size].area, 0);
  const selectedHoles = (['LARGE', 'MEDIUM', 'SMALL'] as PillarSize[]).reduce((sum, size) => sum + pillarCounts[size] * pillarOptions[size].holes, 0);
  const selectedMonthlyPrice = (['LARGE', 'MEDIUM', 'SMALL'] as PillarSize[]).reduce((sum, size) => sum + pillarCounts[size] * pillarOptions[size].price, 0) || slot.price || 0;
  const selectedTree = trees.find(tree => tree.id === selectedTreeId);
  // Đồng bộ với Website/Backend: phí cây được tính theo số hốc trên mỗi 24 hốc,
  // thu một lần cho cấu hình cây; tiền trụ mới nhân theo số tháng.
  const treeFee = selectedTree && selectedHoles > 0
    ? Math.round((selectedTree.price || 0) * (selectedHoles / 24))
    : 0;
  const rentalFee = selectedMonthlyPrice * selectedMonths;
  const totalEstimate = rentalFee + treeFee;

  const isStartToday = isSameDay(startDate, today);

  useEffect(() => { treeApi.getActiveTrees().then(setTrees).catch(() => setTrees([])); }, []);
  useEffect(() => { if (selectedTreeId == null && trees[0]?.id != null) setSelectedTreeId(trees[0].id); }, [trees, selectedTreeId]);
  const updatePillarCount = (size: PillarSize, delta: number) => {
    setPillarCounts(current => {
      const next = Math.max(0, Math.min(pillarOptions[size].maxCount, current[size] + delta));
      return { ...current, [size]: next };
    });
  };

  const handleBook = async () => {
    if (selectedCount === 0) {
      Alert.alert('Chưa chọn trụ', 'Vui lòng chọn ít nhất một loại trụ trước khi thanh toán.');
      return;
    }
    setLoading(true);
    try {
      const result = await bookingApi.bookSlot({
        slotId: slot.id,
        durationInMonths: selectedMonths,
        startTime: startDate.toISOString(),
        isMobile: true,
        mobileRedirectUrl: getMobileRedirectUrl(),
        pillarIds: selectedPillarIds,
        treeId: selectedTreeId,
        treeIds: selectedTreeId ? Array.from({ length: selectedCount }, () => selectedTreeId) : [],
        smallPillarsCount: pillarCounts.SMALL,
        mediumPillarsCount: pillarCounts.MEDIUM,
        largePillarsCount: pillarCounts.LARGE,
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
                const settled = await openAndWaitForPayment(result.paymentUrl, bookingApi.getHistory, result.rentalId);
                const callback = 'callback' in settled ? settled.callback : undefined;
                navigation.navigate('PaymentResult', { status: settled.status, rentalId: result.rentalId, slotNumber: slot.slotNumber, amount: callback?.amount, txnRef: callback?.txnRef, orderInfo: callback?.orderInfo });
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
          <Text style={styles.price}>{formatCurrency(selectedMonthlyPrice)}/tháng</Text>
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

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeading}>Thông tin ô vườn</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Ruler size={16} color={colors.green[600]} /><Text style={styles.statValue}>{selectedArea || slot.area || '--'} m²</Text><Text style={styles.statLabel}>Diện tích đã chọn</Text></View>
            <View style={styles.stat}><Sprout size={16} color={colors.green[600]} /><Text style={styles.statValue}>{selectedHoles || slot.totalHoles || '--'}</Text><Text style={styles.statLabel}>Hốc trồng</Text></View>
            <View style={styles.stat}><Droplets size={16} color={colors.green[600]} /><Text style={styles.statValue}>{selectedCount}</Text><Text style={styles.statLabel}>Trụ đã chọn</Text></View>
          </View>
          <View style={styles.capacityTrack}><View style={[styles.capacityFill, { width: `${Math.min(100, Math.round((selectedPillars.length / Math.max(1, availablePillars.length)) * 100))}%` }]} /></View>
          <Text style={styles.capacityText}>Đang chọn {selectedCount} trụ · dùng {selectedArea.toFixed(1)}/{slot.area || '--'} m²</Text>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.sectionHeader}><Text style={styles.cardHeading}>Tùy chỉnh các loại trụ</Text><Text style={styles.sectionHint}>Giá theo kích thước</Text></View>
          {([
            { size: 'LARGE' as PillarSize, label: 'Trụ lớn (Large)', short: 'L', note: 'Năng suất cao, phù hợp cây lớn' },
            { size: 'MEDIUM' as PillarSize, label: 'Trụ vừa (Medium)', short: 'M', note: 'Kích cỡ phổ biến' },
            { size: 'SMALL' as PillarSize, label: 'Trụ nhỏ (Small)', short: 'S', note: 'Tiết kiệm diện tích' },
          ]).map(item => {
            const group = pillarGroups[item.size];
            const sample = group[0] || pillarOptions[item.size].sample;
            const count = pillarCounts[item.size];
            const option = pillarOptions[item.size];
            return <View key={item.size} style={[styles.pillarRow, count > 0 && styles.pillarRowSelected]}>
              <View style={[styles.pillarIcon, count > 0 && styles.pillarIconSelected]}><Text style={[styles.pillarType, count > 0 && styles.pillarTypeSelected]}>{item.short}</Text></View>
              <View style={styles.pillarBody}><Text style={styles.pillarName}>{item.label}</Text><Text style={styles.pillarMeta}>{String(option.holes)} hốc · {formatCurrency(option.price)}/tháng · {option.area} m²</Text><Text style={styles.pillarNote}>{item.note} · Tối đa {option.maxCount} trụ{count > 0 ? ' · Thành tiền ' + formatCurrency(option.price * count) + '/tháng' : ''}</Text></View>
              <View style={styles.quantityControl}>
                <TouchableOpacity style={styles.quantityButton} disabled={count === 0} onPress={() => updatePillarCount(item.size, -1)}><Minus size={15} color={count === 0 ? colors.gray[300] : colors.gray[700]} /></TouchableOpacity>
                <Text style={styles.quantityValue}>{count}</Text>
                <TouchableOpacity style={[styles.quantityButton, count >= option.maxCount && styles.quantityButtonDisabled]} disabled={count >= option.maxCount} onPress={() => updatePillarCount(item.size, 1)}><Plus size={15} color={count >= option.maxCount ? colors.gray[300] : colors.white} /></TouchableOpacity>
              </View>
            </View>;
          })}
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.sectionHeader}><Text style={styles.cardHeading}>Chọn giống rau / cây trồng</Text><Text style={styles.sectionHint}>{selectedTreeId ? 'Đã chọn' : 'Tùy chọn'}</Text></View>
          <View style={styles.treeGrid}>{trees.map(tree => { const selected = tree.id === selectedTreeId; return <TouchableOpacity key={tree.id} style={[styles.treeCard, selected && styles.treeCardSelected]} onPress={() => setSelectedTreeId(tree.id)}><View style={[styles.treeIcon, selected && styles.treeIconSelected]}><Sprout size={17} color={selected ? colors.white : colors.yellow[800]} /></View><Text style={styles.treeName} numberOfLines={1}>{tree.treeName}</Text><Text style={styles.treeMeta}>{tree.growthDurationDays || tree.harvestDays || '--'} ngày sinh trưởng</Text><Text style={styles.treePrice}>{formatCurrency(tree.price || 0)} <Text style={styles.treePriceUnit}>(24 hốc)</Text></Text></TouchableOpacity>; })}</View>
          {trees.length === 0 ? <Text style={styles.emptyInline}>Chưa tải được danh sách giống cây.</Text> : null}
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

          <View style={styles.priceBreakdown}>
            <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Thuê {selectedCount} trụ ({selectedArea.toFixed(1)} m²)</Text><Text style={styles.breakdownValue}>{formatCurrency(selectedMonthlyPrice)} × {selectedMonths} = {formatCurrency(rentalFee)}</Text></View>
            <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Phí giống cây ({selectedHoles} hốc)</Text><Text style={styles.breakdownValue}>{selectedTree ? formatCurrency(selectedTree.price || 0) + ' / 24 hốc = ' + formatCurrency(treeFee) : 'Chưa chọn'}</Text></View>
            <View style={[styles.breakdownRow, styles.breakdownLast]}><Text style={styles.breakdownLabel}>Giống đã chọn</Text><Text style={styles.breakdownValue}>{selectedTree?.treeName || 'Chưa chọn'}</Text></View>
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng ước tính</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalEstimate)}</Text>
          </View>

          <Button title="Xác nhận & Thanh toán VNPay" onPress={handleBook} loading={loading} disabled={selectedCount === 0} />
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
  priceBreakdown: { backgroundColor: colors.green[50], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.green[100] },
  breakdownLast: { borderBottomWidth: 0 },
  breakdownLabel: { ...typography.caption, color: colors.gray[600] },
  breakdownValue: { ...typography.caption, color: colors.gray[900], fontWeight: '700' },

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

  // Rental configuration overview
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeading: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, backgroundColor: colors.gray[50], borderRadius: radius.md, padding: spacing.sm },
  statValue: { ...typography.body, color: colors.gray[900], fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  capacityTrack: { height: 8, backgroundColor: colors.gray[100], borderRadius: 4, overflow: 'hidden' },
  capacityFill: { height: '100%', backgroundColor: colors.green[500], borderRadius: 4 },
  capacityText: { ...typography.caption, color: colors.gray[500], marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionHint: { ...typography.caption, color: colors.green[700] },
  emptyInline: { ...typography.caption, color: colors.gray[500], paddingVertical: spacing.sm },
  pillarRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm },
  pillarRowSelected: { borderColor: colors.green[400], backgroundColor: colors.green[50] },
  pillarIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  pillarIconSelected: { backgroundColor: colors.green[600] },
  pillarType: { ...typography.caption, color: colors.gray[500] },
  pillarTypeSelected: { color: colors.green[700] },
  pillarBody: { flex: 1 },
  pillarName: { ...typography.body, color: colors.gray[900], fontWeight: '700' },
  pillarMeta: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  pillarNote: { ...typography.caption, color: colors.gray[400], marginTop: 2, fontSize: 10 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: spacing.xs },
  quantityButton: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.green[600], alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { backgroundColor: colors.gray[100] },
  quantityValue: { minWidth: 18, textAlign: 'center', ...typography.body, color: colors.gray[900], fontWeight: '800' },
  treeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  treeCard: { width: '48%', borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.lg, padding: spacing.sm },
  treeCardSelected: { borderColor: colors.green[500], backgroundColor: colors.green[50] },
  treeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.yellow[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  treeIconSelected: { backgroundColor: colors.green[600] },
  treeName: { ...typography.body, color: colors.gray[900], fontWeight: '700' },
  treeMeta: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  treePrice: { ...typography.caption, color: colors.green[700], fontWeight: '700', marginTop: spacing.xs },
  treePriceUnit: { color: colors.gray[500], fontWeight: '400', fontSize: 10 },
});
