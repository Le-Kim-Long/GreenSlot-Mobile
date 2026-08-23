import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import {
  CreditCard,
  ShoppingBag,
  RotateCw,
  Sprout,
  X,
  MapPin,
  Calendar,
  FileText,
  Download,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { bookingApi } from '../../api/bookingApi';
import { apiClient, resolveApiBaseUrl } from '../../api/client';
import type { PaymentTransactionInfo, PillarDetail } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

function getTxnKind(vnpTxnRef: string): 'EXTEND' | 'BOOK' | 'PLANT' {
  if (vnpTxnRef?.startsWith('EXT_')) return 'EXTEND';
  if (vnpTxnRef?.startsWith('PLANT_')) return 'PLANT';
  return 'BOOK';
}

function getExtendedMonths(vnpTxnRef: string): number | null {
  const parts = vnpTxnRef?.split('_');
  if (parts?.[0] !== 'EXT') return null;
  const months = Number(parts[2]);
  return Number.isFinite(months) ? months : null;
}

type FilterKind = 'ALL' | 'BOOK' | 'EXTEND' | 'PLANT';

interface PaymentItem extends PaymentTransactionInfo {
  slotNumber: string;
  rentalId: number;
  locationName?: string;
  locationAddress?: string;
  startDate?: string;
  endDate?: string;
  treeName?: string;
  pillars?: PillarDetail[];
  kind: 'EXTEND' | 'BOOK' | 'PLANT';
  extendedMonths: number | null;
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKind>('ALL');
  const [selectedTxn, setSelectedTxn] = useState<PaymentItem | null>(null);

  const load = useCallback(async () => {
    try {
      const history = await bookingApi.getHistory();
      const items: PaymentItem[] = [];
      history.forEach(r => {
        r.transactions?.forEach(tx => {
          items.push({
            ...tx,
            slotNumber: r.slotNumber,
            rentalId: r.id,
            locationName: r.locationName,
            locationAddress: r.locationAddress,
            startDate: r.startDate,
            endDate: r.endDate,
            treeName: r.treeName,
            pillars: r.pillars,
            kind: getTxnKind(tx.vnpTxnRef),
            extendedMonths: getExtendedMonths(tx.vnpTxnRef),
          });
        });
      });
      items.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setPayments(items);
    } catch {
      setPayments([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredPayments = useMemo(() => {
    if (filter === 'ALL') return payments;
    return payments.filter(p => p.kind === filter);
  }, [payments, filter]);

  const bookCount = payments.filter(p => p.kind === 'BOOK').length;
  const extendCount = payments.filter(p => p.kind === 'EXTEND').length;
  const plantCount = payments.filter(p => p.kind === 'PLANT').length;

  const filters: { key: FilterKind; label: string }[] = [
    { key: 'ALL', label: `Tất cả (${payments.length})` },
    { key: 'BOOK', label: `Thuê mới (${bookCount})` },
    { key: 'EXTEND', label: `Gia hạn (${extendCount})` },
    { key: 'PLANT', label: `Mua giống (${plantCount})` },
  ];

  const handleDownloadInvoice = async (txn: PaymentItem) => {
    try {
      const baseUrl = apiClient.defaults.baseURL?.replace(/\/$/, '') || resolveApiBaseUrl();
      const invoiceUrl = `${baseUrl}/invoices/payment/${txn.id}`;
      await WebBrowser.openBrowserAsync(invoiceUrl);
    } catch {
      Alert.alert('Thông báo', 'Không thể mở hóa đơn PDF trên trình duyệt.');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filteredPayments}
        keyExtractor={item => `${item.rentalId}-${item.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />}
        ListEmptyComponent={
          <EmptyState
            title="Chưa có giao dịch"
            subtitle={
              filter === 'EXTEND'
                ? 'Bạn chưa có giao dịch gia hạn hợp đồng nào'
                : filter === 'PLANT'
                ? 'Bạn chưa có giao dịch mua giống rau nào'
                : 'Lịch sử thanh toán sẽ hiển thị tại đây'
            }
          />
        }
        renderItem={({ item }) => {
          const badge = statusToBadge(item.status);
          const isExtend = item.kind === 'EXTEND';
          const isPlant = item.kind === 'PLANT';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedTxn(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[
                  styles.icon,
                  isExtend ? styles.iconExtend : isPlant ? styles.iconPlant : styles.iconBook
                ]}>
                  {isExtend ? (
                    <RotateCw size={20} color={colors.blue[600] ?? '#2563eb'} />
                  ) : isPlant ? (
                    <Sprout size={20} color={colors.green[700]} />
                  ) : (
                    <ShoppingBag size={20} color={colors.green[600]} />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.badgeRow}>
                    <Text style={[
                      styles.kindTag,
                      isExtend ? styles.kindTagExtend : isPlant ? styles.kindTagPlant : styles.kindTagBook
                    ]}>
                      {isExtend
                        ? `Gia hạn${item.extendedMonths ? ` (+${item.extendedMonths}T)` : ''}`
                        : isPlant
                        ? 'Mua giống rau'
                        : 'Thuê mới'}
                    </Text>
                    <Text style={styles.ref} numberOfLines={1}>
                      {item.vnpTxnRef || `#${item.id}`}
                    </Text>
                  </View>

                  <Text style={styles.title}>Ô {item.slotNumber} {item.locationName ? `· ${item.locationName}` : ''}</Text>

                  <Text style={styles.date}>
                    {item.paymentDate ? new Date(item.paymentDate).toLocaleString('vi-VN') : '-'}
                  </Text>
                </View>

                <View style={styles.right}>
                  <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* MODAL CHI TIẾT HÓA ĐƠN ĐIỆN TỬ */}
      {selectedTxn && (
        <Modal
          visible={!!selectedTxn}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTxn(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <FileText size={18} color="#fef08a" />
                  <Text style={styles.modalHeaderSub}>HÓA ĐƠN GREENSLOT</Text>
                </View>
                <Text style={styles.modalTitle}>Chi tiết biên lai điện tử</Text>
                <Text style={styles.modalRef}>Mã: {selectedTxn.vnpTxnRef || `INV-${selectedTxn.id}`}</Text>

                <TouchableOpacity
                  onPress={() => setSelectedTxn(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {/* Total amount box */}
                <View style={styles.amountBox}>
                  <View>
                    <Text style={styles.amountLabel}>Tổng tiền thanh toán</Text>
                    <Text style={styles.amountValue}>{formatCurrency(selectedTxn.amount)}</Text>
                  </View>
                  <Badge
                    label={statusToBadge(selectedTxn.status).label}
                    variant={statusToBadge(selectedTxn.status).variant}
                  />
                </View>

                {/* Transaction details card */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Loại giao dịch:</Text>
                    <Text style={styles.detailValueBold}>
                      {selectedTxn.kind === 'EXTEND'
                        ? `Gia hạn hợp đồng (${selectedTxn.extendedMonths || 1} tháng)`
                        : selectedTxn.kind === 'PLANT'
                        ? 'Mua phôi giống rau mới'
                        : 'Thuê ô vườn mới'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời gian:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTxn.paymentDate).toLocaleString('vi-VN')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cổng thanh toán:</Text>
                    <Text style={styles.detailValueHighlight}>VNPay Gateway (ATM / QR / Visa)</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã GD VNPay:</Text>
                    <Text style={styles.detailValueMono}>{selectedTxn.vnpTxnRef}</Text>
                  </View>
                </View>

                {/* Slot & Location info card */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Ô vườn & Canh tác</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vị trí ô đất:</Text>
                    <Text style={styles.detailValueBold}>
                      Ô {selectedTxn.slotNumber} (HĐ #{selectedTxn.rentalId})
                    </Text>
                  </View>

                  {selectedTxn.locationName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cơ sở nhà vườn:</Text>
                      <Text style={styles.detailValue}>{selectedTxn.locationName}</Text>
                    </View>
                  )}

                  {selectedTxn.locationAddress && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Địa chỉ:</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                        {selectedTxn.locationAddress}
                      </Text>
                    </View>
                  )}

                  {selectedTxn.treeName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Giống rau:</Text>
                      <Text style={styles.treeHighlight}>🌱 {selectedTxn.treeName}</Text>
                    </View>
                  )}

                  {selectedTxn.pillars && selectedTxn.pillars.length > 0 && (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Trụ canh tác:</Text>
                      <View style={styles.pillarsWrap}>
                        {selectedTxn.pillars.map((p, idx) => (
                          <View key={idx} style={styles.pillarTag}>
                            <Text style={styles.pillarTagText}>
                              {p.pillarCode} ({p.capacityHoles || 24} hốc)
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedTxn.startDate && selectedTxn.endDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Thời hạn:</Text>
                      <Text style={styles.detailValue}>
                        {selectedTxn.startDate} → {selectedTxn.endDate}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleDownloadInvoice(selectedTxn)}
                >
                  <Download size={16} color={colors.white} />
                  <Text style={styles.downloadBtnText}>Xem PDF hóa đơn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedTxn(null)}
                >
                  <Text style={styles.closeModalBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterScrollWrapper: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  filterBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.green[600],
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBook: { backgroundColor: colors.green[50] },
  iconExtend: { backgroundColor: '#eff6ff' },
  iconPlant: { backgroundColor: '#ecfdf5' },
  cardBody: { flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  kindTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  kindTagBook: { backgroundColor: colors.green[50], color: colors.green[700] },
  kindTagExtend: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  kindTagPlant: { backgroundColor: '#ecfdf5', color: '#047857' },
  ref: { fontSize: 10, color: colors.gray[400], fontFamily: 'Inter_400Regular', flex: 1 },
  title: { ...typography.label, fontSize: 14, color: colors.gray[900], marginTop: 2 },
  date: { ...typography.caption, color: colors.gray[400], marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { ...typography.label, fontSize: 14, color: colors.green[700] },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    backgroundColor: colors.green[700],
    padding: spacing.lg,
    position: 'relative',
  },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  modalHeaderSub: { fontSize: 11, color: '#fef08a', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  modalTitle: { fontSize: 18, color: colors.white, fontFamily: 'Inter_700Bold' },
  modalRef: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
  },
  modalBody: { flexShrink: 1 },
  modalBodyContent: { padding: spacing.lg, gap: spacing.md },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.green[50],
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  amountLabel: { fontSize: 11, color: colors.gray[500], fontFamily: 'Inter_400Regular' },
  amountValue: { fontSize: 18, color: colors.green[800], fontFamily: 'Inter_700Bold', marginTop: 2 },
  sectionCard: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 12, color: colors.gray[500], fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 12, color: colors.gray[800], fontFamily: 'Inter_500Medium' },
  detailValueBold: { fontSize: 12, color: colors.gray[900], fontFamily: 'Inter_700Bold' },
  detailValueHighlight: { fontSize: 12, color: '#1d4ed8', fontFamily: 'Inter_600SemiBold' },
  detailValueMono: { fontSize: 11, color: colors.gray[700], fontFamily: 'Inter_400Regular' },
  treeHighlight: { fontSize: 12, color: colors.green[700], fontFamily: 'Inter_700Bold' },
  pillarsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flex: 1 },
  pillarTag: {
    backgroundColor: colors.green[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  pillarTagText: { fontSize: 10, color: colors.green[800], fontFamily: 'Inter_600SemiBold' },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.gray[50],
    gap: spacing.sm,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
  },
  downloadBtnText: { color: colors.white, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  closeModalBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
  },
  closeModalBtnText: { color: colors.gray[800], fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});

