import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { Leaf, MapPin, Calendar } from 'lucide-react-native';
import { bookingApi } from '../../api/bookingApi';
import { formatCurrency } from '../../utils/bookingAdapter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

export default function GardenDetailScreen({ route, navigation }: CustomerStackProps<'GardenDetail'>) {
  const { slot } = route.params;
  const [months, setMonths] = useState('3');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    const duration = parseInt(months, 10);
    if (!duration || duration < 1) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tháng hợp lệ (tối thiểu 1)');
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date();
      startTime.setHours(0, 0, 0, 0);
      const result = await bookingApi.bookSlot({
        slotId: slot.id,
        durationInMonths: duration,
        startTime: startTime.toISOString(),
      });

      if (result.paymentUrl) {
        Alert.alert(
          'Chuyển đến thanh toán',
          'Bạn sẽ được chuyển đến VNPay để hoàn tất thanh toán.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Thanh toán',
              onPress: async () => {
                await Linking.openURL(result.paymentUrl);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Thành công', 'Đặt vườn thành công!');
        navigation.goBack();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể đặt vườn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const totalEstimate = slot.price * (parseInt(months, 10) || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Leaf size={40} color={colors.green[600]} />
        </View>
        <Text style={styles.slotNumber}>Ô vườn {slot.slotNumber}</Text>
        <Text style={styles.price}>{formatCurrency(slot.price)}/tháng</Text>
      </View>

      <Card>
        <View style={styles.infoRow}>
          <MapPin size={18} color={colors.green[600]} />
          <View>
            <Text style={styles.infoLabel}>Vị trí</Text>
            <Text style={styles.infoValue}>{slot.locationName}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Leaf size={18} color={colors.green[600]} />
          <View>
            <Text style={styles.infoLabel}>Cột vườn</Text>
            <Text style={styles.infoValue}>{slot.pillarCode}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={18} color={colors.green[600]} />
          <View>
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <Text style={styles.infoValue}>{slot.status === 'AVAILABLE' ? 'Sẵn sàng thuê' : slot.status}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.bookCard}>
        <Text style={styles.bookTitle}>Đặt thuê</Text>
        <Input
          label="Số tháng thuê"
          value={months}
          onChangeText={setMonths}
          keyboardType="number-pad"
          placeholder="VD: 3"
        />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng ước tính</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalEstimate)}</Text>
        </View>
        <Button title="Xác nhận & Thanh toán VNPay" onPress={handleBook} loading={loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  slotNumber: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.xs },
  price: { ...typography.heading3, color: colors.green[600] },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: { ...typography.caption, color: colors.gray[500] },
  infoValue: { ...typography.body, color: colors.gray[900] },
  bookCard: { marginTop: spacing.md },
  bookTitle: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  totalLabel: { ...typography.body, color: colors.gray[500] },
  totalValue: { ...typography.heading3, color: colors.green[600] },
});
