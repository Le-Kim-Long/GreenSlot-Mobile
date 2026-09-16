import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ShieldAlert,
  MapPin,
  Trees,
  Gauge,
  Clock,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  X,
  Activity,
  MessageSquare,
  AlertCircle,
} from 'lucide-react-native';
import { alertApi } from '../../api/alertApi';
import { taskApi } from '../../api/taskApi';
import { colors } from '../../theme/colors';
import { spacing, radius, typography } from '../../theme/typography';
import type { AlertDTO } from '../../types/api';

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} ${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export default function GardenStaffAlertProcessScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const alertItem: AlertDTO = route.params?.alert;

  const [status, setStatus] = useState<'RESOLVED' | 'IN_PROGRESS' | 'FAILED'>('RESOLVED');
  const [comment, setComment] = useState('');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  if (!alertItem) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xử lý cảnh báo</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color={colors.red[500]} />
          <Text style={styles.notFoundText}>Không tìm thấy thông tin cảnh báo.</Text>
          <TouchableOpacity style={styles.btnReturn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnReturnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleTakePhoto = async () => {
    try {
      const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền sử dụng Máy ảnh để chụp hình chứng minh xử lý.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể khởi động camera: ' + (e?.message || ''));
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập Thư viện ảnh để chọn hình chứng minh xử lý.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể mở thư viện: ' + (e?.message || ''));
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập ghi chú biện pháp khắc phục sự cố!');
      return;
    }

    if (!capturedUri) {
      Alert.alert('Yêu cầu ảnh chứng minh', 'Theo quy trình công việc, bạn phải đính kèm ảnh chứng minh kết quả xử lý sự cố trước khi gửi báo cáo.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgressText('Đang tải ảnh bằng chứng lên...');

    try {
      let finalImageUrl = capturedUri;
      if (capturedUri.startsWith('file:') || capturedUri.startsWith('content:') || capturedUri.startsWith('ph:')) {
        finalImageUrl = await taskApi.uploadEvidenceImage(capturedUri);
      }

      setUploadProgressText('Đang gửi báo cáo xử lý...');
      await alertApi.processAlert({
        alertId: alertItem.id,
        status,
        comment: comment.trim(),
        evidenceImageUrl: finalImageUrl,
      });

      Alert.alert('Thành công', 'Đã gửi báo cáo xử lý cảnh báo thành công!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Lỗi khi gửi báo cáo xử lý cảnh báo:', err);
      const msg = err?.response?.data?.message || 'Không thể gửi báo cáo xử lý. Vui lòng thử lại!';
      Alert.alert('Thất bại', msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <ArrowLeft size={20} color={colors.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xử lý Cảnh Báo #{alertItem.id}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Card Tóm tắt Sự Cố */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardTop}>
            <View style={styles.alertIconBadge}>
              <ShieldAlert size={20} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.typeBadgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{alertItem.alertType || 'CẢNH BÁO IOT'}</Text>
                </View>
                <Text style={styles.alertIdText}>#{alertItem.id}</Text>
              </View>
              <Text style={styles.alertMessageText}>{alertItem.description || alertItem.message}</Text>
            </View>
          </View>

          {/* Chips Metadata */}
          <View style={styles.metaRow}>
            {alertItem.pillarCode && (
              <View style={styles.metaChip}>
                <MapPin size={13} color={colors.gray[500]} />
                <Text style={styles.metaChipText}>Trụ: {alertItem.pillarCode}</Text>
              </View>
            )}
            {alertItem.slotNumber && (
              <View style={styles.metaChip}>
                <MapPin size={13} color={colors.gray[500]} />
                <Text style={styles.metaChipText}>Ô: {alertItem.slotNumber}</Text>
              </View>
            )}
            {alertItem.treeName && (
              <View style={styles.metaChip}>
                <Trees size={13} color={colors.green[600]} />
                <Text style={styles.metaChipText}>Cây: {alertItem.treeName}</Text>
              </View>
            )}
            {alertItem.actualValue != null && alertItem.thresholdValue != null && (
              <View style={styles.metaChip}>
                <Gauge size={13} color="#d97706" />
                <Text style={styles.metaChipText}>
                  {alertItem.sensorType || 'Chỉ số'}: <Text style={{ fontWeight: '700' }}>{alertItem.actualValue}</Text> (ngưỡng {alertItem.thresholdValue})
                </Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Clock size={13} color={colors.gray[400]} />
              <Text style={styles.metaChipText}>{formatDateTime(alertItem.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* SECTION: Trạng thái xử lý */}
        <View style={styles.formSection}>
          <View style={styles.sectionLabelRow}>
            <Activity size={16} color={colors.green[600]} />
            <Text style={styles.sectionLabel}>TRẠNG THÁI XỬ LÝ</Text>
          </View>
          <View style={styles.statusGroup}>
            {[
              { val: 'RESOLVED', label: 'Đã hoàn thành', activeCls: styles.statusResolvedActive },
              { val: 'IN_PROGRESS', label: 'Đang xử lý', activeCls: styles.statusProgressActive },
              { val: 'FAILED', label: 'Thất bại', activeCls: styles.statusFailedActive },
            ].map((opt) => {
              const isSelected = status === opt.val;
              return (
                <TouchableOpacity
                  key={opt.val}
                  style={[styles.statusOption, isSelected && opt.activeCls]}
                  onPress={() => setStatus(opt.val as any)}
                  activeOpacity={0.8}
                >
                  {isSelected && <CheckCircle2 size={15} color={opt.val === 'RESOLVED' ? colors.green[600] : opt.val === 'IN_PROGRESS' ? '#2563eb' : '#dc2626'} />}
                  <Text style={[styles.statusOptionText, isSelected && styles.statusOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION: Ghi chú cách khắc phục */}
        <View style={styles.formSection}>
          <View style={styles.sectionLabelRow}>
            <MessageSquare size={16} color={colors.green[600]} />
            <Text style={styles.sectionLabel}>
              GHI CHÚ CÁCH KHẮC PHỤC <Text style={{ color: colors.red[500] }}>*</Text>
            </Text>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="VD: Đã kiểm tra cảm biến, tiến hành tưới bổ sung 15 phút, cân chỉnh lại dung dịch..."
            placeholderTextColor={colors.gray[400]}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* SECTION: Ảnh bằng chứng (Bắt buộc theo workflow công việc) */}
        <View style={styles.formSection}>
          <View style={styles.sectionLabelRow}>
            <ImageIcon size={16} color={colors.green[600]} />
            <Text style={styles.sectionLabel}>
              ẢNH BẰNG CHỨNG XỬ LÝ <Text style={{ color: colors.red[500] }}>* (BẮT BUỘC)</Text>
            </Text>
          </View>
          <Text style={styles.sectionHelper}>
            Chụp hoặc chọn hình ảnh chụp hiện trường ô vườn sau khi đã khắc phục sự cố.
          </Text>

          {capturedUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setCapturedUri(null)}
                disabled={isSubmitting}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyImagePlaceholder}>
              <ImageIcon size={32} color={colors.gray[300]} />
              <Text style={styles.emptyImageText}>Chưa có ảnh bằng chứng nào được đính kèm</Text>
            </View>
          )}

          {/* Action Buttons: Chụp ảnh & Chọn thư viện */}
          <View style={styles.imageBtnRow}>
            <TouchableOpacity
              style={styles.imageActionBtn}
              onPress={handleTakePhoto}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Camera size={16} color={colors.green[700]} />
              <Text style={styles.imageActionBtnText}>Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.imageActionBtn, styles.imageActionBtnSecondary]}
              onPress={handlePickFromGallery}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <ImageIcon size={16} color={colors.gray[700]} />
              <Text style={[styles.imageActionBtnText, { color: colors.gray[800] }]}>Chọn từ thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitBtnText}>{uploadProgressText || 'Đang gửi...'}</Text>
            </View>
          ) : (
            <View style={styles.submittingRow}>
              <Send size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Gửi báo cáo xử lý</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[900],
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardTop: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertIconBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#b45309',
  },
  alertIdText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[400],
  },
  alertMessageText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[800],
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  metaChipText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[600],
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
    letterSpacing: 0.5,
  },
  sectionHelper: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginBottom: spacing.sm,
  },
  statusGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  statusResolvedActive: {
    borderColor: colors.green[500],
    backgroundColor: colors.green[50],
  },
  statusProgressActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  statusFailedActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  statusOptionText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  statusOptionTextActive: {
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  textArea: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[800],
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  previewContainer: {
    position: 'relative',
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImagePlaceholder: {
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.gray[50],
    marginBottom: spacing.sm,
  },
  emptyImageText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[400],
  },
  imageBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  imageActionBtnSecondary: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  imageActionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  submitBtn: {
    backgroundColor: colors.green[600],
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green[600],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    marginTop: spacing.xs,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  btnReturn: {
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnReturnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
