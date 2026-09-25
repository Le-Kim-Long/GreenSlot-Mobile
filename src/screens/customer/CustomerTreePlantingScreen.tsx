import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';
import {
  Sprout,
  Plus,
  Search,
  Calendar,
  ChevronRight,
  ChevronDown,
  X,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Layers,
  Leaf,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { treeApi, treePlantingApi } from '../../api/treeApi';
import { bookingApi } from '../../api/bookingApi';
import type { TreeDTO, TreePlantingRequestDTO, BookingHistory, PillarDetail } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUICK_REASONS = [
  '🌱 Hết vụ thu hoạch cũ',
  '🌿 Muốn đổi giống rau mới',
  '🥬 Gieo bổ sung trụ mới thuê',
  '🥗 Trồng thêm rau ăn lá cho gia đình',
];

export default function CustomerTreePlantingScreen({ navigation, route }: CustomerStackProps<'CustomerTreePlanting'>) {
  const initialRentalId = (route?.params as any)?.rentalId as number | undefined;

  const [requests, setRequests] = useState<TreePlantingRequestDTO[]>([]);
  const [activeRentals, setActiveRentals] = useState<BookingHistory[]>([]);
  const [activeTrees, setActiveTrees] = useState<TreeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidRequestIds, setPaidRequestIds] = useState<Set<number>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<BookingHistory | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<PillarDetail | null>(null);
  const [selectedTree, setSelectedTree] = useState<TreeDTO | null>(null);
  const [openPickerType, setOpenPickerType] = useState<'rental' | 'pillar' | 'tree' | null>(null);
  const [dropdownLayout, setDropdownLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const rentalTriggerRef = useRef<View>(null);
  const pillarTriggerRef = useRef<View>(null);
  const treeTriggerRef = useRef<View>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [treeSearch, setTreeSearch] = useState('');

  // Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<TreePlantingRequestDTO | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqs, history, trees, availableSlots] = await Promise.allSettled([
        treePlantingApi.getMyRequests(),
        bookingApi.getHistory(),
        treeApi.getActiveTrees(),
        bookingApi.getAvailableSlots(),
      ]);

      if (reqs.status === 'fulfilled') {
        const loadedRequests = reqs.value || [];
        setRequests(loadedRequests);

        const targetReqId = (route?.params as any)?.requestId;
        const autoOpen = (route?.params as any)?.autoOpenDetail;
        const targetSlot = (route?.params as any)?.slotNumber;
        const targetTree = (route?.params as any)?.treeName;

        let matchedDetail: TreePlantingRequestDTO | undefined;
        if (targetReqId) {
          matchedDetail = loadedRequests.find(r => r.id === Number(targetReqId));
        }
        if (!matchedDetail && targetTree) {
          matchedDetail = loadedRequests.find(r =>
            r.newTreeName?.toLowerCase().includes(targetTree.toLowerCase()) ||
            r.treeName?.toLowerCase().includes(targetTree.toLowerCase())
          );
        }
        if (!matchedDetail && targetSlot) {
          matchedDetail = loadedRequests.find(r => r.slotNumber === targetSlot);
        }
        if (!matchedDetail && autoOpen && loadedRequests.length > 0) {
          matchedDetail = loadedRequests[0];
        }

        if (matchedDetail) {
          setSelectedDetail(matchedDetail);
        }
      }
      if (history.status === 'fulfilled') {
        const paidIds = new Set<number>();
        history.value.forEach(rental => {
          rental.transactions?.forEach(tx => {
            if (tx.vnpTxnRef?.startsWith('PLANT_') && (tx.status === 'SUCCESS' || tx.status === 'PAID')) {
              const parts = tx.vnpTxnRef.split('_');
              if (parts.length >= 2) {
                const rId = parseInt(parts[1], 10);
                if (!isNaN(rId)) paidIds.add(rId);
              }
            }
          });
        });
        if (paidIds.size > 0) {
          setPaidRequestIds(prev => new Set([...prev, ...paidIds]));
        }

        const slotsMap = new Map<string, any>();
        if (availableSlots.status === 'fulfilled') {
          availableSlots.value.forEach((s: any) => {
            if (s.slotNumber) slotsMap.set(s.slotNumber, s);
            if (s.id) slotsMap.set(String(s.id), s);
          });
        }

        const actives = history.value.filter((r) => r.status === 'ACTIVE' || r.status === 'PAID').map(r => {
          const matchedSlot = slotsMap.get(r.slotNumber) || (r.slotId ? slotsMap.get(String(r.slotId)) : null);
          if (matchedSlot?.pillars && matchedSlot.pillars.length > 0) {
            const enrichedPillars = (r.pillars || []).map(p => {
              const matchedP = matchedSlot.pillars?.find((sp: any) => sp.id === p.id || sp.pillarCode === p.pillarCode);
              return {
                ...p,
                capacityHoles: p.capacityHoles ?? matchedP?.capacityHoles ?? 36,
                pillarType: p.pillarType ?? matchedP?.pillarType ?? 'MEDIUM',
              };
            });
            return {
              ...r,
              pillars: enrichedPillars.length > 0 ? enrichedPillars : matchedSlot.pillars,
            };
          }
          return r;
        });

        setActiveRentals(actives);

        if (initialRentalId) {
          const preselected = actives.find(r => r.id === initialRentalId);
          if (preselected) {
            setSelectedRental(preselected);
            setIsCreateOpen(true);
          }
        } else if (actives.length > 0 && !selectedRental) {
          setSelectedRental(actives[0]);
        }
      }
      if (trees.status === 'fulfilled') setActiveTrees(trees.value);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!requests || requests.length === 0) return;
    const targetReqId = (route?.params as any)?.requestId;
    const autoOpen = (route?.params as any)?.autoOpenDetail;
    const targetSlot = (route?.params as any)?.slotNumber;
    const targetTree = (route?.params as any)?.treeName;

    if (!targetReqId && !autoOpen && !targetSlot && !targetTree) return;

    let matchedDetail: TreePlantingRequestDTO | undefined;
    if (targetReqId) {
      matchedDetail = requests.find(r => r.id === Number(targetReqId));
    }
    if (!matchedDetail && targetTree) {
      matchedDetail = requests.find(r =>
        r.newTreeName?.toLowerCase().includes(targetTree.toLowerCase()) ||
        r.treeName?.toLowerCase().includes(targetTree.toLowerCase())
      );
    }
    if (!matchedDetail && targetSlot) {
      matchedDetail = requests.find(r => r.slotNumber === targetSlot);
    }
    if (!matchedDetail && autoOpen && requests.length > 0) {
      matchedDetail = requests[0];
    }

    if (matchedDetail) {
      setSelectedDetail(matchedDetail);
    }
  }, [route?.params, requests]);

  const getRemainingDays = (endDateStr?: string) => {
    if (!endDateStr) return 0;
    let end: Date;
    if (endDateStr.includes('/')) {
      const parts = endDateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(p => parseInt(p, 10));
        end = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else {
        end = new Date(endDateStr);
      }
    } else {
      end = new Date(endDateStr);
    }
    if (isNaN(end.getTime())) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getTreePriceForPillar = (tree: TreeDTO | null, pillar?: PillarDetail | null) => {
    if (!tree) return 0;
    const price = tree.price || 0;
    const priceSmall = tree.priceSmall != null && Number(tree.priceSmall) > 0 ? Number(tree.priceSmall) : price;
    const priceMedium = tree.priceMedium != null && Number(tree.priceMedium) > 0 ? Number(tree.priceMedium) : priceSmall * 1.5;
    const priceLarge = tree.priceLarge != null && Number(tree.priceLarge) > 0 ? Number(tree.priceLarge) : priceSmall * 2.0;

    if (!pillar) return priceSmall;

    const holes = pillar.capacityHoles != null && pillar.capacityHoles > 0 ? pillar.capacityHoles : 24;

    let effectiveType = 'SMALL';
    if (pillar.capacityHoles != null && pillar.capacityHoles > 0) {
      if (pillar.capacityHoles <= 24) effectiveType = 'SMALL';
      else if (pillar.capacityHoles <= 36) effectiveType = 'MEDIUM';
      else effectiveType = 'LARGE';
    } else if (pillar.pillarType) {
      effectiveType = pillar.pillarType.toUpperCase();
    }

    if (holes >= 48 || effectiveType === 'LARGE') return priceLarge;
    if (holes >= 36 || effectiveType === 'MEDIUM') return priceMedium;
    return priceSmall;
  };

  const isRequestPaid = (item: TreePlantingRequestDTO) => {
    if (item.isPaid) return true;
    if (paidRequestIds.has(item.id)) return true;
    if (item.status === 'APPROVED' || item.status === 'COMPLETED') return true;
    return false;
  };

  const getEstimatedCost = () => {
    if (!selectedTree) return 0;
    if (selectedPillar) {
      return getTreePriceForPillar(selectedTree, selectedPillar);
    } else if (selectedRental?.pillars && selectedRental.pillars.length > 0) {
      return selectedRental.pillars.reduce(
        (acc, p) => acc + getTreePriceForPillar(selectedTree, p),
        0
      );
    } else {
      const pillarCount = selectedRental?.pillarCodes?.length || selectedRental?.pillars?.length || 1;
      return getTreePriceForPillar(selectedTree, null) * pillarCount;
    }
  };

  const remainingDays = selectedRental ? getRemainingDays(selectedRental.endTime || selectedRental.endDate) : 0;
  const growthDays = selectedTree ? (selectedTree.growthDurationDays || selectedTree.harvestDays || (selectedTree as any).growthTimeDays || (selectedTree as any).growthDays || 0) : 0;
  const isGrowthExceeded = Boolean(
    selectedRental && selectedTree && growthDays > 0 && growthDays > remainingDays
  );

  const estimatedTreeCost = getEstimatedCost();

  const handleOpenCreateModal = () => {
    if (!selectedRental && activeRentals.length > 0) {
      setSelectedRental(activeRentals[0]);
    }
    setOpenPickerType(null);
    setDropdownLayout(null);
    setIsCreateOpen(true);
  };

  const openDropdown = (type: 'rental' | 'pillar' | 'tree', ref: React.RefObject<View | null>) => {
    if (openPickerType === type) {
      setOpenPickerType(null);
      return;
    }
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setDropdownLayout({ x, y, width, height });
        } else {
          setDropdownLayout({ x: 20, y: 220, width: SCREEN_WIDTH - 40, height: 50 });
        }
        setOpenPickerType(type);
      });
    } else {
      setDropdownLayout({ x: 20, y: 220, width: SCREEN_WIDTH - 40, height: 50 });
      setOpenPickerType(type);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRental || !selectedTree || !reason.trim()) {
      Alert.alert('Lưu ý', 'Vui lòng chọn ô đất, giống cây và điền lý do trồng.');
      return;
    }

    if (isGrowthExceeded) {
      Alert.alert(
        'Không thể gửi yêu cầu',
        `Thời gian sinh trưởng của giống cây (${growthDays} ngày) vượt quá thời hạn thuê còn lại của ô đất (${remainingDays} ngày). Vui lòng gia hạn hợp đồng trước!`
      );
      return;
    }

    const cost = getEstimatedCost();
    const pillarCount = selectedPillar ? 1 : (selectedRental.pillars?.length || selectedRental.pillarCodes?.length || 1);
    const targetDesc = selectedPillar
      ? `Trụ ${selectedPillar.pillarCode} (${selectedPillar.capacityHoles || 24} hốc)`
      : `Toàn bộ ${pillarCount} trụ trong ô`;

    Alert.alert(
      'Xác nhận mua giống & gieo trồng',
      `Bạn chắc chắn muốn trồng giống "${selectedTree.treeName}" tại ô ${selectedRental.slotNumber} (${targetDesc})?\n\nChi phí phôi giống: ${formatCurrency(cost)}.\n\nSau khi bấm xác nhận, hệ thống sẽ mở cổng VNPay để bạn hoàn tất thanh toán tiền phôi giống.`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Thanh toán & Gửi',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await treePlantingApi.createRequest({
                rentalId: selectedRental.id,
                targetPillarId: selectedPillar?.id,
                newTreeId: selectedTree.id!,
                reason: reason.trim(),
                notes: notes.trim() || undefined,
                isMobile: true,
                mobileRedirectUrl: getMobileRedirectUrl(),
              });

              if (response.paymentUrl) {
                const settled = await openAndWaitForPayment(response.paymentUrl, bookingApi.getHistory, selectedRental.id);
                if (settled.status === 'success' && response.id) {
                  setPaidRequestIds(prev => new Set([...prev, response.id]));
                }
                setIsCreateOpen(false);
                fetchData();
                navigation.replace('PaymentResult', {
                  status: settled.status,
                  type: 'tree',
                  rentalId: selectedRental.id,
                  slotNumber: selectedRental.slotNumber,
                  amount: settled.callback?.amount,
                  txnRef: settled.callback?.txnRef,
                  orderInfo: settled.callback?.orderInfo
                });
              } else {
                Alert.alert('Thành công', 'Đã gửi yêu cầu trồng cây của bạn đến nhà vườn.');
                setIsCreateOpen(false);
                fetchData();
              }

              setReason('');
              setNotes('');
            } catch (error: any) {
              const errorMsg = error?.response?.data?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại sau.';
              Alert.alert('Thất bại', errorMsg);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const getStatusStyle = (item: TreePlantingRequestDTO) => {
    if (item.status === 'APPROVED') {
      return { bg: '#ecfdf5', txt: '#047857', border: '#a7f3d0', label: 'Đã duyệt' };
    }
    if (item.status === 'REJECTED') {
      return { bg: '#fef2f2', txt: '#dc2626', border: '#fca5a5', label: 'Từ chối' };
    }
    if (isRequestPaid(item)) {
      return { bg: '#eff6ff', txt: '#1d4ed8', border: '#bfdbfe', label: 'Đã thanh toán (Chờ duyệt)' };
    }
    if (item.paymentUrl) {
      return { bg: '#fff7ed', txt: '#c2410c', border: '#fed7aa', label: 'Chờ thanh toán' };
    }
    return { bg: '#fffbeb', txt: '#b45309', border: '#fde68a', label: 'Chờ duyệt' };
  };

  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        const matchSearch =
          r.slotNumber?.toLowerCase().includes(search.toLowerCase()) ||
          r.treeName?.toLowerCase().includes(search.toLowerCase()) ||
          r.newTreeName?.toLowerCase().includes(search.toLowerCase()) ||
          r.reason?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'ALL' ? true : r.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const aPaid = isRequestPaid(a) ? 1 : 0;
        const bPaid = isRequestPaid(b) ? 1 : 0;
        if (bPaid !== aPaid) return bPaid - aPaid;
        return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
      });
  }, [requests, search, statusFilter, paidRequestIds]);

  const filteredTrees = useMemo(() => {
    if (!treeSearch.trim()) return activeTrees;
    const q = treeSearch.toLowerCase();
    return activeTrees.filter(t =>
      t.treeName.toLowerCase().includes(q) ||
      (t.scientificName && t.scientificName.toLowerCase().includes(q))
    );
  }, [activeTrees, treeSearch]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_PAYMENT').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
    };
  }, [requests]);

  const isDropdownAbove =
    dropdownLayout &&
    dropdownLayout.y + dropdownLayout.height + 250 > SCREEN_HEIGHT - 20 &&
    dropdownLayout.y > 280;

  const floatingDropdownTop = dropdownLayout
    ? isDropdownAbove
      ? Math.max(40, dropdownLayout.y - Math.min(250, dropdownLayout.y - 40) - 4)
      : dropdownLayout.y + dropdownLayout.height + 4
    : 200;

  const floatingDropdownMaxHeight = dropdownLayout
    ? isDropdownAbove
      ? Math.min(250, dropdownLayout.y - 50)
      : Math.min(260, SCREEN_HEIGHT - (dropdownLayout.y + dropdownLayout.height) - 30)
    : 250;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ── Top Hero & Actions ── */}
      <View style={styles.topHero}>
        <View style={styles.heroTextRow}>
          <View style={styles.heroTitleWrap}>
            <View style={styles.heroIconBox}>
              <Sprout size={20} color={colors.white} />
            </View>
            <View style={styles.heroTitleColumn}>
              <Text style={styles.heroTitle} numberOfLines={1}>Yêu Cầu Trồng Cây</Text>
              <Text style={styles.heroSubtitle} numberOfLines={1} ellipsizeMode="tail">
                Gieo trồng giống rau sạch
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryAddBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.primaryAddBtnText}>Gửi yêu cầu</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm theo ô vườn, giống rau, lý do..."
            placeholderTextColor={colors.gray[400]}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Interactive KPI Filter Pills */}
        <View style={styles.kpiRow}>
          {[
            { key: 'ALL', label: 'Tất cả', count: counts.all },
            { key: 'PENDING', label: 'Chờ duyệt', count: counts.pending },
            { key: 'APPROVED', label: 'Đã duyệt', count: counts.approved },
            { key: 'REJECTED', label: 'Từ chối', count: counts.rejected },
          ].map(tab => {
            const isActive = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.kpiPill, isActive && styles.kpiPillActive]}
                onPress={() => setStatusFilter(tab.key as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.kpiPillText, isActive && styles.kpiPillTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.kpiBadge, isActive && styles.kpiBadgeActive]}>
                  <Text style={[styles.kpiBadgeText, isActive && styles.kpiBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Requests List ── */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={{ marginTop: 10, color: colors.gray[500], fontSize: 13 }}>Đang tải yêu cầu trồng cây...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = getStatusStyle(item);
            const paid = isRequestPaid(item);
            const showPayNow = !paid && !!item.paymentUrl && item.status === 'PENDING';

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedDetail(item)}
                activeOpacity={0.85}
              >
                {/* Left accent strip based on status */}
                <View style={[styles.cardAccentStrip, { backgroundColor: status.txt }]} />

                <View style={styles.cardInner}>
                  {/* Header Row */}
                  <View style={styles.cardHeader}>
                    <View style={styles.slotBadgeCol}>
                      <View style={styles.slotTag}>
                        <MapPin size={11} color={colors.green[700]} />
                        <Text style={styles.slotTagText} numberOfLines={1}>
                          {item.slotNumber || `Slot #${item.rentalId}`}
                        </Text>
                      </View>
                      {item.targetPillarCode ? (
                        <View style={styles.pillarTag}>
                          <Layers size={10} color={colors.emerald[700]} />
                          <Text style={styles.pillarTagText} numberOfLines={1}>
                            Trụ {item.targetPillarCode}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.pillarTagAll}>
                          <Text style={styles.pillarTagAllText} numberOfLines={1}>Tất cả trụ</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                      <Text style={[styles.statusText, { color: status.txt }]} numberOfLines={1}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Tree Name Row */}
                  <View style={styles.treeInfoRow}>
                    <View style={styles.treeIconCircle}>
                      <Leaf size={14} color={colors.green[700]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.treeNameText}>
                        {item.newTreeName || item.treeName}
                      </Text>
                      <Text style={styles.treeSubText}>
                        Giống rau đăng ký gieo mầm
                      </Text>
                    </View>
                  </View>

                  {/* Reason snippet */}
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText} numberOfLines={2}>
                      <Text style={{ fontWeight: '600', color: colors.gray[700] }}>Lý do: </Text>
                      {item.reason}
                    </Text>
                  </View>

                  {/* VNPay Pay button if unpaid */}
                  {showPayNow && (
                    <TouchableOpacity
                      style={styles.payNowBtn}
                      activeOpacity={0.85}
                      onPress={async (e) => {
                        e.stopPropagation?.();
                        if (item.paymentUrl) {
                          const settled = await openAndWaitForPayment(item.paymentUrl, bookingApi.getHistory, item.rentalId);
                          if (settled.status === 'success') {
                            setPaidRequestIds(prev => new Set([...prev, item.id]));
                          }
                          fetchData();
                        }
                      }}
                    >
                      <CreditCard size={13} color={colors.white} />
                      <Text style={styles.payNowBtnText}>Thanh toán tiền giống (VNPay)</Text>
                    </TouchableOpacity>
                  )}

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerDateRow}>
                      <Calendar size={12} color={colors.gray[400]} />
                      <Text style={styles.dateText}>
                        Gửi ngày {new Date(item.requestedAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    <View style={styles.footerActionRow}>
                      <Text style={styles.footerActionText}>Chi tiết</Text>
                      <ChevronRight size={13} color={colors.green[600]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Sprout size={40} color={colors.green[500]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có yêu cầu trồng cây nào</Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'ALL'
                  ? 'Bắt đầu gửi yêu cầu để nhà vườn chuẩn bị phôi giống và gieo trồng trên trụ của bạn.'
                  : 'Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={handleOpenCreateModal}
                activeOpacity={0.85}
              >
                <Plus size={16} color={colors.white} />
                <Text style={styles.emptyCtaBtnText}>Gửi yêu cầu gieo trồng mới</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── CREATE REQUEST MODAL ── */}
      <Modal visible={isCreateOpen} animationType="slide" transparent onRequestClose={() => setIsCreateOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBg}
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsCreateOpen(false)}
          />

          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Gửi Yêu Cầu Trồng Cây</Text>
                <Text style={styles.modalSubtitle}>Đăng ký giống rau sạch gieo trồng trên trụ khí canh</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setIsCreateOpen(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── STEP 1: CHỌN Ô VƯỜN ── */}
              <View style={styles.stepSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Chọn Ô Vườn Đang Thuê *</Text>
                </View>

                {activeRentals.length === 0 ? (
                  <View style={styles.noRentalNotice}>
                    <AlertTriangle size={18} color="#d97706" />
                    <Text style={styles.noRentalText}>
                      Bạn chưa có ô vườn nào đang hoạt động. Vui lòng thuê ô vườn trước khi gửi yêu cầu trồng cây.
                    </Text>
                  </View>
                ) : (
                  <View ref={rentalTriggerRef} collapsable={false}>
                    <TouchableOpacity
                      style={[styles.dropdownTrigger, openPickerType === 'rental' && styles.dropdownTriggerActive]}
                      onPress={() => openDropdown('rental', rentalTriggerRef)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownTriggerLeft}>
                        <View style={styles.dropdownIconCircle}>
                          <MapPin size={16} color={colors.green[700]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          {selectedRental ? (
                            <>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.dropdownMainText}>Ô {selectedRental.slotNumber}</Text>
                                <View style={styles.miniTag}>
                                  <Text style={styles.miniTagText}>
                                    {selectedRental.pillars?.length || selectedRental.pillarCodes?.length || 1} trụ
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.dropdownSubText} numberOfLines={1}>
                                {selectedRental.locationName || 'Nhà vườn'} · Còn {getRemainingDays(selectedRental.endTime || selectedRental.endDate)} ngày thuê
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.dropdownPlaceholder}>Chọn ô vườn bạn muốn gieo giống...</Text>
                          )}
                        </View>
                      </View>
                      <ChevronDown
                        size={18}
                        color={openPickerType === 'rental' ? colors.green[600] : colors.gray[500]}
                        style={openPickerType === 'rental' ? { transform: [{ rotate: '180deg' }] } : undefined}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ── STEP 2: CHỌN TRỤ CANH TÁC ── */}
              {selectedRental && (
                <View style={styles.stepSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Chọn Trụ Canh Tác</Text>
                  </View>

                  <View ref={pillarTriggerRef} collapsable={false}>
                    <TouchableOpacity
                      style={[styles.dropdownTrigger, openPickerType === 'pillar' && styles.dropdownTriggerActive]}
                      onPress={() => openDropdown('pillar', pillarTriggerRef)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownTriggerLeft}>
                        <View style={styles.dropdownIconCircleEmerald}>
                          <Layers size={16} color={colors.emerald[700]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          {selectedPillar ? (
                            <>
                              <Text style={styles.dropdownMainText}>Trụ {selectedPillar.pillarCode}</Text>
                              <Text style={styles.dropdownSubText}>
                                {selectedPillar.capacityHoles || 24} hốc gieo trồng · {selectedPillar.pillarType || 'Chuẩn'}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.dropdownMainText}>🌿 Toàn bộ các trụ trong ô</Text>
                              <Text style={styles.dropdownSubText}>
                                Áp dụng cho tất cả {selectedRental.pillars?.length || selectedRental.pillarCodes?.length || 1} trụ
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <ChevronDown
                        size={18}
                        color={openPickerType === 'pillar' ? colors.green[600] : colors.gray[500]}
                        style={openPickerType === 'pillar' ? { transform: [{ rotate: '180deg' }] } : undefined}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── STEP 3: CHỌN GIỐNG CÂY TRỒNG ── */}
              <View style={styles.stepSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Chọn Giống Cây Trồng *</Text>
                </View>

                <View ref={treeTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, openPickerType === 'tree' && styles.dropdownTriggerActive]}
                    onPress={() => openDropdown('tree', treeTriggerRef)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <View style={styles.dropdownIconCircle}>
                        <Leaf size={16} color={colors.green[700]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        {selectedTree ? (
                          <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.dropdownMainText}>{selectedTree.treeName}</Text>
                              <Text style={styles.treePriceHighlight}>
                                {formatCurrency(
                                  selectedPillar
                                    ? getTreePriceForPillar(selectedTree, selectedPillar)
                                    : (selectedTree.priceSmall || selectedTree.price || 0)
                                )}/trụ
                              </Text>
                            </View>
                            <Text style={styles.dropdownSubText}>
                              {selectedTree.growthDurationDays || selectedTree.harvestDays || 30} ngày thu hoạch · {selectedTree.scientificName || 'Rau sạch F1'}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.dropdownPlaceholder}>Chọn giống rau sạch gieo trồng...</Text>
                        )}
                      </View>
                    </View>
                    <ChevronDown
                      size={18}
                      color={openPickerType === 'tree' ? colors.green[600] : colors.gray[500]}
                      style={openPickerType === 'tree' ? { transform: [{ rotate: '180deg' }] } : undefined}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── STEP 4: ĐÁNH GIÁ TÍNH KHẢ THI & CHI PHÍ ── */}
              {selectedRental && selectedTree && (
                <View style={styles.stepSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Đánh Giá Tính Khả Thi & Chi Phí</Text>
                  </View>

                  {/* Feasibility Indicator */}
                  {growthDays > 0 && (
                    isGrowthExceeded ? (
                      <View style={styles.feasibilityWarningBox}>
                        <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.feasibilityWarningTitle}>Thời gian sinh trưởng vượt quá hạn thuê!</Text>
                          <Text style={styles.feasibilityWarningDesc}>
                            Giống rau này cần {growthDays} ngày để thu hoạch nhưng ô đất chỉ còn {remainingDays} ngày thuê. Vui lòng gia hạn hợp đồng trước khi gửi yêu cầu gieo giống.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.feasibilitySuccessBox}>
                        <CheckCircle2 size={18} color={colors.green[600]} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.feasibilitySuccessTitle}>Chu kỳ sinh trưởng tương thích hoàn hảo</Text>
                          <Text style={styles.feasibilitySuccessDesc}>
                            Giống rau cần {growthDays} ngày để thu hoạch. Ô đất còn {remainingDays} ngày thuê — đảm bảo thu hoạch trọn vẹn vụ mùa.
                          </Text>
                        </View>
                      </View>
                    )
                  )}

                  {/* Cost Breakdown Card */}
                  <View style={styles.costBreakdownCard}>
                    <View style={styles.costRow}>
                      <Text style={styles.costRowLabel}>Giống rau:</Text>
                      <Text style={styles.costRowValue}>{selectedTree.treeName}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costRowLabel}>Phạm vi gieo trồng:</Text>
                      <Text style={styles.costRowValue}>
                        {selectedPillar
                          ? `Trụ ${selectedPillar.pillarCode} (${selectedPillar.capacityHoles || 24} hốc)`
                          : `Toàn bộ ${selectedRental.pillars?.length || 1} trụ`}
                      </Text>
                    </View>
                    <View style={styles.costDivider} />
                    <View style={styles.costRowTotal}>
                      <View>
                        <Text style={styles.costTotalLabel}>Tổng chi phí phôi giống dự kiến:</Text>
                        <Text style={styles.costGuaranteeTag}>Thanh toán an toàn qua VNPay</Text>
                      </View>
                      <Text style={styles.costTotalValue}>{formatCurrency(estimatedTreeCost)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ── STEP 5: LÝ DO & GHI CHÚ ── */}
              <View style={styles.stepSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>5</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Lý Do & Ghi Chú Kỹ Thuật Viên *</Text>
                </View>

                <Text style={styles.subInputHint}>Gợi ý lý do nhanh:</Text>
                <View style={styles.quickChipsRow}>
                  {QUICK_REASONS.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickChip}
                      onPress={() => setReason(chip)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Lý do trồng / thay cây *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="VD: Thu hoạch xong vụ cũ, muốn đổi sang rau muống..."
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={3}
                  value={reason}
                  onChangeText={setReason}
                />

                <Text style={styles.fieldLabel}>Ghi chú cho kỹ thuật viên chăm sóc (nếu có)</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  placeholder="VD: Ưu tiên gieo mầm vào đầu tuần, bổ sung dinh dưỡng lá..."
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={2}
                  value={notes}
                  onChangeText={setNotes}
                />

                <View style={styles.guaranteeBox}>
                  <ShieldCheck size={18} color={colors.green[700]} />
                  <Text style={styles.guaranteeText}>
                    GreenSlot Cam Kết: Phôi giống F1 chất lượng cao, kỹ thuật viên nhà vườn trực tiếp ươm mầm và kiểm tra sâu bệnh định kỳ trên từng hốc khí canh.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Sticky Action Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!selectedRental || !selectedTree || !reason.trim() || isGrowthExceeded || isSubmitting) && styles.submitBtnDisabled
                ]}
                onPress={handleSubmit}
                disabled={!selectedRental || !selectedTree || !reason.trim() || isGrowthExceeded || isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <CreditCard size={18} color={colors.white} />
                    <Text style={styles.submitBtnText}>
                      {estimatedTreeCost > 0
                        ? `Thanh toán giống & Gửi (${formatCurrency(estimatedTreeCost)})`
                        : 'Gửi yêu cầu trồng cây'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── FLOATING DROPDOWN POPUP (Shows right at the select box position) ── */}
      <Modal
        visible={openPickerType !== null && dropdownLayout !== null}
        animationType="none"
        transparent
        onRequestClose={() => setOpenPickerType(null)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setOpenPickerType(null)}
        />
        {dropdownLayout && (
          <View
            style={[
              styles.floatingDropdownMenu,
              {
                top: floatingDropdownTop,
                left: dropdownLayout.x,
                width: dropdownLayout.width,
                maxHeight: floatingDropdownMaxHeight,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.floatingDropdownHeader}>
              <Text style={styles.floatingDropdownTitle}>
                {openPickerType === 'rental'
                  ? 'Chọn Ô Vườn'
                  : openPickerType === 'pillar'
                  ? 'Chọn Trụ Canh Tác'
                  : 'Chọn Giống Cây Trồng'}
              </Text>
              <TouchableOpacity onPress={() => setOpenPickerType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            {/* RENTAL LIST */}
            {openPickerType === 'rental' && (
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                {activeRentals.map(rental => {
                  const isSelected = selectedRental?.id === rental.id;
                  const daysLeft = getRemainingDays(rental.endTime || rental.endDate);
                  const pillarCount = rental.pillars?.length || rental.pillarCodes?.length || 1;
                  return (
                    <TouchableOpacity
                      key={rental.id}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                      onPress={() => {
                        setSelectedRental(rental);
                        setSelectedPillar(null);
                        setOpenPickerType(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleSelected]}>
                            Ô {rental.slotNumber}
                          </Text>
                          <Text style={styles.dropdownItemLocation}>({rental.locationName || 'Cơ sở nhà vườn'})</Text>
                        </View>
                        <Text style={styles.dropdownItemMeta}>
                          {pillarCount} trụ khí canh ·{' '}
                          <Text style={{ color: daysLeft > 20 ? colors.green[700] : '#ea580c', fontWeight: '600' }}>
                            Còn {daysLeft} ngày thuê
                          </Text>
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkCircleSmall}>
                          <Check size={12} color={colors.white} strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={styles.radioCircleSmall} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* PILLAR LIST */}
            {openPickerType === 'pillar' && selectedRental && (
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                {/* All pillars option */}
                <TouchableOpacity
                  style={[styles.dropdownItem, !selectedPillar && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedPillar(null);
                    setOpenPickerType(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownItemTitle, !selectedPillar && styles.dropdownItemTitleSelected]}>
                      🌿 Toàn bộ các trụ trong ô ({selectedRental.pillars?.length || selectedRental.pillarCodes?.length || 1} trụ)
                    </Text>
                    <Text style={styles.dropdownItemMeta}>Gieo trồng giống cây cho tất cả các trụ</Text>
                  </View>
                  {!selectedPillar ? (
                    <View style={styles.checkCircleSmall}>
                      <Check size={12} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.radioCircleSmall} />
                  )}
                </TouchableOpacity>
                {selectedRental.pillars &&
                  selectedRental.pillars.map(pillar => {
                    const isPSelected = selectedPillar?.id === pillar.id;
                    return (
                      <TouchableOpacity
                        key={pillar.id || pillar.pillarCode}
                        style={[styles.dropdownItem, isPSelected && styles.dropdownItemSelected]}
                        onPress={() => {
                          setSelectedPillar(pillar);
                          setOpenPickerType(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemTitle, isPSelected && styles.dropdownItemTitleSelected]}>
                            Trụ {pillar.pillarCode}
                          </Text>
                          <Text style={styles.dropdownItemMeta}>
                            {pillar.capacityHoles || 24} hốc gieo trồng · {pillar.pillarType || 'Chuẩn'}
                          </Text>
                        </View>
                        {isPSelected ? (
                          <View style={styles.checkCircleSmall}>
                            <Check size={12} color={colors.white} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={styles.radioCircleSmall} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}

            {/* TREE LIST */}
            {openPickerType === 'tree' && (
              <>
                {activeTrees.length > 4 && (
                  <View style={styles.dropdownSearchBar}>
                    <Search size={14} color={colors.gray[400]} />
                    <TextInput
                      placeholder="Tìm tên giống rau..."
                      placeholderTextColor={colors.gray[400]}
                      style={styles.dropdownSearchInput}
                      value={treeSearch}
                      onChangeText={setTreeSearch}
                    />
                    {treeSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setTreeSearch('')}>
                        <X size={14} color={colors.gray[400]} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                  {filteredTrees.map(tree => {
                    const isTSelected = selectedTree?.id === tree.id;
                    const treePrice = selectedPillar
                      ? getTreePriceForPillar(tree, selectedPillar)
                      : tree.priceSmall || tree.price || 0;
                    const gDays =
                      tree.growthDurationDays || tree.harvestDays || (tree as any).growthTimeDays || 30;
                    return (
                      <TouchableOpacity
                        key={tree.id}
                        style={[styles.dropdownItem, isTSelected && styles.dropdownItemSelected]}
                        onPress={() => {
                          setSelectedTree(tree);
                          setOpenPickerType(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingRight: 8,
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemTitle,
                                isTSelected && styles.dropdownItemTitleSelected,
                              ]}
                            >
                              {tree.treeName}
                            </Text>
                            <Text
                              style={[
                                styles.dropdownTreePrice,
                                isTSelected && styles.dropdownTreePriceSelected,
                              ]}
                            >
                              {formatCurrency(treePrice)}/trụ
                            </Text>
                          </View>
                          <Text style={styles.dropdownItemMeta}>
                            {gDays} ngày thu hoạch {tree.scientificName ? `· ${tree.scientificName}` : ''}
                          </Text>
                        </View>
                        {isTSelected ? (
                          <View style={styles.checkCircleSmall}>
                            <Check size={12} color={colors.white} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={styles.radioCircleSmall} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        )}
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal visible={selectedDetail !== null} animationType="fade" transparent onRequestClose={() => setSelectedDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chi Tiết Yêu Cầu</Text>
                <Text style={styles.modalSubtitle}>Mã yêu cầu: #{selectedDetail?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDetail(null)} style={styles.closeBtn}>
                <X size={20} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>

            {selectedDetail && (
              <ScrollView style={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedDetail).bg, borderColor: getStatusStyle(selectedDetail).border }]}>
                    <Text style={[styles.statusText, { color: getStatusStyle(selectedDetail).txt }]}>
                      {getStatusStyle(selectedDetail).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vị trí ô đất:</Text>
                  <Text style={styles.detailValue}>Ô {selectedDetail.slotNumber}</Text>
                </View>

                {selectedDetail.targetPillarCode ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trụ canh tác:</Text>
                    <Text style={styles.detailValue}>Trụ {selectedDetail.targetPillarCode}</Text>
                  </View>
                ) : (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trụ canh tác:</Text>
                    <Text style={styles.detailValue}>Toàn bộ các trụ</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giống rau:</Text>
                  <Text style={[styles.detailValue, { color: colors.green[700], fontWeight: '700' }]}>
                    🌱 {selectedDetail.newTreeName || selectedDetail.treeName}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày gửi yêu cầu:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedDetail.requestedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <Text style={styles.detailSectionHeader}>Lý do & Ghi chú từ khách hàng:</Text>
                <View style={styles.detailQuoteBox}>
                  <Text style={styles.detailQuoteText}>"{selectedDetail.reason}"</Text>
                  {selectedDetail.notes ? (
                    <Text style={styles.detailNotesText}>Ghi chú: {selectedDetail.notes}</Text>
                  ) : null}
                </View>

                {/* Trạng thái thanh toán VNPay */}
                {isRequestPaid(selectedDetail) ? (
                  <View style={styles.paidConfirmationBox}>
                    <CheckCircle size={18} color={colors.green[600]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paidConfirmationTitle}>Đã hoàn tất thanh toán</Text>
                      <Text style={styles.paidConfirmationDesc}>
                        {(selectedDetail.amount || selectedDetail.price) ? `Chi phí phôi giống: ${formatCurrency(selectedDetail.amount || selectedDetail.price!)}. ` : ''}
                        Khoản tiền mua giống đã được thanh toán thành công qua VNPay. Đang chờ Quản lý cơ sở duyệt để nhân viên tiến hành gieo mầm.
                      </Text>
                    </View>
                  </View>
                ) : (selectedDetail.paymentUrl && selectedDetail.status === 'PENDING') ? (
                  <TouchableOpacity
                    style={[styles.payNowBtn, { marginVertical: spacing.md, paddingVertical: 12 }]}
                    onPress={async () => {
                      if (selectedDetail.paymentUrl) {
                        const settled = await openAndWaitForPayment(selectedDetail.paymentUrl, bookingApi.getHistory, selectedDetail.rentalId);
                        if (settled.status === 'success') {
                          setPaidRequestIds(prev => new Set([...prev, selectedDetail.id]));
                          setSelectedDetail(prev => prev ? { ...prev, isPaid: true } : null);
                        }
                        fetchData();
                      }
                    }}
                  >
                    <CreditCard size={16} color={colors.white} />
                    <Text style={styles.payNowBtnText}>Tiến hành thanh toán giống rau (VNPay)</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Phản hồi nhà vườn */}
                <Text style={styles.detailSectionHeader}>Phản hồi từ Nhà vườn:</Text>
                {selectedDetail.status === 'PENDING' ? (
                  <View style={styles.pendingBox}>
                    <AlertCircle size={16} color="#d97706" />
                    <Text style={styles.pendingText}>Đang chờ bộ phận kỹ thuật xem xét và gieo mầm.</Text>
                  </View>
                ) : (
                  <View style={[styles.processedBox, { borderColor: selectedDetail.status === 'APPROVED' ? '#86efac' : '#fca5a5' }]}>
                    <Text style={[styles.processedStatusText, { color: selectedDetail.status === 'APPROVED' ? colors.green[700] : '#dc2626' }]}>
                      {selectedDetail.status === 'APPROVED' ? '🌱 Đồng ý trồng' : '⚠️ Từ chối thực hiện'}
                    </Text>
                    {selectedDetail.processedByName ? (
                      <Text style={styles.processedByText}>
                        Xử lý bởi: {selectedDetail.processedByName} lúc{' '}
                        {selectedDetail.processedAt ? new Date(selectedDetail.processedAt).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    ) : null}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHero: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heroTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.sm,
  },
  heroTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  heroTitleColumn: {
    flex: 1,
    minWidth: 0,
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  heroSubtitle: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 1,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.green[600],
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    flexShrink: 0,
    shadowColor: colors.green[700],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAddBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    flexShrink: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.gray[900],
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 6,
  },
  kpiPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  kpiPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  kpiPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  kpiBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  kpiBadgeActive: {
    backgroundColor: colors.green[600],
  },
  kpiBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[600],
  },
  kpiBadgeTextActive: {
    color: colors.white,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1.5,
  },
  cardAccentStrip: {
    width: 3.5,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  slotBadgeCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  slotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    flexShrink: 0,
  },
  slotTagText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
  },
  pillarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexShrink: 1,
  },
  pillarTagText: {
    fontSize: 10.5,
    fontFamily: 'Inter_600SemiBold',
    color: colors.emerald[700],
  },
  pillarTagAll: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
    flexShrink: 1,
  },
  pillarTagAllText: {
    fontSize: 10.5,
    color: colors.gray[500],
    fontFamily: 'Inter_500Medium',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10.5,
    fontFamily: 'Inter_600SemiBold',
  },
  treeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  treeIconCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeNameText: {
    fontSize: 12.5,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  treeSubText: {
    fontSize: 10,
    color: colors.gray[500],
  },
  reasonBox: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 2.5,
    borderLeftColor: colors.green[500],
    paddingLeft: 7,
    paddingVertical: 1,
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 11,
    color: colors.gray[600],
    lineHeight: 15,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ea580c',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  payNowBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 5,
    marginTop: 1,
  },
  footerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
    color: colors.gray[400],
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerActionText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[600],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green[600],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyCtaBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // Modal styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  formContainer: {
    padding: spacing.md,
    paddingBottom: 30,
  },
  stepSection: {
    marginTop: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  noRentalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noRentalText: {
    fontSize: 12,
    color: '#b45309',
    flex: 1,
    lineHeight: 17,
  },
  singleRentalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: colors.green[600],
    borderRadius: radius.md,
    padding: 12,
  },
  singleRentalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rentalSubInfo: {
    fontSize: 11,
    color: colors.gray[600],
    marginTop: 2,
  },
  rentalCardsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  rentalCard: {
    width: 170,
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  rentalCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: colors.green[600],
  },
  rentalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rentalSlotPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  rentalSlotPillSelected: {
    backgroundColor: colors.green[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  rentalSlotText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[700],
  },
  rentalSlotTextSelected: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  selectedCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentalLocationText: {
    fontSize: 12,
    color: colors.gray[800],
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  rentalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rentalMetaText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  pillarScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  pillarChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillarChipSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[700],
  },
  pillarChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[700],
  },
  pillarChipTextSelected: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  treeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 10,
  },
  treeSearchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: colors.gray[900],
  },
  treeListVertical: {
    gap: 8,
  },
  treeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  treeRowCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: colors.green[600],
  },
  treeRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeRowIconBoxSelected: {
    backgroundColor: colors.green[100],
  },
  treeRowInfo: {
    flex: 1,
    marginLeft: 10,
  },
  treeRowName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  treeRowNameSelected: {
    color: colors.green[800],
  },
  treeRowSciName: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.gray[400],
    marginTop: 1,
  },
  treeRowBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  treeGrowthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  treeGrowthBadgeText: {
    fontSize: 10,
    color: colors.gray[600],
    fontFamily: 'Inter_500Medium',
  },
  treeRowPriceText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: colors.green[700],
  },
  treeSelectRadio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  treeSelectRadioSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  feasibilityWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 10,
  },
  feasibilityWarningTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#dc2626',
    marginBottom: 2,
  },
  feasibilityWarningDesc: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 16,
  },
  feasibilitySuccessBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 10,
  },
  feasibilitySuccessTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
    marginBottom: 2,
  },
  feasibilitySuccessDesc: {
    fontSize: 11,
    color: colors.green[700],
    lineHeight: 16,
  },
  costBreakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  costRowLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  costRowValue: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  costDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  costRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costTotalLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },
  costGuaranteeTag: {
    fontSize: 10,
    color: colors.green[600],
    marginTop: 2,
  },
  costTotalValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.green[700],
  },
  subInputHint: {
    fontSize: 11,
    color: colors.gray[500],
    marginBottom: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipText: {
    fontSize: 11,
    color: colors.gray[700],
    fontFamily: 'Inter_500Medium',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 68,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 52,
    textAlignVertical: 'top',
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  guaranteeText: {
    fontSize: 11,
    color: colors.green[800],
    lineHeight: 16,
    flex: 1,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: colors.white,
  },
  submitBtn: {
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.green[700],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray[400],
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },

  // Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  detailLabel: {
    color: colors.gray[500],
    fontSize: 13,
  },
  detailValue: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[900],
    fontSize: 13,
  },
  detailSectionHeader: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  detailQuoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailQuoteText: {
    fontStyle: 'italic',
    color: colors.gray[800],
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
  },
  detailNotesText: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 6,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  pendingText: {
    fontSize: 12,
    color: '#b45309',
  },
  processedBox: {
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
  },
  processedStatusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  processedByText: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 4,
  },
  paidConfirmationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  paidConfirmationTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
    marginBottom: 2,
  },
  paidConfirmationDesc: {
    fontSize: 11,
    color: colors.green[700],
    lineHeight: 16,
  },

  // ── Dropdown Styles for Steps 1, 2, 3 ──
  dropdownContainer: {
    marginTop: 6,
    marginBottom: 4,
    position: 'relative',
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerActive: {
    borderColor: colors.green[600],
    backgroundColor: '#f8fafc',
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 6,
  },
  dropdownIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownIconCircleEmerald: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMainText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  dropdownSubText: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
  },
  dropdownPlaceholder: {
    fontSize: 13,
    color: colors.gray[400],
    fontFamily: 'Inter_500Medium',
  },
  miniTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  miniTagText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },
  treePriceHighlight: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.green[700],
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colors.green[600],
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  dropdownItemTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  dropdownItemTitleSelected: {
    color: colors.green[800],
    fontFamily: 'Inter_700Bold',
  },
  dropdownItemLocation: {
    fontSize: 11,
    color: colors.gray[500],
  },
  dropdownItemMeta: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
  },
  dropdownTreePrice: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[700],
  },
  dropdownTreePriceSelected: {
    color: colors.green[700],
  },
  checkCircleSmall: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginLeft: 8,
  },
  dropdownSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    height: 34,
    margin: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownSearchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: colors.gray[900],
  },

  // ── Floating Dropdown Popup Styles ──
  floatingDropdownMenu: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.green[600],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 25,
    overflow: 'hidden',
  },
  floatingDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  floatingDropdownTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
