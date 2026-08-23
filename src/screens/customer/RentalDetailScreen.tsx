import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  AppState,
  TextInput,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  Leaf,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  CreditCard,
  Clock,
  CheckCircle2,
  RotateCcw,
  Wrench,
  Sprout,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { managerApi, taskApi } from '../../api/taskApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';
import type { PaymentTransactionInfo, ServiceType } from '../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

function formatDate(isoOrFormatted: string): string {
  if (!isoOrFormatted) return '--';
  if (isoOrFormatted.includes('/')) return isoOrFormatted;
  try {
    const d = new Date(isoOrFormatted);
    if (isNaN(d.getTime())) return isoOrFormatted;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoOrFormatted;
  }
}

function parseToDate(isoOrFormatted: string): Date {
  if (!isoOrFormatted) return new Date();
  if (isoOrFormatted.includes('/')) {
    const [d, m, y] = isoOrFormatted.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(isoOrFormatted);
}

function addMonthsToDate(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDateObj(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatTxDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

// ─── Duration Picker Modal ───────────────────────────────────────────────────
interface DurationPickerProps {
  visible: boolean;
  current: number;
  onSelect: (months: number) => void;
  onClose: () => void;
}

function DurationPicker({ visible, current, onSelect, onClose }: DurationPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Chọn số tháng gia hạn</Text>
            <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
              <X size={22} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={DURATION_OPTIONS}
            keyExtractor={item => item.toString()}
            numColumns={3}
            contentContainerStyle={pickerStyles.grid}
            renderItem={({ item }) => {
              const isSelected = item === current;
              return (
                <TouchableOpacity
                  style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[pickerStyles.optionNum, isSelected && pickerStyles.optionNumSelected]}>
                    {item}
                  </Text>
                  <Text style={[pickerStyles.optionLabel, isSelected && pickerStyles.optionLabelSelected]}>
                    tháng
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Service Picker Modal ────────────────────────────────────────────────────
interface ServicePickerProps {
  visible: boolean;
  services: ServiceType[];
  current: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}

function ServicePicker({ visible, services, current, onSelect, onClose }: ServicePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Chọn dịch vụ chăm sóc</Text>
            <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
              <X size={22} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={services}
            keyExtractor={item => item.id!.toString()}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            renderItem={({ item }) => {
              const isSelected = item.id === current;
              return (
                <TouchableOpacity
                  style={[
                    styles.serviceOptionCard,
                    isSelected && styles.serviceOptionCardSelected
                  ]}
                  onPress={() => { if (item.id != null) onSelect(item.id); onClose(); }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceOptionName, isSelected && styles.serviceOptionNameSelected]}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.serviceOptionDesc, isSelected && styles.serviceOptionDescSelected]}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.serviceOptionPrice, isSelected && styles.serviceOptionPriceSelected]}>
                    {formatCurrency(item.price)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Transaction Row ─────────────────────────────────────────────────────────
function TransactionRow({ tx }: { tx: PaymentTransactionInfo }) {
  const isSuccess = tx.status === 'SUCCESS';
  return (
    <View style={txStyles.row}>
      <View style={[txStyles.dot, isSuccess ? txStyles.dotSuccess : txStyles.dotFail]} />
      <View style={txStyles.info}>
        <Text style={txStyles.ref}>{tx.vnpTxnRef}</Text>
        <Text style={txStyles.date}>{formatTxDate(tx.paymentDate)}</Text>
      </View>
      <View style={txStyles.right}>
        <Text style={txStyles.amount}>{formatCurrency(tx.amount)}</Text>
        <Text style={[txStyles.status, isSuccess ? txStyles.statusSuccess : txStyles.statusFail]}>
          {isSuccess ? 'Thành công' : tx.status}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RentalDetailScreen({ route, navigation }: CustomerStackProps<'RentalDetail'>) {
  const { rental: initialRental } = route.params;
  const [rental, setRental] = useState(initialRental);
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [extending, setExtending] = useState(false);

  // Care services states
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);

  // AppState ref for payment result detection
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingExtendRef = useRef<boolean>(false);

  const currentEndDate = useMemo(() => parseToDate(rental.endDate), [rental.endDate]);
  const newEndDate = useMemo(() => addMonthsToDate(currentEndDate, selectedMonths), [currentEndDate, selectedMonths]);
  const pricePerMonth = useMemo(() => rental.totalPrice / Math.max(1,
    (() => {
      const start = parseToDate(rental.startDate);
      const end = parseToDate(rental.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
    })()
  ), [rental]);
  const extensionCost = pricePerMonth * selectedMonths;

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Load service types on mount
  const loadServiceTypes = () => {
    setServicesLoading(true);
    setServicesError(false);
    managerApi.getServiceTypes()
      .then(types => {
        setServices(types);
        if (types.length && types[0].id != null) {
          setSelectedServiceId(types[0].id);
        }
      })
      .catch(err => {
        console.warn('Failed to load service types:', err);
        setServicesError(true);
      })
      .finally(() => setServicesLoading(false));
  };

  useEffect(() => {
    if (rental.status === 'ACTIVE') loadServiceTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect return from VNPay browser
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
      if (wasBackground && next === 'active' && pendingExtendRef.current) {
        pendingExtendRef.current = false;
        try {
          const history = await bookingApi.getHistory();
          const updated = history.find(r => r.id === rental.id);
          if (updated) setRental(updated);
            let payStatus: 'success' | 'failed' | 'pending';
            if (updated?.status === 'ACTIVE') {
              payStatus = 'success';
            } else {
              payStatus = 'pending';
            }
            navigation.navigate('PaymentResult', {
              status: payStatus,
              rentalId: rental.id,
              slotNumber: rental.slotNumber,
              txnRef: updated?.transactions?.[0]?.vnpTxnRef,
              amount: updated?.transactions?.[0]?.amount?.toString(),
            });
        } catch { /* silent */ }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [rental.id, rental.slotNumber]);

  const [harvestSubmitting, setHarvestSubmitting] = useState(false);

  const handleCancelBooking = () => {
    Alert.alert(
      'Hủy hợp đồng thuê',
      `Bạn có chắc chắn muốn hủy đơn thuê ô vườn ${rental.slotNumber} này không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.cancelBooking(rental.id);
              Alert.alert('Thành công', 'Đã hủy đơn đặt vườn thành công.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy đơn. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleHarvestDecision = async (decision: 'SELF' | 'STAFF') => {
    Alert.alert(
      'Xác nhận phương thức thu hoạch',
      decision === 'SELF'
        ? 'Bạn sẽ tự đến vườn để trải nghiệm thu hoạch rau của mình?'
        : 'Bạn muốn nhân viên nhà vườn thu hoạch giúp và đóng gói gửi cho bạn?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setHarvestSubmitting(true);
            try {
              await bookingApi.recordHarvestDecision(rental.id, decision);
              Alert.alert('Thành công', 'Đã ghi nhận lựa chọn thu hoạch của bạn!');
              const history = await bookingApi.getHistory();
              const updated = history.find(r => r.id === rental.id);
              if (updated) setRental(updated);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Ghi nhận thất bại. Vui lòng thử lại.');
            } finally {
              setHarvestSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleExtend = async () => {
    Alert.alert(
      'Xác nhận gia hạn',
      `Gia hạn thêm ${selectedMonths} tháng?\nĐến ngày: ${formatDateObj(newEndDate)}\nPhí ước tính: ${formatCurrency(extensionCost)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán VNPay',
          onPress: async () => {
            setExtending(true);
            try {
              const result = await bookingApi.extendBooking({
                rentalId: rental.id,
                durationInMonths: selectedMonths,
                isMobile: true,
              });
              if (result.paymentUrl) {
                pendingExtendRef.current = true;
                await Linking.openURL(result.paymentUrl);
              }
            } catch (e: unknown) {
              const err = e as { response?: { data?: { message?: string } } };
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gia hạn. Vui lòng thử lại.');
            } finally {
              setExtending(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestService = async () => {
    if (!selectedServiceId) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại dịch vụ chăm sóc!');
      return;
    }
    setServiceSubmitting(true);
    try {
      // Use rental.slotId if defined, otherwise fallback to rental.id (rentalId)
      const targetSlotId = rental.slotId || rental.id;
      await taskApi.requestService({
        slotId: targetSlotId,
        serviceTypeId: selectedServiceId,
        description: description.trim() || undefined,
      });
      Alert.alert('Thành công', 'Yêu cầu dịch vụ chăm sóc đã được gửi thành công!');
      setDescription('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi yêu cầu dịch vụ. Vui lòng thử lại.');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const badge = statusToBadge(rental.status);
  const isActive = rental.status === 'ACTIVE';
  const isPending = rental.status === 'PENDING' || rental.status === 'PENDING_PAYMENT';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Leaf size={36} color={colors.green[600]} />
          </View>
          <Text style={styles.slotTitle}>Ô vườn {rental.slotNumber}</Text>
          <View style={{ marginTop: 6 }}>
            <Badge label={badge.label} variant={badge.variant} />
          </View>
        </View>

        {/* ── Harvest Decision Banner (nếu đang active) ─────────────────── */}
        {isActive && (
          <View style={[styles.card, styles.harvestCard]}>
            <View style={styles.harvestHeader}>
              <Sprout size={20} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Phương thức thu hoạch nông sản</Text>
            </View>
            <Text style={styles.harvestSubtitle}>
              Khi rau củ đến thời điểm chín rộ, bạn có thể tự đến vườn trải nghiệm hái rau hoặc nhờ nhân viên thu hoạch gửi về tận nhà.
            </Text>

            <View style={styles.harvestButtonsRow}>
              <TouchableOpacity
                style={styles.harvestSelfBtn}
                onPress={() => handleHarvestDecision('SELF')}
                disabled={harvestSubmitting}
              >
                <Text style={styles.harvestSelfBtnText}>🌿 Tôi tự đến thu hoạch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.harvestStaffBtn}
                onPress={() => handleHarvestDecision('STAFF')}
                disabled={harvestSubmitting}
              >
                <Text style={styles.harvestStaffBtnText}>👨‍🌾 Nhờ vườn thu hoạch</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Info Card ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin hợp đồng</Text>

          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.green[600]} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Cơ sở</Text>
              <Text style={styles.infoValue}>{rental.locationName ?? '--'}</Text>
            </View>
          </View>

          {rental.treeName && (
            <View style={styles.infoRow}>
              <Sprout size={16} color={colors.green[600]} />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Giống rau canh tác</Text>
                <Text style={[styles.infoValue, { color: colors.green[700], fontWeight: '700' }]}>
                  {rental.treeName}
                </Text>
              </View>
            </View>
          )}

          {rental.pillars && rental.pillars.length > 0 ? (
            <View style={styles.infoRow}>
              <Leaf size={16} color={colors.green[600]} />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Các trụ canh tác</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {rental.pillars.map((p, idx) => (
                    <View key={idx} style={styles.pillarBadgeFull}>
                      <Text style={styles.pillarBadgeFullText}>
                        Trụ {p.pillarCode} ({p.capacityHoles || 24} hốc)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Leaf size={16} color={colors.green[600]} />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Cột vườn</Text>
                <Text style={styles.infoValue}>{rental.pillarCode ?? '--'}</Text>
              </View>
            </View>
          )}

          {/* Date Range */}
          <View style={styles.dateRangeCard}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>📅 Ngày bắt đầu</Text>
              <Text style={styles.dateBlockValue}>{formatDate(rental.startDate)}</Text>
            </View>
            <View style={styles.dateArrow}>
              <ChevronRight size={20} color={colors.green[400]} />
            </View>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>🏁 Ngày kết thúc</Text>
              <Text style={styles.dateBlockValue}>{formatDate(rental.endDate)}</Text>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng tiền hợp đồng</Text>
            <Text style={styles.totalValue}>{formatCurrency(rental.totalPrice)}</Text>
          </View>

          {/* Cancel button if pending */}
          {isPending && (
            <TouchableOpacity
              style={styles.cancelFullBtn}
              onPress={handleCancelBooking}
            >
              <Text style={styles.cancelFullBtnText}>Hủy đơn đặt vườn này</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Transaction History ──────────────────────── */}
        {rental.transactions && rental.transactions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
            {rental.transactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </View>
        )}

        {/* ── Care Service Request Card (chỉ khi ACTIVE) ─── */}
        {isActive && (
          <View style={[styles.card, styles.serviceCard]}>
            <View style={styles.serviceHeader}>
              <Wrench size={20} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Đăng ký Dịch vụ Chăm sóc</Text>
            </View>
            <Text style={styles.serviceSubtitle}>
              Gửi yêu cầu chăm sóc, bón phân, tỉa cành hoặc xử lý sâu bệnh cho ô vườn này.
            </Text>

            {/* Loading state */}
            {servicesLoading && (
              <View style={styles.serviceStatusBox}>
                <ActivityIndicator size="small" color={colors.green[600]} />
                <Text style={styles.serviceStatusText}>Đang tải danh sách dịch vụ...</Text>
              </View>
            )}

            {/* Error state */}
            {!servicesLoading && servicesError && (
              <View style={styles.serviceStatusBox}>
                <Text style={styles.serviceStatusText}>Không thể tải dịch vụ.</Text>
                <TouchableOpacity onPress={loadServiceTypes} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty state */}
            {!servicesLoading && !servicesError && services.length === 0 && (
              <View style={styles.serviceStatusBox}>
                <Text style={styles.serviceStatusText}>Chưa có dịch vụ nào được cung cấp.</Text>
              </View>
            )}

            {/* Service picker (only when services loaded) */}
            {!servicesLoading && services.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Chọn loại dịch vụ *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setServicePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText} numberOfLines={1}>
                    {selectedService ? selectedService.name : 'Vui lòng chọn dịch vụ...'}
                  </Text>
                  <View style={styles.pickerBadge}>
                    <Text style={styles.pickerBadgeText}>Thay đổi</Text>
                  </View>
                </TouchableOpacity>

                {selectedService && (
                  <View style={styles.servicePriceSummary}>
                    <Text style={styles.servicePriceLabel}>Phí dịch vụ:</Text>
                    <Text style={styles.servicePriceValue}>{formatCurrency(selectedService.price)}</Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Ghi chú chi tiết yêu cầu</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Nhập ghi chú hoặc yêu cầu cụ thể dành cho nhân viên vườn..."
                  placeholderTextColor={colors.gray[400]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />

                <Button
                  title="Gửi yêu cầu chăm sóc"
                  onPress={handleRequestService}
                  loading={serviceSubmitting}
                  disabled={!selectedServiceId}
                />
              </>
            )}
          </View>
        )}

        {/* ── Extension Card (chỉ khi ACTIVE) ─────────── */}
        {isActive && (
          <View style={[styles.card, styles.extendCard]}>
            <View style={styles.extendHeader}>
              <RotateCcw size={20} color={colors.green[700]} />
              <Text style={styles.sectionTitle}>Gia hạn hợp đồng</Text>
            </View>
            <Text style={styles.extendSubtitle}>
              Chọn số tháng bạn muốn gia hạn thêm từ ngày{' '}
              <Text style={{ fontWeight: '700', color: colors.green[700] }}>
                {formatDate(rental.endDate)}
              </Text>
            </Text>

            {/* Duration picker button */}
            <Text style={styles.fieldLabel}>Thời gian gia hạn</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Calendar size={18} color={colors.green[600]} />
              <Text style={styles.pickerButtonText}>{selectedMonths} tháng</Text>
              <View style={styles.pickerBadge}>
                <Text style={styles.pickerBadgeText}>Thay đổi</Text>
              </View>
            </TouchableOpacity>

            {/* New date range preview */}
            <View style={styles.dateRangeCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>📅 Bắt đầu gia hạn</Text>
                <Text style={styles.dateBlockValue}>{formatDate(rental.endDate)}</Text>
              </View>
              <View style={styles.dateArrow}>
                <ChevronRight size={20} color={colors.green[400]} />
              </View>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>🏁 Kết thúc mới</Text>
                <Text style={[styles.dateBlockValue, { color: colors.green[700] }]}>
                  {formatDateObj(newEndDate)}
                </Text>
              </View>
            </View>

            {/* Duration summary */}
            <View style={styles.durationSummary}>
              <Clock size={14} color={colors.green[600]} />
              <Text style={styles.durationText}>
                Gia hạn thêm{' '}
                <Text style={styles.durationHighlight}>{selectedMonths} tháng</Text>
              </Text>
            </View>

            {/* Cost estimate */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Phí gia hạn ước tính</Text>
              <Text style={styles.totalValue}>{formatCurrency(extensionCost)}</Text>
            </View>

            <Button
              title="Xác nhận & Thanh toán VNPay"
              onPress={handleExtend}
              loading={extending}
            />

            <Text style={styles.noteText}>
              💡 Hệ thống sẽ chuyển bạn đến VNPay để hoàn tất thanh toán.
            </Text>
          </View>
        )}

        {/* Padding bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Duration Picker Modal */}
      <DurationPicker
        visible={pickerVisible}
        current={selectedMonths}
        onSelect={setSelectedMonths}
        onClose={() => setPickerVisible(false)}
      />

      {/* Service Picker Modal */}
      <ServicePicker
        visible={servicePickerVisible}
        services={services}
        current={selectedServiceId}
        onSelect={setSelectedServiceId}
        onClose={() => setServicePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  slotTitle: {
    ...typography.heading1,
    color: colors.gray[900],
    textAlign: 'center',
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  extendCard: {
    borderColor: colors.green[300],
    borderWidth: 1.5,
  },
  serviceCard: {
    borderColor: colors.green[300],
    borderWidth: 1.5,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoTexts: { flex: 1 },
  infoLabel: { ...typography.caption, color: colors.gray[400] },
  infoValue: { ...typography.body, color: colors.gray[800], marginTop: 2 },

  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  dateBlock: { flex: 1, alignItems: 'center' },
  dateBlockLabel: { ...typography.caption, color: colors.gray[500] },
  dateBlockValue: { ...typography.label, color: colors.gray[900], marginTop: 4 },
  dateArrow: { paddingHorizontal: spacing.xs },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    marginTop: spacing.xs,
  },
  totalLabel: { ...typography.body, color: colors.gray[600] },
  totalValue: { ...typography.heading2, color: colors.green[700] },

  // Extension specific
  extendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  extendSubtitle: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md },

  // Service specific
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  serviceSubtitle: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md },
  serviceStatusBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  serviceStatusText: { ...typography.bodySmall, color: colors.gray[500], textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green[100],
    borderRadius: radius.full,
  },
  retryBtnText: { ...typography.caption, color: colors.green[700], fontWeight: '700' },
  servicePriceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  servicePriceLabel: { ...typography.bodySmall, color: colors.gray[600] },
  servicePriceValue: { ...typography.label, color: colors.green[700], fontWeight: '700' },
  textArea: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 14,
    color: colors.gray[800],
    backgroundColor: colors.gray[50],
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },

  fieldLabel: { ...typography.caption, color: colors.gray[700], marginBottom: 6, fontWeight: '600' },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.green[300],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  pickerButtonText: { ...typography.body, color: colors.gray[800], flex: 1 },
  pickerBadge: {
    backgroundColor: colors.green[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pickerBadgeText: { ...typography.caption, color: colors.green[700], fontWeight: '700' },

  durationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  durationText: { ...typography.bodySmall, color: colors.gray[600] },
  durationHighlight: { color: colors.green[700], fontWeight: '700' },

  noteText: {
    ...typography.caption,
    color: colors.gray[400],
    marginTop: spacing.md,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Service picker custom card styles
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.green[100],
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  serviceOptionCardSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  serviceOptionName: { ...typography.label, color: colors.gray[800] },
  serviceOptionNameSelected: { color: colors.green[700], fontWeight: '700' },
  serviceOptionDesc: { ...typography.caption, color: colors.gray[500], marginTop: 2 },
  serviceOptionDescSelected: { color: colors.green[600] },
  serviceOptionPrice: { ...typography.label, color: colors.green[700] },
  serviceOptionPriceSelected: { fontWeight: '700' },

  // Harvest Card
  harvestCard: {
    backgroundColor: '#f0fdf4',
    borderColor: colors.green[300],
    borderWidth: 1.5,
  },
  harvestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  harvestSubtitle: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  harvestButtonsRow: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  harvestSelfBtn: {
    backgroundColor: colors.green[600],
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestSelfBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  harvestStaffBtn: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.green[600],
  },
  harvestStaffBtnText: {
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  pillarBadgeFull: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  pillarBadgeFullText: {
    fontSize: 11,
    color: colors.green[800],
    fontFamily: 'Inter_600SemiBold',
  },

  cancelFullBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFullBtnText: {
    fontSize: 13,
    color: '#dc2626',
    fontFamily: 'Inter_600SemiBold',
  },
});

// ─── Duration Picker Styles ───────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: { ...typography.label, color: colors.gray[900] },
  closeBtn: { padding: 4 },
  grid: { padding: spacing.md, gap: spacing.sm },
  option: {
    flex: 1,
    margin: 6,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.green[50],
    borderWidth: 1.5,
    borderColor: colors.green[100],
  },
  optionSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[700],
  },
  optionNum: { fontSize: 22, fontWeight: '700', color: colors.green[700] },
  optionNumSelected: { color: colors.white },
  optionLabel: { ...typography.caption, color: colors.green[500] },
  optionLabelSelected: { color: 'rgba(255,255,255,0.8)' },
});

// ─── Transaction Styles ───────────────────────────────────────────────────────
const txStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSuccess: { backgroundColor: colors.green[500] },
  dotFail: { backgroundColor: '#ef4444' },
  info: { flex: 1 },
  ref: { ...typography.caption, color: colors.gray[800], fontWeight: '600' },
  date: { ...typography.caption, color: colors.gray[400] },
  right: { alignItems: 'flex-end' },
  amount: { ...typography.label, color: colors.gray[900] },
  status: { ...typography.caption },
  statusSuccess: { color: colors.green[600] },
  statusFail: { color: '#ef4444' },
});
