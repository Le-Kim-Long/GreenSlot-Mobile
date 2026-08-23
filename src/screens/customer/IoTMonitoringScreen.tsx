import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Thermometer, Droplets, Sun, Wind, Activity, MapPin, Sprout } from 'lucide-react-native';
import { iotApi, IOT_DEVICE_ID } from '../../api/iotApi';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory, SensorReadingResponseDTO } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

const SENSOR_ICONS: Record<string, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Droplets,
  LIGHT: Sun,
  CO2: Wind,
  PH: Activity,
};

const SENSOR_NAMES_VI: Record<string, string> = {
  TEMPERATURE: 'Nhiệt độ không khí',
  HUMIDITY: 'Độ ẩm không khí',
  SOIL_MOISTURE: 'Độ ẩm đất canh tác',
  LIGHT: 'Cường độ ánh sáng',
  CO2: 'Nồng độ khí CO2',
  PH: 'Độ pH dung dịch dinh dưỡng',
};

const POLL_INTERVAL = 15000;

interface RentedSlotOption {
  slotId: number;
  slotNumber: string;
  locationName?: string;
  treeName?: string;
  pillarCode?: string;
}

export default function IoTMonitoringScreen() {
  const [rentals, setRentals] = useState<RentedSlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<RentedSlotOption | null>(null);
  const [readings, setReadings] = useState<SensorReadingResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user's active rented slots
  const loadRentals = useCallback(async () => {
    try {
      const history = await bookingApi.getHistory();
      const active = history.filter(r => r.status === 'ACTIVE');
      const options: RentedSlotOption[] = [];
      active.forEach(r => {
        const slotId = r.slotId || r.id;
        options.push({
          slotId,
          slotNumber: r.slotNumber,
          locationName: r.locationName,
          treeName: r.treeName,
          pillarCode: r.pillarCode || (r.pillars?.[0]?.pillarCode),
        });
      });
      setRentals(options);
      if (options.length > 0 && !selectedSlot) {
        setSelectedSlot(options[0]);
      }
    } catch {
      setRentals([]);
    }
  }, [selectedSlot]);

  // Load sensors for selected slot or fallback device
  const loadReadings = useCallback(async () => {
    try {
      let data: SensorReadingResponseDTO[] = [];
      if (selectedSlot?.slotId) {
        data = await iotApi.getLatestBySlot(selectedSlot.slotId);
      }
      if (!data || data.length === 0) {
        data = await iotApi.getLatestReadings(IOT_DEVICE_ID);
      }
      setReadings(data || []);
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      setReadings([]);
    }
  }, [selectedSlot]);

  useEffect(() => {
    loadRentals().finally(() => setLoading(false));
  }, [loadRentals]);

  useEffect(() => {
    if (selectedSlot) {
      loadReadings();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(loadReadings, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedSlot, loadReadings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRentals();
    await loadReadings();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
    >
      {/* Slot / Pillar Selector */}
      {rentals.length > 0 && (
        <View style={styles.selectorWrapper}>
          <Text style={styles.sectionTitle}>Chọn ô vườn cần giám sát</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotList}>
            {rentals.map((item, index) => {
              const isSelected = selectedSlot?.slotId === item.slotId;
              return (
                <TouchableOpacity
                  key={`${item.slotId}-${index}`}
                  style={[styles.slotChip, isSelected && styles.slotChipActive]}
                  onPress={() => setSelectedSlot(item)}
                >
                  <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                    Ô {item.slotNumber} {item.pillarCode ? `· Trụ ${item.pillarCode}` : ''}
                  </Text>
                  {item.treeName && (
                    <Text style={[styles.slotChipTree, isSelected && styles.slotChipTreeActive]}>
                      🌱 {item.treeName}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View>
          <Text style={styles.deviceLabel}>
            {selectedSlot ? `Giám sát Ô ${selectedSlot.slotNumber}` : `Thiết bị: ${IOT_DEVICE_ID}`}
          </Text>
          {selectedSlot?.locationName && (
            <Text style={styles.locationSub}>📍 {selectedSlot.locationName}</Text>
          )}
        </View>
        {lastUpdate ? <Text style={styles.updateTime}>Cập nhật: {lastUpdate}</Text> : null}
      </View>

      {/* Sensor Readings List */}
      {readings.length === 0 ? (
        <EmptyState
          title="Không có dữ liệu cảm biến"
          subtitle="Hệ thống IoT đang thu thập thông số hoặc đang hiệu chuẩn cảm biến"
        />
      ) : (
        readings.map(r => {
          const Icon = SENSOR_ICONS[r.sensorType] || Thermometer;
          const sensorTitle = SENSOR_NAMES_VI[r.sensorType] || r.sensorDescription || r.sensorType;
          return (
            <Card key={r.id} style={styles.sensorCard}>
              <View style={styles.sensorHeader}>
                <View style={styles.sensorIcon}>
                  <Icon size={22} color={colors.green[600]} />
                </View>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorName}>{sensorTitle}</Text>
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
  selectorWrapper: { marginBottom: spacing.md },
  sectionTitle: {
    ...typography.caption,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: 'Inter_600SemiBold',
  },
  slotList: { gap: spacing.sm, paddingVertical: 4 },
  slotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.green[200],
  },
  slotChipActive: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[700],
  },
  slotChipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  slotChipTextActive: {
    color: colors.white,
  },
  slotChipTree: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.green[700],
    marginTop: 2,
  },
  slotChipTreeActive: {
    color: colors.green[100],
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.green[50],
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  deviceLabel: { ...typography.label, color: colors.green[800] },
  locationSub: { ...typography.caption, color: colors.gray[600], marginTop: 2 },
  updateTime: { ...typography.caption, color: colors.green[700], fontFamily: 'Inter_500Medium' },
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
