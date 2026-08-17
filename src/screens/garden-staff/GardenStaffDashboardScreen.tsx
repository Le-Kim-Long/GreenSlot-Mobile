import { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, RefreshControl, 
  Alert, TouchableOpacity, Image, Modal, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  CheckCircle, LogOut, ShieldAlert, ChevronRight, 
  Image as ImageIcon, X, AlertTriangle, Send 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GardenStaffStackParamList } from '../../navigation/types';
import { taskApi } from '../../api/taskApi';
import type { GardeningTaskResponseDTO } from '../../types/api';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';

import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function GardenStaffDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GardenStaffStackParamList>>();
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<GardeningTaskResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Submit Bằng chứng
  const [activeTask, setActiveTask] = useState<GardeningTaskResponseDTO | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await taskApi.getMyTasks();
      setTasks(data);
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const updateStatus = async (taskId: number, status: string, imageUrl?: string) => {
    try {
      await taskApi.updateTaskStatus(taskId, { status, evidenceImageUrl: imageUrl });
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể cập nhật trạng thái';
      Alert.alert('Lỗi', msg);
    }
  };

  const handleOpenCompleteModal = (task: GardeningTaskResponseDTO) => {
    setActiveTask(task);
    setEvidenceUrl(task.evidenceImageUrl || '');
  };

  const handleSubmitEvidence = async () => {
    if (!activeTask) return;
    if (!evidenceUrl.trim()) {
      Alert.alert('Lỗi', 'Bắt buộc nhập URL hình ảnh bằng chứng công việc!');
      return;
    }

    setIsSubmitting(true);
    try {
      await taskApi.updateTaskStatus(activeTask.id, {
        status: 'PENDING_APPROVAL',
        evidenceImageUrl: evidenceUrl.trim(),
      });
      Alert.alert('Thành công', 'Đã nộp bằng chứng công việc! Đang chờ Quản lý duyệt.');
      setActiveTask(null);
      setEvidenceUrl('');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Lỗi khi gửi bằng chứng';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, {user?.name || user?.fullName || 'Nhân viên'}</Text>
        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.8}>
          <LogOut size={16} color={colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.alertShortcut}
        onPress={() => navigation.navigate('GardenStaffAlert')}
        activeOpacity={0.8}
      >
        <View style={styles.alertIconBox}>
          <ShieldAlert size={22} color="#dc2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertShortcutTitle}>Báo cáo Sự cố IoT Alert</Text>
          <Text style={styles.alertShortcutSub}>Cập nhật kết quả xử lý khi thiết bị hoặc ô đất gặp cảnh báo</Text>
        </View>
        <ChevronRight size={20} color="#dc2626" />
      </TouchableOpacity>

      <FlatList
        data={tasks}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.green[600]} />}
        ListEmptyComponent={<EmptyState title="Không có nhiệm vụ" subtitle="Các nhiệm vụ mới sẽ hiển thị tại đây" />}
        renderItem={({ item }) => {
          const badge = statusToBadge(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.taskName}>#{item.id} {item.taskName}</Text>
                <Badge label={badge.label} variant={badge.variant} />
              </View>
              {item.targetSlotNumber ? (
                <Text style={styles.slot}>Ô vườn: {item.targetSlotNumber}</Text>
              ) : null}
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
              <Text style={styles.type}>Loại: {item.taskType}</Text>

              {/* Thông báo nếu bị từ chối */}
              {item.status === 'REJECTED' && item.rejectionReason ? (
                <View style={styles.rejectedBanner}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <Text style={styles.rejectedText}>Từ chối: {item.rejectionReason}</Text>
                </View>
              ) : null}

              {/* Hiển thị Ảnh Bằng Chứng nếu có */}
              {item.evidenceImageUrl ? (
                <View style={styles.evidenceContainer}>
                  <Text style={styles.evidenceLabel}>Ảnh bằng chứng đã gửi:</Text>
                  <Image 
                    source={{ uri: item.evidenceImageUrl }} 
                    style={styles.evidenceImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Actions Button */}
              {item.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnStart]} onPress={() => updateStatus(item.id, 'IN_PROGRESS')} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>Bắt đầu làm</Text>
                  </TouchableOpacity>
                </View>
              ) : (item.status === 'IN_PROGRESS' || item.status === 'REJECTED') ? (
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDone]} onPress={() => handleOpenCompleteModal(item)} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>
                      {item.status === 'REJECTED' ? 'Nộp lại bằng chứng' : 'Hoàn thành (Gửi ảnh)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : item.status === 'PENDING_APPROVAL' ? (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingText}>⏳ Đang chờ Quản lý duyệt hoàn thành</Text>
                </View>
              ) : item.status === 'COMPLETED' ? (
                <View style={styles.doneRow}>
                  <CheckCircle size={16} color={colors.green[600]} />
                  <Text style={styles.doneText}>Đã hoàn thành</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {/* Modal Nộp Bằng Chứng */}
      <Modal visible={!!activeTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nộp bằng chứng hoàn thành</Text>
              <TouchableOpacity onPress={() => setActiveTask(null)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSub}>Công việc: <Text style={{ fontWeight: '700' }}>{activeTask?.taskName}</Text></Text>
              <Text style={styles.inputLabel}>Nhập URL hình ảnh bằng chứng (Bắt buộc) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://..."
                value={evidenceUrl}
                onChangeText={setEvidenceUrl}
                autoCapitalize="none"
              />

              {evidenceUrl.trim() ? (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Xem trước ảnh:</Text>
                  <Image source={{ uri: evidenceUrl.trim() }} style={styles.previewImg} resizeMode="cover" />
                </View>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setActiveTask(null)} disabled={isSubmitting}>
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmitEvidence} disabled={isSubmitting || !evidenceUrl.trim()}>
                <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSubmitText}>{isSubmitting ? 'Đang gửi...' : 'Gửi duyệt'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  alertShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertShortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 2,
  },
  alertShortcutSub: {
    fontSize: 12,
    color: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.green[600],
  },
  greeting: { ...typography.heading3, color: colors.white },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  logoutText: { ...typography.button, color: colors.white, fontSize: 13 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  taskName: { ...typography.label, color: colors.gray[900], flex: 1, marginRight: spacing.sm, fontWeight: '700' },
  slot: { ...typography.bodySmall, color: colors.green[700], fontWeight: '600', marginBottom: spacing.xs },
  desc: { ...typography.body, color: colors.gray[600], marginBottom: spacing.xs },
  type: { ...typography.caption, color: colors.gray[400], marginBottom: spacing.sm },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  rejectedText: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  evidenceContainer: {
    marginTop: 8,
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  evidenceLabel: { fontSize: 11, fontWeight: '600', color: '#4b5563', marginBottom: 4 },
  evidenceImage: { width: '100%', height: 140, borderRadius: 6, backgroundColor: '#111827' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionBtnStart: { backgroundColor: colors.green[600] },
  actionBtnDone: { backgroundColor: '#7c3aed' },
  actionBtnText: { ...typography.button, color: colors.white, fontSize: 13, fontWeight: '700' },
  pendingRow: { marginTop: 6, padding: 8, backgroundColor: '#f5f3ff', borderRadius: 8, alignItems: 'center' },
  pendingText: { fontSize: 12, color: '#6d28d9', fontWeight: '600' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 6 },
  doneText: { ...typography.bodySmall, color: colors.green[600], fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalBody: { marginBottom: 16 },
  modalSub: { fontSize: 13, color: '#4b5563', marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#f9fafb' },
  previewBox: { marginTop: 12 },
  previewLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  previewImg: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#111827' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  btnCancelText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#7c3aed' },
  btnSubmitText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
