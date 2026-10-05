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
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import {
  Thermometer,
  Droplets,
  Sun,
  Activity,
  MapPin,
  Sprout,
  TrendingUp,
  ArrowLeft,
  Clock,
  WifiOff,
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { iotApi } from '../../api/iotApi';
import { bookingApi } from '../../api/bookingApi';
import type { SensorReadingResponseDTO } from '../../types/api';
import type { CustomerStackParamList } from '../../navigation/types';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { spacing, radius } from '../../theme/typography';

const { width } = Dimensions.get('window');
const POLL_INTERVAL = 10000;
const HISTORY_LIMIT = 50;

export interface HistoryPoint {
  value: number;
  recordedAt: string;
  timeStr: string;
  dateStr: string;
  fullDateTimeStr: string;
}

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
  LIGHT: 'Cường độ ánh sáng',
  LIGHT_INTENSITY: 'Cường độ ánh sáng',
  CO2: 'Nồng độ CO2',
  PH: 'Độ pH đất',
};

const SENSOR_COLORS: Record<string, string> = {
  SOIL_MOISTURE: '#16A34A',
  PH: '#2563EB',
  LIGHT_INTENSITY: '#DC2626',
  LIGHT: '#DC2626',
  TEMPERATURE: '#F97316',
  HUMIDITY: '#06B6D4',
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

const computeYTicks = (sensorType: string, values: number[]) => {
  const t = sensorType.toUpperCase();
  const rawMax = values.length > 0 ? Math.max(...values) : 0;
  const rawMin = values.length > 0 ? Math.min(...values) : 0;

  if (t.includes('SOIL_MOISTURE') || t.includes('HUMIDITY')) {
    const max = rawMax > 80 ? 100 : 80;
    const step = max / 4;
    return [max, max - step, max - step * 2, max - step * 3, 0];
  }
  if (t.includes('PH')) {
    const max = rawMax > 12 ? 14 : 12;
    const step = max / 4;
    return [max, max - step, max - step * 2, max - step * 3, 0].map(v => Number(v.toFixed(1)));
  }
  if (t.includes('LIGHT')) {
    const max = Math.max(1800, Math.ceil((rawMax || 1800) / 450) * 450);
    const step = max / 4;
    return [max, max - step, max - step * 2, max - step * 3, 0].map(Math.round);
  }
  if (t.includes('TEMPERATURE')) {
    const max = Math.max(40, Math.ceil(rawMax / 10) * 10);
    const min = Math.min(0, Math.floor(rawMin / 10) * 10);
    const step = (max - min) / 4;
    return [max, max - step, max - step * 2, max - step * 3, min].map(Math.round);
  }

  // Generic fallback: 5 clean levels
  let min = Math.floor(rawMin);
  let max = Math.ceil(rawMax);
  if (min === max) {
    min = Math.max(0, min - 2);
    max = max + 2;
  }
  const step = (max - min) / 4;
  return [max, max - step, max - step * 2, max - step * 3, min].map(v => Number(v.toFixed(1)));
};

// ─────────────────────────────────────────────────────
// SVG INTERACTIVE LINE CHART (Displays Timestamps & Values)
// ─────────────────────────────────────────────────────
function SvgLineChart({
  data,
  color,
  unit,
  sensorType,
  cardWidth,
}: {
  data: HistoryPoint[];
  color: string;
  unit: string;
  sensorType: string;
  cardWidth: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>(data.length - 1);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setSelectedIndex(data.length - 1);
    if (scrollRef.current && data.length > 4) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [data.length]);

  if (data.length === 0) {
    return (
      <View style={styles.chartEmptyBox}>
        <Text style={styles.noDataText}>Chưa có dữ liệu đo đạc nào</Text>
      </View>
    );
  }

  const CHART_HEIGHT = 175;
  const PAD_TOP = 26;
  const PAD_BOTTOM = 34;
  const Y_AXIS_WIDTH = 42;
  const USABLE_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const availableChartW = Math.max(200, cardWidth - Y_AXIS_WIDTH - 24);

  const values = data.map(d => d.value);
  const yTicks = computeYTicks(sensorType, values);
  const maxVal = yTicks[0];
  const minVal = yTicks[yTicks.length - 1];
  const valRange = maxVal - minVal || 1;

  // Horizontal spacing per point
  const POINT_SPACING = Math.max(56, (availableChartW - 40) / Math.max(1, data.length - 1));
  const totalSvgWidth = Math.max(availableChartW, 40 + (data.length - 1) * POINT_SPACING);

  const points = data.map((d, i) => {
    const x = 20 + i * POINT_SPACING;
    const clampedVal = Math.min(Math.max(d.value, minVal), maxVal);
    const y = PAD_TOP + (1 - (clampedVal - minVal) / valRange) * USABLE_H;
    return { ...d, x, y, isSelected: i === selectedIndex };
  });

  const activePoint = points[selectedIndex] || points[points.length - 1];

  // SVG Line & Area path strings
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const baselineY = PAD_TOP + USABLE_H;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

  // Tooltip geometry
  const tooltipW = 96;
  const tooltipH = 38;
  const tooltipX = Math.max(4, Math.min(totalSvgWidth - tooltipW - 4, activePoint.x - tooltipW / 2));
  const tooltipY = activePoint.y - tooltipH - 8 < 4 ? activePoint.y + 10 : activePoint.y - tooltipH - 8;

  const gradientId = `grad-${sensorType.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  return (
    <View style={styles.chartWrapper}>
      {/* Chart Canvas Area */}
      <View style={styles.chartRow}>
        {/* Fixed Y-Axis column on left */}
        <View style={[styles.yAxisContainer, { height: CHART_HEIGHT, width: Y_AXIS_WIDTH }]}>
          {yTicks.map((tv, idx) => {
            const tickY = PAD_TOP + (1 - (tv - minVal) / valRange) * USABLE_H;
            return (
              <Text
                key={`ytick-${idx}`}
                style={[
                  styles.yAxisLabel,
                  { position: 'absolute', top: tickY - 7, right: 6 },
                ]}
                numberOfLines={1}
              >
                {tv}
              </Text>
            );
          })}
          {/* Vertical axis line */}
          <View style={[styles.yAxisBorder, { top: PAD_TOP, height: USABLE_H }]} />
        </View>

        {/* Scrollable Chart Body */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalSvgWidth }}
          style={styles.chartScrollView}
        >
          <Svg width={totalSvgWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid lines matching Y-ticks */}
            {yTicks.map((tv, idx) => {
              const tickY = PAD_TOP + (1 - (tv - minVal) / valRange) * USABLE_H;
              return (
                <Line
                  key={`grid-${idx}`}
                  x1={0}
                  y1={tickY}
                  x2={totalSvgWidth}
                  y2={tickY}
                  stroke="#F1F5F9"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* X-Axis baseline */}
            <Line
              x1={0}
              y1={baselineY}
              x2={totalSvgWidth}
              y2={baselineY}
              stroke="#CBD5E1"
              strokeWidth={1.5}
            />

            {/* Area gradient under curve */}
            <Path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Connecting curve line */}
            <Path
              d={linePath}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertical guide line on selected point */}
            <Line
              x1={activePoint.x}
              y1={PAD_TOP}
              x2={activePoint.x}
              y2={baselineY}
              stroke={color}
              strokeDasharray="3,3"
              strokeWidth={1.5}
              opacity={0.5}
            />

            {/* Data point dots and X-axis ticks */}
            {points.map((p, idx) => (
              <G key={`point-${idx}`}>
                {/* X-Axis tick line */}
                <Line
                  x1={p.x}
                  y1={baselineY}
                  x2={p.x}
                  y2={baselineY + 4}
                  stroke="#94A3B8"
                  strokeWidth={1}
                />

                {/* X-Axis timestamp label */}
                <SvgText
                  x={p.x}
                  y={baselineY + 16}
                  fontSize={9}
                  fill={p.isSelected ? '#0F172A' : '#64748B'}
                  fontWeight={p.isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {p.timeStr}
                </SvgText>

                {/* Point dot marker */}
                {p.isSelected ? (
                  <>
                    <Circle cx={p.x} cy={p.y} r={9} fill={color} opacity={0.25} />
                    <Circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
                  </>
                ) : (
                  <Circle cx={p.x} cy={p.y} r={3.5} fill="#FFFFFF" stroke={color} strokeWidth={2} />
                )}
              </G>
            ))}

            {/* Floating Tooltip Callout on active point */}
            <G>
              <Rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipW}
                height={tooltipH}
                rx={8}
                ry={8}
                fill="#0F172A"
                opacity={0.92}
              />
              <SvgText
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 14}
                fontSize={9}
                fill="#94A3B8"
                fontWeight="500"
                textAnchor="middle"
              >
                {activePoint.timeStr}
              </SvgText>
              <SvgText
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 28}
                fontSize={11.5}
                fill="#FFFFFF"
                fontWeight="bold"
                textAnchor="middle"
              >
                {activePoint.value} {unit}
              </SvgText>
            </G>
          </Svg>

          {/* Interactive touch targets over each data point column */}
          {points.map((p, idx) => (
            <TouchableOpacity
              key={`touch-${idx}`}
              style={{
                position: 'absolute',
                left: p.x - POINT_SPACING / 2,
                top: 0,
                width: POINT_SPACING,
                height: CHART_HEIGHT,
              }}
              onPress={() => setSelectedIndex(idx)}
              activeOpacity={0.6}
            />
          ))}
        </ScrollView>
      </View>

      {/* Selected Point Inspection Summary Strip */}
      <View style={styles.chartInspectRow}>
        <View style={styles.inspectBadge}>
          <Clock size={11} color="#475569" />
          <Text style={styles.inspectText}>
            Thời gian: <Text style={styles.inspectBold}>{activePoint.timeStr}</Text>
            {activePoint.dateStr ? ` (${activePoint.dateStr})` : ''}
          </Text>
        </View>

        <View style={[styles.inspectBadge, { backgroundColor: `${color}14`, borderColor: `${color}40` }]}>
          <Text style={[styles.inspectText, { color }]}>
            Số liệu: <Text style={[styles.inspectBold, { color }]}>{activePoint.value} {unit}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// SENSOR GAUGE CARD (with SVG Chart)
// ─────────────────────────────────────────────────────
function SensorGaugeCard({
  reading,
  historyPoints,
  isOnline,
}: {
  reading: SensorReadingResponseDTO;
  historyPoints: HistoryPoint[];
  isOnline: boolean;
}) {
  const Icon = SENSOR_ICONS[reading.sensorType] || Activity;
  const name = SENSOR_NAMES_VI[reading.sensorType] || reading.sensorDescription || reading.sensorType;
  const statusInfo = getSensorStatus(reading.sensorType, reading.value);
  const themeColor = SENSOR_COLORS[reading.sensorType] || '#16A34A';
  const maxVal = reading.sensorType.toUpperCase().includes('PH') ? 14 : 100;
  const progressPct = Math.min(Math.max((reading.value / maxVal) * 100, 0), 100);
  const chartW = width - spacing.md * 4;

  const readingTime = reading.recordedAt ? new Date(reading.recordedAt) : null;
  const formattedTime = readingTime && !isNaN(readingTime.getTime())
    ? readingTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <Card style={styles.gaugeCard}>
      {/* Header row */}
      <View style={styles.gaugeHeader}>
        <View style={[styles.gaugeIconBox, { backgroundColor: statusInfo.status === 'safe' ? '#F0FDF4' : '#FFFBEB' }]}>
          <Icon size={20} color={themeColor} />
        </View>
        <View style={styles.gaugeTitleBox}>
          <View style={styles.gaugeTitleRow}>
            <Text style={styles.gaugeName}>{name}</Text>
            {!isOnline && (
              <View style={styles.offlineSmallTag}>
                <Text style={styles.offlineSmallTagText}>Dữ liệu lưu</Text>
              </View>
            )}
          </View>
          <Text style={styles.gaugeTime}>
            {isOnline ? 'Cập nhật:' : 'Lần đo gần nhất:'} {formattedTime || 'Chưa xác định'}
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
          <TrendingUp size={13} color="#64748B" />
          <Text style={styles.chartLabel}>
            Biểu đồ diễn biến {historyPoints.length} lần đo ({reading.unit})
          </Text>
          {historyPoints.length > 4 && (
            <Text style={styles.scrollHintText}>← Vuốt ngang →</Text>
          )}
        </View>

        <SvgLineChart
          data={historyPoints}
          color={themeColor}
          unit={reading.unit}
          sensorType={reading.sensorType}
          cardWidth={chartW}
        />
      </View>
    </Card>
  );
}

// Hàm kiểm tra an toàn xem thiết bị có đang kết nối và có dữ liệu đo đạc mới (trong 5 phút) hay không
const checkIsActive = (latestReadings: any[], historyReadings: any[] = []) => {
  const now = Date.now();
  let maxTime = 0;
  const allRecords = [...(latestReadings || []), ...(historyReadings || [])];
  for (const r of allRecords) {
    if (!r) continue;
    const timeVal = (r as any).recordedAt || (r as any).createdAt || (r as any).timestamp || (r as any).time;
    if (timeVal) {
      const t = new Date(timeVal).getTime();
      if (!isNaN(t) && t > maxTime) {
        maxTime = t;
      }
    }
  }
  if (maxTime === 0) return { isActive: false, lastTime: '' };
  const isActive = Math.abs(now - maxTime) <= 5 * 60 * 1000;
  const lastTime = new Date(maxTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
  return { isActive, lastTime };
};

// ─────────────────────────────────────────────────────
// MAIN DETAIL SCREEN
// ─────────────────────────────────────────────────────
export default function IoTDetailScreen() {
  const route = useRoute<RouteProp<CustomerStackParamList, 'IoTDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const { slotId, pillarId, pillarCode: routePillarCode } = route.params;

  const [rental, setRental] = useState<any>(null);
  const resolvedPillarCodeRef = useRef<string | null>(null);
  const [readings, setReadings] = useState<SensorReadingResponseDTO[]>([]);
  const [historyData, setHistoryData] = useState<Record<string, HistoryPoint[]>>({});
  const [isOnline, setIsOnline] = useState(false);
  const [lastRecordedTime, setLastRecordedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load readings and history - use codeOverride or resolvedPillarCodeRef.current for specific pillar data
  const loadReadings = useCallback(async (codeOverride?: string) => {
    try {
      const codeToUse = codeOverride || routePillarCode || resolvedPillarCodeRef.current;
      const [latest, hist] = await Promise.allSettled(
        codeToUse
          ? [
            // Fetch by specific pillar code (deviceId) for accurate data (matching FE)
            iotApi.getLatest(codeToUse),
            iotApi.getHistory(codeToUse, HISTORY_LIMIT),
          ]
          : [
            iotApi.getLatestBySlot(slotId),
            iotApi.getHistoryBySlot(slotId, HISTORY_LIMIT),
          ]
      );

      const latestData: SensorReadingResponseDTO[] = latest.status === 'fulfilled' ? (latest.value || []) : [];
      const histData: SensorReadingResponseDTO[] = hist.status === 'fulfilled' ? (hist.value || []) : [];

      const { isActive, lastTime } = checkIsActive(latestData, histData);
      setIsOnline(isActive);
      setLastRecordedTime(lastTime);

      // Sort and group history by sensorType with rich timestamp metadata
      const trendMap: Record<string, HistoryPoint[]> = {};
      histData
        .slice()
        .filter(r => r && r.sensorType && typeof r.value === 'number')
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
        .forEach(r => {
          if (!trendMap[r.sensorType]) trendMap[r.sensorType] = [];
          const date = new Date(r.recordedAt);
          const valid = !isNaN(date.getTime());
          const timeStr = valid
            ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '';
          const dateStr = valid
            ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            : '';

          trendMap[r.sensorType].push({
            value: Number(r.value.toFixed(2)),
            recordedAt: r.recordedAt,
            timeStr,
            dateStr,
            fullDateTimeStr: `${timeStr} ${dateStr}`.trim(),
          });
        });

      // Construct effective readings: if device is offline and latestData is empty,
      // fallback to the most recent record of each sensorType from histData so cards and charts still render!
      const readingsMap = new Map<string, SensorReadingResponseDTO>();

      // 1. Populate from history (latest records take priority)
      histData
        .slice()
        .filter(r => r && r.sensorType && typeof r.value === 'number')
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .forEach(r => {
          if (!readingsMap.has(r.sensorType)) {
            readingsMap.set(r.sensorType, r);
          }
        });

      // 2. Overwrite with latestData if present
      latestData.forEach(r => {
        if (r && r.sensorType) {
          readingsMap.set(r.sensorType, r);
        }
      });

      const effectiveReadings = Array.from(readingsMap.values());

      setReadings(effectiveReadings);
      setHistoryData(trendMap);
    } catch {
      // silent
    }
  }, [slotId, routePillarCode]);

  const loadRentalInfo = useCallback(async () => {
    try {
      let active: any = null;
      try {
        const history = await bookingApi.getHistory();
        active = history.find(r => (r.slotId || r.id) == slotId && r.status === 'ACTIVE') || history.find(r => (r.slotId || r.id) == slotId); // eslint-disable-line eqeqeq
      } catch {
        // Staff or guest might not have customer booking history
      }

      if (active) {
        const cleanPillars = active.pillars?.filter((p: any) => p.pillarCode !== 'arduino-greenhouse-01') || [];

        // If a specific pillar was selected, show only that pillar's info
        const targetPillar = cleanPillars.find((p: any) =>
          (pillarId && p.id == pillarId) || // eslint-disable-line eqeqeq
          (routePillarCode && p.pillarCode?.trim().toLowerCase() === routePillarCode.trim().toLowerCase())
        );

        const displayPillarCode = targetPillar?.pillarCode ||
          routePillarCode ||
          (cleanPillars.length > 0 ? cleanPillars.map((p: any) => p.pillarCode).join(', ') : 'ESP32');

        const displayHoles = targetPillar?.capacityHoles ||
          (cleanPillars.reduce((sum: number, p: any) => sum + (p.capacityHoles || 0), 0) || 24);

        const displayTreeName = targetPillar?.treeName || active.treeName;

        setRental({
          slotId,
          slotNumber: active.slotNumber,
          locationName: active.locationName,
          treeName: displayTreeName,
          pillarCode: displayPillarCode,
          capacityHoles: displayHoles,
        });

        // Set the actual pillar code to use for sensor queries
        const actualCode = targetPillar?.pillarCode || routePillarCode || (cleanPillars.length === 1 ? cleanPillars[0].pillarCode : null);
        if (actualCode) {
          resolvedPillarCodeRef.current = actualCode;
          await loadReadings(actualCode);
        } else {
          await loadReadings();
        }
      } else {
        // Fallback for staff or when slot history is not accessible
        setRental({
          slotId,
          slotNumber: `${slotId || '---'}`,
          locationName: '',
          treeName: 'Cây trồng',
          pillarCode: routePillarCode || 'ESP32',
          capacityHoles: 24,
        });
        if (routePillarCode) {
          resolvedPillarCodeRef.current = routePillarCode;
          await loadReadings(routePillarCode);
        } else {
          await loadReadings();
        }
      }
    } catch (err) {
      console.log('Error loading rental details', err);
      await loadReadings(routePillarCode);
    }
  }, [slotId, pillarId, routePillarCode, loadReadings]);

  const initData = useCallback(async () => {
    setLoading(true);
    await loadRentalInfo();
    setLoading(false);
  }, [loadRentalInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadReadings(), POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadReadings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRentalInfo();
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
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Trạng thái:</Text>
                <View style={[styles.statusBadge, isOnline ? styles.statusBadgeOnline : styles.statusBadgeOffline]}>
                  <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
                  <Text style={[styles.statusBadgeText, isOnline ? styles.statusBadgeTextOnline : styles.statusBadgeTextOffline]}>
                    {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                  </Text>
                </View>
              </View>
              {rental?.locationName ? (
                <View style={[styles.detailInfoRow, { marginTop: 4 }]}>
                  <MapPin size={11} color='rgba(255,255,255,0.7)' />
                  <Text style={styles.detailLocText}>{rental.locationName}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Card>

      {/* Section Title */}
      <Text style={styles.sectionHeaderTitle}>Chỉ số thiết bị đo thực tế</Text>

      {/* Offline Alert Banner (Does NOT hide charts; informs user that charts display last measured data) */}
      {!isOnline && (
        <Card style={styles.offlineCard}>
          <View style={styles.offlineHeader}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineTitle}>Thiết bị đang ngoại tuyến</Text>
          </View>
          <Text style={styles.offlineDesc}>
            Trụ hiện chưa có tín hiệu cảm biến mới trong 5 phút qua. Dưới đây là toàn bộ số liệu và biểu đồ đo đạc được lưu lại trước khi thiết bị ngoại tuyến.
          </Text>
          {lastRecordedTime ? (
            <View style={styles.offlineLastTimeRow}>
              <Text style={styles.offlineLastTimeLabel}>Lần đo gần nhất:</Text>
              <Text style={styles.offlineLastTimeValue}>{lastRecordedTime}</Text>
            </View>
          ) : null}
        </Card>
      )}

      {/* Sensor gauge cards with interactive charts */}
      {readings.length === 0 ? (
        <Card style={styles.noDataCard}>
          <Text style={styles.noDataText}>Chưa nhận được tín hiệu cảm biến từ trụ này.</Text>
        </Card>
      ) : (
        readings.map(r => (
          <SensorGaugeCard
            key={r.id || r.sensorType}
            reading={r}
            historyPoints={historyData[r.sensorType] || (r.value != null ? [{
              value: r.value,
              recordedAt: r.recordedAt,
              timeStr: r.recordedAt ? new Date(r.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
              dateStr: r.recordedAt ? new Date(r.recordedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '',
              fullDateTimeStr: r.recordedAt ? new Date(r.recordedAt).toLocaleString('vi-VN') : '',
            }] : [])}
            isOnline={isOnline}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusBadgeOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  statusBadgeOffline: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOnline: {
    backgroundColor: '#86EFAC',
  },
  statusDotOffline: {
    backgroundColor: '#CBD5E1',
  },
  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  statusBadgeTextOnline: {
    color: '#F0FDF4',
  },
  statusBadgeTextOffline: {
    color: '#E2E8F0',
  },
  offlineCard: {
    padding: spacing.md,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  offlineTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#92400E',
  },
  offlineDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#B45309',
    lineHeight: 18,
  },
  offlineLastTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  offlineLastTimeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#92400E',
  },
  offlineLastTimeValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#78350F',
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
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.sm,
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
  gaugeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gaugeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  offlineSmallTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineSmallTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: '#B45309',
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
    fontSize: 22,
    letterSpacing: -0.5,
  },
  gaugeUnit: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#94A3B8',
  },
  progressRow: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
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
    marginBottom: 8,
  },
  chartLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  scrollHintText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#94A3B8',
  },
  chartWrapper: {
    marginTop: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFCFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  yAxisContainer: {
    position: 'relative',
    backgroundColor: '#FAFCFF',
    zIndex: 10,
  },
  yAxisLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: '#94A3B8',
  },
  yAxisBorder: {
    position: 'absolute',
    right: 0,
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  chartScrollView: {
    flex: 1,
  },
  chartInspectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  inspectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  inspectText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#475569',
  },
  inspectBold: {
    fontFamily: 'Inter_700Bold',
    color: '#0F172A',
  },
  chartTip: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    paddingLeft: 2,
  },
  chartEmptyBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
});
