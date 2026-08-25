import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from 'react-native';
import {
  Thermometer,
  Droplets,
  Sun,
  Activity,
  MapPin,
  Sprout,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { iotApi } from '../../api/iotApi';
import { bookingApi } from '../../api/bookingApi';
import type { SensorReadingResponseDTO } from '../../types/api';
import type { CustomerStackParamList } from '../../navigation/types';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { spacing } from '../../theme/typography';

const { width } = Dimensions.get('window');
const POLL_INTERVAL = 10000;
const HISTORY_LIMIT = 20;

const SENSOR_ICONS: Record<string, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Droplets,
  LIGHT: Sun,
  LIGHT_INTENSITY: Sun,
  CO2: Activity,
  PH: Activity,
};

const SENSOR_NAMES_VI: Record<string, string> = {
  TEMPERATURE: 'Nhiệt độ không khí',
  HUMIDITY: 'Độ ẩm không khí',
  SOIL_MOISTURE: 'Độ ẩm đất',
  LIGHT: 'Ánh sáng',
  LIGHT_INTENSITY: 'Ánh sáng',
  CO2: 'Nồng độ CO2',
  PH: 'Độ pH',
};

const SENSOR_COLORS: Record<string, string> = {
  SOIL_MOISTURE: '#3B82F6',
  PH: '#8B5CF6',
  TEMPERATURE: '#EF4444',
  HUMIDITY: '#10B981',
  LIGHT: '#F59E0B',
  LIGHT_INTENSITY: '#F59E0B',
  CO2: '#6B7280',
};

const getSensorStatus = (type: string, val: number) => {
  const t = type.toUpperCase();
  if (t.includes('SOIL_MOISTURE')) {
    if (val < 40) return { status: 'warning', color: '#F59E0B', text: 'Đất khô, cần tưới' };
    if (val > 85) return { status: 'warning', color: '#3B82F6', text: 'Đất quá ẩm' };
    return { status: 'safe', color: '#16A34A', text: 'Độ ẩm lý tưởng' };
  }
  if (t.includes('TEMPERATURE')) {
    if (val < 16) return { status: 'warning', color: '#3B82F6', text: 'Thời tiết lạnh' };
    if (val > 36) return { status: 'danger', color: '#EF4444', text: 'Quá nóng' };
    return { status: 'safe', color: '#16A34A', text: 'Nhiệt độ tốt' };
  }
  if (t.includes('PH')) {
    if (val < 5.5) return { status: 'danger', color: '#EF4444', text: 'Axit cao' };
    if (val > 7.2) return { status: 'danger', color: '#EF4444', text: 'Kiềm cao' };
    return { status: 'safe', color: '#16A34A', text: 'pH hoàn hảo' };
  }
  if (t.includes('HUMIDITY')) {
    if (val < 50) return { status: 'warning', color: '#F59E0B', text: 'Không khí khô' };
    return { status: 'safe', color: '#16A34A', text: 'Độ ẩm tốt' };
  }
  return { status: 'safe', color: '#16A34A', text: 'Bình thường' };
};

