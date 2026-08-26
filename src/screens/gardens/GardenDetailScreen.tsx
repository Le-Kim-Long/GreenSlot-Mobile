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
import {
  Leaf,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Sprout,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { treeApi } from '../../api/treeApi';
import type { TreeDTO } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const SHORT_MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
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

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

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

  const canGoPrev = viewYear > minDate.getFullYear() ||
    (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());

  return (
    <View style={calStyles.wrapper}>
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

      <View style={calStyles.weekRow}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={[calStyles.weekLabel, w === 'CN' && calStyles.weekLabelSun]}>
            {w}
          </Text>
        ))}
      </View>

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

interface ChosenPillarItem {
  id: string;
  type: 'SMALL' | 'MEDIUM' | 'LARGE';
  typeName: string;
  holes: number;
  label: string;
}

export default function GardenDetailScreen({ route, navigation }: CustomerStackProps<'GardenDetail'>) {
  const { slot } = route.params;

  // Configuration metrics
  const slotArea = slot?.area && slot.area > 0 ? slot.area : 5.0;

  // Initialize counts based on slot area capacity
  const [smallCount, setSmallCount] = useState(() => (slotArea < 1.5 ? 1 : 0));
  const [mediumCount, setMediumCount] = useState(() => (slotArea >= 3.0 ? 2 : slotArea >= 1.5 ? 1 : 0));
  const [largeCount, setLargeCount] = useState(0);

  const [selectedMonths, setSelectedMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const [trees, setTrees] = useState<TreeDTO[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [pillarTreeSelections, setPillarTreeSelections] = useState<{ [pillarId: string]: number }>({});
  const [activePillarTab, setActivePillarTab] = useState<string>('ALL');
  const [seedMode, setSeedMode] = useState<'ALL' | 'CUSTOM'>('ALL');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [startDate, setStartDate] = useState<Date>(today);
  const endDate = useMemo(() => addMonths(startDate, selectedMonths), [startDate, selectedMonths]);

  // Derived pillar metrics
  const totalAreaUsed = (smallCount * 1.0) + (mediumCount * 1.5) + (largeCount * 2.0);
  const remainingArea = Math.max(0, slotArea - totalAreaUsed);
  const totalPillarsCount = smallCount + mediumCount + largeCount;
  const totalHoles = (smallCount * 24) + (mediumCount * 36) + (largeCount * 48);

  const pillarsMonthlyPrice = (smallCount * 150000) + (mediumCount * 200000) + (largeCount * 300000);
  const slotRentalCost = pillarsMonthlyPrice * selectedMonths;

  // Generate Chosen Pillars List: SMALL -> MEDIUM -> LARGE
  const chosenPillars = useMemo<ChosenPillarItem[]>(() => {
    const list: ChosenPillarItem[] = [];
    for (let i = 1; i <= smallCount; i++) {
      list.push({ id: `S-${i}`, type: 'SMALL', typeName: 'Trụ Nhỏ', holes: 24, label: `Trụ Nhỏ #${i} (${24} hốc)` });
    }
    for (let i = 1; i <= mediumCount; i++) {
      list.push({ id: `M-${i}`, type: 'MEDIUM', typeName: 'Trụ Vừa', holes: 36, label: `Trụ Vừa #${i} (${36} hốc)` });
    }
    for (let i = 1; i <= largeCount; i++) {
      list.push({ id: `L-${i}`, type: 'LARGE', typeName: 'Trụ Lớn', holes: 48, label: `Trụ Lớn #${i} (${48} hốc)` });
    }
    return list;
  }, [smallCount, mediumCount, largeCount]);

  // Auto-sync tree selections for newly added pillars
  useEffect(() => {
    if (chosenPillars.length === 0) return;
    setPillarTreeSelections(prev => {
      const next = { ...prev };
      const defaultTree = selectedTreeId || (trees[0]?.id ?? 1);
      chosenPillars.forEach(p => {
        if (!next[p.id]) {
          next[p.id] = defaultTree;
        }
      });
      return next;
    });
  }, [chosenPillars, selectedTreeId, trees]);

  // Load Active Trees from API
  useEffect(() => {
    treeApi.getActiveTrees()
      .then(data => {
        setTrees(data);
        if (data.length > 0 && data[0].id != null) {
          setSelectedTreeId(data[0].id);
        }
      })
      .catch(() => setTrees([]));
  }, []);

  // Sync active pillar tab if it is removed
  useEffect(() => {
    if (activePillarTab !== 'ALL' && !chosenPillars.some(p => p.id === activePillarTab)) {
      setActivePillarTab('ALL');
    }
  }, [chosenPillars, activePillarTab]);

  // Helpers to calculate prices based on pillar type
  const getTreePriceForPillar = (t?: TreeDTO | null, pType?: 'SMALL' | 'MEDIUM' | 'LARGE') => {
    if (!t) return 0;
    const base = t.price || 0;
    if (pType === 'LARGE') {
      return Number((t as any).priceLarge != null ? (t as any).priceLarge : base * 2.0);
    }
    if (pType === 'MEDIUM') {
      return Number((t as any).priceMedium != null ? (t as any).priceMedium : base * 1.5);
    }
    return Number((t as any).priceSmall != null ? (t as any).priceSmall : base);
  };

  const getTreeForPillar = (pillarId: string) => {
    const tId = pillarTreeSelections[pillarId] || selectedTreeId || (trees[0]?.id ?? 1);
    return trees.find(t => t.id === tId) || trees[0] || null;
  };

  // Detailed Tree Costs per Chosen Pillar
  const pillarTreeDetails = useMemo(() => {
    return chosenPillars.map(p => {
      const t = getTreeForPillar(p.id);
      const cost = getTreePriceForPillar(t, p.type);
      return {
        pillar: p,
        tree: t,
        cost: Math.round(cost),
      };
    });
  }, [chosenPillars, pillarTreeSelections, selectedTreeId, trees]);

  const totalTreeCost = useMemo(() => {
    return pillarTreeDetails.reduce((sum, item) => sum + item.cost, 0);
  }, [pillarTreeDetails]);

  const totalEstimate = slotRentalCost + totalTreeCost;

  const isStartToday = isSameDay(startDate, today);

  const handlePillarChange = (type: 'SMALL' | 'MEDIUM' | 'LARGE', delta: number) => {
    const sizeMap = { SMALL: 1.0, MEDIUM: 1.5, LARGE: 2.0 };
    const requiredSize = sizeMap[type];

    if (delta > 0) {
      if (remainingArea < requiredSize) {
        Alert.alert(
          'Diện tích không đủ',
          `Không thể thêm trụ do đã vượt quá diện tích ô vườn (${slotArea} m²). Vui lòng bớt các trụ khác.`
        );
        return;
      }
      if (type === 'SMALL') setSmallCount(c => c + 1);
      if (type === 'MEDIUM') setMediumCount(c => c + 1);
      if (type === 'LARGE') setLargeCount(c => c + 1);
    } else {
      if (type === 'SMALL' && smallCount > 0) setSmallCount(c => c - 1);
      if (type === 'MEDIUM' && mediumCount > 0) setMediumCount(c => c - 1);
      if (type === 'LARGE' && largeCount > 0) setLargeCount(c => c - 1);
    }
  };

  const handleBook = async () => {
    if (totalPillarsCount === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 trụ canh tác.');
      return;
    }

    setLoading(true);
    try {
      const treeIdsPayload = chosenPillars.map(p => {
        return pillarTreeSelections[p.id] || selectedTreeId || (trees[0]?.id ?? 1);
      });

      const result = await bookingApi.bookSlot({
        slotId: slot.id,
        durationInMonths: selectedMonths,
        startTime: startDate.toISOString(),
        treeId: treeIdsPayload[0],
        treeIds: treeIdsPayload,
        smallPillarsCount: smallCount,
        mediumPillarsCount: mediumCount,
        largePillarsCount: largeCount,
        isMobile: true,
        mobileRedirectUrl: getMobileRedirectUrl(),
      });

      if (result.paymentUrl) {
        Alert.alert(
          'Chuyển đến thanh toán',
          'Bạn sẽ được chuyển đến cổng thanh toán VNPay an toàn.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Thanh toán ngay',
              onPress: async () => {
                const settled = await openAndWaitForPayment(result.paymentUrl, bookingApi.getHistory, result.rentalId);
                const callback = 'callback' in settled ? settled.callback : undefined;
                navigation.replace('PaymentResult', {
                  status: settled.status,
                  rentalId: result.rentalId,
                  slotNumber: slot.slotNumber,
                  amount: callback?.amount,
                  txnRef: callback?.txnRef,
                  orderInfo: callback?.orderInfo
                });
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

  const handleSelectTree = (treeId: number) => {
    if (seedMode === 'ALL') {
      setSelectedTreeId(treeId);
      setPillarTreeSelections(prev => {
        const next = { ...prev };
        chosenPillars.forEach(p => {
          next[p.id] = treeId;
        });
        return next;
      });
    } else {
      if (activePillarTab === 'ALL') {
        setSelectedTreeId(treeId);
        setPillarTreeSelections(prev => {
          const next = { ...prev };
          chosenPillars.forEach(p => {
            next[p.id] = treeId;
          });
          return next;
        });
      } else {
        setPillarTreeSelections(prev => ({
          ...prev,
          [activePillarTab]: treeId
        }));
        const newMap = { ...pillarTreeSelections, [activePillarTab]: treeId };
        const allSame = chosenPillars.length > 0 && chosenPillars.every(p => newMap[p.id] === treeId);
        if (allSame) {
          setSelectedTreeId(treeId);
        }
      }
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIcon}>
              <Leaf size={28} color={colors.green[600]} />
            </View>
            <View>
              <Text style={styles.slotNumber}>{slot.slotNumber}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Sẵn sàng cho thuê</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroPriceLabel}>Giá thuê trụ đã chọn</Text>
            <Text style={styles.heroPriceValue}>{formatCurrency(pillarsMonthlyPrice)}<Text style={styles.heroPriceMonth}>/tháng</Text></Text>
          </View>
        </View>

        {/* Garden Info Grid */}
        <View style={styles.gridInfo}>
          <View style={styles.gridInfoItem}>
            <Text style={styles.gridInfoLabel}>📐 Diện tích ô vườn</Text>
            <Text style={styles.gridInfoValue}>{slotArea.toFixed(1)} m²</Text>
          </View>
          <View style={styles.gridInfoItem}>
            <Text style={styles.gridInfoLabel}>🔋 Năng suất đã chọn</Text>
            <Text style={styles.gridInfoValue}>{totalHoles} hốc ({totalPillarsCount} trụ)</Text>
          </View>
          <View style={[styles.gridInfoItem, { borderRightWidth: 0 }]}>
            <Text style={styles.gridInfoLabel}>🏢 Cơ sở nhà vườn</Text>
            <Text style={styles.gridInfoValue} numberOfLines={1}>{slot.locationName || 'Cơ sở 1'}</Text>
          </View>
        </View>

        {/* Capacity Area Bar */}
        <Card style={styles.cardSection}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityTitle}>Dung Lượng Diện Tích Ô Vườn</Text>
            <Text style={styles.capacityValue}>
              {totalAreaUsed.toFixed(1)} / {slotArea.toFixed(1)} m² ({Math.round((totalAreaUsed / slotArea) * 100)}%)
            </Text>
          </View>
          <View style={styles.capacityTrack}>
            <View style={[styles.capacityBarFill, { width: `${Math.min(100, (totalAreaUsed / slotArea) * 100)}%` as any }]} />
          </View>
          <View style={styles.capacityFooter}>
            <Text style={styles.capacityFooterLeft}>Còn trống {remainingArea.toFixed(1)} m² (có thể chọn thêm trụ)</Text>
            <Text style={styles.capacityFooterRight}>Ô nhỏ sẽ giới hạn số lượng trụ lớn</Text>
          </View>
        </Card>

        {/* Customize Pillar Counts */}
        <Card style={styles.cardSection}>
          <Text style={styles.sectionTitle}>⚙️ Tùy Chỉnh Các Loại Trụ Canh Tác Trong Ô</Text>
          <Text style={styles.sectionDesc}>Tự do tăng/giảm số lượng trụ phù hợp theo diện tích ô đất của bạn</Text>

          {/* Large Pillar */}
          <View style={styles.pillarRow}>
            <View style={styles.pillarIconBoxLarge}>
              <Text style={styles.pillarIconTextLarge}>L</Text>
            </View>
            <View style={styles.pillarInfo}>
              <Text style={styles.pillarName}>Trụ Lớn (Large) <Text style={styles.pillarHoles}>48 hốc • Chiếm 2.0 m²</Text></Text>
              <Text style={styles.pillarPrice}>Giá thuê: 300.000đ/tháng • Năng suất tối đa</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => handlePillarChange('LARGE', -1)}
              >
                <Minus size={14} color={colors.gray[600]} />
              </TouchableOpacity>
              <Text style={styles.counterVal}>{largeCount}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, remainingArea < 2.0 && styles.counterBtnDisabled]}
                onPress={() => handlePillarChange('LARGE', 1)}
              >
                <Plus size={14} color={remainingArea >= 2.0 ? colors.green[700] : colors.gray[300]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Medium Pillar */}
          <View style={styles.pillarRow}>
            <View style={styles.pillarIconBoxMedium}>
              <Text style={styles.pillarIconTextMedium}>M</Text>
            </View>
            <View style={styles.pillarInfo}>
              <Text style={styles.pillarName}>Trụ Vừa (Medium) <Text style={styles.pillarHoles}>36 hốc • Chiếm 1.5 m²</Text></Text>
              <Text style={styles.pillarPrice}>Giá thuê: 200.000đ/tháng • Kích thước chuẩn</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => handlePillarChange('MEDIUM', -1)}
              >
                <Minus size={14} color={colors.gray[600]} />
              </TouchableOpacity>
              <Text style={styles.counterVal}>{mediumCount}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, remainingArea < 1.5 && styles.counterBtnDisabled]}
                onPress={() => handlePillarChange('MEDIUM', 1)}
              >
                <Plus size={14} color={remainingArea >= 1.5 ? colors.green[700] : colors.gray[300]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Small Pillar */}
          <View style={styles.pillarRow}>
            <View style={styles.pillarIconBoxSmall}>
              <Text style={styles.pillarIconTextSmall}>S</Text>
            </View>
            <View style={styles.pillarInfo}>
              <Text style={styles.pillarName}>Trụ Nhỏ (Small) <Text style={styles.pillarHoles}>24 hốc • Chiếm 1.0 m²</Text></Text>
              <Text style={styles.pillarPrice}>Giá thuê: 150.000đ/tháng • Tiết kiệm diện tích</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => handlePillarChange('SMALL', -1)}
              >
                <Minus size={14} color={colors.gray[600]} />
              </TouchableOpacity>
              <Text style={styles.counterVal}>{smallCount}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, remainingArea < 1.0 && styles.counterBtnDisabled]}
                onPress={() => handlePillarChange('SMALL', 1)}
              >
                <Plus size={14} color={remainingArea >= 1.0 ? colors.green[700] : colors.gray[300]} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Tree Seed Selector Card */}
        {totalPillarsCount > 0 && (
          <Card style={styles.cardSection}>
            <View style={styles.seedHeader}>
              <Text style={styles.sectionTitle}>🌱 Chọn Giống Rau / Cây Trồng Thủy Canh</Text>
            </View>
            <Text style={styles.sectionDesc}>Gán giống chung cho toàn bộ hoặc chọn riêng giống rau khác nhau trên từng trụ</Text>

            {/* Seed Allocation Mode Tab Bar */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, seedMode === 'ALL' && styles.modeTabActive]}
                onPress={() => { setSeedMode('ALL'); setActivePillarTab('ALL'); }}
              >
                <Text style={[styles.modeTabText, seedMode === 'ALL' && styles.modeTabTextActive]}>Dùng chung 1 giống</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, seedMode === 'CUSTOM' && styles.modeTabActive]}
                onPress={() => { setSeedMode('CUSTOM'); setActivePillarTab(chosenPillars[0]?.id || 'ALL'); }}
              >
                <Text style={[styles.modeTabText, seedMode === 'CUSTOM' && styles.modeTabTextActive]}>Chọn riêng từng trụ</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Pillar Tabs */}
            {seedMode === 'CUSTOM' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillarChipsRow}>
                {chosenPillars.map(p => {
                  const isActive = activePillarTab === p.id;
                  const currentTree = getTreeForPillar(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pillarChip, isActive && styles.pillarChipActive]}
                      onPress={() => setActivePillarTab(p.id)}
                    >
                      <Text style={[styles.pillarChipText, isActive && styles.pillarChipTextActive]}>
                        {p.label.split(' (')[0]}
                      </Text>
                      {currentTree && (
                        <Text style={[styles.pillarChipSubText, isActive && styles.pillarChipSubTextActive]} numberOfLines={1}>
                          {currentTree.treeName}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Tree Cards List */}
            <View style={styles.treeListGrid}>
              {trees.map(t => {
                const tId = t.id ?? 0;
                const isSelected = seedMode === 'ALL'
                  ? selectedTreeId === tId
                  : (activePillarTab === 'ALL' ? selectedTreeId === tId : pillarTreeSelections[activePillarTab] === tId);

                const priceSmall = getTreePriceForPillar(t, 'SMALL');
                const priceMedium = getTreePriceForPillar(t, 'MEDIUM');
                const priceLarge = getTreePriceForPillar(t, 'LARGE');

                let displayCost = 0;
                if (seedMode === 'ALL') {
                  displayCost = chosenPillars.reduce((sum, p) => sum + getTreePriceForPillar(t, p.type), 0);
                } else {
                  if (activePillarTab === 'ALL') {
                    displayCost = chosenPillars.reduce((sum, p) => sum + getTreePriceForPillar(t, p.type), 0);
                  } else {
                    const activeP = chosenPillars.find(p => p.id === activePillarTab);
                    displayCost = getTreePriceForPillar(t, activeP?.type);
                  }
                }

                const isExceeded = (t.minRentalDays || 0) / 30 > selectedMonths;

                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.treeCard, isSelected && styles.treeCardSelected]}
                    onPress={() => handleSelectTree(tId)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.treeCardHeader}>
                      <View style={[styles.treeIconBox, isSelected && styles.treeIconBoxSelected]}>
                        <Sprout size={18} color={isSelected ? colors.white : colors.green[700]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.treeNameTitle}>{t.treeName}</Text>
                        <Text style={styles.treeGrowthDuration}>Thu hoạch: ~{t.harvestDays || t.growthDurationDays} ngày</Text>
                      </View>
                      {isSelected && (
                        <CheckCircle size={18} color={colors.green[600]} style={styles.checkBadge} />
                      )}
                    </View>

                    {isExceeded && (
                      <View style={styles.treeWarningBadge}>
                        <Text style={styles.treeWarningText}>⚠️ Cần thuê ≥ {Math.ceil((t.minRentalDays || 0) / 30)} tháng</Text>
                      </View>
                    )}

                    <View style={styles.treeCardDivider} />

                    <View style={styles.treePriceRow}>
                      <Text style={styles.treePriceLabelText}>
                        {seedMode === 'ALL' ? 'Tổng giống cho cả vườn:' : 'Tổng giống cho 1 trụ:'}
                      </Text>
                      <Text style={styles.treePriceValueText}>+{formatCurrency(displayCost)}</Text>
                    </View>

                    <View style={styles.treePriceLegend}>
                      <Text style={styles.legendCell}>Nhỏ: {formatCurrency(priceSmall)}</Text>
                      <Text style={styles.legendCell}>Vừa: {formatCurrency(priceMedium)}</Text>
                      <Text style={styles.legendCell}>Lớn: {formatCurrency(priceLarge)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Invoice Card - Hóa Đơn Thuê Canh Tác */}
        <Card style={styles.cardInvoice}>
          <Text style={styles.invoiceTitle}>Hóa Đơn Thuê Canh Tác</Text>

          {/* Ngày bắt đầu */}
          <Text style={styles.invoiceSectionLabel}>Ngày bắt đầu canh tác</Text>
          <TouchableOpacity
            style={styles.invoicePickerBtn}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={colors.green[600]} />
            <Text style={styles.invoicePickerText}>{formatDate(startDate)}</Text>
            <View style={styles.pickerBadgeAlt}>
              <Text style={styles.pickerBadgeTextAlt}>{isStartToday ? 'Hôm nay' : 'Thay đổi'}</Text>
            </View>
          </TouchableOpacity>

          {/* Thời gian thuê */}
          <Text style={styles.invoiceSectionLabel}>Thời gian thuê (Tối thiểu 1 tháng)</Text>
          <TouchableOpacity
            style={styles.invoicePickerBtn}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={colors.green[600]} />
            <Text style={styles.invoicePickerText}>{selectedMonths} tháng</Text>
            <View style={styles.pickerBadgeAlt}>
              <Text style={styles.pickerBadgeTextAlt}>Thay đổi</Text>
            </View>
          </TouchableOpacity>

          {/* Quick options */}
          <View style={styles.quickMonthsRow}>
            {[1, 3, 6, 12].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.quickMonthChip, selectedMonths === m && styles.quickMonthChipActive]}
                onPress={() => setSelectedMonths(m)}
              >
                <Text style={[styles.quickMonthText, selectedMonths === m && styles.quickMonthTextActive]}>{m} tháng</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date boundaries */}
          <View style={styles.dateBounds}>
            <View style={styles.dateCell}>
              <Text style={styles.dateCellLabel}>Bắt đầu</Text>
              <Text style={styles.dateCellValue}>{formatDate(startDate)}</Text>
            </View>
            <ChevronRight size={16} color={colors.gray[300]} style={{ alignSelf: 'center', marginTop: 10 }} />
            <View style={styles.dateCell}>
              <Text style={styles.dateCellLabel}>Kết thúc</Text>
              <Text style={styles.dateCellValue}>{formatDate(endDate)}</Text>
            </View>
          </View>

          {/* Bill items table */}
          <View style={styles.billTable}>
            {/* Rent Item */}
            {totalPillarsCount > 0 && (
              <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billLabel}>Thuê {totalPillarsCount} trụ ({totalAreaUsed.toFixed(1)} m²):</Text>
                  {smallCount > 0 && <Text style={styles.billSub}>• {smallCount}x Trụ Nhỏ (24 hốc): 150k/th</Text>}
                  {mediumCount > 0 && <Text style={styles.billSub}>• {mediumCount}x Trụ Vừa (36 hốc): 200k/th</Text>}
                  {largeCount > 0 && <Text style={styles.billSub}>• {largeCount}x Trụ Lớn (48 hốc): 300k/th</Text>}
                </View>
                <Text style={styles.billValue}>
                  {formatCurrency(pillarsMonthlyPrice)} x {selectedMonths}th = {formatCurrency(slotRentalCost)}
                </Text>
              </View>
            )}

            {/* Tree Seeds Item */}
            {totalTreeCost > 0 && (
              <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billLabel}>Phôi giống cây trồng ({totalHoles} hốc):</Text>
                  {pillarTreeDetails.map((item, pIdx) => (
                    <Text key={pIdx} style={styles.billSub}>
                      • {item.pillar.label.split(' (')[0]}: {item.tree?.treeName || 'Đang canh tác'} ({formatCurrency(item.cost)})
                    </Text>
                  ))}
                </View>
                <Text style={styles.billValue}>{formatCurrency(totalTreeCost)}</Text>
              </View>
            )}

            {/* IoT & System Irrigation Included */}
            <View style={styles.billRowMuted}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billLabelMuted}>🔬 Thiết bị đo IoT & Hệ thống tưới:</Text>
                <Text style={styles.billSubMuted}>• Cảm biến pH, ẩm, ánh sáng & bơm tự động 24/7</Text>
              </View>
              <Text style={styles.billValueFree}>Đã bao gồm</Text>
            </View>

            {/* Gateway & Tax */}
            {/* <View style={styles.billRowMuted}>
              <Text style={styles.billLabelMuted}>💳 Thuế GTGT & Phí nền tảng:</Text>
              <Text style={styles.billValueFree}>0đ</Text>
            </View> */}

            <View style={styles.totalDivider} />

            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Tổng thanh toán</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(totalEstimate)}</Text>
            </View>
          </View>

          <Button
            title={`Đặt thuê & Thanh toán ngay`}
            onPress={handleBook}
            loading={loading}
          />
        </Card>
      </ScrollView>

      {/* Date Picker Modal */}
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
              <Text style={styles.modalNoteText}>Chỉ có thể chọn thời gian bắt đầu từ hôm nay trở đi</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duration Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn thời hạn thuê</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalClose}>
                <X size={22} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DURATION_OPTIONS}
              numColumns={3}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={styles.monthGrid}
              renderItem={({ item }) => {
                const isSelected = item === selectedMonths;
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
            <View style={styles.modalNote}>
              <Calendar size={14} color={colors.green[600]} />
              <Text style={styles.modalNoteText}>
                Bắt đầu canh tác từ: <Text style={{ fontWeight: '700' }}>{formatDate(startDate)}</Text>
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const calStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { backgroundColor: colors.gray[100] },
  monthTitle: { ...typography.heading3, color: colors.gray[900] },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.gray[500], fontWeight: '600' },
  weekLabelSun: { color: '#dc2626' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderRadius: 999,
  },
  dayCellSelected: { backgroundColor: colors.green[600] },
  dayCellToday: { borderWidth: 1.5, borderColor: colors.green[400] },
  dayText: { fontSize: 14, fontWeight: '500', color: colors.gray[800] },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  dayTextToday: { color: colors.green[700], fontWeight: '700' },
  dayTextDisabled: { color: colors.gray[300] },
  dayTextSun: { color: '#dc2626' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.green[500],
    position: 'absolute',
    bottom: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 50 },

  // Hero Card
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNumber: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: colors.gray[900] },
  statusBadge: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  statusBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.green[700] },
  heroRight: { alignItems: 'flex-end' },
  heroPriceLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.gray[400] },
  heroPriceValue: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: colors.green[700], marginTop: 2 },
  heroPriceMonth: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.gray[500] },

  // Info Grid
  gridInfo: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  gridInfoItem: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.gray[100],
    alignItems: 'center',
  },
  gridInfoLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.gray[400] },
  gridInfoValue: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.gray[800], marginTop: 2 },

  // Shared Cards
  cardSection: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },

  // Capacity Area Bar
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  capacityTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.gray[800] },
  capacityValue: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.green[700] },
  capacityTrack: { height: 8, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  capacityBarFill: { height: 8, backgroundColor: colors.green[500], borderRadius: radius.full },
  capacityFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  capacityFooterLeft: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.green[600] },
  capacityFooterRight: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[400] },

  // Customize Section
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  sectionDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.gray[500], marginTop: 3 },

  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  pillarIconBoxLarge: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  pillarIconTextLarge: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: '#7c3aed' },
  pillarIconBoxMedium: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  pillarIconTextMedium: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: '#1d4ed8' },
  pillarIconBoxSmall: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  pillarIconTextSmall: { fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: '#15803d' },

  pillarInfo: { flex: 1 },
  pillarName: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.gray[800] },
  pillarHoles: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.gray[400] },
  pillarPrice: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[500], marginTop: 2 },

  counter: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray[200], padding: 4 },
  counterBtn: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.gray[50], alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { opacity: 0.4 },
  counterVal: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.gray[800], minWidth: 16, textAlign: 'center' },

  // Seed Selection
  seedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seedBadge: { backgroundColor: colors.green[50], borderWidth: 1, borderColor: colors.green[200], borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  seedBadgeText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: colors.green[700] },

  modeTabs: { flexDirection: 'row', backgroundColor: colors.gray[100], borderRadius: radius.lg, padding: 4, marginTop: spacing.md, gap: 4 },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  modeTabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  modeTabText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[500] },
  modeTabTextActive: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.green[800] },

  pillarChipsRow: { paddingVertical: spacing.sm, gap: spacing.xs },
  pillarChip: {
    backgroundColor: colors.gray[50],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  pillarChipActive: { backgroundColor: colors.green[50], borderColor: colors.green[500] },
  pillarChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.gray[600] },
  pillarChipTextActive: { color: colors.green[800], fontFamily: 'Inter_700Bold' },
  pillarChipSubText: { fontSize: 9, fontFamily: 'Inter_400Regular', color: colors.gray[400], marginTop: 2, maxWidth: 85 },
  pillarChipSubTextActive: { color: colors.green[600], fontFamily: 'Inter_600SemiBold' },

  treeListGrid: { gap: spacing.sm, marginTop: spacing.md },
  treeCard: {
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    padding: spacing.md,
  },
  treeCardSelected: { backgroundColor: colors.white, borderColor: colors.green[500], shadowColor: colors.green[600], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  treeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  treeIconBox: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.green[50], alignItems: 'center', justifyContent: 'center' },
  treeIconBoxSelected: { backgroundColor: colors.green[600] },
  treeNameTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  treeGrowthDuration: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.gray[500], marginTop: 1 },
  checkBadge: { marginLeft: 'auto' },

  treeWarningBadge: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  treeWarningText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#b45309' },

  treeCardDivider: { height: 1, backgroundColor: colors.gray[200], marginVertical: spacing.sm },
  treePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  treePriceLabelText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[500] },
  treePriceValueText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.green[700] },

  treePriceLegend: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.gray[200], padding: 5, marginTop: 6 },
  legendCell: { fontSize: 9, fontFamily: 'Inter_500Medium', color: colors.gray[500] },

  // Invoice Card
  cardInvoice: { padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.green[200], backgroundColor: colors.white, marginTop: spacing.md },
  invoiceTitle: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: colors.gray[900], marginBottom: spacing.md },
  invoiceSectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.gray[600], textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 5 },

  invoicePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray[50],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  invoicePickerText: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.gray[800] },
  pickerBadgeAlt: { backgroundColor: colors.green[600], borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  pickerBadgeTextAlt: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.white },

  quickMonthsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  quickMonthChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray[200], backgroundColor: colors.gray[50] },
  quickMonthChipActive: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  quickMonthText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[600] },
  quickMonthTextActive: { color: colors.white, fontFamily: 'Inter_700Bold' },

  dateBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateCell: { flex: 1, alignItems: 'center' },
  dateCellLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', color: colors.gray[400], textTransform: 'uppercase' },
  dateCellValue: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.gray[800], marginTop: 3 },

  // Bill items table
  billTable: { backgroundColor: colors.green[50], borderRadius: radius.lg, borderStyle: 'solid', borderWidth: 1, borderColor: colors.green[200], padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  billRow: { borderBottomWidth: 1, borderBottomColor: colors.green[100], paddingBottom: 6 },
  billRowMuted: { borderBottomWidth: 1, borderBottomColor: colors.green[100], paddingBottom: 6 },
  billLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.gray[700] },
  billLabelMuted: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[500] },
  billSub: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[500], marginTop: 2, paddingLeft: 6 },
  billSubMuted: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[400], marginTop: 2, paddingLeft: 6 },
  billValue: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.gray[800], marginTop: 4, textAlign: 'right' },
  billValueFree: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.green[600], textAlign: 'right' },
  totalDivider: { height: 1, backgroundColor: colors.green[200], marginVertical: 2 },
  finalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalTotalLabel: { fontSize: 13, fontFamily: 'Inter_800ExtraBold', color: colors.gray[800] },
  finalTotalValue: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: colors.green[800] },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  modalTitle: { ...typography.heading3, color: colors.gray[900] },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  monthGrid: { padding: spacing.md, gap: spacing.sm },
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
  monthOptionSelected: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  checkIcon: { marginBottom: 2 },
  monthOptionNumber: { fontSize: 26, fontWeight: '800', color: colors.gray[900] },
  monthOptionNumberSelected: { color: colors.white },
  monthOptionLabel: { ...typography.caption, color: colors.gray[500] },
  monthOptionLabelSelected: { color: colors.green[100] },
  monthOptionDate: { ...typography.caption, color: colors.gray[400], marginTop: 2, fontSize: 10 },
  monthOptionDateSelected: { color: colors.green[200] },
  modalNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.green[50], borderRadius: radius.md },
  modalNoteText: { ...typography.caption, color: colors.green[700], flex: 1 },
});
