import React, { useState, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMobileRedirectUrl, openAndWaitForPayment } from '../../utils/paymentFlow';
import { Sprout, Plus, Search, Calendar, ChevronRight, X, AlertCircle, CreditCard, CheckCircle } from 'lucide-react-native';
import { treeApi, treePlantingApi } from '../../api/treeApi';
import { bookingApi } from '../../api/bookingApi';
import type { TreeDTO, TreePlantingRequestDTO, BookingHistory, PillarDetail } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

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
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Selector modals
  const [isRentalSelectOpen, setIsRentalSelectOpen] = useState(false);
  const [isPillarSelectOpen, setIsPillarSelectOpen] = useState(false);
  const [isTreeSelectOpen, setIsTreeSelectOpen] = useState(false);

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

      if (reqs.status === 'fulfilled') setRequests(reqs.value);
      if (history.status === 'fulfilled') {
        // Collect all paid PLANT_ request IDs from transaction history
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

        // Build slots map to enrich pillars with capacityHoles and pillarType
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
        // Auto-select rental if navigated with rentalId param
        if (initialRentalId) {
          const preselected = actives.find(r => r.id === initialRentalId);
          if (preselected) {
            setSelectedRental(preselected);
            setIsCreateOpen(true);
          }
        }
      }
      if (trees.status === 'fulfilled') setActiveTrees(trees.value);
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  /**
   * Mirror backend's Tree.getEffectivePriceForPillar() & Pillar.getEffectivePillarType():
   * Priority: capacityHoles (<= 24: SMALL, <= 36: MEDIUM, > 36: LARGE).
   */
  const getTreePriceForPillar = (tree: TreeDTO | null, pillar?: PillarDetail | null) => {
    if (!tree) return 0;
    const price = tree.price || 0;
    const priceSmall = tree.priceSmall != null && Number(tree.priceSmall) > 0 ? Number(tree.priceSmall) : price;
    const priceMedium = tree.priceMedium != null && Number(tree.priceMedium) > 0 ? Number(tree.priceMedium) : priceSmall * 1.5;
    const priceLarge = tree.priceLarge != null && Number(tree.priceLarge) > 0 ? Number(tree.priceLarge) : priceSmall * 2.0;

    if (!pillar) return priceSmall;

    const holes = pillar.capacityHoles != null && pillar.capacityHoles > 0 ? pillar.capacityHoles : 24;

    // Backend Pillar.getEffectivePillarType() logic:
    // If capacityHoles > 0: <= 24 is SMALL, <= 36 is MEDIUM, else LARGE
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

  const handleSubmit = async () => {
    if (!selectedRental || !selectedTree || !reason.trim()) {
      Alert.alert('Lưu ý', 'Vui lòng chọn ô đất, giống cây và điền lý do.');
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
      `Bạn chắc chắn muốn trồng "${selectedTree.treeName}" tại ô ${selectedRental.slotNumber} (${targetDesc})?\n\nChi phí phôi giống: ${formatCurrency(cost)}.\n\nSau khi bấm xác nhận, hệ thống sẽ chuyển sang cổng VNPay để bạn thanh toán tiền phôi giống.`,
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

              setSelectedRental(null);
              setSelectedPillar(null);
              setSelectedTree(null);
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
      return { bg: colors.green[50], txt: colors.green[700], label: 'Đã duyệt' };
    }
    if (item.status === 'REJECTED') {
      return { bg: '#fee2e2', txt: '#dc2626', label: 'Từ chối' };
    }
    if (isRequestPaid(item)) {
      return { bg: colors.green[50], txt: colors.green[700], label: 'Đã thanh toán (Chờ duyệt)' };
    }
    if (item.paymentUrl) {
      return { bg: '#fff7ed', txt: '#ea580c', label: 'Chờ thanh toán' };
    }
    return { bg: '#fef3c7', txt: '#d97706', label: 'Chờ duyệt' };
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.slotNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.treeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.newTreeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' ? true : r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header Controls */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm theo slot, cây, lý do..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsCreateOpen(true)}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {[
          { label: 'Tất cả', count: requests.length, color: colors.green[700], bg: colors.green[50] },
          { label: 'Chờ duyệt', count: requests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_PAYMENT').length, color: '#d97706', bg: '#fef3c7' },
          { label: 'Đã duyệt', count: requests.filter(r => r.status === 'APPROVED').length, color: colors.green[700], bg: colors.green[50] },
          { label: 'Từ chối', count: requests.filter(r => r.status === 'REJECTED').length, color: '#dc2626', bg: '#fee2e2' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
            <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.activeTab]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.activeTabText]}>
              {tab === 'ALL' ? 'Tất cả' : tab === 'PENDING' ? 'Chờ duyệt' : tab === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Requests List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const status = getStatusStyle(item);
            const paid = isRequestPaid(item);
            const showPayNow = !paid && !!item.paymentUrl && item.status === 'PENDING';

            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedDetail(item)}>
                <View style={styles.cardHeader}>
                  <View style={styles.slotBadge}>
                    <Sprout size={16} color={colors.green[600]} />
                    <Text style={styles.slotText}>
                      {item.slotNumber || `Slot #${item.rentalId}`}
                      {item.targetPillarCode ? ` · Trụ ${item.targetPillarCode}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.txt }]}>{status.label}</Text>
                  </View>
                </View>

                <Text style={styles.treeNameText}>🌱 Cây trồng: {item.newTreeName || item.treeName}</Text>
                <Text style={styles.reasonText} numberOfLines={2}>
                  Lý do: {item.reason}
                </Text>

                {showPayNow && (
                  <TouchableOpacity
                    style={styles.payNowBtn}
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
                    <CreditCard size={14} color={colors.white} />
                    <Text style={styles.payNowBtnText}>Thanh toán VNPay</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Ngày gửi: {new Date(item.requestedAt).toLocaleDateString('vi-VN')}
                  </Text>
                  <ChevronRight size={16} color={colors.gray[400]} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sprout size={48} color={colors.gray[300]} style={{ marginBottom: 12 }} />
              <Text style={{ color: colors.gray[500] }}>Chưa có yêu cầu trồng cây nào.</Text>
            </View>
          }
        />
      )}

      {/* CREATE REQUEST MODAL */}
      <Modal visible={isCreateOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gửi Yêu Cầu Trồng Cây</Text>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                <X size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              {/* Select Rental */}
              <Text style={styles.label}>Chọn Ô vườn đang thuê *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsRentalSelectOpen(true)}>
                <Text style={{ color: selectedRental ? colors.gray[900] : colors.gray[400] }}>
                  {selectedRental ? `Ô ${selectedRental.slotNumber} (${selectedRental.locationName || 'Nhà vườn'})` : 'Nhấp để chọn ô đất'}
                </Text>
              </TouchableOpacity>

              {/* Select Pillar if available */}
              {selectedRental && selectedRental.pillars && selectedRental.pillars.length > 0 && (
                <>
                  <Text style={styles.label}>Chọn Trụ canh tác cụ thể</Text>
                  <TouchableOpacity style={styles.selector} onPress={() => setIsPillarSelectOpen(true)}>
                    <Text style={{ color: selectedPillar ? colors.gray[900] : colors.gray[400] }}>
                      {selectedPillar ? `Trụ ${selectedPillar.pillarCode} (${selectedPillar.capacityHoles || 24} hốc)` : 'Mặc định hoặc chọn trụ'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Select Tree */}
              <Text style={styles.label}>Chọn Giống cây muốn trồng *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsTreeSelectOpen(true)}>
                <Text style={{ color: selectedTree ? colors.gray[900] : colors.gray[400] }}>
                  {selectedTree ? `🌱 ${selectedTree.treeName || (selectedTree as any).name}` : 'Nhấp để chọn giống cây'}
                </Text>
              </TouchableOpacity>

              {/* Growth Duration Warning */}
              {selectedRental && selectedTree && growthDays > 0 && (
                isGrowthExceeded ? (
                  <View style={styles.warningBlock}>
                    <AlertCircle size={16} color='#dc2626' />
                    <Text style={styles.warningText}>
                      ⚠️ Thời gian sinh trưởng ({growthDays} ngày) vượt quá thời hạn thuê còn lại ({remainingDays} ngày). Không thể gửi yêu cầu!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.successBlock}>
                    <CheckCircle size={16} color={colors.green[600]} />
                    <Text style={styles.successText}>
                      ✅ Giống cây có thể thu hoạch trong {growthDays} ngày. Còn {remainingDays} ngày thuê.
                    </Text>
                  </View>
                )
              )}

              {/* Estimated Cost */}
              {selectedTree && estimatedTreeCost > 0 && (
                <View style={styles.costBlock}>
                  <CreditCard size={15} color={colors.green[700]} />
                  <Text style={styles.costText}>
                    Chi phí phôi giống dự kiến: <Text style={{ fontWeight: '700' }}>{formatCurrency(estimatedTreeCost)}</Text>
                    {selectedPillar ? ` (Trụ ${selectedPillar.capacityHoles || 24} hốc)` : ''}
                  </Text>
                </View>
              )}

              {/* Reason */}
              <Text style={styles.label}>Lý do trồng / thay thế cây *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="VD: Cây cũ đã hết vụ, muốn đổi giống cây mới..."
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />

              {/* Notes */}
              <Text style={styles.label}>Ghi chú cho kỹ thuật viên</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ghi chú thêm (nếu có)..."
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi yêu cầu ngay</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={selectedDetail !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Yêu Cầu</Text>
              <TouchableOpacity onPress={() => setSelectedDetail(null)}>
                <X size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            {selectedDetail && (
              <ScrollView style={{ padding: spacing.md }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedDetail).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusStyle(selectedDetail).txt }]}>
                      {getStatusStyle(selectedDetail).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vị trí ô đất:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.slotNumber}</Text>
                </View>

                {selectedDetail.targetPillarCode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trụ canh tác:</Text>
                    <Text style={styles.detailValue}>Trụ {selectedDetail.targetPillarCode}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giống cây:</Text>
                  <Text style={[styles.detailValue, { color: colors.green[700], fontWeight: '700' }]}>
                    🌱 {selectedDetail.newTreeName || selectedDetail.treeName}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày gửi:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedDetail.requestedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <Text style={styles.detailSectionHeader}>Lý do & Ghi chú từ khách hàng:</Text>
                <View style={styles.detailQuoteBox}>
                  <Text style={styles.detailQuoteText}>"{selectedDetail.reason}"</Text>
                  {selectedDetail.notes ? (
                    <Text style={styles.detailNotesText}>Lưu ý: {selectedDetail.notes}</Text>
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
                        Khoản tiền mua giống đã được thanh toán thành công qua VNPay. Hệ thống đang chờ Quản lý nhà vườn duyệt trước khi nhân viên gieo mầm.
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
                  <View
                    style={[
                      styles.processedBox,
                      { borderColor: selectedDetail.status === 'APPROVED' ? colors.green[200] : '#fca5a5' },
                    ]}
                  >
                    <Text style={styles.processedStatusText}>
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

      {/* RENTAL PICKER */}
      <Modal visible={isRentalSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ô đất</Text>
              <TouchableOpacity onPress={() => setIsRentalSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeRentals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedRental(item);
                    setSelectedPillar(null);
                    setIsRentalSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>Ô {item.slotNumber} ({item.locationName})</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.gray[500], padding: 20 }}>Bạn không có ô đất nào đang thuê.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* PILLAR PICKER */}
      <Modal visible={isPillarSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn trụ canh tác</Text>
              <TouchableOpacity onPress={() => setIsPillarSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedRental?.pillars || []}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedPillar(item);
                    setIsPillarSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>Trụ {item.pillarCode} ({item.capacityHoles || 24} hốc)</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.gray[500], padding: 20 }}>Không có thông tin trụ cụ thể.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* TREE PICKER */}
      <Modal visible={isTreeSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn giống cây</Text>
              <TouchableOpacity onPress={() => setIsTreeSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeTrees}
              keyExtractor={(item) => item.id!.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedTree(item);
                    setIsTreeSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>🌱 {item.treeName || (item as any).name}</Text>
                  {item.price ? (
                    <Text style={styles.pickerItemSub}>
                      Giá giống: {formatCurrency(selectedPillar ? getTreePriceForPillar(item, selectedPillar) : (item.priceSmall || item.price))}
                      {selectedPillar ? ` (Trụ ${selectedPillar.capacityHoles || 24} hốc)` : ''}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gray[900],
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.green[50],
  },
  tabText: {
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: 'Inter_500Medium',
  },
  activeTabText: {
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  treeNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green[700],
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: spacing.xs,
  },
  dateText: {
    fontSize: 11,
    color: colors.gray[400],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  formContainer: {
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    color: colors.gray[500],
  },
  detailValue: {
    fontWeight: '600',
    color: colors.gray[900],
  },
  detailSectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  detailQuoteBox: {
    backgroundColor: '#f9fafb',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  detailQuoteText: {
    fontStyle: 'italic',
    color: colors.gray[800],
    fontWeight: '500',
  },
  detailNotesText: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 8,
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
    backgroundColor: '#f9fafb',
  },
  processedStatusText: {
    fontWeight: '700',
    color: colors.gray[900],
    fontSize: 13,
  },
  processedByText: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 4,
  },
  pickerBox: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: '60%',
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  pickerItemSub: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
  },
  payNowBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  warningBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
    lineHeight: 18,
  },
  successBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  successText: {
    fontSize: 12,
    color: colors.green[700],
    flex: 1,
    lineHeight: 18,
  },
  costBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.green[200],
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  costText: {
    fontSize: 13,
    color: colors.green[800],
    flex: 1,
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
    marginVertical: spacing.md,
  },
  paidConfirmationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green[800],
    marginBottom: 4,
  },
  paidConfirmationDesc: {
    fontSize: 12,
    color: colors.green[700],
    lineHeight: 18,
  },
});