// ─────────────────────────────────────────────────────
// SVG GRADIENT LINE CHART (Smooth and Continuous)
// ─────────────────────────────────────────────────────
function SvgLineChart({
  data,
  color,
  height = 90,
  chartWidth,
}: {
  data: number[];
  color: string;
  height?: number;
  chartWidth: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Layout boundaries
  const padH = 12;
  const padTop = 15;
  const padBottom = 15;
  const usableW = chartWidth - padH * 2;
  const usableH = height - padTop - padBottom;

  // Compute coordinate points
  const points = data.map((v, i) => {
    const x = padH + (i / (data.length - 1)) * usableW;
    const y = padTop + (1 - (v - min) / range) * usableH;
    return { x, y, value: v };
  });

  // Calculate segments connecting the dots
  const segments = points.slice(0, -1).map((p, i) => {
    const next = points[i + 1];
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return { x: p.x, y: p.y, len, angle, yMax: Math.max(p.y, next.y) };
  });

  return (
    <View style={{ height, width: chartWidth, marginTop: 8, position: 'relative', overflow: 'hidden' }}>
      {/* Horizontal guide lines */}
      <View style={{ position: 'absolute', left: padH, right: padH, top: padTop, height: 1, backgroundColor: '#F1F5F9' }} />
      <View style={{ position: 'absolute', left: padH, right: padH, top: padTop + usableH / 2, height: 1, backgroundColor: '#F1F5F9' }} />
      <View style={{ position: 'absolute', left: padH, right: padH, top: padTop + usableH, height: 1.5, backgroundColor: '#E2E8F0' }} />

      {/* Area Gradient fill effect (rendered as thin colored columns under each segment zone to look like continuous area) */}
      {points.map((p, i) => {
        if (i === points.length - 1) return null;
        const next = points[i + 1];
        const segWidth = next.x - p.x;
        const midY = (p.y + next.y) / 2;
        const colHeight = height - midY;
        
        return (
          <View
            key={`fill-${i}`}
            style={{
              position: 'absolute',
              left: p.x,
              top: midY,
              width: segWidth,
              height: colHeight,
              backgroundColor: color,
              opacity: 0.1,
            }}
          />
        );
      })}

      {/* Clean continuous connecting lines */}
      {segments.map((seg, i) => (
        <View
          key={`line-${i}`}
          style={{
            position: 'absolute',
            left: seg.x,
            top: seg.y,
            width: seg.len,
            height: 2.5,
            backgroundColor: color,
            transform: [
              { translateX: 0 },
              { translateY: 0 },
              { rotate: `${seg.angle}deg` }
            ],
            transformOrigin: 'left center',
            borderRadius: 1,
          }}
        />
      ))}

      {/* Interactive Dot Markers */}
      {points.map((p, i) => (
        <View
          key={`dot-${i}`}
          style={{
            position: 'absolute',
            left: p.x - 4,
            top: p.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === points.length - 1 ? color : '#fff',
            borderWidth: 2,
            borderColor: color,
            zIndex: 10,
          }}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────
// SENSOR GAUGE CARD (with SVG Chart)
// ─────────────────────────────────────────────────────
function SensorGaugeCard({
  reading,
  trendValues,
}: {
  reading: SensorReadingResponseDTO;
  trendValues: number[];
}) {
  const Icon = SENSOR_ICONS[reading.sensorType] || Activity;
  const name = SENSOR_NAMES_VI[reading.sensorType] || reading.sensorDescription || reading.sensorType;
  const statusInfo = getSensorStatus(reading.sensorType, reading.value);
  const themeColor = SENSOR_COLORS[reading.sensorType] || '#16A34A';
  const maxVal = reading.sensorType.toUpperCase().includes('PH') ? 14 : 100;
  const progressPct = Math.min(Math.max((reading.value / maxVal) * 100, 0), 100);
  const chartW = width - spacing.md * 4;

  return (
    <Card style={styles.gaugeCard}>
      {/* Header row */}
      <View style={styles.gaugeHeader}>
        <View style={[styles.gaugeIconBox, { backgroundColor: statusInfo.status === 'safe' ? '#F0FDF4' : '#FFFBEB' }]}>
          <Icon size={20} color={themeColor} />
        </View>
        <View style={styles.gaugeTitleBox}>
          <Text style={styles.gaugeName}>{name}</Text>
          <Text style={styles.gaugeTime}>
            Cập nhật: {new Date(reading.recordedAt).toLocaleTimeString('vi-VN')}
          </Text>
        </View>
        <View style={styles.gaugeValueBox}>
          <Text style={[styles.gaugeValue, { color: themeColor }]}>
            {reading.value.toFixed(reading.sensorType.toUpperCase().includes('PH') ? 2 : 1)}
          </Text>
          <Text style={styles.gaugeUnit}>{reading.unit}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: themeColor }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          <Text style={styles.maxLabel}>Max: {maxVal}{reading.unit}</Text>
        </View>
      </View>

      {/* Trend chart using SVG */}
      <View style={styles.chartSection}>
        <View style={styles.chartTitleRow}>
          <TrendingUp size={12} color='#94A3B8' />
          <Text style={styles.chartLabel}>
            Diễn biến {trendValues.length} lần đo gần nhất
          </Text>
        </View>
        {trendValues.length >= 2 ? (
          <SvgLineChart data={trendValues} color={themeColor} chartWidth={chartW} />
        ) : (
          <Text style={styles.noDataText}>Chưa đủ dữ liệu biểu đồ</Text>
        )}
      </View>
    </Card>
  );
}

// ─────────────────────────────────────────────────────
// MAIN DETAIL SCREEN
// ─────────────────────────────────────────────────────
export default function IoTDetailScreen() {
  const route = useRoute<RouteProp<CustomerStackParamList, 'IoTDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const { slotId } = route.params;

  const [rental, setRental] = useState<any>(null);
  const [readings, setReadings] = useState<SensorReadingResponseDTO[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load rental detail from history
  const loadRentalInfo = useCallback(async () => {
    try {
      const history = await bookingApi.getHistory();
      const active = history.find(r => (r.slotId || r.id) === slotId);
      if (active) {
        const cleanPillars = active.pillars?.filter((p: any) => p.pillarCode !== 'arduino-greenhouse-01') || [];
        const totalHoles = cleanPillars.reduce((sum: number, p: any) => sum + (p.capacityHoles || 0), 0) || 24;
        
        let displayPillarCode = active.pillarCode || '';
        if (displayPillarCode) {
          displayPillarCode = displayPillarCode
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s !== 'arduino-greenhouse-01')
            .join(', ');
        }
        if (!displayPillarCode && cleanPillars.length > 0) {
          displayPillarCode = cleanPillars.map((p: any) => p.pillarCode).join(', ');
        }

        setRental({
          slotId,
          slotNumber: active.slotNumber,
          locationName: active.locationName,
          treeName: active.treeName,
          pillarCode: displayPillarCode || 'ESP32',
          capacityHoles: totalHoles,
        });
      }
    } catch (err) {
      console.log('Error loading rental details', err);
    }
  }, [slotId]);

  // Load readings and history
  const loadReadings = useCallback(async () => {
    try {
      const [latest, hist] = await Promise.allSettled([
        iotApi.getLatestBySlot(slotId),
        iotApi.getHistoryBySlot(slotId, HISTORY_LIMIT),
      ]);

      const latestData = latest.status === 'fulfilled' ? (latest.value || []) : [];
      const histData = hist.status === 'fulfilled' ? (hist.value || []) : [];

      // Sort and group history
      const trendMap: Record<string, number[]> = {};
      histData
        .slice()
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
        .forEach(r => {
          if (!trendMap[r.sensorType]) trendMap[r.sensorType] = [];
          trendMap[r.sensorType].push(r.value);
        });

      setReadings(latestData);
      setHistoryData(trendMap);
    } catch {
      // silent
    }
  }, [slotId]);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadRentalInfo(), loadReadings()]);
    setLoading(false);
  }, [loadRentalInfo, loadReadings]);

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadReadings, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadReadings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRentalInfo(), loadReadings()]);
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor='#16A34A' />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Back button and title */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ArrowLeft size={20} color='#1E293B' />
        <Text style={styles.backButtonText}>Quay lại danh sách</Text>
      </TouchableOpacity>

      {/* Main info badge card */}
      <Card style={styles.infoBadge}>
        <View style={styles.infoBadgeRow}>
          <View style={styles.infoBadgeIcon}>
            <Sprout size={24} color='#fff' />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBadgeTitle}>
              Mảnh vườn {rental?.slotNumber}
            </Text>
            <View style={styles.detailInfoBlock}>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Mã trụ:</Text>
                <Text style={styles.detailInfoValue}>{rental?.pillarCode}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Giống cây:</Text>
                <Text style={styles.detailInfoValue}>{rental?.treeName || 'Chưa trồng'}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Số hốc:</Text>
                <Text style={styles.detailInfoValue}>{rental?.capacityHoles} hốc</Text>
              </View>
              {rental?.locationName && (
                <View style={[styles.detailInfoRow, { marginTop: 4 }]}>
                  <MapPin size={11} color='rgba(255,255,255,0.7)' />
                  <Text style={styles.detailLocText}>{rental.locationName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Card>

      {/* Section Title */}
      <Text style={styles.sectionHeaderTitle}>Chỉ số thiết bị đo thực tế</Text>

      {/* Sensor gauge cards */}
      {readings.length === 0 ? (
        <Card style={styles.noDataCard}>
          <Text style={styles.noDataText}>⚠️ Chưa nhận được tín hiệu cảm biến từ trụ này.</Text>
        </Card>
      ) : (
        readings.map(r => (
          <SensorGaugeCard
            key={r.id || r.sensorType}
            reading={r}
            trendValues={historyData[r.sensorType] || [r.value]}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  backButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1E293B',
  },
  infoBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 0,
  },
  infoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  infoBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBadgeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  infoBadgeSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  infoBadgeTree: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#D1FAE5',
    marginTop: 6,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  detailInfoBlock: {
    marginTop: 8,
    gap: 4,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailInfoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    minWidth: 70,
  },
  detailInfoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  detailLocText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  sectionHeaderTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: spacing.sm,
    paddingLeft: 2,
  },
  noDataCard: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  gaugeCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  gaugeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTitleBox: {
    flex: 1,
  },
  gaugeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  gaugeTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  gaugeValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  gaugeValue: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  gaugeUnit: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#94A3B8',
  },
  progressRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  } as ViewStyle,
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  maxLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#94A3B8',
  },
  chartSection: {
    paddingTop: spacing.xs,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chartLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
});
