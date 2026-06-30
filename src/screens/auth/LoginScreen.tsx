import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setLoading(true);
    const ok = await login(username.trim(), password);
    setLoading(false);
    if (!ok) setError('Tên đăng nhập hoặc mật khẩu không đúng');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Leaf size={32} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Canh tác đô thị{'\n'}thông minh</Text>
            <Text style={styles.heroSub}>
              Thuê vườn, giám sát IoT và chăm sóc cây trồng — tất cả trong một nền tảng.
            </Text>
          </View>

          <View style={styles.form}>
            <Logo size="md" />
            <Text style={styles.formTitle}>Đăng nhập</Text>
            <Text style={styles.formSub}>Chào mừng trở lại GreenSlot</Text>

            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.red[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Tên đăng nhập"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="Nhập tên đăng nhập"
            />
            <Input
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Nhập mật khẩu"
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgot}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <Button title="Đăng nhập" onPress={handleLogin} loading={loading} style={styles.btn} />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.green[600],
    padding: spacing.xl,
    paddingTop: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: { ...typography.heading1, color: colors.white, marginBottom: spacing.sm },
  heroSub: { ...typography.body, color: colors.green[100] },
  form: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
  formTitle: { ...typography.heading2, color: colors.gray[900], marginTop: spacing.lg },
  formSub: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red[100],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  errorText: { ...typography.bodySmall, color: colors.red[800], flex: 1 },
  forgot: { ...typography.bodySmall, color: colors.green[600], textAlign: 'right', marginBottom: spacing.lg },
  btn: { marginTop: spacing.sm },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  registerText: { ...typography.body, color: colors.gray[500] },
  registerLink: { ...typography.body, color: colors.green[600], fontFamily: 'Inter_600SemiBold' },
});
