import React, { useState, useEffect } from 'react';
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
  const { login, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Validation states
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ username?: boolean; password?: boolean }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Login States
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Auth Setup
  useEffect(() => {
    import('@react-native-google-signin/google-signin')
      .then(({ GoogleSignin }) => {
        if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
          try {
            GoogleSignin.configure({
              webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
              offlineAccess: true,
            });
          } catch (e) {
            console.warn('Google Signin configuration failed:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load Google Signin module:', err);
      });
  }, []);

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
      const result = await login(username.trim(), password);
      if (result !== true) {
        setApiError(typeof result === 'string' ? result : 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } catch (err: any) {
      setApiError(err?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginFlow = async () => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
        throw new Error(
          'Google Sign-In yêu cầu chạy trên bản Native build (Android APK/Dev build). Nếu chạy trên Expo Go, vui lòng đăng nhập bằng Email/Mật khẩu.'
        );
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      let idToken: string | null = null;
      if (response && 'type' in response) {
        if (response.type === 'success' && response.data?.idToken) {
          idToken = response.data.idToken;
        } else if (response.type === 'cancelled') {
          return;
        }
      } else if (response && (response as any).idToken) {
        idToken = (response as any).idToken;
      }

      if (!idToken) {
        throw new Error('Không nhận được mã xác thực idToken từ Google.');
      }

      const success = await loginWithGoogle(idToken);
      if (!success) {
        setApiError('Đăng nhập Google thất bại trên máy chủ.');
      }
    } catch (err: any) {
      console.warn('Google Signin Error:', err);
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '12501') {
        return;
      }
      setApiError(err?.message || 'Đăng nhập Google thất bại.');
    } finally {
      setGoogleLoading(false);
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
                loading={loading || googleLoading}
                style={styles.loginBtn}
              />

              {/* Google OAuth Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Hoặc đăng nhập với</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google OAuth Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLoginFlow}
                disabled={loading || googleLoading}
                activeOpacity={0.8}
              >
                <View style={styles.googleBtnContent}>
                  <View style={styles.googleIconCircle}>
                    <Text style={[styles.googleIconLetter, { color: '#4285F4' }]}>G
                      <Text style={{ color: '#EA4335' }}>o</Text>
                      <Text style={{ color: '#FBBC05' }}>o</Text>
                      <Text style={{ color: '#4285F4' }}>g</Text>
                      <Text style={{ color: '#34A853' }}>l</Text>
                      <Text style={{ color: '#EA4335' }}>e</Text>
                    </Text>
                  </View>
                  <Text style={styles.googleBtnText}>
                    {googleLoading ? 'Đang xác thực Google...' : 'Google'}
                  </Text>
                </View>
              </TouchableOpacity>

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
    marginBottom: spacing.sm,
    borderRadius: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    ...typography.caption,
    color: colors.gray[400],
    fontFamily: 'Inter_500Medium',
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.gray[300],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconCircle: {
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleIconLetter: {
    fontSize: 14,
    fontFamily: 'Inter_900Black',
    fontWeight: 'bold',
  },
  googleBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
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

