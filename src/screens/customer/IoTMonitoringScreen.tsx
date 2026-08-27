import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Cpu,
  MapPin,
  ChevronDown,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { bookingApi } from '../../api/bookingApi';
import type { CustomerStackParamList } from '../../navigation/types';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { spacing } from '../../theme/typography';

const POLL_INTERVAL = 10000;

interface RentedSlotOption {
  slotId: number;
  slotNumber: string;
  locationName?: string;
  treeName?: string;
  pillarCode?: string;
  pillarId?: number;
  pillarType?: string;
  capacityHoles?: number;
}

// ─────────────────────────────────────────────────────
// SIMPLIFIED PILLAR CARD (Shows basic info only)
// ─────────────────────────────────────────────────────
function PillarSummaryCard({
  rental,
  onViewDetail,
}: {
  rental: RentedSlotOption;
  onViewDetail: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={onViewDetail}
      activeOpacity={0.85}
    >
      {/* Header row: Online dot + Detail button */}
      <View style={styles.summaryCardHeader}>
        <View style={styles.summaryCardLeft}>
          <View style={styles.pillarTitleRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.pillarCodeText}>Trụ {rental.pillarCode || 'ESP32'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={onViewDetail}
          activeOpacity={0.8}
        >
          <TrendingUp size={13} color='#16A34A' />
          <Text style={styles.detailBtnText}>Biểu đồ</Text>
        </TouchableOpacity>
      </View>

      {/* Info rows - each on its own line */}
      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ô vườn:</Text>
          <View style={styles.slotPill}>
            <Text style={styles.slotPillText}>Ô {rental.slotNumber}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Giống cây:</Text>
          <Text style={styles.infoValue}>{rental.treeName || 'Chưa trồng'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Số hốc:</Text>
          <Text style={styles.infoValue}>{rental.capacityHoles || 24} hốc</Text>
        </View>
        {rental.locationName && (
          <View style={styles.infoRow}>
            <MapPin size={11} color='#94A3B8' />
            <Text style={styles.locText}>{rental.locationName}</Text>
          </View>
        )}
      </View>

      <View style={styles.onlineRow}>
        <CheckCircle2 size={12} color='#16A34A' />
        <Text style={styles.onlineText}>Online</Text>
        <ChevronRight size={14} color='#94A3B8' style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────
// MAIN SCREEN (List view with Dropdown Filter)
// ─────────────────────────────────────────────────────
export default function IoTMonitoringScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();

  const [rentals, setRentals] = useState<RentedSlotOption[]>([]);
  const [filterSlotId, setFilterSlotId] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState<{ x: number; y: number; width: number } | null>(null);
  const triggerRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load active rentals (expand pillars list)
  const loadRentals = useCallback(async () => {
    try {
      const history = await bookingApi.getHistory();
      const active = history.filter(r => r.status === 'ACTIVE');
      const options: RentedSlotOption[] = [];
      
      active.forEach(r => {
        const slotId = r.slotId || r.id;
        const pillarsList = r.pillars || [];
        
        if (pillarsList.length > 0) {
          // Add each pillar as a separate option, filtering out arduino-greenhouse-01
          pillarsList.forEach(pillar => {
            if (pillar.pillarCode && pillar.pillarCode !== 'arduino-greenhouse-01') {
              options.push({
                slotId,
                slotNumber: r.slotNumber,
                locationName: r.locationName,
                treeName: pillar.treeName || r.treeName,
                pillarCode: pillar.pillarCode,
                pillarId: pillar.id,
                pillarType: pillar.pillarType || 'Trụ Canh Tác',
                capacityHoles: pillar.capacityHoles || 24,
              });
            }
          });
        } else if (r.pillarCode && r.pillarCode !== 'arduino-greenhouse-01') {
          // Fallback if pillars array is empty but pillarCode exists and is not arduino
          options.push({
            slotId,
            slotNumber: r.slotNumber,
            locationName: r.locationName,
            treeName: r.treeName,
            pillarCode: r.pillarCode,
            pillarType: 'Trụ Canh Tác',
            capacityHoles: 24,
          });
        }
      });
      setRentals(options);
    } catch {
      setRentals([]);
    }
  }, []);

  // Poll update timestamp simulation
  const checkStatus = useCallback(() => {
    setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  useEffect(() => {
    loadRentals().finally(() => setLoading(false));
  }, [loadRentals]);

  useEffect(() => {
    checkStatus();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [checkStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRentals();
    checkStatus();
    setRefreshing(false);
  };

  // Filter logic - Filter by matching slotId & pillarCode
  const filteredRentals = filterSlotId === 'all' 
    ? rentals 
    : rentals.filter(r => `${r.slotId}-${r.pillarCode}` === filterSlotId);

  const getSelectedLabel = () => {
    if (filterSlotId === 'all') return 'Tất cả các trụ (Bảng tổng hợp)';
    const selected = rentals.find(r => `${r.slotId}-${r.pillarCode}` === filterSlotId);
    if (!selected) return 'Tất cả các trụ (Bảng tổng hợp)';
    return `Trụ ${selected.pillarCode} - Ô ${selected.slotNumber}`;
  };

  if (loading) return <LoadingScreen />;
  if (rentals.length === 0) {
    return (
      <EmptyState
        title='Chưa có ô vườn đang thuê'
        subtitle='Bạn cần ít nhất một hợp đồng thuê đang hoạt động để giám sát IoT.'
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── HEADER CONTROL PANEL ── */}
      <View style={[styles.controlPanel, { zIndex: 100 }]}>
        <View style={styles.controlTop}>
          <View style={styles.controlIconBox}>
            <Cpu size={22} color='#16A34A' />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.controlTitle}>Giám Sát Trụ IoT</Text>
            <Text style={styles.controlSubtitle}>
              Chọn trụ bên dưới để kiểm tra chỉ số chi tiết và biểu đồ đo đạc
            </Text>
          </View>
        </View>

        {/* Label selector */}
        <Text style={styles.selectorLabel}>THIẾT BỊ / TRỤ GIÁM SÁT:</Text>

        {/* Dropdown Trigger Button */}
        <TouchableOpacity
          ref={triggerRef}
          style={styles.dropdownTrigger}
          onPress={() => {
            if (!dropdownOpen) {
              triggerRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
                setDropdownLayout({ x, y: y + height + 4, width });
                setDropdownOpen(true);
              });
            } else {
              setDropdownOpen(false);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownTriggerText} numberOfLines={1}>
            {filterSlotId === 'all' ? '🌐 ' : '🌱 '}
            {getSelectedLabel()}
          </Text>
          <ChevronDown size={16} color='#475569' style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Dropdown via Modal — renders outside ScrollView so scroll works correctly */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType='none'
          onRequestClose={() => setDropdownOpen(false)}
        >
          {/* Backdrop: tap outside to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDropdownOpen(false)}
          >
            {dropdownLayout && (
              <View
                style={[
                  styles.dropdownMenu,
                  { position: 'absolute', top: dropdownLayout.y, left: dropdownLayout.x, width: dropdownLayout.width },
                ]}
              >
                {/* Stop propagation so tapping inside doesn't close the modal */}
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  {/* "All" option */}
                  <TouchableOpacity
                    style={[styles.dropdownItem, filterSlotId === 'all' && styles.dropdownItemActive]}
                    onPress={() => { setFilterSlotId('all'); setDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, filterSlotId === 'all' && styles.dropdownItemTextActive]}>
                      🌐 Tất cả các trụ (Bảng tổng hợp)
                    </Text>
                  </TouchableOpacity>
                  {/* Scrollable list — max 6 items */}
                  <ScrollView
                    style={{ maxHeight: 6 * 48 }}
                    keyboardShouldPersistTaps='handled'
                    showsVerticalScrollIndicator={rentals.length > 6}
                  >
                    {rentals.map((item, idx) => {
                      const itemKey = `${item.slotId}-${item.pillarCode}`;
                      const isSel = filterSlotId === itemKey;
                      return (
                        <TouchableOpacity
                          key={`${itemKey}-${idx}`}
                          style={[styles.dropdownItem, isSel && styles.dropdownItemActive]}
                          onPress={() => { setFilterSlotId(itemKey); setDropdownOpen(false); }}
                        >
                          <Text style={[styles.dropdownItemText, isSel && styles.dropdownItemTextActive]}>
                            🌱 Trụ {item.pillarCode} - Ô {item.slotNumber} ({item.capacityHoles || 24} hốc)
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor='#16A34A' />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── STATUS BAR ── */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              Đang hiển thị {filteredRentals.length} trụ giám sát
            </Text>
          </View>
          <Text style={styles.updateTime}>
            {lastUpdate ? `Cập nhật: ${lastUpdate}` : 'Đang kết nối...'}
          </Text>
        </View>

        {/* ══ PILLARS LIST ══════════════════════════ */}
        <View>
          {filteredRentals.map((r, idx) => (
            <PillarSummaryCard
              key={`${r.slotId}-${r.pillarCode}-${idx}`}
              rental={r}
              onViewDetail={() => navigation.navigate('IoTDetail', {
                slotId: r.slotId,
                pillarId: r.pillarId,
                pillarCode: r.pillarCode,
              })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
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
  controlPanel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: spacing.sm,
    zIndex: 100,
    position: 'relative',
  },
  controlTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  controlIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#1E293B',
  },
  controlSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectorLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownTriggerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#475569',
  },
  dropdownItemTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22,163,74,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#14532D',
  },
  updateTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#16A34A',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryCardLeft: {
    flex: 1,
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  pillarCodeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  infoBlock: {
    marginBottom: 8,
    gap: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
  },
  infoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#94A3B8',
    minWidth: 62,
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#334155',
  },
  slotPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotPillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#15803D',
  },
  pillarSubLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 14,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  detailBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#16A34A',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 8,
    paddingLeft: 14,
  },
  locText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#64748B',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  onlineText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#16A34A',
  },
});
