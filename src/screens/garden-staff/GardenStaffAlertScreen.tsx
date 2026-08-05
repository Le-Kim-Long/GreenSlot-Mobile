import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, CheckCircle2, Send, X, ClipboardList, MessageSquare, Camera, RefreshCw } from 'lucide-react-native';
import { alertApi } from '../../api/alertApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { AlertDTO } from '../../types/api';

export default function GardenStaffAlertScreen() {
  const [alertId, setAlertId] = useState('');
  const [status, setStatus] = useState<'RESOLVED' | 'IN_PROGRESS' | 'FAILED'>('RESOLVED');
  const [comment, setComment] = useState('');
  const [evidenceImageUrl, setEvidenceImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<AlertDTO[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const fetchAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const data = await alertApi.getPendingAlerts();
      setPendingAlerts(data || []);
    } catch (err) {
      console.log('Failed to fetch pending alerts:', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSubmit = async () => {
    if (!alertId.trim() || isNaN(Number(alertId))) {
      Alert.alert('Lỗi', 'Vui lòng nhập ID cảnh báo hợp lệ.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ghi chú khắc phục.');
      return;
    }

    setIsSubmitting(true);
    try {
      await alertApi.processAlert({
        alertId: Number(alertId),
        status,
        comment: comment.trim(),
        evidenceImageUrl: evidenceImageUrl.trim() || undefined,
      });

      Alert.alert('Thành công', 'Báo cáo xử lý sự cố đã được gửi.');
      setAlertId('');
      setComment('');
      setEvidenceImageUrl('');
      setStatus('RESOLVED');
      fetchAlerts(); // Refresh the list
    } catch (err) {
      Alert.alert('Thất bại', 'Không thể gửi báo cáo. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner Alert header */}
        <View style={styles.banner}>
          <ShieldAlert size={28} color={colors.white} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Báo cáo xử lý IoT Alert</Text>
            <Text style={styles.bannerSub}>
              Cập nhật kết quả kiểm tra thiết bị hoặc tình trạng ô đất khi hệ thống gửi cảnh báo IoT.
            </Text>
          </View>
        </View>

        {/* Danh sách Alert chưa xử lý */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cảnh Báo Chưa Xử Lý</Text>
          <TouchableOpacity onPress={fetchAlerts} style={styles.refreshBtn}>
            <RefreshCw size={14} color={colors.green[600]} />
            <Text style={styles.refreshText}>Làm mới</Text>
          </TouchableOpacity>
        </View>

        {isLoadingAlerts ? (
          <ActivityIndicator size="small" color={colors.green[600]} style={{ marginVertical: 10 }} />
        ) : pendingAlerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <CheckCircle2 size={24} color={colors.green[500]} />
            <Text style={styles.emptyText}>Tuyệt vời! Hiện không có cảnh báo chưa xử lý nào.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alertsList}>
            {pendingAlerts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.alertItemCard,
                  alertId === item.id.toString() && { borderColor: colors.green[600], borderWidth: 2 },
                ]}
                onPress={() => setAlertId(item.id.toString())}
              >
                <View style={styles.alertCardHeader}>
                  <Text style={styles.alertCardId}>ID: #{item.id}</Text>
                  <Text style={styles.alertCardSeverity}>{item.severity || 'HIGH'}</Text>
                </View>
                <Text style={styles.alertCardType}>{item.alertType}</Text>
                <Text style={styles.alertCardMsg} numberOfLines={2}>{item.message}</Text>
                {item.pillarCode && <Text style={styles.alertCardPillar}>Trụ: {item.pillarCode}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.formCard}>
          {/* Alert ID */}
          <Text style={styles.label}>Mã Cảnh Báo (Alert ID) *</Text>
          <View style={styles.inputContainer}>
            <ClipboardList size={18} color={colors.gray[400]} />
            <TextInput
              keyboardType="numeric"
              placeholder="VD: 12"
              style={styles.input}
              value={alertId}
              onChangeText={setAlertId}
            />
          </View>

          {/* Status picker */}
          <Text style={styles.label}>Kết quả xử lý *</Text>
          <View style={styles.statusRow}>
            {(['RESOLVED', 'IN_PROGRESS', 'FAILED'] as const).map((s) => {
              const isActive = status === s;
              let btnStyle = {};
              let activeTxt: string = colors.gray[600];


              if (isActive) {
                if (s === 'RESOLVED') {
                  btnStyle = { borderColor: colors.green[600], backgroundColor: colors.green[50] };
                  activeTxt = colors.green[700];
                } else if (s === 'IN_PROGRESS') {
                  btnStyle = { borderColor: '#2563eb', backgroundColor: '#eff6ff' };
                  activeTxt = '#1d4ed8';
                } else {
                  btnStyle = { borderColor: '#dc2626', backgroundColor: '#fef2f2' };
                  activeTxt = '#b91c1c';
                }
              }

              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, btnStyle]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusBtnText, isActive && { color: activeTxt, fontWeight: '700' }]}>
                    {s === 'RESOLVED' ? 'Hoàn thành' : s === 'IN_PROGRESS' ? 'Đang xử lý' : 'Thất bại'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ghi chú */}
          <Text style={styles.label}>Ghi chú biện pháp khắc phục *</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <MessageSquare size={18} color={colors.gray[400]} style={{ marginTop: 8 }} />
            <TextInput
              placeholder="Mô tả công việc đã làm để khắc phục (tưới cây, thay máy bơm, kiểm tra van tưới...)"
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
              value={comment}
              onChangeText={setComment}
            />
          </View>

          {/* Image Url */}
          <Text style={styles.label}>Ảnh chụp hiện trường (URL)</Text>
          <View style={styles.inputContainer}>
            <Camera size={18} color={colors.gray[400]} />
            <TextInput
              placeholder="Nhập URL hình ảnh bằng chứng..."
              style={styles.input}
              value={evidenceImageUrl}
              onChangeText={setEvidenceImageUrl}
            />
          </View>

          {/* Submit btn */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Send size={18} color={colors.white} />
                <Text style={styles.submitBtnText}>Gửi báo cáo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    height: 46,
    marginBottom: spacing.xs,
  },
  textAreaContainer: {
    height: 90,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gray[900],
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.xs,
  },
  statusBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBtnText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    shadowColor: colors.green[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[800],
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  refreshText: {
    fontSize: 12,
    color: colors.green[600],
    fontWeight: '600',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
  alertsList: {
    gap: 12,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  alertItemCard: {
    width: 220,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCardId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[600],
  },
  alertCardSeverity: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertCardType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[800],
  },
  alertCardMsg: {
    fontSize: 12,
    color: colors.gray[500],
    lineHeight: 16,
  },
  alertCardPillar: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green[700],
    backgroundColor: colors.green[50],
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
});
