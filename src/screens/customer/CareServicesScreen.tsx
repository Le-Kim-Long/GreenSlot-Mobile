import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { bookingApi } from '../../api/bookingApi';
import { managerApi, taskApi } from '../../api/taskApi';
import type { BookingHistory, ServiceType, GardeningTaskResponseDTO } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Badge, statusToBadge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/bookingAdapter';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function CareServicesScreen() {
  const [rentals, setRentals] = useState<BookingHistory[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [requests, setRequests] = useState<GardeningTaskResponseDTO[]>([]);
  const [selectedRental, setSelectedRental] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [history, types, reqs] = await Promise.all([
        bookingApi.getHistory().catch(() => []),
        managerApi.getServiceTypes().catch(() => []),
        taskApi.getMyServiceRequests().catch(() => []),
      ]);
      const active = history.filter(r => r.status === 'ACTIVE');
      setRentals(active);
      setServices(types);
      setRequests(reqs);
      
      if (active.length && selectedRental === null) setSelectedRental(active[0].id);
      if (types.length && types[0].id != null && selectedService === null) setSelectedService(types[0].id);
    } catch (e) {
      console.warn('Failed to load care services data:', e);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedRental || !selectedService) {
      Alert.alert('Lỗi', 'Vui lòng chọn vườn và loại dịch vụ');
      return;
    }
    const rental = rentals.find(r => r.id === selectedRental);
    setSubmitting(true);
    try {
      await taskApi.requestService({
        slotId: rental?.slotId || selectedRental,
        serviceTypeId: selectedService,
        description: description.trim() || undefined,
      });
      Alert.alert('Thành công', 'Yêu cầu dịch vụ chăm sóc đã được gửi!');
      setDescription('');
      // Tải lại danh sách yêu cầu dịch vụ
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Đặt dịch vụ chăm sóc cho vườn đang thuê của bạn</Text>

      <Card>
        <Text style={styles.label}>Chọn vườn</Text>
        {rentals.length === 0 ? (
          <Text style={styles.empty}>Không có vườn đang thuê</Text>
        ) : (
          rentals.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.option, selectedRental === r.id && styles.optionSelected]}
              onPress={() => setSelectedRental(r.id)}
            >
              <Text style={styles.optionTitle}>{r.slotNumber}</Text>
              <Text style={styles.optionSub}>{r.locationName}</Text>
            </TouchableOpacity>
          ))
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Loại dịch vụ</Text>
        {services.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.option, selectedService === s.id && styles.optionSelected]}
            onPress={() => { if (s.id != null) setSelectedService(s.id); }}
          >
            <Text style={styles.optionTitle}>{s.name}</Text>
            <Text style={styles.optionSub}>{formatCurrency(s.price)}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Input
        label="Mô tả thêm (tuỳ chọn)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        placeholder="Ghi chú cho nhân viên vườn..."
        style={styles.textarea}
      />

      <Button title="Gửi yêu cầu" onPress={handleSubmit} loading={submitting} disabled={!rentals.length} />

      {/* Danh sách yêu cầu dịch vụ đã gửi */}
      <Text style={[styles.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Yêu cầu đã gửi</Text>
      {requests.length === 0 ? (
        <Card style={{ padding: spacing.md, alignItems: 'center' }}>
          <Text style={styles.empty}>Bạn chưa gửi yêu cầu dịch vụ nào.</Text>
        </Card>
      ) : (
        requests.map((req) => {
          const badgeInfo = statusToBadge(req.status);
          return (
            <Card key={req.id} style={styles.requestCard}>
              <View style={styles.reqHeader}>
                <Text style={styles.reqTitle}>{req.taskName}</Text>
                <Badge label={badgeInfo.label} variant={badgeInfo.variant} />
              </View>
              {req.description ? (
                <Text style={styles.reqDesc}>{req.description}</Text>
              ) : null}
              <View style={styles.reqFooter}>
                <Text style={styles.reqMeta}>
                  Slot: {req.targetSlotNumber || 'N/A'} · Ngày: {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                {req.assignedStaffName ? (
                  <Text style={styles.reqStaff}>NV: {req.assignedStaffName}</Text>
                ) : (
                  <Text style={[styles.reqStaff, { color: colors.gray[400] }]}>Chờ phân công</Text>
                )}
              </View>
            </Card>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { ...typography.body, color: colors.gray[500], marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.green[900], marginBottom: spacing.sm },
  section: { marginTop: spacing.md },
  empty: { ...typography.body, color: colors.gray[400] },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[100],
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  optionTitle: { ...typography.label, color: colors.gray[900] },
  optionSub: { ...typography.caption, color: colors.gray[500] },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  requestCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderColor: colors.gray[200],
    borderWidth: 1,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reqTitle: {
    ...typography.label,
    color: colors.gray[800],
    flex: 1,
    marginRight: spacing.sm,
  },
  reqDesc: {
    ...typography.bodySmall,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  reqFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.xs,
  },
  reqMeta: {
    ...typography.caption,
    color: colors.gray[400],
  },
  reqStaff: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.green[700],
  },
});
