import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  PlusCircle,
  X,
  Calendar,
  Layers,
  Minus,
  Plus,
  Info,
  CreditCard,
  Sprout,
  ShieldCheck,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory, AddPillarsPreviewDTO } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { openAndWaitForPayment, getMobileRedirectUrl } from '../../utils/paymentFlow';

interface AddPillarsModalProps {
  visible: boolean;
  rental: BookingHistory | null;
  onClose: () => void;
  onPaymentSettled: (
    status: 'success' | 'failed' | 'pending',
    callback: any,
    rentalId: number
  ) => void;
}

export function AddPillarsModal({
  visible,
  rental,
  onClose,
  onPaymentSettled,
}: AddPillarsModalProps) {
  const [smallCount, setSmallCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [largeCount, setLargeCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<AddPillarsPreviewDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (visible && rental) {
      setSmallCount(0);
      setMediumCount(0);
      setLargeCount(0);
      setErrorMsg('');
      setPreviewData(null);
    }
  }, [visible, rental?.id]);

  // Live preview call whenever counts change
  useEffect(() => {
    if (!visible || !rental) return;

    let isCurrent = true;
    setPreviewLoading(true);

    const timer = setTimeout(() => {
      bookingApi
        .previewAddPillars(rental.id, { smallCount, mediumCount, largeCount })
        .then(data => {
          if (isCurrent) {
            setPreviewData(data);
            setErrorMsg('');
          }
        })
        .catch((err: any) => {
          if (isCurrent) {
            const msg = err?.response?.data?.message || 'Không thể tính toán chi phí thuê thêm trụ.';
            setErrorMsg(msg);
          }
        })
        .finally(() => {
          if (isCurrent) setPreviewLoading(false);
        });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [visible, rental?.id, smallCount, mediumCount, largeCount]);

  if (!rental) return null;

  const totalSelected = smallCount + mediumCount + largeCount;
  const slotTotalArea = previewData?.slotTotalArea || rental.slotArea || 10.0;
  const currentUsedArea = previewData?.currentUsedArea ?? 0;
  const requestedArea = previewData?.requestedArea ?? (smallCount * 1.0 + mediumCount * 1.5 + largeCount * 2.0);
  const remainingAreaAfter = previewData?.remainingAreaAfter ?? (slotTotalArea - currentUsedArea - requestedArea);

  // Capacity bar percentages
  const usedPct = Math.min(100, Math.max(0, (currentUsedArea / slotTotalArea) * 100));
  const requestedPct = Math.min(100 - usedPct, Math.max(0, (requestedArea / slotTotalArea) * 100));

  const handleConfirmAndPay = async () => {
    if (totalSelected <= 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 trụ muốn thuê thêm.');
      return;
    }
    if (previewData && !previewData.canAdd) {
      setErrorMsg(previewData.message || 'Diện tích ô không đủ để thuê thêm các trụ đã chọn.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await bookingApi.addPillars(rental.id, {
        smallCount,
        mediumCount,
        largeCount,
        isMobile: true,
        redirectUrl: getMobileRedirectUrl(),
      });

      if (!res.paymentUrl) {
        Alert.alert('Lỗi', 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
        setSubmitting(false);
        return;
      }

      onClose();

      const settled = await openAndWaitForPayment(
        res.paymentUrl,
        bookingApi.getHistory,
        rental.id
      );

      const callback = 'callback' in settled ? settled.callback : undefined;
      onPaymentSettled(settled.status, callback, rental.id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch.';
      setErrorMsg(msg);
      Alert.alert('Thất bại', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <PlusCircle size={20} color={colors.emerald[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Thuê thêm trụ khí canh</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Ô vườn {rental.slotNumber} {rental.locationName ? `• ${rental.locationName}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Top Stat Cards */}
            <View style={styles.statsRow}>
              {/* Contract remaining days */}
              <View style={styles.statCard}>
                <View style={styles.statIconRow}>
                  <Calendar size={14} color={colors.emerald[700]} />
                  <Text style={styles.statLabel}>Thời hạn còn lại</Text>
                </View>
                <Text style={styles.statValue}>
                  {previewData ? `${previewData.daysRemaining} ngày` : 'Đang tính...'}
                </Text>
                <Text style={styles.statHint}>Hết hạn: {rental.endDate}</Text>
              </View>

              {/* Free area in slot */}
              <View style={[styles.statCard, styles.statCardGreen]}>
                <View style={styles.statIconRow}>
                  <Layers size={14} color={colors.emerald[700]} />
                  <Text style={[styles.statLabel, { color: colors.emerald[800] }]}>Diện tích ô trống</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.emerald[800] }]}>
                  {previewData ? `${previewData.availableArea.toFixed(1)} m²` : '--'}
                  <Text style={styles.statValueSub}> / {slotTotalArea} m²</Text>
                </Text>
                <Text
                  style={[
                    styles.statHint,
                    remainingAreaAfter < 0 ? { color: colors.red[600], fontWeight: '700' } : { color: colors.emerald[700] },
                  ]}
                >
                  Sau chọn: {previewData ? `${previewData.remainingAreaAfter.toFixed(1)} m²` : '--'}
                </Text>
              </View>
            </View>

            {/* Visual Capacity Bar */}
            <View style={styles.capacityBarWrap}>
              <View style={styles.capacityBarHeader}>
                <Text style={styles.capacityBarTitle}>Sức chứa ô vườn</Text>
                <Text style={styles.capacityBarDetail}>
                  Đã dùng {(currentUsedArea + requestedArea).toFixed(1)} / {slotTotalArea} m²
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barUsed, { width: `${usedPct}%` }]} />
                <View style={[styles.barRequested, { width: `${requestedPct}%` }]} />
              </View>
              <View style={styles.barLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.emerald[600] }]} />
                  <Text style={styles.legendText}>Hiện có ({currentUsedArea.toFixed(1)}m²)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>Thuê thêm ({requestedArea.toFixed(1)}m²)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.gray[200] }]} />
                  <Text style={styles.legendText}>Còn trống ({Math.max(0, remainingAreaAfter).toFixed(1)}m²)</Text>
                </View>
              </View>
            </View>

            {/* Section: Select Pillars */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chọn số lượng trụ muốn thuê thêm</Text>
              {previewLoading && (
                <View style={styles.loadingPill}>
                  <ActivityIndicator size="small" color={colors.emerald[600]} />
                  <Text style={styles.loadingPillText}>Đang tính...</Text>
                </View>
              )}
            </View>

            {/* Pillar Item 1: SMALL */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarInfo}>
                <View style={styles.pillarNameRow}>
                  <Text style={styles.pillarName}>Trụ Nhỏ</Text>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>24 hốc · 1.0 m²</Text>
                  </View>
                </View>
                <Text style={styles.pillarPrice}>150.000 ₫/tháng</Text>
                {previewData && (
                  <Text style={styles.pillarProRated}>
                    ~{formatCurrency(Math.round(150000 * (previewData.daysRemaining / 30)))} cho {previewData.daysRemaining} ngày
                  </Text>
                )}
              </View>

              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={[styles.stepperBtn, smallCount <= 0 && styles.stepperBtnDisabled]}
                  onPress={() => setSmallCount(Math.max(0, smallCount - 1))}
                  disabled={smallCount <= 0}
                >
                  <Minus size={16} color={smallCount > 0 ? colors.gray[700] : colors.gray[300]} />
                </TouchableOpacity>
                <Text style={styles.stepperCount}>{smallCount}</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    styles.stepperBtnAdd,
                    (previewData ? previewData.remainingAreaAfter < 1.0 : false) && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => setSmallCount(smallCount + 1)}
                  disabled={previewData ? previewData.remainingAreaAfter < 1.0 : false}
                >
                  <Plus size={16} color={colors.emerald[700]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pillar Item 2: MEDIUM */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarInfo}>
                <View style={styles.pillarNameRow}>
                  <Text style={styles.pillarName}>Trụ Vừa</Text>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>36 hốc · 1.5 m²</Text>
                  </View>
                </View>
                <Text style={styles.pillarPrice}>200.000 ₫/tháng</Text>
                {previewData && (
                  <Text style={styles.pillarProRated}>
                    ~{formatCurrency(Math.round(200000 * (previewData.daysRemaining / 30)))} cho {previewData.daysRemaining} ngày
                  </Text>
                )}
              </View>

              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={[styles.stepperBtn, mediumCount <= 0 && styles.stepperBtnDisabled]}
                  onPress={() => setMediumCount(Math.max(0, mediumCount - 1))}
                  disabled={mediumCount <= 0}
                >
                  <Minus size={16} color={mediumCount > 0 ? colors.gray[700] : colors.gray[300]} />
                </TouchableOpacity>
                <Text style={styles.stepperCount}>{mediumCount}</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    styles.stepperBtnAdd,
                    (previewData ? previewData.remainingAreaAfter < 1.5 : false) && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => setMediumCount(mediumCount + 1)}
                  disabled={previewData ? previewData.remainingAreaAfter < 1.5 : false}
                >
                  <Plus size={16} color={colors.emerald[700]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pillar Item 3: LARGE */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarInfo}>
                <View style={styles.pillarNameRow}>
                  <Text style={styles.pillarName}>Trụ Lớn</Text>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>48 hốc · 2.0 m²</Text>
                  </View>
                </View>
                <Text style={styles.pillarPrice}>300.000 ₫/tháng</Text>
                {previewData && (
                  <Text style={styles.pillarProRated}>
                    ~{formatCurrency(Math.round(300000 * (previewData.daysRemaining / 30)))} cho {previewData.daysRemaining} ngày
                  </Text>
                )}
              </View>

              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={[styles.stepperBtn, largeCount <= 0 && styles.stepperBtnDisabled]}
                  onPress={() => setLargeCount(Math.max(0, largeCount - 1))}
                  disabled={largeCount <= 0}
                >
                  <Minus size={16} color={largeCount > 0 ? colors.gray[700] : colors.gray[300]} />
                </TouchableOpacity>
                <Text style={styles.stepperCount}>{largeCount}</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    styles.stepperBtnAdd,
                    (previewData ? previewData.remainingAreaAfter < 2.0 : false) && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => setLargeCount(largeCount + 1)}
                  disabled={previewData ? previewData.remainingAreaAfter < 2.0 : false}
                >
                  <Plus size={16} color={colors.emerald[700]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pro-rated Cost Breakdown Card */}
            {previewData && totalSelected > 0 && (
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tổng số trụ thuê thêm:</Text>
                  <Text style={styles.breakdownValue}>{previewData.totalPillars} trụ</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Diện tích chiếm dụng:</Text>
                  <Text style={styles.breakdownValue}>{previewData.requestedArea.toFixed(1)} m²</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Đơn giá trụ gốc:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(previewData.monthlyPillarsPrice)}/tháng</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownSub}>
                    Tính theo thời hạn ({previewData.daysRemaining} ngày / 30 ngày):
                  </Text>
                  <Text style={styles.breakdownSub}>
                    {(previewData.daysRemaining / 30).toFixed(2)} tháng
                  </Text>
                </View>

                <View style={styles.breakdownDivider} />

                <View style={styles.breakdownTotalRow}>
                  <Text style={styles.breakdownTotalLabel}>Tổng thanh toán pro-rated:</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {formatCurrency(previewData.totalAmount)}
                  </Text>
                </View>
              </View>
            )}

            {/* Note & Workflow Info */}
            <View style={styles.infoBox}>
              <Info size={16} color="#0284c7" style={{ marginTop: 2 }} />
              <Text style={styles.infoBoxText}>
                <Text style={{ fontWeight: '700' }}>Quy trình thực hiện: </Text>
                Sau khi thanh toán thành công, hệ thống tự động cấp phát trụ mới và giao việc cho nhân viên vườn lắp đặt. Bạn có thể vào mục <Text style={{ fontWeight: '700' }}>"Trồng cây mới"</Text> để bắt đầu chọn giống rau trồng trên trụ.
              </Text>
            </View>

            {/* Error Box */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.btnCancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnSubmit,
                (submitting || totalSelected <= 0 || (previewData && !previewData.canAdd)) && styles.btnSubmitDisabled,
              ]}
              onPress={handleConfirmAndPay}
              disabled={submitting || totalSelected <= 0 || (previewData ? !previewData.canAdd : false)}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <CreditCard size={16} color={colors.white} />
              )}
              <Text style={styles.btnSubmitText}>
                {submitting
                  ? 'Đang tạo giao dịch...'
                  : previewData && previewData.totalAmount > 0
                  ? `Xác nhận & Thanh toán (${formatCurrency(previewData.totalAmount)})`
                  : 'Xác nhận & Thanh toán'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.emerald[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.heading3.fontFamily,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  statCardGreen: {
    backgroundColor: colors.emerald[50],
    borderColor: colors.emerald[200],
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray[600],
    fontFamily: typography.caption.fontFamily,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    fontFamily: typography.heading3.fontFamily,
    marginTop: 2,
  },
  statValueSub: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.gray[500],
  },
  statHint: {
    fontSize: 10,
    color: colors.gray[400],
    marginTop: 2,
  },
  capacityBarWrap: {
    backgroundColor: colors.gray[50],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  capacityBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  capacityBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
  },
  capacityBarDetail: {
    fontSize: 11,
    color: colors.gray[500],
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: radius.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barUsed: {
    height: '100%',
    backgroundColor: colors.emerald[600],
  },
  barRequested: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  barLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.gray[600],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[800],
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingPillText: {
    fontSize: 11,
    color: colors.emerald[600],
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pillarInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  pillarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillarName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  pillBadge: {
    backgroundColor: colors.emerald[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.emerald[200],
  },
  pillBadgeText: {
    fontSize: 10,
    color: colors.emerald[700],
    fontWeight: '600',
  },
  pillarPrice: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
    fontWeight: '500',
  },
  pillarProRated: {
    fontSize: 11,
    color: colors.emerald[700],
    marginTop: 1,
    fontStyle: 'italic',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnAdd: {
    borderColor: colors.emerald[500],
    backgroundColor: colors.emerald[50],
  },
  stepperBtnDisabled: {
    opacity: 0.35,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[100],
  },
  stepperCount: {
    width: 26,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  breakdownCard: {
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[900],
  },
  breakdownSub: {
    fontSize: 11,
    color: colors.gray[500],
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.emerald[200],
    marginVertical: spacing.xs,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[900],
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.emerald[700],
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#0369a1',
  },
  errorBox: {
    backgroundColor: colors.red[100],
    borderWidth: 1,
    borderColor: colors.red[500],
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  errorBoxText: {
    fontSize: 12,
    color: colors.red[700],
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  btnCancel: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  btnSubmit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.emerald[600],
  },
  btnSubmitDisabled: {
    opacity: 0.5,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
