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
import { Sprout, Search, Calendar, ChevronRight, X, User, MapPin, CheckCircle, XCircle } from 'lucide-react-native';
import { treePlantingApi } from '../../api/treeApi';
import type { TreePlantingRequestDTO } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

export default function TreePlantingManagementScreen() {
  const [requests, setRequests] = useState<TreePlantingRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Detail & Processing Modal
  const [selectedDetail, setSelectedDetail] = useState<TreePlantingRequestDTO | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await treePlantingApi.getAllRequests();
      setRequests(data || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    Alert.alert(
      'Phê duyệt yêu cầu',
      'Bạn có đồng ý cho khách hàng trồng giống cây này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await treePlantingApi.approveRequest(id);
              Alert.alert('Thành công', 'Đã phê duyệt yêu cầu.');
              setSelectedDetail(null);
              fetchRequests();
            } catch {
              Alert.alert('Lỗi', 'Thao tác thất bại.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối.');
      return;
    }

    setIsSubmitting(true);
    try {
      await treePlantingApi.rejectRequest(id, rejectReason.trim());
      Alert.alert('Thành công', 'Đã từ chối yêu cầu.');
      setSelectedDetail(null);
      setRejectReason('');
      fetchRequests();
    } catch {
      Alert.alert('Lỗi', 'Thao tác thất bại.');
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
      r.userName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' ? true : r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm theo slot, giống cây, tên khách..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tabs */}
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
                    <MapPin size={15} color={colors.green[600]} />
                    <Text style={styles.slotText}>{item.slotNumber || `Slot #${item.slotId}`}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.txt }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <User size={14} color={colors.gray[500]} />
                  <Text style={styles.custText}>Khách hàng: {item.userName}</Text>
                </View>

                <View style={styles.row}>
                  <Sprout size={14} color={colors.green[600]} />
                  <Text style={styles.treeText}>Giống yêu cầu: {item.treeName}</Text>
                </View>

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
              <Text style={{ color: colors.gray[500] }}>Chưa có yêu cầu trồng cây nào.</Text>
            </View>
          }
        />
      )}

      {/* DETAIL & PROCESS MODAL */}
      <Modal visible={selectedDetail !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xử lý Yêu cầu Trồng cây</Text>
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
                  <Text style={styles.detailLabel}>Khách hàng:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.userName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vị trí ô đất:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.slotNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giống cây mới:</Text>
                  <Text style={styles.detailValue}>{selectedDetail.treeName}</Text>
                </View>

                {selectedDetail.notes ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={styles.detailLabel}>Ghi chú của khách:</Text>
                    <Text style={styles.notesBox}>"{selectedDetail.notes}"</Text>
                  </View>
                ) : null}

                {/* If PENDING -> show Approve/Reject controls */}
                {selectedDetail.status === 'PENDING' ? (
                  <View style={styles.actionContainer}>
                    <Text style={styles.actionHeader}>Ghi chú xử lý / Lý do từ chối</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập lý do từ chối hoặc phản hồi cho khách..."
                      value={rejectReason}
                      onChangeText={setRejectReason}
                    />

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.btn, styles.rejectBtn, isSubmitting && { opacity: 0.5 }]}
                        onPress={() => handleReject(selectedDetail.id)}
                        disabled={isSubmitting}
                      >
                        <XCircle size={18} color="#dc2626" />
                        <Text style={[styles.btnText, { color: '#dc2626' }]}>Từ chối</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btn, styles.approveBtn, isSubmitting && { opacity: 0.5 }]}
                        onPress={() => handleApprove(selectedDetail.id)}
                        disabled={isSubmitting}
                      >
                        <CheckCircle size={18} color={colors.white} />
                        <Text style={[styles.btnText, { color: colors.white }]}>Phê duyệt</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.processedContainer}>
                    <Text style={styles.processedText}>Yêu cầu này đã được xử lý.</Text>
                    {selectedDetail.rejectReason ? (
                      <Text style={styles.reasonText}>Lý do từ chối: {selectedDetail.rejectReason}</Text>
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
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gray[900],
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  custText: {
    fontSize: 13,
    color: colors.gray[700],
    fontWeight: '600',
  },
  treeText: {
    fontSize: 13,
    color: colors.green[700],
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
    maxHeight: '85%',
    overflow: 'hidden',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    color: colors.gray[500],
    fontSize: 13,
  },
  detailValue: {
    fontWeight: '600',
    color: colors.gray[900],
    fontSize: 13,
  },
  notesBox: {
    backgroundColor: '#f9fafb',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    fontStyle: 'italic',
    color: colors.gray[700],
  },
  actionContainer: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: spacing.md,
  },
  actionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.gray[900],
    height: 44,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  approveBtn: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[600],
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  processedContainer: {
    marginTop: spacing.lg,
    backgroundColor: '#f9fafb',
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  processedText: {
    fontSize: 13,
    color: colors.gray[500],
    fontWeight: '500',
  },
  reasonText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
