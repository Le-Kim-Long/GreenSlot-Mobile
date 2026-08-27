import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

const AUTO_NAVIGATE_DELAY = 3000; // 3 giây

type PaymentStatus = 'success' | 'failed' | 'pending';

interface StatusConfig {
  icon: typeof CheckCircle;
  iconColor: string;
  bgColor: string;
  ringColor: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonColor: string;
}

const STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  success: {
    icon: CheckCircle,
    iconColor: colors.green[600],
    bgColor: '#f0fdf4',
    ringColor: colors.green[100],
    title: '🎉 Thanh toán thành công!',
    subtitle: 'Giao dịch đã được xác nhận. Ô vườn của bạn đã được kích hoạt.',
    buttonLabel: 'Xem vườn đang thuê',
    buttonColor: colors.green[600],
  },
  failed: {
    icon: XCircle,
    iconColor: '#dc2626',
    bgColor: '#fef2f2',
    ringColor: '#fee2e2',
    title: '❌ Thanh toán thất bại',
    subtitle: 'Giao dịch không thành công hoặc đã bị hủy. Vui lòng thử lại.',
    buttonLabel: 'Quay lại',
    buttonColor: '#dc2626',
  },
  pending: {
    icon: Clock,
    iconColor: '#d97706',
    bgColor: '#fffbeb',
    ringColor: '#fef3c7',
    title: '⏳ Đang xử lý...',
    subtitle:
      'Giao dịch chưa được xác nhận. Nếu đã thanh toán, vui lòng chờ vài phút rồi kiểm tra lại.',
    buttonLabel: 'Xem trạng thái',
    buttonColor: '#d97706',
  },
};

function formatAmount(amountStr?: string): string | null {
  if (!amountStr) return null;
  // VNPay sends vnp_Amount in VND x 100.
  const num = parseInt(amountStr, 10) / 100;
  if (isNaN(num)) return null;
  return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export default function PaymentResultScreen({
  route,
  navigation,
}: CustomerStackProps<'PaymentResult'>) {
  const params = route.params ?? {};
  const isSuccess = params.status === 'success' || (params as any).responseCode === '00' || (params as any).vnp_ResponseCode === '00';
  const status: PaymentStatus = isSuccess ? 'success' : (params.status === 'failed' ? 'failed' : 'pending');
  const { slotNumber, amount, txnRef, orderInfo, type } = params;
  const isTreePayment = type === 'tree';

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  // Override content for tree planting payments
  const displayTitle = isTreePayment && isSuccess ? '🌱 Thanh toán phôi giống thành công!' : config.title;
  const displaySubtitle = isTreePayment && isSuccess
    ? 'Thanh toán mua phôi giống thành công. Yêu cầu trồng cây của bạn đã được ghi nhận và đang chờ nhà vườn phê duyệt.'
    : isTreePayment && status === 'failed'
      ? 'Thanh toán phôi giống không thành công. Vui lòng thử lại.'
      : config.subtitle;
  const displayButtonLabel = isTreePayment ? 'Xem yêu cầu trồng cây' : config.buttonLabel;

  const [countdown, setCountdown] = useState(AUTO_NAVIGATE_DELAY / 1000);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim, slideAnim]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      goToRentals();
    }, AUTO_NAVIGATE_DELAY);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToRentals = () => {
    if (isTreePayment) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs',
            state: {
              routes: [{ name: 'Rentals' }],
              index: 0,
            },
          },
          { name: 'CustomerTreePlanting' },
        ],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'CustomerTabs',
            state: {
              routes: [{ name: 'Rentals' }],
              index: 0,
            },
          },
        ],
      });
    }
  };

  const formattedAmount = formatAmount(amount);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: config.bgColor }]} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Animated icon */}
        <Animated.View
          style={[
            styles.iconRing,
            { borderColor: config.ringColor, backgroundColor: config.ringColor },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.iconInner}>
            <Icon size={56} color={config.iconColor} strokeWidth={1.5} />
          </View>
        </Animated.View>

        {/* Text & details */}
        <Animated.View
          style={[
            styles.textBlock,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.subtitle}>{displaySubtitle}</Text>

          {(slotNumber || formattedAmount || txnRef) && (
            <View style={styles.detailCard}>
              {slotNumber ? <DetailRow label="Ô vườn" value={`Ô ${slotNumber}`} /> : null}
              {formattedAmount ? <DetailRow label="Số tiền" value={formattedAmount} /> : null}
              {txnRef ? <DetailRow label="Mã GD" value={txnRef} small /> : null}
              {orderInfo ? <DetailRow label="Nội dung" value={orderInfo} small /> : null}
            </View>
          )}

          <Text style={styles.countdown}>
            Tự động chuyển sau{' '}
            <Text style={{ color: config.buttonColor, fontFamily: 'Inter_700Bold' }}>
              {countdown}s
            </Text>
          </Text>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={{ opacity: opacityAnim, width: '100%' }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.buttonColor }]}
            onPress={goToRentals}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{displayButtonLabel}</Text>
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text
        style={[detailStyles.value, small && detailStyles.valueSmall]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  value: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1f2937',
    flex: 2,
    textAlign: 'right',
  },
  valueSmall: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.heading2.fontFamily,
    fontSize: typography.heading2.fontSize,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  countdown: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xxl,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontFamily: typography.button.fontFamily,
    fontSize: typography.button.fontSize,
    color: '#ffffff',
  },
});

