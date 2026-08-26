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
  ShieldCheck,
  Receipt,
  Printer,
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
  monthlyPrice?: number;
  targetPillarCode?: string;
  targetPillarHoles?: number;
  pillarsCount?: number;
  kind: 'EXTEND' | 'BOOK' | 'PLANT';
  extendedMonths: number | null;
}

// ─── Itemized Breakdown Component ─────────────────────────────────────────────
function ItemizedBreakdown({ txn }: { txn: PaymentItem }) {
  const total = Number(txn.amount) || 0;
  const isPlantOnly = txn.kind === 'PLANT';
  const isSinglePillarPlant = isPlantOnly && !!txn.targetPillarCode && txn.targetPillarCode !== 'Toàn bộ các trụ';

  const pillarsCount = isSinglePillarPlant
    ? 1
    : (isPlantOnly ? (txn.pillarsCount || txn.pillars?.length || 1) : (txn.pillars?.length || 1));

  let months = txn.extendedMonths || 1;
  if (txn.kind === 'BOOK' && txn.startDate && txn.endDate) {
    const start = new Date(txn.startDate);
    const end = new Date(txn.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      months = Math.max(1, Math.round(diffDays / 30));
    }
  }

  const slotPricePerMonth = isPlantOnly ? 0 : (txn.monthlyPrice || 500000);
  const slotSubtotal = isPlantOnly ? 0 : Math.min(total, slotPricePerMonth * months);
  const treeSubtotal = isPlantOnly ? total : Math.max(0, total - slotSubtotal);
  const treePricePerPillar = treeSubtotal > 0 ? Math.round(treeSubtotal / Math.max(1, pillarsCount)) : 0;

  const kindLabel = txn.kind === 'EXTEND' ? 'Gia hạn' : txn.kind === 'PLANT' ? 'Phôi giống' : 'Thuê mới';

  return (
    <View style={bStyles.container}>
      {/* Header */}
      <View style={bStyles.header}>
        <View style={bStyles.headerLeft}>
          <Receipt size={15} color={colors.green[600]} />
          <Text style={bStyles.headerTitle}>BẢNG KÊ CHI TIẾT</Text>
        </View>
        <View style={bStyles.kindBadge}>
          <Text style={bStyles.kindBadgeText}>{kindLabel}</Text>
        </View>
      </View>

      {/* Column Headers */}
      <View style={bStyles.colHeader}>
        <Text style={[bStyles.colText, { flex: 1 }]}>Khoản mục / Dịch vụ</Text>
        <Text style={[bStyles.colText, { width: 70, textAlign: 'right' }]}>Đơn giá</Text>
        <Text style={[bStyles.colText, { width: 45, textAlign: 'center' }]}>SL</Text>
        <Text style={[bStyles.colText, { width: 70, textAlign: 'right' }]}>Thành tiền</Text>
      </View>

      {/* Row 1: Tiền thuê ô đất */}
      {slotSubtotal > 0 && (
        <View style={bStyles.row}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} color={colors.gray[500]} />
              <Text style={bStyles.rowTitle} numberOfLines={1}>Thuê ô {txn.slotNumber}</Text>
            </View>
            <Text style={bStyles.rowDesc}>
              {txn.kind === 'EXTEND'
                ? `Gia hạn hợp đồng (${months} tháng)`
                : `Mặt bằng canh tác (${pillarsCount} trụ)`}
            </Text>
          </View>
          <Text style={[bStyles.rowMono, { width: 70, textAlign: 'right' }]}>
            {slotPricePerMonth.toLocaleString('vi-VN')}đ/th
          </Text>
          <Text style={[bStyles.rowCenter, { width: 45 }]}>{months}th</Text>
          <Text style={[bStyles.rowBold, { width: 70, textAlign: 'right' }]}>
            {slotSubtotal.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      )}

      {/* Row 2: Phôi giống - bóc tách từng trụ */}
      {treeSubtotal > 0 && (
        !isSinglePillarPlant && txn.pillars && txn.pillars.length > 1 ? (
          txn.pillars.map((p, pIdx) => (
            <View key={p.pillarCode || pIdx} style={bStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={bStyles.rowTitleGreen} numberOfLines={1}>
                  🌱 {p.treeName || txn.treeName || 'Phôi giống thủy canh'} (Trụ {p.pillarCode})
                </Text>
                <Text style={bStyles.rowDesc}>
                  Cung cấp giống cho Trụ {p.pillarCode} ({p.capacityHoles || 24} hốc)
                </Text>
              </View>
              <Text style={[bStyles.rowMono, { width: 70, textAlign: 'right' }]}>
                {treePricePerPillar.toLocaleString('vi-VN')}đ/trụ
              </Text>
              <Text style={[bStyles.rowCenter, { width: 45 }]}>1 trụ</Text>
              <Text style={[bStyles.rowBoldGreen, { width: 70, textAlign: 'right' }]}>
                {treePricePerPillar.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          ))
        ) : (
          <View style={bStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={bStyles.rowTitleGreen} numberOfLines={1}>
                🌱 {txn.treeName || 'Phôi giống rau thủy canh'}
              </Text>
              <Text style={bStyles.rowDesc}>
                {isSinglePillarPlant
                  ? `Giống Trụ ${txn.targetPillarCode} (${txn.targetPillarHoles || 24} hốc)`
                  : `Cung cấp giống (${pillarsCount} trụ)`}
              </Text>
            </View>
            <Text style={[bStyles.rowMono, { width: 70, textAlign: 'right' }]}>
              {treePricePerPillar.toLocaleString('vi-VN')}đ/trụ
            </Text>
            <Text style={[bStyles.rowCenter, { width: 45 }]}>
              {isSinglePillarPlant ? '1 trụ' : `${pillarsCount} trụ`}
            </Text>
            <Text style={[bStyles.rowBoldGreen, { width: 70, textAlign: 'right' }]}>
              {treeSubtotal.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        )
      )}

      {/* Row 3: IoT & Tưới tự động */}
      <View style={[bStyles.row, { backgroundColor: colors.gray[50] }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={12} color={colors.green[600]} />
            <Text style={bStyles.rowTitleGray}>Hệ thống IoT & Tưới tự động 24/7</Text>
          </View>
          <Text style={bStyles.rowDescGray}>Cảm biến đo ẩm/pH/ánh sáng & điều khiển máy bơm</Text>
        </View>
        <Text style={[bStyles.rowGray, { width: 70, textAlign: 'right' }]}>Đã gồm</Text>
        <Text style={[bStyles.rowGray, { width: 45, textAlign: 'center' }]}>Kỳ</Text>
        <Text style={[bStyles.rowFree, { width: 70, textAlign: 'right' }]}>0đ</Text>
      </View>

      {/* Footer */}
      <View style={bStyles.footer}>
        <View style={bStyles.footerRow}>
          <Text style={bStyles.footerLabel}>Tạm tính chi phí:</Text>
          <Text style={bStyles.footerMono}>{total.toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={bStyles.footerRow}>
          <Text style={bStyles.footerLabel}>Thuế GTGT / Phí nền tảng:</Text>
          <Text style={bStyles.footerGray}>0đ (Đã bao gồm)</Text>
        </View>
        <View style={[bStyles.footerRow, bStyles.footerTotal]}>
          <Text style={bStyles.footerTotalLabel}>Tổng thực tế (VNPay):</Text>
          <Text style={bStyles.footerTotalValue}>{total.toLocaleString('vi-VN')} VNĐ</Text>
        </View>
      </View>
    </View>
  );
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
            treeName: (tx as any).treeName || r.treeName,
            pillars: r.pillars,
            monthlyPrice: r.monthlyPrice,
            targetPillarCode: (tx as any).targetPillarCode,
            targetPillarHoles: (tx as any).targetPillarHoles,
            pillarsCount: (tx as any).pillarsCount,
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
                        ? 'Mua phôi giống'
                        : 'Thuê mới'}
                    </Text>
                    <Text style={styles.ref} numberOfLines={1}>
                      {item.vnpTxnRef || `#${item.id}`}
                    </Text>
                  </View>

                  <Text style={styles.title}>Ô {item.slotNumber} {item.locationName ? `· ${item.locationName}` : ''}</Text>

                  {/* Thông tin cây trồng */}
                  {item.kind === 'PLANT' && item.targetPillarCode && item.targetPillarCode !== 'Toàn bộ các trụ' ? (
                    <Text style={styles.treeRow} numberOfLines={1}>
                      🌱 Trụ {item.targetPillarCode}: {item.treeName || '--'}
                    </Text>
                  ) : item.pillars && item.pillars.length > 0 ? (
                    <View style={styles.pillarsInline}>
                      {item.pillars.slice(0, 2).map((p, idx) => (
                        <Text key={idx} style={styles.pillarInlineTag}>🌱 {p.pillarCode}</Text>
                      ))}
                      {item.pillars.length > 2 && (
                        <Text style={styles.pillarInlineMore}>+{item.pillars.length - 2}</Text>
                      )}
                    </View>
                  ) : item.treeName ? (
                    <Text style={styles.treeRow}>🌱 {item.treeName}</Text>
                  ) : null}

                  <Text style={styles.date}>
                    <Calendar size={11} color={colors.gray[400]} /> {item.paymentDate ? new Date(item.paymentDate).toLocaleString('vi-VN') : '-'}
                  </Text>
                </View>

                <View style={styles.right}>
                  <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                  <Badge label={badge.label} variant={badge.variant} />
                  <Text style={styles.viewDetail}>Xem chi tiết →</Text>
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
                  <Text style={styles.modalHeaderSub}>BIÊN LAI THANH TOÁN ĐIỆN TỬ</Text>
                </View>
                <Text style={styles.modalTitle}>HÓA ĐƠN DỊCH VỤ GREENSLOT</Text>
                <Text style={styles.modalRef}>Mã giao dịch: {selectedTxn.vnpTxnRef || `INV-${selectedTxn.id}`}</Text>

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
                    <Text style={styles.amountLabel}>Số tiền thanh toán</Text>
                    <Text style={styles.amountValue}>{formatCurrency(selectedTxn.amount)}</Text>
                  </View>
                  <View style={styles.statusBadgeWrap}>
                    {selectedTxn.status === 'SUCCESS' || selectedTxn.status === 'PAID' ? (
                      <CheckCircle2 size={14} color={colors.green[700]} />
                    ) : selectedTxn.status === 'PENDING' ? (
                      <Clock size={14} color='#d97706' />
                    ) : (
                      <XCircle size={14} color='#dc2626' />
                    )}
                    <Text style={[
                      styles.statusText,
                      selectedTxn.status === 'SUCCESS' || selectedTxn.status === 'PAID'
                        ? { color: colors.green[700] }
                        : selectedTxn.status === 'PENDING'
                        ? { color: '#d97706' }
                        : { color: '#dc2626' }
                    ]}>
                      {statusToBadge(selectedTxn.status).label}
                    </Text>
                  </View>
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
                        ? 'Mua phôi giống rau canh tác mới'
                        : 'Đăng ký thuê ô vườn mới'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời gian giao dịch:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTxn.paymentDate).toLocaleString('vi-VN')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cổng thanh toán:</Text>
                    <Text style={styles.detailValueHighlight}>VNPay Gateway (ATM / QR Pay / Visa / Master)</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mã đối soát VNPay:</Text>
                    <Text style={styles.detailValueMono}>{selectedTxn.vnpTxnRef}</Text>
                  </View>
                </View>

                {/* === BẢNG KÊ CHI TIẾT ITEMIZED BREAKDOWN === */}
                <ItemizedBreakdown txn={selectedTxn} />

                {/* Thông tin Ô vườn & Canh tác */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Thông tin ô vườn & canh tác</Text>

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
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Địa chỉ cơ sở:</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                        {selectedTxn.locationAddress}
                      </Text>
                    </View>
                  )}

                  {/* Trụ & Giống cây */}
                  {selectedTxn.kind === 'PLANT' && selectedTxn.targetPillarCode && selectedTxn.targetPillarCode !== 'Toàn bộ các trụ' ? (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Trụ & Giống trồng mới:</Text>
                      <View style={styles.pillarsWrap}>
                        <View style={styles.pillarTagAlt}>
                          <Text style={styles.pillarTagAltText}>
                            🏷️ Trụ {selectedTxn.targetPillarCode} ({selectedTxn.targetPillarHoles || 24} hốc): 🌱 {selectedTxn.treeName}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : selectedTxn.pillars && selectedTxn.pillars.length > 0 ? (
                    <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Trụ & Giống canh tác:</Text>
                      <View style={styles.pillarsWrap}>
                        {selectedTxn.pillars.map((p, idx) => (
                          <View key={idx} style={styles.pillarTag}>
                            <Text style={styles.pillarTagText}>
                              Trụ {p.pillarCode} ({p.capacityHoles || 24} hốc): 🌱 {p.treeName || selectedTxn.treeName || 'Đang canh tác'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : selectedTxn.treeName ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Giống cây đăng ký:</Text>
                      <Text style={styles.treeHighlight}>🌱 {selectedTxn.treeName}</Text>
                    </View>
                  ) : null}

                  {/* Thời hạn hợp đồng */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thời hạn hợp đồng:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTxn.startDate && selectedTxn.endDate &&
                       !isNaN(new Date(selectedTxn.startDate).getTime()) &&
                       !isNaN(new Date(selectedTxn.endDate).getTime())
                        ? `${new Date(selectedTxn.startDate).toLocaleDateString('vi-VN')} → ${new Date(selectedTxn.endDate).toLocaleDateString('vi-VN')}`
                        : `Theo hợp đồng thuê HĐ #${selectedTxn.rentalId}`}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleDownloadInvoice(selectedTxn)}
                >
                  <Download size={16} color={colors.white} />
                  <Text style={styles.downloadBtnText}>Tải PDF hóa đơn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => WebBrowser.openBrowserAsync(`${apiClient.defaults.baseURL?.replace(/\/$/, '') || resolveApiBaseUrl()}/invoices/payment/${selectedTxn.id}`)}
                >
                  <Printer size={15} color={colors.gray[700]} />
                  <Text style={styles.printBtnText}>In hóa đơn</Text>
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

// ─── Itemized Breakdown Styles ─────────────────────────────────────────────────
const bStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.green[700],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kindBadge: {
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.green[700] },
  colHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  colText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.gray[400] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  rowTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  rowTitleGreen: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.green[800] },
  rowTitleGray: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.gray[700] },
  rowDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[500], marginTop: 2 },
  rowDescGray: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[400], marginTop: 2 },
  rowMono: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[700] },
  rowCenter: { fontSize: 10, textAlign: 'center', fontFamily: 'Inter_600SemiBold', color: colors.gray[600] },
  rowBold: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  rowBoldGreen: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.green[700] },
  rowGray: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.gray[400] },
  rowFree: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.green[600] },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.gray[100],
    gap: 4,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.gray[500] },
  footerMono: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.gray[800] },
  footerGray: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.gray[400] },
  footerTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  footerTotalLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  footerTotalValue: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.green[800] },
});

