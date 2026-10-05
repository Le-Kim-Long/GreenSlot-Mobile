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
  Zap,
  X,
  Sprout,
  CheckCircle2,
  Layers,
  FileText,
  UserCheck,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import type { BookingHistory } from '../../types/api';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

interface EarlyHarvestModalProps {
  visible: boolean;
  rental: BookingHistory | null;
  initialPillarCode?: string;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export function EarlyHarvestModal({
  visible,
  rental,
  initialPillarCode,
  onClose,
  onSuccess,
}: EarlyHarvestModalProps) {
  const [method, setMethod] = useState<'STAFF' | 'SELF'>('STAFF');
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pillars parsing & availability
  const { availablePillars, hasPlantedPillars, defaultPlantedPillarCode } = useMemo(() => {
    if (!rental) {
      return { availablePillars: [], hasPlantedPillars: false, defaultPlantedPillarCode: '' };
    }

    if (rental.pillars && rental.pillars.length > 0) {
      const list = rental.pillars.map((p) => {
        const treeOnPillar = p.treeName || (rental.treeName && rental.pillars?.length === 1 ? rental.treeName : undefined);
        const hasTree = !!treeOnPillar;
        return {
          pillarCode: p.pillarCode,
          treeName: treeOnPillar,
          pillarType: p.pillarTypeName || p.pillarType || 'Trụ khí canh',
          hasTree,
        };
      });

      const planted = list.filter((p) => p.hasTree);
      return {
        availablePillars: list,
        hasPlantedPillars: planted.length > 0,
        defaultPlantedPillarCode: planted.length === 1 ? planted[0].pillarCode : '',
      };
    }

    // Trường hợp dữ liệu cũ chỉ có rental.pillarCodes hoặc rental.pillarCode
    const codes = rental.pillarCodes && rental.pillarCodes.length > 0
      ? rental.pillarCodes
      : rental.pillarCode
      ? [rental.pillarCode]
      : [];

    const hasTree = !!rental.treeName;
    const list = codes.map((c) => ({
      pillarCode: c,
      treeName: rental.treeName,
      pillarType: 'Trụ khí canh',
      hasTree,
    }));

    return {
      availablePillars: list,
      hasPlantedPillars: hasTree && list.length > 0,
      defaultPlantedPillarCode: list.length === 1 ? list[0].pillarCode : '',
    };
  }, [rental]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setMethod('STAFF');
      setNotes('');
      setError('');
      if (initialPillarCode) {
        setSelectedPillar(initialPillarCode);
      } else {
        setSelectedPillar(defaultPlantedPillarCode);
      }
    }
  }, [visible, initialPillarCode, defaultPlantedPillarCode]);

  if (!rental) return null;

  const handleSubmit = async () => {
    // Kiểm tra nếu chọn trụ cụ thể mà trụ đó chưa có cây trồng
    if (selectedPillar) {
      const target = availablePillars.find((p) => p.pillarCode === selectedPillar);
      if (target && !target.hasTree) {
        Alert.alert(
          'Không thể thu hoạch trụ này',
          `Trụ ${selectedPillar} hiện chưa có cây trồng (đã thu hoạch hoặc chưa gieo giống). Vui lòng chọn trụ đang canh tác.`
        );
        return;
      }
    } else {
      // Trường hợp chọn tất cả các trụ
      if (!hasPlantedPillars) {
        Alert.alert(
          'Không thể thu hoạch sớm',
          'Hiện không có trụ nào trong ô vườn đang có cây trồng để thu hoạch sớm.'
        );
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      await bookingApi.recordHarvestDecision(
        rental.id,
        method,
        selectedPillar || undefined,
        notes.trim() || undefined
      );

      const isSelf = method === 'SELF';
      const slotNum = rental.slotNumber || '';
      const successMsg = isSelf
        ? `Đã ghi nhận bạn tự thu hoạch Ô ${slotNum}! Lịch sử thu hoạch đã được lưu và trụ canh tác đã sẵn sàng gieo giống mới.`
        : `Yêu cầu thu hoạch sớm Ô ${slotNum} đã được gửi đến nhân viên làm vườn ca trực!`;

      onSuccess(successMsg);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gửi yêu cầu thu hoạch sớm thất bại. Vui lòng thử lại.';
      setError(msg);
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
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Zap size={20} color="#d97706" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Yêu cầu thu hoạch sớm</Text>
                <Text style={styles.headerSubtitle}>
                  Ô vườn {rental.slotNumber} · {rental.locationName || 'GreenSlot Farm'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Banner hướng dẫn */}
            <View style={styles.tipBox}>
              <Info size={16} color="#b45309" style={{ marginTop: 2 }} />
              <Text style={styles.tipText}>
                Thu hoạch sớm giúp bạn chủ động thu hoạch khi rau đã đạt kích thước mong muốn. Sau khi thu hoạch, trụ sẽ được dọn trống để bạn gieo trồng đợt rau mới.
              </Text>
            </View>

            {/* Cảnh báo nếu không có trụ nào có cây */}
            {!hasPlantedPillars && (
              <View style={styles.warningBox}>
                <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Ô vườn chưa có cây trồng</Text>
                  <Text style={styles.warningText}>
                    Tất cả các trụ trong ô vườn này hiện chưa gieo trồng hoặc đã được thu hoạch trước đó. Bạn không thể tạo yêu cầu thu hoạch sớm lúc này.
                  </Text>
                </View>
              </View>
            )}

            {/* 1. Chọn trụ thu hoạch */}
            {availablePillars.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Layers size={15} color={colors.gray[700]} />
                  <Text style={styles.sectionTitle}>Chọn trụ muốn thu hoạch sớm:</Text>
                </View>

                {/* Option: Tất cả các trụ đang canh tác */}
                <TouchableOpacity
                  style={[
                    styles.pillarOption,
                    selectedPillar === '' && styles.pillarOptionActive,
                    !hasPlantedPillars && styles.pillarOptionDisabled,
                  ]}
                  onPress={() => hasPlantedPillars && setSelectedPillar('')}
                  disabled={!hasPlantedPillars}
                >
                  <View style={styles.radioCircle}>
                    {selectedPillar === '' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pillarOptionLabel, selectedPillar === '' && styles.pillarOptionLabelActive]}>
                      Tất cả các trụ đang canh tác trong ô
                    </Text>
                    <Text style={styles.pillarOptionSub}>
                      {hasPlantedPillars
                        ? `Áp dụng cho các trụ đang có cây trồng phát triển`
                        : 'Không có trụ nào đang canh tác'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Danh sách từng trụ */}
                {availablePillars.map((p, idx) => {
                  const isSelected = selectedPillar === p.pillarCode;
                  const canHarvest = p.hasTree;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.pillarOption,
                        isSelected && styles.pillarOptionActive,
                        !canHarvest && styles.pillarOptionDisabled,
                      ]}
                      onPress={() => {
                        if (!canHarvest) {
                          Alert.alert(
                            'Trụ chưa trồng cây mới',
                            `Trụ ${p.pillarCode} hiện chưa có cây trồng (đã được thu hoạch hoặc chưa gieo hạt). Không thể thu hoạch sớm.`
                          );
                          return;
                        }
                        setSelectedPillar(p.pillarCode);
                      }}
                    >
                      <View style={[styles.radioCircle, !canHarvest && styles.radioDisabled]}>
                        {isSelected && canHarvest && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text
                            style={[
                              styles.pillarOptionLabel,
                              isSelected && styles.pillarOptionLabelActive,
                              !canHarvest && styles.textDisabled,
                            ]}
                          >
                            Trụ {p.pillarCode}
                          </Text>
                          {canHarvest ? (
                            <View style={styles.treeBadge}>
                              <Text style={styles.treeBadgeText}>{p.treeName}</Text>
                            </View>
                          ) : (
                            <View style={styles.emptyBadge}>
                              <Text style={styles.emptyBadgeText}>Đã thu hoạch · Chưa trồng mới</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.pillarOptionSub, !canHarvest && styles.textDisabled]}>
                          {canHarvest
                            ? `Loại trụ: ${p.pillarType}`
                            : 'Trụ đang trống, hãy gieo trồng cây mới để canh tác'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 2. Chọn hình thức thu hoạch */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <UserCheck size={15} color={colors.gray[700]} />
                <Text style={styles.sectionTitle}>Hình thức thu hoạch:</Text>
              </View>

              <View style={styles.methodGrid}>
                {/* Method 1: STAFF */}
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    method === 'STAFF' && styles.methodCardActive,
                  ]}
                  onPress={() => setMethod('STAFF')}
                  activeOpacity={0.8}
                >
                  <View style={styles.methodHeader}>
                    <CheckCircle2
                      size={18}
                      color={method === 'STAFF' ? colors.green[600] : colors.gray[300]}
                    />
                    <Text
                      style={[
                        styles.methodTitle,
                        method === 'STAFF' && styles.methodTitleActive,
                      ]}
                    >
                      Nhờ nhân viên thu hoạch
                    </Text>
                  </View>
                  <Text style={styles.methodDesc}>
                    Nhân viên làm vườn ca trực sẽ thu hoạch cẩn thận, chụp ảnh nghiệm thu và bàn giao nông sản cho bạn.
                  </Text>
                </TouchableOpacity>

                {/* Method 2: SELF */}
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    method === 'SELF' && styles.methodCardActive,
                  ]}
                  onPress={() => setMethod('SELF')}
                  activeOpacity={0.8}
                >
                  <View style={styles.methodHeader}>
                    <CheckCircle2
                      size={18}
                      color={method === 'SELF' ? colors.green[600] : colors.gray[300]}
                    />
                    <Text
                      style={[
                        styles.methodTitle,
                        method === 'SELF' && styles.methodTitleActive,
                      ]}
                    >
                      Tôi tự thu hoạch
                    </Text>
                  </View>
                  <Text style={styles.methodDesc}>
                    Bạn tự đến vườn trải nghiệm hái rau sạch. Hệ thống sẽ lưu vào Lịch sử và giải phóng trụ ngay lập tức.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Ghi chú dặn dò */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText size={15} color={colors.gray[700]} />
                <Text style={styles.sectionTitle}>Ghi chú / Dặn dò gửi nhân viên:</Text>
              </View>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder="Ví dụ: Rau đã nở tốt, nhờ nhân viên hái vào sáng sớm mai và bọc màng bảo quản mát giúp tôi..."
                placeholderTextColor={colors.gray[400]}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.btnCancelText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnSubmit,
                (!hasPlantedPillars || submitting) && styles.btnSubmitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!hasPlantedPillars || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Zap size={16} color="#fff" />
                  <Text style={styles.btnSubmitText}>Xác nhận thu hoạch sớm</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: '#fef3c7',
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
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tipBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#dc2626',
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#991b1b',
    marginTop: 2,
    lineHeight: 17,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  pillarOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
  },
  pillarOptionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  pillarOptionDisabled: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    opacity: 0.65,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDisabled: {
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[200],
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#d97706',
  },
  pillarOptionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  pillarOptionLabelActive: {
    color: '#92400e',
  },
  pillarOptionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 2,
  },
  textDisabled: {
    color: colors.gray[400],
  },
  treeBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.green[300],
  },
  treeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },
  emptyBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  emptyBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[500],
  },
  methodGrid: {
    gap: spacing.sm,
  },
  methodCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  methodCardActive: {
    borderColor: colors.green[500],
    backgroundColor: colors.green[50],
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[700],
  },
  methodTitleActive: {
    color: colors.green[800],
  },
  methodDesc: {
    fontSize: 11.5,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    lineHeight: 16,
    paddingLeft: 26,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[800],
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: colors.gray[50],
  },
  errorBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: 'Inter_500Medium',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  btnCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnCancelText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[600],
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d97706',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  btnSubmitDisabled: {
    backgroundColor: colors.gray[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSubmitText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
});
