import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ClipboardList, UserPlus, Plus, Search, X, 
  CheckCircle, Eye, AlertTriangle 
} from 'lucide-react-native';
import { taskApi } from '../../api/taskApi';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { ServiceTypeDTO, GardenSlotDTO, GardeningTaskResponseDTO } from '../../types/api';

export default function TaskManagementScreen() {
  const [tasks, setTasks] = useState<GardeningTaskResponseDTO[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDTO[]>([]);
  const [slots, setSlots] = useState<GardenSlotDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GardeningTaskResponseDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    taskType: 'MAINTENANCE',
    targetSlotId: '',
    staffId: '',
    serviceId: '',
    evidenceImageUrl: '',
  });

  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesData, slotsData, tasksData] = await Promise.all([
        businessManagerApi.getAllServiceTypes().catch(() => []),
        businessManagerApi.getAllSlots().catch(() => []),
        taskApi.getAllTasks().catch(() => []),
      ]);
      setServiceTypes(servicesData);
      setSlots(slotsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateMode(true);
    setIsReviewMode(false);
    setIsDetailMode(false);
    setSelectedTask(null);
    setFormData({
      taskName: '',
      description: '',
      taskType: 'MAINTENANCE',
      targetSlotId: '',
      staffId: '',
      serviceId: '',
      evidenceImageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenAssignModal = (task: GardeningTaskResponseDTO) => {
    setIsCreateMode(false);
    setIsReviewMode(false);
    setIsDetailMode(false);
    setSelectedTask(task);
    setFormData({
      taskName: task.taskName || '',
      description: task.description || '',
      taskType: task.taskType || 'MAINTENANCE',
      targetSlotId: task.targetSlotId ? String(task.targetSlotId) : '',
      staffId: task.assignedStaffId ? String(task.assignedStaffId) : '',
      serviceId: '',
      evidenceImageUrl: task.evidenceImageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenReviewModal = (task: GardeningTaskResponseDTO) => {
    setSelectedTask(task);
    setReviewAction('APPROVE');
    setRejectionReason('');
    setIsReviewMode(true);
    setIsCreateMode(false);
    setIsDetailMode(false);
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (task: GardeningTaskResponseDTO) => {
    setSelectedTask(task);
    setIsDetailMode(true);
    setIsCreateMode(false);
    setIsReviewMode(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (isReviewMode) {
      if (!selectedTask) return;
      if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối!');
        return;
      }
      setIsSubmitting(true);
      try {
        await taskApi.reviewTask(selectedTask.id, {
          action: reviewAction,
          rejectionReason: reviewAction === 'REJECT' ? rejectionReason.trim() : undefined,
        });
        Alert.alert(
          'Thành công',
          reviewAction === 'APPROVE' ? 'Đã duyệt hoàn thành công việc!' : 'Đã từ chối công việc (yêu cầu làm lại)!'
        );
        setIsModalOpen(false);
        fetchData();
      } catch (e: any) {
        const msg = e?.response?.data?.message || 'Lỗi khi duyệt công việc';
        Alert.alert('Lỗi', msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isCreateMode) {
      if (!formData.taskName.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên công việc!');
        return;
      }
      if (!formData.targetSlotId) {
        Alert.alert('Lỗi', 'Vui lòng chọn Ô vườn (Slot)!');
        return;
      }

      setIsSubmitting(true);
      try {
        await taskApi.createTask({
          taskName: formData.taskName.trim(),
          description: formData.description.trim() || undefined,
          taskType: formData.taskType,
          targetSlotId: Number(formData.targetSlotId),
          evidenceImageUrl: formData.evidenceImageUrl.trim() || undefined,
        });

        Alert.alert('Thành công', 'Tạo công việc mới thành công!');
        setIsModalOpen(false);
        fetchData();
      } catch (e: any) {
        const msg = e?.response?.data?.message || 'Tạo công việc thất bại';
        Alert.alert('Lỗi', msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!selectedTask) return;
      if (!formData.staffId) {
        Alert.alert('Lỗi', 'Vui lòng chọn nhân viên để gán!');
        return;
      }

      setIsSubmitting(true);
      try {
        await taskApi.assignTask(selectedTask.id, Number(formData.staffId));
        Alert.alert('Thành công', 'Gán nhân viên thành công!');
        setIsModalOpen(false);
        fetchData();
      } catch (e: any) {
        const msg = e?.response?.data?.message || 'Gán công việc thất bại';
        Alert.alert('Lỗi', msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.taskName?.toLowerCase().includes(search.toLowerCase()) ||
    t.targetSlotNumber?.toLowerCase().includes(search.toLowerCase()) ||
    t.assignedStaffName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý công việc</Text>
          <Text style={styles.headerSub}>Tạo mới, gán nhân viên & duyệt bằng chứng</Text>
        </View>
        <TouchableOpacity style={styles.btnCreate} onPress={handleOpenCreateModal}>
          <Plus size={18} color="#fff" />
          <Text style={styles.btnCreateText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên task, ô vườn, nhân viên..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <ClipboardList size={48} color={colors.gray[200]} />
          <Text style={styles.emptyText}>Chưa có danh sách công việc</Text>
          <TouchableOpacity style={styles.btnCreateSub} onPress={handleOpenCreateModal}>
            <Text style={styles.btnCreateSubText}>+ Tạo công việc đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.taskId}>#{item.id}</Text>
                  <Text style={styles.taskName}>{item.taskName}</Text>
                </View>
                <View style={[
                  styles.statusBadgeBox,
                  item.status === 'COMPLETED' ? styles.badgeSuccess :
                  item.status === 'PENDING_APPROVAL' ? styles.badgePurple :
                  item.status === 'IN_PROGRESS' ? styles.badgeBlue :
                  item.status === 'REJECTED' ? styles.badgeRed : styles.badgeYellow
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    item.status === 'COMPLETED' ? styles.textSuccess :
                    item.status === 'PENDING_APPROVAL' ? styles.textPurple :
                    item.status === 'IN_PROGRESS' ? styles.textBlue :
                    item.status === 'REJECTED' ? styles.textRed : styles.textYellow
                  ]}>
                    {item.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.taskMeta}>
                Ô: {item.targetSlotNumber || 'N/A'} · Loại: {item.taskType}
              </Text>
              
              {item.description ? (
                <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}

              {/* Thumbnail Ảnh Bằng Chứng nếu có */}
              {item.evidenceImageUrl ? (
                <View style={styles.evidenceRow}>
                  <Image source={{ uri: item.evidenceImageUrl }} style={styles.evidenceThumb} resizeMode="cover" />
                  <Text style={styles.evidenceInfo}>📸 Đã có ảnh bằng chứng</Text>
                </View>
              ) : null}

              <View style={styles.taskFooter}>
                <Text style={styles.staffMeta} numberOfLines={1}>
                  {item.assignedStaffName ? `NV: ${item.assignedStaffName}` : 'Chưa gán'}
                </Text>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.btnDetail}
                    onPress={() => handleOpenDetailModal(item)}
                  >
                    <Eye size={13} color="#4b5563" />
                    <Text style={styles.btnDetailText}>Chi tiết</Text>
                  </TouchableOpacity>

                  {item.status === 'PENDING_APPROVAL' ? (
                    <TouchableOpacity
                      style={styles.btnReview}
                      onPress={() => handleOpenReviewModal(item)}
                    >
                      <CheckCircle size={13} color="#fff" />
                      <Text style={styles.btnReviewText}>Duyệt</Text>
                    </TouchableOpacity>
                  ) : item.status === 'PENDING' && !item.assignedStaffName ? (
                    <TouchableOpacity
                      style={styles.btnAssign}
                      onPress={() => handleOpenAssignModal(item)}
                    >
                      <UserPlus size={13} color={colors.green[700]} />
                      <Text style={styles.btnAssignText}>Gán</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Quản lý (Create, Assign, Review, Detail) */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isReviewMode ? 'Phê duyệt công việc' :
                 isDetailMode ? `Chi tiết công việc #${selectedTask?.id}` :
                 isCreateMode ? 'Tạo công việc mới' : 'Gán nhân viên thực hiện'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {isDetailMode && selectedTask ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.detailTitle}>{selectedTask.taskName}</Text>
                  <Text style={styles.detailSub}>Ô: {selectedTask.targetSlotNumber} · Loại: {selectedTask.taskType} · Trạng thái: {selectedTask.status}</Text>
                  {selectedTask.description ? (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxText}>{selectedTask.description}</Text>
                    </View>
                  ) : null}
                  {selectedTask.rejectionReason ? (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionBoxText}>⚠️ Lý do từ chối: {selectedTask.rejectionReason}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.label}>Hình ảnh bằng chứng:</Text>
                  {selectedTask.evidenceImageUrl ? (
                    <Image source={{ uri: selectedTask.evidenceImageUrl }} style={styles.largeEvidence} resizeMode="contain" />
                  ) : (
                    <Text style={styles.emptyImgText}>Chưa có hình ảnh bằng chứng.</Text>
                  )}
                </View>
              ) : isReviewMode && selectedTask ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.detailTitle}>{selectedTask.taskName}</Text>
                  <Text style={styles.detailSub}>Nhân viên: {selectedTask.assignedStaffName || 'N/A'} · Ô: {selectedTask.targetSlotNumber}</Text>
                  
                  <Text style={styles.label}>📸 Ảnh Bằng Chứng từ Nhân Viên:</Text>
                  {selectedTask.evidenceImageUrl ? (
                    <Image source={{ uri: selectedTask.evidenceImageUrl }} style={styles.largeEvidence} resizeMode="contain" />
                  ) : (
                    <Text style={styles.emptyImgText}>⚠️ Không tìm thấy ảnh bằng chứng.</Text>
                  )}

                  <Text style={styles.label}>Quyết định phê duyệt:</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      style={[styles.radioChoice, reviewAction === 'APPROVE' && styles.radioChoiceActiveGreen]}
                      onPress={() => setReviewAction('APPROVE')}
                    >
                      <Text style={[styles.radioChoiceText, reviewAction === 'APPROVE' && styles.textGreenBold]}>Duyệt hoàn thành</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.radioChoice, reviewAction === 'REJECT' && styles.radioChoiceActiveRed]}
                      onPress={() => setReviewAction('REJECT')}
                    >
                      <Text style={[styles.radioChoiceText, reviewAction === 'REJECT' && styles.textRedBold]}>Từ chối (Làm lại)</Text>
                    </TouchableOpacity>
                  </View>

                  {reviewAction === 'REJECT' ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.label}>Lý do từ chối *</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Nhập lý do nhân viên cần làm lại..."
                        multiline
                        numberOfLines={3}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                      />
                    </View>
                  ) : null}
                </View>
              ) : isCreateMode ? (
                <>
                  <Text style={styles.label}>Tên công việc *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: Tưới cây & tỉa cành"
                    value={formData.taskName}
                    onChangeText={(t) => setFormData({ ...formData, taskName: t })}
                  />

                  <Text style={styles.label}>Mô tả chi tiết</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ghi chú thêm..."
                    multiline
                    numberOfLines={3}
                    value={formData.description}
                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                  />

                  <Text style={styles.label}>Chọn Ô vườn (Slot) *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {slots.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.chip,
                          formData.targetSlotId === String(s.id) && styles.chipActive,
                        ]}
                        onPress={() => setFormData({ ...formData, targetSlotId: String(s.id) })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            formData.targetSlotId === String(s.id) && styles.chipTextActive,
                          ]}
                        >
                          Slot {s.slotNumber}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.label}>URL ảnh hướng dẫn đính kèm (Tùy chọn)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    value={formData.evidenceImageUrl}
                    onChangeText={(t) => setFormData({ ...formData, evidenceImageUrl: t })}
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Chọn Nhân viên thực hiện *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập Staff ID (VD: 3)"
                    keyboardType="numeric"
                    value={formData.staffId}
                    onChangeText={(t) => setFormData({ ...formData, staffId: t })}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.btnSecondaryText}>{isDetailMode ? 'Đóng' : 'Hủy'}</Text>
              </TouchableOpacity>
              
              {!isDetailMode && (
                <TouchableOpacity
                  style={[styles.btnPrimary, isReviewMode && reviewAction === 'REJECT' && { backgroundColor: '#dc2626' }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.btnPrimaryText}>
                    {isSubmitting ? 'Đang xử lý...' : isReviewMode ? (reviewAction === 'APPROVE' ? 'Xác nhận duyệt' : 'Xác nhận từ chối') : isCreateMode ? 'Tạo mới' : 'Xác nhận gán'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerTitle: { ...typography.heading2, color: colors.gray[900], fontSize: 18 },
  headerSub: { ...typography.bodySmall, color: colors.gray[500] },
  btnCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  btnCreateText: { ...typography.label, color: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: spacing.xs,
    ...typography.body,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: { ...typography.body, color: colors.gray[400], marginTop: spacing.md },
  btnCreateSub: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.green[50], borderRadius: 8 },
  btnCreateSubText: { fontSize: 13, color: colors.green[700], fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  taskId: { fontSize: 11, color: '#9ca3af', fontWeight: '700', fontFamily: 'monospace' },
  taskName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statusBadgeBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgePurple: { backgroundColor: '#f3e8ff' },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeYellow: { backgroundColor: '#fef9c3' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  textSuccess: { color: '#15803d' },
  textPurple: { color: '#7e22ce' },
  textBlue: { color: '#1d4ed8' },
  textRed: { color: '#b91c1c' },
  textYellow: { color: '#a16207' },
  taskMeta: { fontSize: 12, color: colors.green[700], fontWeight: '600', marginBottom: 4 },
  taskDesc: { fontSize: 12, color: '#4b5563', marginBottom: 6 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb', padding: 6, borderRadius: 8, marginBottom: 8 },
  evidenceThumb: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#111827' },
  evidenceInfo: { fontSize: 11, color: '#4b5563', fontWeight: '600' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  staffMeta: { fontSize: 12, color: '#6b7280', flex: 1, marginRight: 8 },
  btnDetail: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#f3f4f6' },
  btnDetailText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  btnReview: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#7c3aed' },
  btnReviewText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  btnAssign: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.green[50], borderWidth: 1, borderColor: colors.green[200] },
  btnAssignText: { fontSize: 11, fontWeight: '700', color: colors.green[700] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalBody: { marginBottom: 14 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detailSub: { fontSize: 12, color: '#4b5563' },
  descBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  descBoxText: { fontSize: 12, color: '#374151' },
  rejectionBox: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  rejectionBoxText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 4 },
  largeEvidence: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#111827', marginTop: 4 },
  emptyImgText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  radioChoice: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' },
  radioChoiceActiveGreen: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  radioChoiceActiveRed: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  radioChoiceText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  textGreenBold: { color: '#16a34a', fontWeight: '700' },
  textRedBold: { color: '#dc2626', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#f9fafb', marginBottom: 8 },
  textArea: { height: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: colors.green[600] },
  chipText: { fontSize: 12, color: '#4b5563' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  btnSecondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  btnSecondaryText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: colors.green[600] },
  btnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
