import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Thermometer, Droplets, Sun, Wind } from 'lucide-react-native';
import { iotApi, IOT_DEVICE_ID } from '../../api/iotApi';
import type { SensorReading } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

const SENSOR_ICONS: Record<string, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  LIGHT: Sun,
  CO2: Wind,
};

const POLL_INTERVAL = 15000;

export default function IoTMonitoringScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const data = await iotApi.getLatestReadings(IOT_DEVICE_ID);
      setReadings(data);
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      setReadings([]);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
    >
      <Text style={styles.deviceLabel}>Thiết bị: {IOT_DEVICE_ID}</Text>
      {lastUpdate ? <Text style={styles.updateTime}>Cập nhật: {lastUpdate}</Text> : null}

      {readings.length === 0 ? (
        <EmptyState title="Không có dữ liệu cảm biến" subtitle="Kiểm tra kết nối IoT hoặc thử lại sau" />
      ) : (
        readings.map(r => {
          const Icon = SENSOR_ICONS[r.sensorType] || Thermometer;
          return (
            <Card key={r.id} style={styles.sensorCard}>
              <View style={styles.sensorHeader}>
                <View style={styles.sensorIcon}>
                  <Icon size={22} color={colors.green[600]} />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorName}>{r.sensorDescription || r.sensorType}</Text>
                  <Text style={styles.sensorTime}>
                    {new Date(r.recordedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.sensorValueBox}>
                  <Text style={styles.sensorValue}>{r.value.toFixed(1)}</Text>
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
  deviceLabel: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.xs },
  updateTime: { ...typography.caption, color: colors.green[600], marginBottom: spacing.lg },
  sensorCard: { marginBottom: spacing.sm },
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
  sensorTime: { ...typography.caption, color: colors.gray[400] },
  sensorValueBox: { alignItems: 'flex-end' },
  sensorValue: { ...typography.heading2, color: colors.green[600] },
  sensorUnit: { ...typography.caption, color: colors.gray[500] },
});
