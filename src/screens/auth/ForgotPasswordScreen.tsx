import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../api/authApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

export default function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      Alert.alert('Thành công', 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Quên mật khẩu</Text>
        <Text style={styles.sub}>Nhập email để nhận hướng dẫn đặt lại mật khẩu</Text>
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button title="Gửi yêu cầu" onPress={handleSubmit} loading={loading} />
        <Button title="Quay lại đăng nhập" onPress={() => navigation.navigate('Login')} variant="secondary" style={styles.back} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl },
  title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.xs },
  sub: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.xl },
  back: { marginTop: spacing.md },
});
