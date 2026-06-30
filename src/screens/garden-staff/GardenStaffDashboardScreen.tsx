import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { taskApi } from '../../api/taskApi';
import type { GardeningTask } from '../../types/api';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';

import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function GardenStaffDashboardScreen() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<GardeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const updateStatus = async (taskId: number, status: string) => {
    try {
      await taskApi.updateTaskStatus(taskId, status);
      await load();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, {user?.name}</Text>
        <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.green[600],
  },
  greeting: { ...typography.heading3, color: colors.white },
  logout: {
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
});
