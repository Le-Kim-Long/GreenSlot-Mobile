import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ShieldCheck } from 'lucide-react-native';
import { authApi } from '../../api/authApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtpScreen({ navigation, route }: AuthScreenProps<'VerifyOtp'>) {
  const { email } = route.params;
  const { loginWithJwtData } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    try {
      // BE trả về JwtResponse ngay sau khi OTP hợp lệ → tự đăng nhập luôn
      const jwtData = await authApi.verifyOtp({ email, otp: cleanOtp });
      await loginWithJwtData(jwtData);
      // Không cần navigate — AuthContext thay đổi user state sẽ tự redirect vào app
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      Alert.alert('Lỗi xác thực', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp(email);
      Alert.alert('Đã gửi lại OTP ✉️', 'Mã xác thực mới đã được gửi vào email của bạn.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể gửi lại mã OTP.';
      Alert.alert('Lỗi', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={64} color={colors.green[600]} />
        </View>

        <Text style={styles.title}>Xác thực OTP</Text>
        <Text style={styles.sub}>Chúng tôi đã gửi mã xác thực đến email:</Text>
        <View style={styles.emailContainer}>
          <Mail size={16} color={colors.gray[600]} style={styles.emailIcon} />
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Input
          label="Mã xác thực OTP *"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="Nhập mã OTP (ví dụ: 123456)"
          containerStyle={styles.input}
        />

        <Button
          title="Xác minh tài khoản"
          onPress={handleVerify}
          loading={loading}
          style={styles.btn}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Không nhận được mã? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={[styles.resendLink, resending && { color: colors.gray[400] }]}>
              {resending ? 'Đang gửi...' : 'Gửi lại mã'}
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Quay lại đăng nhập"
          onPress={() => navigation.navigate('Login')}
          variant="secondary"
          style={styles.back}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, justifyContent: 'center', flex: 1 },
  iconContainer: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.heading2, color: colors.gray[900], textAlign: 'center', marginBottom: spacing.xs },
  sub: { ...typography.bodySmall, color: colors.gray[500], textAlign: 'center' },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  emailIcon: { marginRight: spacing.xs },
  emailText: { fontFamily: 'Inter_600SemiBold', color: colors.gray[800] },
  input: { marginBottom: spacing.md },
  btn: { marginTop: spacing.md },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  resendText: { ...typography.bodySmall, color: colors.gray[500] },
  resendLink: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[600],
    textDecorationLine: 'underline',
  },
  back: { marginTop: spacing.md },
});
