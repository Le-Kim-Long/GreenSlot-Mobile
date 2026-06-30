import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

export default function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.username || !form.name || !form.email || !form.password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    const result = await register(form.username, form.name, form.email, form.password, form.phone);
    setLoading(false);
    if (result === true) {
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } else {
      Alert.alert('Lỗi', result);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.sub}>Đăng ký để bắt đầu thuê vườn canh tác</Text>

          <Input label="Tên đăng nhập *" value={form.username} onChangeText={v => update('username', v)} autoCapitalize="none" />
          <Input label="Họ và tên *" value={form.name} onChangeText={v => update('name', v)} />
          <Input label="Email *" value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Số điện thoại" value={form.phone} onChangeText={v => update('phone', v)} keyboardType="phone-pad" />
          <Input label="Mật khẩu *" value={form.password} onChangeText={v => update('password', v)} secureTextEntry />
          <Input label="Xác nhận mật khẩu *" value={form.confirm} onChangeText={v => update('confirm', v)} secureTextEntry />

          <Button title="Đăng ký" onPress={handleRegister} loading={loading} style={styles.btn} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.back}>
            <Text style={styles.backText}>Đã có tài khoản? Đăng nhập</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: spacing.xl },
  title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.xs },
  sub: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.xl },
  btn: { marginTop: spacing.md },
  back: { alignItems: 'center', marginTop: spacing.xl },
  backText: { ...typography.body, color: colors.green[600], fontFamily: 'Inter_600SemiBold' },
});
