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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, UserPlus, Plus, Search, X } from 'lucide-react-native';
import { taskApi } from '../../api/taskApi';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { ServiceTypeDTO, GardenSlotDTO } from '../../types/api';

interface TaskItem {
  id: number;
  taskName: string;
  description?: string;
  taskType: string;
  status: string;
  targetSlotId?: number;
  targetSlotNumber?: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
}

const MOCK_GARDENERS = [
  { id: 10, name: 'Nguyễn Văn A (Nhân viên vườn)' },
  { id: 11, name: 'Trần Thị B (Nhân viên vườn)' },
  { id: 12, name: 'Lê Văn C (Kỹ thuật viên)' },
];

export default function TaskManagementScreen() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDTO[]>([]);
  const [slots, setSlots] = useState<GardenSlotDTO[]>([]);
  const [gardeners, setGardeners] = useState<any[]>(MOCK_GARDENERS);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    taskType: 'MAINTENANCE',
    targetSlotId: '',
    staffId: '',
    serviceId: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesData, slotsData, tasksData, staffData] = await Promise.all([
        businessManagerApi.getAllServiceTypes().catch(() => []),
        businessManagerApi.getAllSlots().catch(() => []),
        taskApi.getAllTasks().catch(() => []),
        businessManagerApi.getGardenStaffsByLocation(1).catch(() => []),
      ]);
      setServiceTypes(servicesData);
      setSlots(slotsData);
      setTasks(tasksData);
      if (staffData && staffData.length > 0) {
        setGardeners(staffData.map(s => ({ id: s.id, name: s.fullName || s.username })));
      } else {
        setGardeners(MOCK_GARDENERS);
      }
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
    setSelectedTask(null);
    setFormData({
      taskName: '',
      description: '',
      taskType: 'MAINTENANCE',
      targetSlotId: '',
      staffId: '',
      serviceId: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenAssignModal = (task: TaskItem) => {
    setIsCreateMode(false);
    setSelectedTask(task);
    setFormData({
      taskName: task.taskName || '',
      description: task.description || '',
      taskType: task.taskType || 'MAINTENANCE',
      targetSlotId: task.targetSlotId ? String(task.targetSlotId) : '',
      staffId: task.assignedStaffId ? String(task.assignedStaffId) : '',
      serviceId: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (isCreateMode) {
      if (!formData.taskName.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên công việc!');
        return;
      }
      if (!formData.targetSlotId) {
        Alert.alert('Lỗi', 'Vui lòng chọn Ô vườn (Slot)!');
        return;
      }
      if (!formData.staffId) {
        Alert.alert('Lỗi', 'Vui lòng chọn Nhân viên thực hiện!');
        return;
      }

      setIsSubmitting(true);
      try {
        const newTask = await taskApi.createTask({
          taskName: formData.taskName.trim(),
          description: formData.description.trim() || undefined,
          taskType: formData.taskType,
          targetSlotId: Number(formData.targetSlotId),
          scheduledDate: new Date().toISOString(),
          priority: 'MEDIUM',
        });

        // Tự động gán nhân viên ngay sau khi tạo
        if (formData.staffId && newTask?.id) {
          await taskApi.assignTaskByPath(newTask.id, {
            staffId: Number(formData.staffId),
          });
        }

        Alert.alert('Thành công', 'Đã tạo & phân công công việc thành công!');
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        // Fallback: Nếu không có quyền tạo task trực tiếp, thử requestService
        try {
          await taskApi.requestService({
            slotId: Number(formData.targetSlotId),
            description: `[${formData.taskName}] ${formData.description}`,
            serviceTypeId: formData.serviceId ? Number(formData.serviceId) : 1,
          });
          Alert.alert('Thành công', 'Đã tạo yêu cầu công việc mới thành công!');
          setIsModalOpen(false);
          fetchData();
        } catch {
          Alert.alert('Lỗi', 'Tạo công việc thất bại. Vui lòng thử lại!');
        }
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
        await taskApi.assignTaskByPath(selectedTask.id, {
          staffId: Number(formData.staffId),
        });

        Alert.alert('Thành công', 'Gán công việc thành công!');
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        // Fallback sang assignTask cũ
        try {
          await taskApi.assignTask({
            taskId: selectedTask.id,
            staffId: Number(formData.staffId),
            slotId: selectedTask.targetSlotId,
            taskName: selectedTask.taskName,
            description: selectedTask.description,
          });
          Alert.alert('Thành công', 'Gán công việc thành công!');
          setIsModalOpen(false);
          fetchData();
        } catch {
          Alert.alert('Lỗi', 'Gán công việc thất bại!');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.taskName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý công việc</Text>
          <Text style={styles.headerSub}>Tạo mới & phân công cho nhân viên</Text>
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
          placeholder="Tìm kiếm công việc..."
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
                <Text style={styles.taskName}>{item.taskName}</Text>
                <Text style={styles.statusBadge}>{item.status}</Text>
              </View>
              <Text style={styles.taskMeta}>
                Slot: {item.targetSlotNumber || 'N/A'} · Loại: {item.taskType}
              </Text>
              {item.description ? (
                <Text style={styles.taskDesc}>{item.description}</Text>
              ) : null}
              <View style={styles.taskFooter}>
                <Text style={styles.staffMeta}>
                  {item.assignedStaffName
                    ? `Phân công: ${item.assignedStaffName}`
                    : 'Chưa phân công'}
                </Text>
                <TouchableOpacity
                  style={styles.btnAssign}
                  onPress={() => handleOpenAssignModal(item)}
                >
                  <UserPlus size={14} color={colors.green[600]} />
                  <Text style={styles.btnAssignText}>
                    {item.assignedStaffName ? 'Gán lại' : 'Phân công'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Create/Assign Task */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCreateMode ? 'Tạo & Phân công công việc' : 'Gán nhân viên thực hiện'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {isCreateMode ? (
                <>
                  <Text style={styles.label}>Tên công việc *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: Tưới cây & Tỉa cành"
                    value={formData.taskName}
                    onChangeText={(t) => setFormData({ ...formData, taskName: t })}
                  />

                  <Text style={styles.label}>Mô tả công việc</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Chi tiết công việc..."
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
                </>
              ) : null}

              <Text style={styles.label}>Chọn Nhân viên thực hiện *</Text>
              {gardeners.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.radioItem,
                    formData.staffId === String(g.id) && styles.radioItemActive,
                  ]}
                  onPress={() => setFormData({ ...formData, staffId: String(g.id) })}
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.staffId === String(g.id) && styles.radioTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.btnPrimaryText}>
                  {isSubmitting ? 'Đang xử lý...' : isCreateMode ? 'Tạo mới' : 'Xác nhận gán'}
                </Text>
              </TouchableOpacity>
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
  headerTitle: { ...typography.heading2, color: colors.gray[900] },
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
  emptyText: {
    ...typography.body,
    color: colors.gray[400],
    marginTop: spacing.md,
  },
  btnCreateSub: {
    marginTop: spacing.lg,
  },
  btnCreateSubText: {
    ...typography.label,
    color: colors.green[600],
  },
  list: { padding: spacing.md },
  taskCard: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: { ...typography.heading2, color: colors.gray[900], flex: 1 },
  statusBadge: {
    ...typography.caption,
    color: colors.yellow[800],
    backgroundColor: colors.yellow[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  taskMeta: { ...typography.bodySmall, color: colors.gray[500], marginTop: 2 },
  taskDesc: { ...typography.bodySmall, color: colors.gray[700], marginTop: spacing.xs },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  staffMeta: { ...typography.caption, color: colors.gray[500] },
  btnAssign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnAssignText: { ...typography.caption, color: colors.green[600], fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.heading2, color: colors.gray[900] },
  modalBody: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.gray[700], marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.green[600] },
  chipText: { ...typography.bodySmall, color: colors.gray[700] },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  radioItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.xs,
  },
  radioItemActive: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  radioText: { ...typography.body, color: colors.gray[700] },
  radioTextActive: { color: colors.green[700], fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', gap: spacing.md },
  btnSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  btnSecondaryText: { ...typography.label, color: colors.gray[700] },
  btnPrimary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.green[600],
  },
  btnPrimaryText: { ...typography.label, color: '#fff' },
});
