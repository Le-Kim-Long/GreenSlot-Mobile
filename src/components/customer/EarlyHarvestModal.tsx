import React, { useState, useEffect } from 'react';
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
  Zap,
  X,
  CheckCircle2,
  Sprout,
  Users,
  ChevronDown,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

interface EarlyHarvestModalProps {
  visible: boolean;
  rental: BookingHistory | null;
  onClose: () => void;
  onSuccess: (method: 'SELF' | 'STAFF', notes?: string, pillarCode?: string) => void;
}

export function EarlyHarvestModal({
  visible,
  rental,
  onClose,
  onSuccess,
}: EarlyHarvestModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'SELF' | 'STAFF'>('STAFF');
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPillarDropdown, setShowPillarDropdown] = useState(false);

  useEffect(() => {
    if (visible && rental) {
      setSelectedMethod('STAFF');
      setSelectedPillar('');
      setNotes('');
      setError('');
      setSubmitting(false);
      setShowPillarDropdown(false);
    }
  }, [visible, rental]);

  if (!rental) return null;

  const pillars = (rental.pillars || []).filter(
    p => p.pillarCode && p.pillarCode !== 'arduino-greenhouse-01'
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await bookingApi.recordHarvestDecision(
        rental.id,
        selectedMethod,
        selectedPillar || undefined,
        notes.trim() || undefined
      );
      onClose();
      onSuccess(selectedMethod, notes.trim() || undefined, selectedPillar || undefined);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gửi yêu cầu thu hoạch sớm thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPillarLabel = () => {
    if (!selectedPillar) return '🌱 Tất cả các trụ đang canh tác trong ô';
    const found = pillars.find(p => p.pillarCode === selectedPillar);
    if (!found) return `Trụ ${selectedPillar}`;
    const tree = found.treeName || rental.treeName;
    return `Trụ ${found.pillarCode}${tree ? ` (${tree})` : ''}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Zap size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Yêu cầu thu hoạch sớm</Text>
                <Text style={styles.headerSubtitle}>
                  Ô {rental.slotNumber} {rental.locationName ? `· ${rental.locationName}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={submitting}>
              <X size={20} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Banner hướng dẫn */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                💡 Bạn có thể chủ động đề xuất thu hoạch khi nhận thấy rau đã đủ kích thước thu hái qua camera giám sát.
              </Text>
            </View>

            {/* Chọn trụ nếu ô có nhiều trụ */}
            {pillars.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Chọn trụ muốn thu hoạch sớm:</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowPillarDropdown(!showPillarDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {getPillarLabel()}
                  </Text>
                  <ChevronDown size={18} color={colors.gray[500]} />
                </TouchableOpacity>

                {showPillarDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, !selectedPillar && styles.dropdownItemActive]}
                      onPress={() => {
                        setSelectedPillar('');
                        setShowPillarDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !selectedPillar && styles.dropdownItemTextActive]}>
                        🌱 Tất cả các trụ đang canh tác trong ô
                      </Text>
                    </TouchableOpacity>
                    {pillars.map((p, idx) => {
                      const tree = p.treeName || rental.treeName;
                      const isSelected = selectedPillar === p.pillarCode;
                      return (
                        <TouchableOpacity
                          key={p.id || idx}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                          onPress={() => {
                            setSelectedPillar(p.pillarCode);
                            setShowPillarDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                            Trụ {p.pillarCode} {tree ? `(Đang trồng: ${tree})` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Chọn hình thức thu hoạch */}
            <View style={styles.section}>
              <Text style={styles.label}>Hình thức thu hoạch:</Text>
              
              {/* Option: Nhân viên */}
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === 'STAFF' && styles.methodCardActive]}
                onPress={() => setSelectedMethod('STAFF')}
                activeOpacity={0.8}
              >
                <View style={styles.methodHeader}>
                  <View style={[styles.methodIcon, selectedMethod === 'STAFF' && styles.methodIconActive]}>
                    <Users size={18} color={selectedMethod === 'STAFF' ? '#047857' : colors.gray[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodTitle, selectedMethod === 'STAFF' && styles.methodTitleActive]}>
                      Nhờ nhân viên thu hoạch
                    </Text>
                    <Text style={styles.methodDesc}>
                      Nhân viên ca trực sẽ thu hoạch, chụp ảnh nghiệm thu và liên hệ bàn giao rau sạch cho bạn.
                    </Text>
                  </View>
                  <CheckCircle2
                    size={20}
                    color={selectedMethod === 'STAFF' ? '#059669' : colors.gray[300]}
                  />
                </View>
              </TouchableOpacity>

              {/* Option: Tự thu hoạch */}
              <TouchableOpacity
                style={[styles.methodCard, selectedMethod === 'SELF' && styles.methodCardActive]}
                onPress={() => setSelectedMethod('SELF')}
                activeOpacity={0.8}
              >
                <View style={styles.methodHeader}>
                  <View style={[styles.methodIcon, selectedMethod === 'SELF' && styles.methodIconActive]}>
                    <Sprout size={18} color={selectedMethod === 'SELF' ? '#047857' : colors.gray[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodTitle, selectedMethod === 'SELF' && styles.methodTitleActive]}>
                      Tôi tự thu hoạch
                    </Text>
                    <Text style={styles.methodDesc}>
                      Bạn tự đến vườn thu hoạch trải nghiệm. Hệ thống lưu lịch sử và giải phóng trụ ngay.
                    </Text>
                  </View>
                  <CheckCircle2
                    size={20}
                    color={selectedMethod === 'SELF' ? '#059669' : colors.gray[300]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Ghi chú dặn dò */}
            <View style={styles.section}>
              <Text style={styles.label}>Ghi chú dặn dò (tùy chọn):</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder={selectedMethod === 'STAFF' ? "Ví dụ: Giao trước 17h, để nguyên rễ rau..." : "Ghi chú thêm nếu có..."}
                placeholderTextColor={colors.gray[400]}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Zap size={16} color={colors.white} />
                  <Text style={styles.submitBtnText}>Xác nhận thu hoạch sớm</Text>
                </>
              )}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.sm,
  },
  infoBoxText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#92400E',
    lineHeight: 18,
  },
  section: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
    marginBottom: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[800],
    flex: 1,
  },
  dropdownMenu: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  dropdownItemActive: {
    backgroundColor: '#ECFDF5',
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[700],
  },
  dropdownItemTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#065F46',
  },
  methodCard: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  methodCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconActive: {
    backgroundColor: '#D1FAE5',
  },
  methodTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
  },
  methodTitleActive: {
    color: '#065F46',
  },
  methodDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: 16,
  },
  textArea: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[900],
    minHeight: 70,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#DC2626',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[600],
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: '#D97706',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
});
