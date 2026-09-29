import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Clock,
  X,
  CreditCard,
  Building2,
  Calendar,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { formatCurrency } from '../../utils/bookingAdapter';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { openAndWaitForPayment, getMobileRedirectUrl } from '../../utils/paymentFlow';

interface ExtendRentalModalProps {
  visible: boolean;
  rental: BookingHistory | null;
  onClose: () => void;
  onPaymentSettled: (
    status: 'success' | 'failed' | 'pending',
    callback: any,
    rentalId: number
  ) => void;
}

const QUICK_MONTHS = [1, 3, 6, 12, 24];

export function ExtendRentalModal({
  visible,
  rental,
  onClose,
  onPaymentSettled,
}: ExtendRentalModalProps) {
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendMonthsInput, setExtendMonthsInput] = useState('1');
  const [extendMonthsError, setExtendMonthsError] = useState('');
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState('');

  useEffect(() => {
    if (visible && rental) {
      setExtendMonths(1);
      setExtendMonthsInput('1');
      setExtendMonthsError('');
      setExtendError('');
      setExtending(false);
    }
  }, [visible, rental?.id]);

  const handleMonthsChange = (rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '');
    setExtendMonthsInput(cleaned);

    if (!cleaned) {
      setExtendMonths(0);
      setExtendMonthsError('Vui lòng nhập số tháng gia hạn (tối thiểu 1 tháng).');
      return;
    }

    const num = parseInt(cleaned, 10);
    if (isNaN(num) || num < 1) {
      setExtendMonths(0);
      setExtendMonthsError('Số tháng gia hạn phải là số nguyên dương.');
      return;
    }

    if (num > 120) {
      setExtendMonths(num);
      setExtendMonthsError('Số tháng gia hạn tối đa là 120 tháng (10 năm).');
      return;
    }

    setExtendMonths(num);
    setExtendMonthsError('');
    setExtendError('');
  };

  // Unit prices — computed unconditionally (rental may be null, use optional chaining)
  const extLandPrice = rental?.landPrice ?? 0;
  const extPillarsPrice =
    rental?.monthlyPillarsPrice ??
    (rental?.pillars?.reduce((sum, p) => sum + (p.price ?? 0), 0) ?? 0);
  const extUnitPrice = rental?.monthlyPrice || (extLandPrice + extPillarsPrice);
  const extTotalCost = (extendMonths > 0 ? extendMonths : 0) * extUnitPrice;
  const pillarsCount = rental?.pillars?.length || rental?.pillarCodes?.length || 1;

  // New end date calculation — must be before any early return (Rules of Hooks)
  const newEndDate = useMemo(() => {
    if (!rental?.endDate) return '--';
    let end: Date;
    if (rental.endDate.includes('/')) {
      const parts = rental.endDate.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        end = new Date(y, m - 1, d);
      } else {
        end = new Date();
      }
    } else {
      end = new Date(rental.endDate);
    }
    if (isNaN(end.getTime())) return '--';
    const next = new Date(end);
    next.setMonth(next.getMonth() + (extendMonths > 0 ? extendMonths : 0));
    return `${next.getDate().toString().padStart(2, '0')}/${(next.getMonth() + 1).toString().padStart(2, '0')}/${next.getFullYear()}`;
  }, [rental?.endDate, extendMonths]);

  if (!rental) return null;

  const handleConfirmAndPay = async () => {
    if (!extendMonths || extendMonths < 1 || Boolean(extendMonthsError)) {
      setExtendError('Vui lòng nhập số tháng gia hạn hợp lệ (tối thiểu 1 tháng).');
      return;
    }
    if (extendMonths > 120) {
      setExtendError('Số tháng gia hạn không được vượt quá 120 tháng (10 năm).');
      return;
    }

    setExtending(true);
    setExtendError('');

    try {
      const res = await bookingApi.extendBooking({
        rentalId: rental.id,
        durationInMonths: extendMonths,
        isMobile: true,
        redirectUrl: getMobileRedirectUrl(),
      });

      if (!res.paymentUrl) {
        Alert.alert('Lỗi', 'Không nhận được liên kết thanh toán. Vui lòng thử lại.');
        setExtending(false);
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
      const msg = err?.response?.data?.message || 'Gia hạn thất bại. Vui lòng thử lại.';
      setExtendError(msg);
      Alert.alert('Thất bại', msg);
    } finally {
      setExtending(false);
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
                <Clock size={20} color="#1d4ed8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Gia hạn hợp đồng</Text>
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
            {/* Input & Quick Chips */}
            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <Text style={styles.inputLabel}>Số tháng muốn gia hạn</Text>
                <Text style={styles.inputHint}>(Tối thiểu 1 tháng, tối đa 120 tháng)</Text>
              </View>

              <View style={[styles.inputWrapper, extendMonthsError ? styles.inputErrorBorder : null]}>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={extendMonthsInput}
                  onChangeText={handleMonthsChange}
                  placeholder="Nhập số tháng..."
                  placeholderTextColor={colors.gray[400]}
                />
                <Text style={styles.unitSuffix}>tháng</Text>
              </View>

              {extendMonthsError ? (
                <Text style={styles.inputErrorText}>⚠️ {extendMonthsError}</Text>
              ) : null}

              {/* Quick Select Chips */}
              <View style={styles.quickChipsRow}>
                {QUICK_MONTHS.map(m => {
                  const isSelected = extendMonths === m && !extendMonthsError;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.quickChip, isSelected && styles.quickChipActive]}
                      onPress={() => {
                        setExtendMonthsInput(m.toString());
                        setExtendMonths(m);
                        setExtendMonthsError('');
                        setExtendError('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}
                        numberOfLines={1}
                      >
                        {m} tháng
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Extension Preview */}
            <View style={styles.datePreviewCard}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>📅 Hạn hiện tại</Text>
                <Text style={styles.dateBlockValue}>{rental.endDate}</Text>
              </View>
              <ChevronRight size={18} color={colors.green[600]} />
              <View style={styles.dateBlock}>
                <Text style={styles.dateBlockLabel}>🏁 Hạn mới dự kiến</Text>
                <Text style={[styles.dateBlockValue, { color: colors.emerald[700] }]}>
                  {newEndDate}
                </Text>
              </View>
            </View>

            {/* Detailed Price Breakdown (Transparent like FE) */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tiền thuê đất ô vườn:</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(extLandPrice)}/tháng</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tiền thuê trụ ({pillarsCount} trụ):</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(extPillarsPrice)}/tháng</Text>
              </View>

              {/* Nested Pillar List */}
              {rental.pillars && rental.pillars.length > 0 && (
                <View style={styles.pillarsList}>
                  {rental.pillars.map((p, idx) => {
                    const type = p.pillarType?.toUpperCase();
                    const holes = p.capacityHoles || (type === 'LARGE' ? 48 : type === 'MEDIUM' ? 36 : 24);
                    const label =
                      type === 'LARGE' || holes >= 48
                        ? `Trụ Lớn (${holes} hốc)`
                        : type === 'MEDIUM' || holes >= 36
                        ? `Trụ Vừa (${holes} hốc)`
                        : `Trụ Nhỏ (${holes} hốc)`;
                    return (
                      <View key={p.id || idx} style={styles.pillarLine}>
                        <Text style={styles.pillarLineCode}>
                          • {p.pillarCode} - {label}
                        </Text>
                        <Text style={styles.pillarLinePrice}>
                          {formatCurrency(p.price || 0)}/tháng
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: '600' }]}>
                  Tổng đơn giá thuê ô & trụ:
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.emerald[800] }]}>
                  {formatCurrency(extUnitPrice)}/tháng
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Thời gian gia hạn:</Text>
                <Text style={styles.breakdownValue}>
                  {extendMonths > 0 ? `${extendMonths} tháng` : '--'}
                </Text>
              </View>

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>Tổng tiền cần thanh toán:</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(extTotalCost)}</Text>
              </View>
            </View>

            {/* Error Message */}
            {extendError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {extendError}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={extending}>
              <Text style={styles.btnCancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnSubmit,
                (extending || !extendMonths || extendMonths < 1 || Boolean(extendMonthsError)) &&
                  styles.btnSubmitDisabled,
              ]}
              onPress={handleConfirmAndPay}
              disabled={extending || !extendMonths || extendMonths < 1 || Boolean(extendMonthsError)}
            >
              {extending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <CreditCard size={16} color={colors.white} />
              )}
              <Text style={styles.btnSubmitText}>
                {extending
                  ? 'Đang xử lý...'
                  : extTotalCost > 0
                  ? `Xác nhận & Thanh toán (${formatCurrency(extTotalCost)})`
                  : 'Xác nhận & Thanh toán VNPay'}
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
    maxHeight: '90%',
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
    backgroundColor: '#eff6ff',
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
  inputSection: {
    marginBottom: spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[800],
  },
  inputHint: {
    fontSize: 11,
    color: colors.gray[400],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
  },
  inputErrorBorder: {
    borderColor: colors.red[500],
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  unitSuffix: {
    fontSize: 13,
    color: colors.gray[500],
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  inputErrorText: {
    fontSize: 11,
    color: colors.red[600],
    marginTop: 4,
    fontWeight: '500',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipActive: {
    backgroundColor: colors.emerald[600],
    borderColor: colors.emerald[600],
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[700],
    textAlign: 'center',
  },
  quickChipTextActive: {
    color: colors.white,
  },
  datePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateBlock: {
    flex: 1,
  },
  dateBlockLabel: {
    fontSize: 11,
    color: colors.gray[500],
    marginBottom: 2,
  },
  dateBlockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[800],
  },
  breakdownCard: {
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 5,
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
  pillarsList: {
    borderLeftWidth: 2,
    borderLeftColor: colors.emerald[300],
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
    gap: 3,
    backgroundColor: 'rgba(209, 250, 229, 0.4)',
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillarLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarLineCode: {
    fontSize: 11,
    color: colors.gray[700],
    flex: 1,
  },
  pillarLinePrice: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[800],
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
