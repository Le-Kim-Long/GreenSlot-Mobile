import React, { useState, useEffect } from 'react';
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
import {
  Leaf,
  Sparkles,
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Square,
  AtSign,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';
import { getApiErrorMessage } from '../../api/client';

export default function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { register, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const [agreeTerms, setAgreeTerms] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google States
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
              forceCodeForRefreshToken: true,
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

  const validateField = (field: string, value: string, currentForm = form) => {
    let err = '';
    const v = value.trim();

    switch (field) {
      case 'username':
        if (!v) {
          err = 'Vui lòng nhập tên đăng nhập';
        } else if (v.length < 3 || v.length > 20) {
          err = 'Tên đăng nhập từ 3 - 20 ký tự';
        } else if (!/^[a-zA-Z0-9_]+$/.test(v)) {
          err = 'Chỉ dùng chữ cái, số và dấu gạch dưới (_)';
        }
        break;

      case 'name':
        if (!v) {
          err = 'Vui lòng nhập họ và tên';
        } else if (v.length < 2) {
          err = 'Họ và tên tối thiểu 2 ký tự';
        }
        break;

      case 'email':
        if (!v) {
          err = 'Vui lòng nhập địa chỉ email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          err = 'Email không đúng định dạng';
        }
        break;

      case 'phone':
        if (v && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(v)) {
          err = 'Số điện thoại không hợp lệ (10 chữ số)';
        }
        break;

      case 'password':
        if (!value) {
          err = 'Vui lòng nhập mật khẩu';
        } else if (value.length < 6) {
          err = 'Mật khẩu tối thiểu 6 ký tự';
        }
        break;

      case 'confirm':
        if (!value) {
          err = 'Vui lòng xác nhận mật khẩu';
        } else if (value !== currentForm.password) {
          err = 'Mật khẩu không trùng khớp';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: err }));
    return !err;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, (form as any)[field]);
  };

  const update = (key: keyof typeof form, value: string) => {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    if (apiError) setApiError('');

    if (touched[key]) {
      validateField(key, value, newForm);
    }

    if (key === 'password' && touched.confirm) {
      validateField('confirm', form.confirm, newForm);
    }
  };

  const handleRegister = async () => {
    const allTouched = {
      username: true,
      name: true,
      email: true,
      phone: true,
      password: true,
      confirm: true,
    };
    setTouched(allTouched);

    const validUser = validateField('username', form.username);
    const validName = validateField('name', form.name);
    const validEmail = validateField('email', form.email);
    const validPhone = validateField('phone', form.phone);
    const validPass = validateField('password', form.password);
    const validConfirm = validateField('confirm', form.confirm);

    if (!validUser || !validName || !validEmail || !validPhone || !validPass || !validConfirm) {
      return;
    }

    if (!agreeTerms) {
      Alert.alert(
        'Điều khoản dịch vụ',
        'Vui lòng tích chọn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật để tiếp tục.'
      );
      return;
    }

    setApiError('');
    setLoading(true);
    try {
      const result = await register(
        form.username.trim(),
        form.name.trim(),
        form.email.trim(),
        form.password,
        form.phone.trim() || undefined
      );
      setLoading(false);

      if (result === true) {
        Alert.alert(
          'Đăng ký thành công! 🎉',
          'Một mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và xác thực.',
          [{ text: 'Xác thực ngay', onPress: () => navigation.navigate('VerifyOtp', { email: form.email.trim() }) }]
        );
      } else {
        setApiError(typeof result === 'string' ? result : 'Đăng ký thất bại.');
      }
    } catch (err: unknown) {
      setLoading(false);
      setApiError(getApiErrorMessage(err, 'Có lỗi xảy ra trong quá trình đăng ký.'));
    }
  };

  const handleGoogleSignUpFlow = async () => {
    setApiError('');
    setGoogleLoading(true);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
        throw new Error(
          'Google Sign-In yêu cầu chạy trên bản Native build (Android APK/Dev build). Nếu chạy trên Expo Go, vui lòng đăng ký bằng form bên trên.'
        );
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Luôn gọi signOut trước để hiển thị bảng chọn tài khoản Google (Account Chooser)
      try {
        await GoogleSignin.signOut();
      } catch (_) {}

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

      const result = await loginWithGoogle(idToken, 'register');
      if (result !== true) {
        setApiError(typeof result === 'string' ? result : 'Đăng ký Google thất bại trên máy chủ.');
      }
    } catch (err: any) {
      console.warn('Google Signin Error:', err);
      if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '12501') {
        return;
      }
      setApiError(err?.message || 'Đăng ký Google không thành công.');
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
            {/* Top Brand Header - Compact Proportions */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Leaf size={24} color={colors.white} />
              </View>
              <Text style={styles.brandName}>
                Green<Text style={styles.brandAccent}>Slot</Text>
              </Text>

              <View style={styles.taglinePill}>
                <Sparkles size={11} color={colors.green[700]} />
                <Text style={styles.taglineText}>Nền tảng Nông nghiệp Đô thị 4.0</Text>
              </View>
            </View>

            {/* Form Card */}
            <View style={styles.cardContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Tạo tài khoản</Text>
                <Text style={styles.formSub}>Tham gia cộng đồng canh tác đô thị thông minh</Text>
              </View>

              {/* Global API Error Alert */}
              {apiError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={14} color={colors.red[600]} />
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              {/* 1. Tên đăng nhập */}
              <Input
                label="Tên đăng nhập"
                labelStyle={styles.inputLabel}
                value={form.username}
                onChangeText={v => update('username', v)}
                onBlur={() => handleBlur('username')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="@ vd: nguyenvana (ít nhất 3 ký tự)"
                leftIcon={<AtSign size={16} color={colors.green[600]} />}
                error={touched.username ? errors.username : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* 2. Họ và tên */}
              <Input
                label="Họ và tên"
                labelStyle={styles.inputLabel}
                value={form.name}
                onChangeText={v => update('name', v)}
                onBlur={() => handleBlur('name')}
                placeholder="Nguyễn Văn A"
                leftIcon={<User size={16} color={colors.green[600]} />}
                error={touched.name ? errors.name : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* 3. Email */}
              <Input
                label="Email"
                labelStyle={styles.inputLabel}
                value={form.email}
                onChangeText={v => update('email', v)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@example.com"
                leftIcon={<Mail size={16} color={colors.green[600]} />}
                error={touched.email ? errors.email : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* 4. Số điện thoại */}
              <Input
                label="Số điện thoại"
                labelStyle={styles.inputLabel}
                value={form.phone}
                onChangeText={v => update('phone', v)}
                onBlur={() => handleBlur('phone')}
                keyboardType="phone-pad"
                placeholder="0901234567"
                leftIcon={<Phone size={16} color={colors.green[600]} />}
                error={touched.phone ? errors.phone : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* 5. Mật khẩu */}
              <Input
                label="Mật khẩu"
                labelStyle={styles.inputLabel}
                value={form.password}
                onChangeText={v => update('password', v)}
                onBlur={() => handleBlur('password')}
                isPassword
                placeholder="Ít nhất 6 ký tự"
                leftIcon={<Lock size={16} color={colors.green[600]} />}
                error={touched.password ? errors.password : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* 6. Xác nhận mật khẩu */}
              <Input
                label="Xác nhận mật khẩu"
                labelStyle={styles.inputLabel}
                value={form.confirm}
                onChangeText={v => update('confirm', v)}
                onBlur={() => handleBlur('confirm')}
                isPassword
                placeholder="Nhập lại mật khẩu"
                leftIcon={<ShieldCheck size={16} color={colors.green[600]} />}
                error={touched.confirm ? errors.confirm : undefined}
                containerStyle={styles.inputWrapper}
                inputContainerStyle={styles.inputBox}
                style={styles.inputText}
              />

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                {agreeTerms ? (
                  <CheckSquare size={16} color={colors.green[600]} />
                ) : (
                  <Square size={16} color={colors.gray[400]} />
                )}
                <Text style={styles.termsText}>
                  Tôi đồng ý với{' '}
                  <Text style={styles.termsHighlight}>Điều khoản dịch vụ</Text> và{' '}
                  <Text style={styles.termsHighlight}>Chính sách bảo mật</Text>
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <Button
                title="Tiếp tục & Nhận mã OTP"
                onPress={handleRegister}
                loading={loading || googleLoading}
                style={styles.registerBtn}
              />

              {/* Divider: Hoặc đăng nhập với */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Hoặc đăng nhập với</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button: Đăng nhập với Google */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignUpFlow}
                disabled={loading || googleLoading}
                activeOpacity={0.8}
              >
                <View style={styles.googleBtnContent}>
                  <View style={styles.googleLetters}>
                    <Text style={[styles.googleLetter, { color: '#4285F4' }]}>G</Text>
                    <Text style={[styles.googleLetter, { color: '#EA4335' }]}>o</Text>
                    <Text style={[styles.googleLetter, { color: '#FBBC05' }]}>o</Text>
                    <Text style={[styles.googleLetter, { color: '#4285F4' }]}>g</Text>
                    <Text style={[styles.googleLetter, { color: '#34A853' }]}>l</Text>
                    <Text style={[styles.googleLetter, { color: '#EA4335' }]}>e</Text>
                  </View>
                  <Text style={styles.googleBtnText}>
                    {googleLoading ? 'Đang kết nối...' : 'Đăng nhập với Google'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Footer Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.7}
                  style={styles.loginLinkContainer}
                >
                  <Text style={styles.loginLink}>Đăng nhập</Text>
                  <ArrowRight size={13} color={colors.green[600]} />
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
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  centeredWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 5,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: colors.green[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 21.5,
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  brandAccent: {
    color: colors.green[600],
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  taglineText: {
    color: colors.green[800],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.green[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 11,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeader: {
    marginBottom: 5,
    alignItems: 'center',
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  formSub: {
    color: colors.gray[500],
    fontSize: 12,
    marginTop: 1,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 11,
    color: colors.red[800],
    flex: 1,
    fontFamily: 'Inter_500Medium',
  },
  inputWrapper: {
    marginBottom: 4.5,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
    marginBottom: 2.5,
  },
  inputBox: {
    minHeight: 41,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputText: {
    paddingVertical: 2,
    fontSize: 14,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  termsText: {
    color: colors.gray[600],
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15.5,
  },
  termsHighlight: {
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
  },
  registerBtn: {
    marginTop: 3,
    marginBottom: 4.5,
    borderRadius: 12,
    minHeight: 43,
    backgroundColor: colors.green[600],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    fontSize: 10.5,
    color: colors.gray[400],
    fontFamily: 'Inter_500Medium',
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    minHeight: 43,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4.5,
    shadowColor: colors.gray[300],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleLetters: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleLetter: {
    fontSize: 14.5,
    fontFamily: 'Inter_700Bold',
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
    paddingTop: 4.5,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  footerText: {
    color: colors.gray[500],
    fontSize: 13,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  loginLink: {
    color: colors.green[600],
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
