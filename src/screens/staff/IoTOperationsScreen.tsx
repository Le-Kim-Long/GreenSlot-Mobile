import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { iotApi } from '../../api/iotApi';
import { pumpApi, type PumpStatus } from '../../api/pumpApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/typography';

export default function IoTOperationsScreen() {
  const [pump, setPump] = useState<PumpStatus>('OFF');
  const [autoMode, setAutoMode] = useState(false);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [sensorType, setSensorType] = useState('TEMPERATURE');
  const [deviceId, setDeviceId] = useState('ESP32_GARDEN_01');
  const [min, setMin] = useState('0');
  const [max, setMax] = useState('100');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [pumpState, thresholdData] = await Promise.all([pumpApi.getStatus(), iotApi.getThresholds()]);
      setPump((pumpState?.status || pumpState || 'OFF') as PumpStatus);
      setThresholds(Array.isArray(thresholdData) ? thresholdData : thresholdData?.content || []);
    } catch { /* permission/empty state is handled below */ }
  }, []);
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  if (loading) return <LoadingScreen />;
  const togglePump = async () => { const next = pump === 'ON' ? 'OFF' : 'ON'; try { await pumpApi.setStatus(next); setPump(next); } catch { Alert.alert('Lỗi', 'Không thể điều khiển máy bơm.'); } };
  const addThreshold = async () => { try { await iotApi.createThreshold({ deviceId, sensorType, minValue: Number(min), maxValue: Number(max) }); await load(); Alert.alert('Thành công', 'Đã lưu ngưỡng cảm biến.'); } catch { Alert.alert('Lỗi', 'Không thể lưu ngưỡng cảm biến.'); } };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
    <Text style={styles.title}>Vận hành IoT</Text>
    <Card style={styles.card}><Text style={styles.heading}>Máy bơm</Text><View style={styles.row}><Text style={styles.value}>Trạng thái: {pump}</Text><Button title={pump === 'ON' ? 'Tắt bơm' : 'Bật bơm'} onPress={togglePump} /></View><View style={styles.row}><Text style={styles.value}>Chế độ tự động</Text><Switch value={autoMode} onValueChange={async value => { setAutoMode(value); try { await pumpApi.setAutoMode(value); } catch { setAutoMode(!value); } }} /></View></Card>
    <Card style={styles.card}><Text style={styles.heading}>Thêm ngưỡng cảm biến</Text><TextInput style={styles.input} value={deviceId} onChangeText={setDeviceId} placeholder="Device ID" /><TextInput style={styles.input} value={sensorType} onChangeText={setSensorType} placeholder="Sensor type" /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={min} onChangeText={setMin} keyboardType="decimal-pad" placeholder="Min" /><TextInput style={[styles.input, styles.half]} value={max} onChangeText={setMax} keyboardType="decimal-pad" placeholder="Max" /></View><Button title="Lưu ngưỡng" onPress={addThreshold} /></Card>
    <Text style={styles.heading}>Ngưỡng hiện tại</Text>{thresholds.map((item, index) => <Card key={item.id ?? index} style={styles.card}><Text style={styles.value}>{item.sensorType} · {item.deviceId}</Text><Text style={styles.meta}>{item.minValue} – {item.maxValue} {item.unit || ''}</Text><TouchableOpacity onPress={async () => { if (item.id) { await iotApi.deleteThreshold(item.id); await load(); } }}><Text style={styles.delete}>Xóa ngưỡng</Text></TouchableOpacity></Card>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg }, title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.lg }, heading: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md }, card: { marginBottom: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm }, value: { ...typography.body, color: colors.gray[800], flex: 1 }, meta: { ...typography.bodySmall, color: colors.gray[500], marginTop: spacing.xs }, input: { borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.gray[900], marginBottom: spacing.sm, flex: 1 }, half: { minWidth: 0 }, delete: { ...typography.caption, color: colors.red[600], marginTop: spacing.sm } });
