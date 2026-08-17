import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, LogOut, ShieldAlert, ChevronRight, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GardenStaffStackParamList } from '../../navigation/types';
import { taskApi } from '../../api/taskApi';
import type { GardeningTask } from '../../types/api';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ImagePickerButton } from '../../components/ui/ImagePickerButton';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function GardenStaffDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GardenStaffStackParamList>>();
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<GardeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Completion modal states
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

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

  const updateStatus = async (taskId: number, status: string, evidenceImageUrl?: string, notes?: string) => {
    if (status === 'COMPLETED' && (!evidenceImageUrl || !evidenceImageUrl.trim())) {
      setCompletingTaskId(taskId);
      setEvidenceUrl('');
      setCompletionNotes('');
      return;
    }

    try {
      await taskApi.updateTaskStatus(taskId, {
        status,
        evidenceImageUrl,
        note: notes,
      });
      await load();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completingTaskId) return;
    if (!evidenceUrl.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chụp hoặc chọn ảnh bằng chứng!');
      return;
    }

    setSubmittingCompletion(true);
    try {
      await taskApi.updateTaskStatus(completingTaskId, {
        status: 'COMPLETED',
        evidenceImageUrl: evidenceUrl.trim(),
        note: completionNotes.trim() || undefined,
      });
      setCompletingTaskId(null);
      Alert.alert('Thành công', 'Đã báo cáo hoàn thành công việc!');
      await load();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi kết quả hoàn thành công việc.');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, {user?.name}</Text>
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
                <Text style={styles.taskName}>{item.taskName}</Text>
                <Badge label={badge.label} variant={badge.variant} />
              </View>
              {item.targetSlotNumber ? (
                <Text style={styles.slot}>Ô vườn: {item.targetSlotNumber}</Text>
              ) : null}
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
              <Text style={styles.type}>{item.taskType}</Text>
              {item.status === 'PENDING' || item.status === 'IN_PROGRESS' ? (
                <View style={styles.actions}>
                  {item.status === 'PENDING' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnStart]} onPress={() => updateStatus(item.id, 'IN_PROGRESS')} activeOpacity={0.8}>
                      <Text style={styles.actionBtnText}>Bắt đầu</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'IN_PROGRESS' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDone]} onPress={() => updateStatus(item.id, 'COMPLETED')} activeOpacity={0.8}>
                      <Text style={styles.actionBtnText}>Hoàn thành</Text>
                    </TouchableOpacity>
                  )}
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

      {/* Completion Modal */}
      <Modal visible={completingTaskId !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Báo cáo Hoàn thành</Text>
              <TouchableOpacity onPress={() => setCompletingTaskId(null)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <ImagePickerButton
                label="Ảnh chụp kết quả (bắt buộc) *"
                onImageSelected={setEvidenceUrl}
                uploadFn={taskApi.uploadEvidenceImage}
              />

              <Text style={styles.fieldLabel}>Ghi chú hoàn thành</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Nhập chi tiết các công việc đã thực hiện..."
                placeholderTextColor={colors.gray[400]}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setCompletingTaskId(null)}
              >
                <Text style={styles.btnSecondaryText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, !evidenceUrl && styles.btnDisabled]}
                onPress={handleConfirmCompletion}
                disabled={submittingCompletion || !evidenceUrl}
              >
                <Text style={styles.btnPrimaryText}>
                  {submittingCompletion ? 'Đang gửi...' : 'Gửi hoàn thành'}
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
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  taskName: { ...typography.label, color: colors.gray[900], flex: 1, marginRight: spacing.sm },
  slot: { ...typography.bodySmall, color: colors.green[600], marginBottom: spacing.xs },
  desc: { ...typography.body, color: colors.gray[500], marginBottom: spacing.xs },
  type: { ...typography.caption, color: colors.gray[400], marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionBtnStart: { backgroundColor: colors.green[600] },
  actionBtnDone: { backgroundColor: colors.green[700] },
  actionBtnText: { ...typography.button, color: colors.white, fontSize: 13 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  doneText: { ...typography.bodySmall, color: colors.green[600] },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading3,
    color: colors.gray[900],
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySmall,
    color: colors.gray[700],
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 14,
    color: colors.gray[800],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: spacing.md,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.gray[300],
  },
  btnPrimaryText: {
    ...typography.button,
    color: '#fff',
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    ...typography.button,
    color: colors.gray[700],
  },
});
