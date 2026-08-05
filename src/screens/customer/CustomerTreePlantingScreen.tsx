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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, Plus, Search, Calendar, ChevronRight, X, AlertCircle } from 'lucide-react-native';
import { treeApi, treePlantingApi } from '../../api/treeApi';
import { bookingApi } from '../../api/bookingApi';
import type { TreeDTO, TreePlantingRequestDTO, BookingHistory } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

export default function CustomerTreePlantingScreen() {
  const [requests, setRequests] = useState<TreePlantingRequestDTO[]>([]);
  const [activeRentals, setActiveRentals] = useState<BookingHistory[]>([]);
  const [activeTrees, setActiveTrees] = useState<TreeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modal create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<BookingHistory | null>(null);
  const [selectedTree, setSelectedTree] = useState<TreeDTO | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Selector modals
  const [isRentalSelectOpen, setIsRentalSelectOpen] = useState(false);
  const [isTreeSelectOpen, setIsTreeSelectOpen] = useState(false);

  // Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<TreePlantingRequestDTO | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqs, history, trees] = await Promise.allSettled([
        treePlantingApi.getMyRequests(),
        bookingApi.getHistory(),
        treeApi.getActiveTrees(),
      ]);

      if (reqs.status === 'fulfilled') setRequests(reqs.value);
      if (history.status === 'fulfilled') {
        setActiveRentals(history.value.filter((r) => r.status === 'ACTIVE' || r.status === 'PAID'));
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

  const handleSubmit = async () => {
    if (!selectedRental || !selectedTree || !reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn ô đất, giống cây và điền lý do.');
      return;
    }

    setIsSubmitting(true);
    try {
      await treePlantingApi.createRequest({
        rentalId: selectedRental.id,
        newTreeId: selectedTree.id!,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu trồng cây của bạn đến nhà vườn.');
      setIsCreateOpen(false);
      setSelectedRental(null);
      setSelectedTree(null);
      setReason('');
      setNotes('');
      fetchData();
    } catch (error) {
      Alert.alert('Thất bại', 'Không thể gửi yêu cầu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: colors.green[50], txt: colors.green[700], label: 'Đã duyệt' };
      case 'REJECTED':
        return { bg: '#fee2e2', txt: '#dc2626', label: 'Từ chối' };
      default:
        return { bg: '#fef3c7', txt: '#d97706', label: 'Chờ duyệt' };
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.slotNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.treeName?.toLowerCase().includes(search.toLowerCase()) ||
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
            const status = getStatusStyle(item.status);
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedDetail(item)}>
                <View style={styles.cardHeader}>
                  <View style={styles.slotBadge}>
                    <Sprout size={16} color={colors.green[600]} />
                    <Text style={styles.slotText}>{item.slotNumber || `Slot #${item.rentalId}`}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.txt }]}>{status.label}</Text>
                  </View>
                </View>

                <Text style={styles.treeNameText}>Cây trồng: {item.treeName}</Text>
                <Text style={styles.reasonText} numberOfLines={2}>
                  Lý do: {item.reason}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Ngày yêu cầu: {new Date(item.requestedAt).toLocaleDateString('vi-VN')}
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
              <Text style={styles.label}>Chọn Ô đất đang thuê *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsRentalSelectOpen(true)}>
                <Text style={{ color: selectedRental ? colors.gray[900] : colors.gray[400] }}>
                  {selectedRental ? selectedRental.slotNumber : 'Nhấp để chọn ô đất'}
                </Text>
              </TouchableOpacity>

              {/* Select Tree */}
              <Text style={styles.label}>Chọn Giống cây muốn trồng *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsTreeSelectOpen(true)}>
                <Text style={{ color: selectedTree ? colors.gray[900] : colors.gray[400] }}>
                  {selectedTree ? selectedTree.treeName : 'Nhấp để chọn giống cây'}
                </Text>
              </TouchableOpacity>

              {/* Reason */}
              <Text style={styles.label}>Lý do trồng / thay thế cây *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="VD: Cây cũ đã hết vụ, muốn đổi giống cây..."
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedDetail.status).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusStyle(selectedDetail.status).txt }]}>
                      {getStatusStyle(selectedDetail.status).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vị trí ô đất:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.slotNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giống cây:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.treeName}</Text>
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

                {/* Phản hồi nhà vườn */}
                <Text style={styles.detailSectionHeader}>Phản hồi từ Nhà vườn:</Text>
                {selectedDetail.status === 'PENDING' ? (
                  <View style={styles.pendingBox}>
                    <AlertCircle size={16} color="#d97706" />
                    <Text style={styles.pendingText}>Đang chờ bộ phận kỹ thuật xem xét thổ nhưỡng.</Text>
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
                    setIsRentalSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.slotNumber} ({item.locationName})</Text>
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
                  <Text style={styles.pickerItemText}>{item.treeName}</Text>
                  <Text style={styles.pickerItemSub}>{item.scientificName}</Text>
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
});
