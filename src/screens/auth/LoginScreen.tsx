import React, { useState } from 'react';
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
import { Leaf, User, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Validation states
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ username?: boolean; password?: boolean }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateField = (field: 'username' | 'password', value: string) => {
    let err = '';
    if (field === 'username') {
      const trimmed = value.trim();
      if (!trimmed) {
        err = 'Vui lòng nhập tên đăng nhập';
      } else if (trimmed.length < 3) {
        err = 'Tên đăng nhập tối thiểu 3 ký tự';
      }
    } else if (field === 'password') {
      if (!value) {
        err = 'Vui lòng nhập mật khẩu';
      } else if (value.length < 6) {
        err = 'Mật khẩu phải từ 6 ký tự trở lên';
      }
    }
    setErrors(prev => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleBlur = (field: 'username' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, field === 'username' ? username : password);
  };

  const handleChangeUsername = (text: string) => {
    setUsername(text);
    if (apiError) setApiError('');
    if (touched.username) {
      validateField('username', text);
    }
  };

  const handleChangePassword = (text: string) => {
    setPassword(text);
    if (apiError) setApiError('');
    if (touched.password) {
      validateField('password', text);
    }
  };

  const handleLogin = async () => {
    setTouched({ username: true, password: true });

    const isUserValid = validateField('username', username);
    const isPassValid = validateField('password', password);

    if (!isUserValid || !isPassValid) {
      return;
    }

    setApiError('');
    setLoading(true);
    try {
      const ok = await login(username.trim(), password);
      if (!ok) {
        setApiError('Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } catch (err: any) {
      setApiError(err?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.centeredWrapper}>
            {/* Top Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Leaf size={32} color={colors.white} />
              </View>
              <Text style={styles.brandName}>
                Green<Text style={styles.brandAccent}>Slot</Text>
              </Text>

              <View style={styles.taglinePill}>
                <Sparkles size={12} color={colors.green[700]} />
                <Text style={styles.taglineText}>Nền tảng Nông nghiệp Đô thị 4.0</Text>
              </View>
            </View>

            {/* Form Card */}
            <View style={styles.cardContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Chào mừng trở lại</Text>
                <Text style={styles.formSub}>Đăng nhập để quản lý mảnh vườn của bạn</Text>
              </View>

              {/* Global API Error Alert */}
              {apiError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={colors.red[600]} />
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              {/* Username Input */}
              <Input
                label="Tên đăng nhập"
                value={username}
                onChangeText={handleChangeUsername}
                onBlur={() => handleBlur('username')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Nhập tên đăng nhập"
                leftIcon={<User size={18} color={colors.green[600]} />}
                error={touched.username ? errors.username : undefined}
                containerStyle={styles.inputWrapper}
              />

              {/* Password Input */}
              <Input
                label="Mật khẩu"
                value={password}
                onChangeText={handleChangePassword}
                onBlur={() => handleBlur('password')}
                isPassword
                placeholder="Nhập mật khẩu"
                leftIcon={<Lock size={18} color={colors.green[600]} />}
                error={touched.password ? errors.password : undefined}
                containerStyle={styles.inputWrapper}
              />

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button
                title="Đăng nhập"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginBtn}
              />

              {/* Footer Navigation Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.7}
                  style={styles.registerLinkContainer}
                >
                  <Text style={styles.registerLink}>Đăng ký ngay</Text>
                  <ArrowRight size={14} color={colors.green[600]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4FBF7',
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  centeredWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: colors.green[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: colors.green[600],
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  taglineText: {
    ...typography.caption,
    color: colors.green[800],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: colors.green[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeader: {
    marginBottom: spacing.md,
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  formSub: {
    ...typography.bodySmall,
    color: colors.gray[500],
    marginTop: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.red[800],
    flex: 1,
    fontFamily: 'Inter_500Medium',
  },
  inputWrapper: {
    marginBottom: spacing.sm + 2,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: 2,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
  },
  loginBtn: {
    marginBottom: spacing.md,
    borderRadius: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  footerText: {
    ...typography.body,
    color: colors.gray[500],
    fontSize: 14,
  },
  registerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  registerLink: {
    ...typography.body,
    color: colors.green[600],
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});
