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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { alertApi } from '../../api/alertApi';
import { colors } from '../../theme/colors';

export default function AlertProcessingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const alertId = route.params?.alertId;

  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'RESOLVED' | 'PENDING' | 'IGNORED'>('RESOLVED');

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập ghi chú xử lý!');
      return;
    }

    try {
      setLoading(true);
      await alertApi.processAlert({
        alertId,
        status,
        comment,
      });
      Alert.alert('Thành công', 'Đã xử lý cảnh báo thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Process alert error:', error);
      Alert.alert('Lỗi', 'Không thể xử lý cảnh báo. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Xử Lý Cảnh Báo #{alertId || 'Chung'}</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Trạng thái xử lý</Text>
        <View style={styles.statusRow}>
          {[
            { key: 'RESOLVED', label: 'Đã giải quyết' },
            { key: 'PENDING', label: 'Đang theo dõi' },
            { key: 'IGNORED', label: 'Bỏ qua' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.statusBtn,
                status === item.key && styles.activeStatusBtn,
              ]}
              onPress={() => setStatus(item.key as any)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  status === item.key && styles.activeStatusBtnText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Ghi chú xử lý / Biện pháp khắc phục</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="Nhập chi tiết quá trình xử lý..."
          value={comment}
          onChangeText={setComment}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>Xác nhận Xử lý</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.gray[900], marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  activeStatusBtn: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  statusBtnText: { fontSize: 13, color: colors.gray[700], fontWeight: '500' },
  activeStatusBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.green[600],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

