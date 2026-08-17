import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Thermometer, Droplets, Sun, Wind, Activity } from 'lucide-react-native';
import { iotApi, IOT_DEVICE_ID } from '../../api/iotApi';
import type { SensorReading } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

const SENSOR_ICONS: Record<string, any> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Droplets,
  PH: Activity,
  LIGHT: Sun,
  LIGHT_INTENSITY: Sun,
  CO2: Wind,
};

const SENSOR_NAMES: Record<string, string> = {
  TEMPERATURE: 'Nhiệt độ không khí',
  HUMIDITY: 'Độ ẩm không khí',
  SOIL_MOISTURE: 'Độ ẩm đất',
  PH: 'Độ pH của đất',
  LIGHT: 'Cường độ ánh sáng',
  LIGHT_INTENSITY: 'Cường độ ánh sáng',
  CO2: 'Nồng độ CO2',
};

const POLL_INTERVAL = 15000;

interface Props {
  route?: {
    params?: {
      slotId?: number;
      pillarId?: number;
      deviceId?: string;
    };
  };
}

export default function IoTMonitoringScreen({ route }: Props) {
  const params = route?.params;
  const slotId = params?.slotId;
  const pillarId = params?.pillarId;
  const deviceId = params?.deviceId;

  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      let data: SensorReading[] = [];
      // Nếu có các tham số lọc, dùng endpoint /iot/sensors/latest của API Docs §6.2
      if (slotId || pillarId || deviceId) {
        data = await iotApi.getLatestSensorReadings({
          slotId,
          pillarId,
          deviceId,
        });
      } else {
        // Fallback: dùng default device id
        data = await iotApi.getLatestReadings(IOT_DEVICE_ID);
      }
      setReadings(data);
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      console.warn('Failed to load IoT readings:', err);
      setReadings([]);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slotId, pillarId, deviceId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Đánh giá mức độ an toàn của chỉ số cảm biến
  const getStatusColor = (type: string, value: number) => {
    if (type === 'PH') {
      if (value < 5.5 || value > 7.5) return colors.red[600]; // Danger
      if (value < 6.0 || value > 7.0) return '#F59E0B'; // Warning (Gold)
      return colors.green[600]; // Good
    }
    if (type === 'TEMPERATURE') {
      if (value < 15 || value > 40) return colors.red[600];
      if (value < 20 || value > 35) return '#F59E0B';
      return colors.green[600];
    }
    if (type === 'SOIL_MOISTURE') {
      if (value < 30 || value > 90) return colors.red[600];
      if (value < 40 || value > 80) return '#F59E0B';
      return colors.green[600];
    }
    // Default
    return colors.green[600];
  };

  const getStatusText = (type: string, value: number) => {
    const color = getStatusColor(type, value);
    if (color === colors.red[600]) return 'Nguy hiểm';
    if (color === '#F59E0B') return 'Cảnh báo';
    return 'An toàn';
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
    >
      <View style={styles.headerInfo}>
        {slotId ? (
          <Text style={styles.deviceLabel}>Đang theo dõi Ô vườn ID: {slotId}</Text>
        ) : pillarId ? (
          <Text style={styles.deviceLabel}>Đang theo dõi Trụ ID: {pillarId}</Text>
        ) : (
          <Text style={styles.deviceLabel}>Thiết bị: {deviceId || IOT_DEVICE_ID}</Text>
        )}
        {lastUpdate ? <Text style={styles.updateTime}>Cập nhật lúc: {lastUpdate}</Text> : null}
      </View>

      {readings.length === 0 ? (
        <EmptyState title="Không có dữ liệu cảm biến" subtitle="Ô vườn này chưa có thiết bị IoT hoạt động hoặc dữ liệu chưa được cập nhật." />
      ) : (
        readings.map((r, idx) => {
          const Icon = SENSOR_ICONS[r.sensorType] || Activity;
          const friendlyName = SENSOR_NAMES[r.sensorType] || r.sensorDescription || r.sensorType;
          const statusColor = getStatusColor(r.sensorType, r.value);
          const statusText = getStatusText(r.sensorType, r.value);

          return (
            <Card key={r.id || idx} style={styles.sensorCard}>
              <View style={styles.sensorHeader}>
                <View style={styles.sensorIcon}>
                  <Icon size={22} color={colors.green[600]} />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorName}>{friendlyName}</Text>
                  <Text style={styles.sensorTime}>
                    {new Date(r.recordedAt).toLocaleString('vi-VN')}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.sensorValueBox}>
                  <Text style={[styles.sensorValue, { color: statusColor }]}>{r.value.toFixed(1)}</Text>
                  <Text style={styles.sensorUnit}>{r.unit}</Text>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerInfo: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deviceLabel: { ...typography.label, color: colors.gray[800], marginBottom: spacing.xs },
  updateTime: { ...typography.caption, color: colors.green[600] },
  sensorCard: { marginBottom: spacing.sm, padding: spacing.md },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sensorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorInfo: { flex: 1 },
  sensorName: { ...typography.label, color: colors.gray[900] },
  sensorTime: { ...typography.caption, color: colors.gray[400], marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  sensorValueBox: { alignItems: 'flex-end', justifyContent: 'center' },
  sensorValue: { ...typography.heading2 },
  sensorUnit: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
});