// ─── Screen Styles ─────────────────────────────────────────────────────────────
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
  title: { ...typography.label, fontSize: 13, color: colors.gray[900], marginTop: 2 },
  treeRow: { fontSize: 11, color: colors.green[700], fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  pillarsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  pillarInlineTag: {
    fontSize: 10,
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
    backgroundColor: colors.green[50],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  pillarInlineMore: {
    fontSize: 10,
    color: colors.gray[500],
    fontFamily: 'Inter_500Medium',
  },
  date: { fontSize: 10, color: colors.gray[400], fontFamily: 'Inter_400Regular', marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { ...typography.label, fontSize: 13, color: colors.green[700] },
  viewDetail: { fontSize: 9, color: colors.green[600], fontFamily: 'Inter_600SemiBold', marginTop: 2 },

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
    maxHeight: '92%',
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
  modalHeaderSub: { fontSize: 10, color: '#fef08a', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  modalTitle: { fontSize: 18, color: colors.white, fontFamily: 'Inter_700Bold' },
  modalRef: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 2 },
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
  amountValue: { fontSize: 22, color: colors.green[800], fontFamily: 'Inter_700Bold', marginTop: 2 },
  statusBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  sectionCard: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingBottom: 6,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 11, color: colors.gray[500], fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 11, color: colors.gray[800], fontFamily: 'Inter_500Medium', maxWidth: '60%', textAlign: 'right' },
  detailValueBold: { fontSize: 11, color: colors.gray[900], fontFamily: 'Inter_700Bold', maxWidth: '60%', textAlign: 'right' },
  detailValueHighlight: { fontSize: 10, color: '#1d4ed8', fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' },
  detailValueMono: { fontSize: 10, color: colors.gray[700], fontFamily: 'Inter_400Regular' },
  treeHighlight: { fontSize: 11, color: colors.green[700], fontFamily: 'Inter_700Bold' },
  pillarsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flex: 1 },
  pillarTag: {
    backgroundColor: colors.green[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  pillarTagText: { fontSize: 10, color: colors.green[800], fontFamily: 'Inter_600SemiBold' },
  pillarTagAlt: {
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[300],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  pillarTagAltText: { fontSize: 10, color: colors.green[800], fontFamily: 'Inter_700Bold' },

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
  downloadBtnText: { color: colors.white, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    justifyContent: 'center',
  },
  printBtnText: { color: colors.gray[700], fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  closeModalBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
  },
  closeModalBtnText: { color: colors.gray[800], fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
