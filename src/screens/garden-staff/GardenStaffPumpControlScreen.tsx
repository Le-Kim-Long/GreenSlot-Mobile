import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Droplets,
  Power,
  RefreshCw,
  AlertTriangle,
  Sprout,
  Clock,
  Layers,
  CheckCircle,
  MapPin,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { pumpApi, AssignedSlotPumps, PillarPumpInfo } from '../../api/pumpApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

export default function GardenStaffPumpControlScreen() {
  const navigation = useNavigation();
  const [assignedSlots, setAssignedSlots] = useState<AssignedSlotPumps[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const setBusy = (key: string, isBusy: boolean) => {
    setActionLoading(prev => ({ ...prev, [key]: isBusy }));
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await pumpApi.getMyAssignedPumps();
      setAssignedSlots(data || []);
    } catch {
      setAssignedSlots([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Tự động cập nhật trạng thái mỗi 8 giây
    const timer = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Bật/tắt bơm cho 1 trụ
  const handleTogglePillar = async (pillar: PillarPumpInfo) => {
    const key = `pillar_${pillar.pillarId}`;
    setBusy(key, true);
    const nextStatus = pillar.pumpStatus === 'ON' ? 'OFF' : 'ON';
    try {
      await pumpApi.setPillarPumpStatus(pillar.pillarId, nextStatus);
      // Optimistic update
      setAssignedSlots(prev =>
        prev.map(slot => ({
          ...slot,
          pillars: slot.pillars.map(p =>
            p.pillarId === pillar.pillarId
              ? {
                  ...p,
                  pumpStatus: nextStatus,
                  lastTriggerReason: nextStatus === 'ON' ? 'Kích hoạt thủ công' : 'Tắt thủ công',
                  lastTriggerTime: new Date().toISOString(),
                }
              : p
          ),
        }))
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể điều khiển máy bơm trụ.';
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(key, false);
    }
  };

  // Bật/tắt chế độ tự động cho 1 trụ
  const handleToggleAuto = async (pillar: PillarPumpInfo, value: boolean) => {
    const key = `auto_${pillar.pillarId}`;
    setBusy(key, true);
    try {
      await pumpApi.setPillarAutoMode(pillar.pillarId, value);
      setAssignedSlots(prev =>
        prev.map(slot => ({
          ...slot,
          pillars: slot.pillars.map(p =>
            p.pillarId === pillar.pillarId ? { ...p, autoMode: value } : p
          ),
        }))
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể cập nhật chế độ tự động.';
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(key, false);
    }
  };

  // Bật tưới tất cả trụ trong 1 ô
  const handleTriggerAllSlot = async (slotId: number, slotNumber: string) => {
    Alert.alert(
      'Tưới toàn bộ ô vườn',
      `Bạn có chắc chắn muốn kích hoạt máy bơm cho toàn bộ các trụ trong ô ${slotNumber}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bật tưới tất cả',
          onPress: async () => {
            const key = `slot_${slotId}`;
            setBusy(key, true);
            try {
              const res = await pumpApi.triggerSlotAllPumps(slotId);
              Alert.alert('Thành công', res?.message || `Đã kích hoạt máy bơm cho các trụ trong ô ${slotNumber}.`);
              await loadData(true);
            } catch (e: any) {
              const msg = e?.response?.data?.message || 'Không thể bật tưới toàn bộ ô.';
              Alert.alert('Lỗi', msg);
            } finally {
              setBusy(key, false);
            }
          },
        },
      ]
    );
  };

  // Tắt tất cả trụ trong 1 ô
  const handleTurnOffAllSlot = async (slotId: number, slotNumber: string) => {
    const key = `slot_${slotId}`;
    setBusy(key, true);
    try {
      const res = await pumpApi.turnOffSlotAllPumps(slotId);
      Alert.alert('Thành công', res?.message || `Đã tắt toàn bộ máy bơm trong ô ${slotNumber}.`);
      await loadData(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể tắt máy bơm.';
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(key, false);
    }
  };

  const displayedSlots = assignedSlots.filter(
    s => selectedSlotId === 'ALL' || s.slotId === selectedSlotId
  );

  const totalPillars = assignedSlots.reduce((acc, s) => acc + (s.pillars?.length || 0), 0);
  const runningPillars = assignedSlots.reduce(
    (acc, s) => acc + (s.pillars?.filter(p => p.pumpStatus === 'ON').length || 0),
    0
  );

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={colors.white} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Điều khiển máy bơm</Text>
          <Text style={styles.headerSub}>
            Hệ thống tưới tự động & kích hoạt thủ công theo trụ
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadData(false)}
          activeOpacity={0.8}
        >
          <RefreshCw size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Overview Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={[styles.statValue, { color: colors.green[700] }]}>{assignedSlots.length}</Text>
          <Text style={styles.statLabel}>Ô vườn phụ trách</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{totalPillars}</Text>
          <Text style={styles.statLabel}>Tổng số trụ tưới</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: runningPillars > 0 ? '#ecfdf5' : '#f8fafc' }]}>
          <Text style={[styles.statValue, { color: runningPillars > 0 ? '#059669' : colors.gray[600] }]}>
            {runningPillars}
          </Text>
          <Text style={styles.statLabel}>Đang bơm nước</Text>
        </View>
      </View>

      {/* Filter Slot horizontal scroll */}
      {assignedSlots.length > 1 && (
        <View style={styles.slotFilterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotFilterContent}>
            <TouchableOpacity
              style={[styles.slotChip, selectedSlotId === 'ALL' && styles.slotChipActive]}
              onPress={() => setSelectedSlotId('ALL')}
              activeOpacity={0.8}
            >
              <Text style={[styles.slotChipText, selectedSlotId === 'ALL' && styles.slotChipTextActive]}>
                Tất cả ô vườn ({assignedSlots.length})
              </Text>
            </TouchableOpacity>
            {assignedSlots.map(s => (
              <TouchableOpacity
                key={s.slotId}
                style={[styles.slotChip, selectedSlotId === s.slotId && styles.slotChipActive]}
                onPress={() => setSelectedSlotId(s.slotId)}
                activeOpacity={0.8}
              >
                <Text style={[styles.slotChipText, selectedSlotId === s.slotId && styles.slotChipTextActive]}>
                  Ô {s.slotNumber} ({s.pillars?.length || 0} trụ)
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content List */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
      >
        {assignedSlots.length === 0 ? (
          <EmptyState
            title="Chưa có ô vườn phụ trách"
            subtitle="Hiện tại tài khoản của bạn chưa được phân công phụ trách ô vườn hoặc thiết bị bơm nào."
          />
        ) : (
          displayedSlots.map(slot => {
            const isSlotBusy = actionLoading[`slot_${slot.slotId}`];
            return (
              <View key={slot.slotId} style={styles.slotSection}>
                {/* Slot Header Banner */}
                <View style={styles.slotHeaderBox}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MapPin size={16} color={colors.green[700]} />
                      <Text style={styles.slotTitle}>Ô vườn: {slot.slotNumber}</Text>
                    </View>
                    {slot.locationName && (
                      <Text style={styles.slotLocation}>Cơ sở: {slot.locationName}</Text>
                    )}
                  </View>

                  {/* Batch Actions */}
                  <View style={styles.batchActions}>
                    <TouchableOpacity
                      style={[styles.batchBtn, styles.batchBtnTrigger]}
                      onPress={() => handleTriggerAllSlot(slot.slotId, slot.slotNumber)}
                      disabled={isSlotBusy}
                      activeOpacity={0.8}
                    >
                      {isSlotBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Droplets size={13} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.batchBtnText}>Tưới tất cả</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.batchBtn, styles.batchBtnOff]}
                      onPress={() => handleTurnOffAllSlot(slot.slotId, slot.slotNumber)}
                      disabled={isSlotBusy}
                      activeOpacity={0.8}
                    >
                      <Power size={13} color="#374151" style={{ marginRight: 4 }} />
                      <Text style={styles.batchBtnOffText}>Tắt</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Pillars Grid */}
                <View style={styles.pillarsContainer}>
                  {(!slot.pillars || slot.pillars.length === 0) ? (
                    <Text style={styles.emptyPillars}>Ô vườn này chưa có trụ canh tác nào được gắn thiết bị.</Text>
                  ) : (
                    slot.pillars.map(pillar => {
                      const isPillarBusy = actionLoading[`pillar_${pillar.pillarId}`];
                      const isAutoBusy = actionLoading[`auto_${pillar.pillarId}`];
                      const isRunning = pillar.pumpStatus === 'ON';

                      return (
                        <View key={pillar.pillarId} style={[styles.pillarCard, isRunning && styles.pillarCardRunning]}>
                          {/* Top Row: Code & Status */}
                          <View style={styles.pillarTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pillarCode}>Trụ {pillar.pillarCode}</Text>
                              <Text style={styles.pillarInfo}>
                                {pillar.pillarTypeName || 'Trụ vừa'} · {pillar.capacityHoles || 24} hốc
                              </Text>
                            </View>

                            <View style={[styles.pumpStatusBadge, isRunning ? styles.pumpStatusRunning : styles.pumpStatusStopped]}>
                              <View style={[styles.pumpStatusDot, isRunning ? styles.dotRunning : styles.dotStopped]} />
                              <Text style={[styles.pumpStatusText, isRunning ? styles.textRunning : styles.textStopped]}>
                                {isRunning ? 'ĐANG BƠM' : 'ĐÃ TẮT'}
                              </Text>
                            </View>
                          </View>

                          {/* Tree Name */}
                          <View style={styles.treeRow}>
                            <Sprout size={14} color={colors.green[600]} />
                            <Text style={styles.treeName} numberOfLines={1}>
                              {pillar.treeName || 'Chưa gieo cây giống'}
                            </Text>
                          </View>

                          {/* Trigger info */}
                          {pillar.lastTriggerReason ? (
                            <View style={styles.lastTriggerRow}>
                              <Clock size={12} color={colors.gray[400]} />
                              <Text style={styles.lastTriggerText} numberOfLines={1}>
                                {pillar.lastTriggerReason}
                                {pillar.lastTriggerTime ? ` (${new Date(pillar.lastTriggerTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})` : ''}
                              </Text>
                            </View>
                          ) : null}

                          {/* Bottom Controls Row */}
                          <View style={styles.pillarControls}>
                            {/* Auto Mode Switch */}
                            <View style={styles.autoRow}>
                              <Text style={styles.autoLabel}>Tự động</Text>
                              <Switch
                                value={Boolean(pillar.autoMode)}
                                onValueChange={v => handleToggleAuto(pillar, v)}
                                disabled={isAutoBusy}
                                trackColor={{ false: '#d1d5db', true: colors.green[400] }}
                                thumbColor={pillar.autoMode ? colors.green[600] : '#f4f3f4'}
                              />
                            </View>

                            {/* Manual Pump Button */}
                            <TouchableOpacity
                              style={[
                                styles.pumpActionBtn,
                                isRunning ? styles.pumpActionBtnStop : styles.pumpActionBtnStart,
                              ]}
                              onPress={() => handleTogglePillar(pillar)}
                              disabled={isPillarBusy}
                              activeOpacity={0.8}
                            >
                              {isPillarBusy ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : isRunning ? (
                                <>
                                  <Power size={14} color="#fff" style={{ marginRight: 4 }} />
                                  <Text style={styles.pumpActionBtnText}>Tắt bơm</Text>
                                </>
                              ) : (
                                <>
                                  <Droplets size={14} color="#fff" style={{ marginRight: 4 }} />
                                  <Text style={styles.pumpActionBtnText}>Bật tưới</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.green[600],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  refreshBtn: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.gray[600], marginTop: 2, textAlign: 'center' },

  slotFilterWrapper: {
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  slotFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotChipActive: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  slotChipText: { fontSize: 12, color: colors.gray[600], fontWeight: '600' },
  slotChipTextActive: { color: colors.white, fontWeight: '700' },

  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  slotSection: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  slotHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  slotTitle: { fontSize: 14, fontWeight: '700', color: colors.gray[900] },
  slotLocation: { fontSize: 11, color: colors.gray[500], marginTop: 2 },
  batchActions: { flexDirection: 'row', gap: 6 },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  batchBtnTrigger: { backgroundColor: colors.green[600] },
  batchBtnOff: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  batchBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  batchBtnOffText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  pillarsContainer: { padding: 12, gap: 10 },
  emptyPillars: { fontSize: 12, color: colors.gray[400], textAlign: 'center', paddingVertical: 12 },

  pillarCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  pillarCardRunning: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  pillarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  pillarCode: { fontSize: 14, fontWeight: '700', color: colors.gray[900] },
  pillarInfo: { fontSize: 11, color: colors.gray[500], marginTop: 1 },

  pumpStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  pumpStatusRunning: { backgroundColor: '#dcfce7' },
  pumpStatusStopped: { backgroundColor: '#f3f4f6' },
  pumpStatusDot: { width: 6, height: 6, borderRadius: 3 },
  dotRunning: { backgroundColor: '#16a34a' },
  dotStopped: { backgroundColor: '#9ca3af' },
  pumpStatusText: { fontSize: 10, fontWeight: '700' },
  textRunning: { color: '#15803d' },
  textStopped: { color: '#6b7280' },

  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  treeName: { fontSize: 12, color: colors.gray[800], fontWeight: '600', flex: 1 },

  lastTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  lastTriggerText: { fontSize: 11, color: colors.gray[400], flex: 1 },

  pillarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoLabel: { fontSize: 12, fontWeight: '600', color: colors.gray[700] },
  pumpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pumpActionBtnStart: { backgroundColor: colors.green[600] },
  pumpActionBtnStop: { backgroundColor: '#dc2626' },
  pumpActionBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
