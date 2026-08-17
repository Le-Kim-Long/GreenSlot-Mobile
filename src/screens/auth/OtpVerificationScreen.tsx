import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

type OtpNavProp = NativeStackNavigationProp<AuthStackParamList, 'OtpVerification'>;
type OtpRouteProp = RouteProp<AuthStackParamList, 'OtpVerification'>;

interface Props {
  navigation: OtpNavProp;
  route: OtpRouteProp;
}

export function OtpVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { verifyOtp } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const otpValue = otp.join('');

  // Xử lý nhập từng ký tự và chuyển focus
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số OTP.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otpValue);
      // AuthContext sẽ xử lý login và điều hướng tự động
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert(
        'OTP không hợp lệ',
        err?.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn. Vui lòng thử lại.'
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, otpValue, verifyOtp]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp(email);
      Alert.alert('Đã gửi', `OTP mới đã được gửi đến ${email}.`);
      // Cooldown 60 giây
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi lại OTP. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  }, [email, cooldown]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📧</Text>
        </View>

        <Text style={styles.title}>Xác thực Email</Text>
        <Text style={styles.subtitle}>
          Chúng tôi đã gửi mã OTP 6 chữ số đến
        </Text>
        <Text style={styles.emailText}>{email}</Text>

        {/* OTP Inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputRefs.current[index] = ref; }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : {}]}
              value={digit}
              onChangeText={text => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || otpValue.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Xác thực</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Không nhận được mã? </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : cooldown > 0 ? (
              <Text style={styles.resendCooldown}>Gửi lại ({cooldown}s)</Text>
            ) : (
              <Text style={styles.resendLink}>Gửi lại OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Quay lại đăng ký</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#14532d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#16a34a',
    marginTop: 4,
    marginBottom: 28,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  otpInput: {
    width: 44,
    height: 56,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  otpInputFilled: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
  },
  resendLink: {
    fontSize: 13,
    color: '#16a34a',
    fontFamily: 'Inter_600SemiBold',
  },
  resendCooldown: {
    fontSize: 13,
    color: '#9ca3af',
    fontFamily: 'Inter_400Regular',
  },
  backLink: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
});
