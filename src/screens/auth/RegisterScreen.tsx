import React, { useState } from 'react';
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
  UserPlus,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

export default function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { register } = useAuth();

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
          err = 'Email không đúng định dạng (vd: user@gmail.com)';
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
          err = 'Mật khẩu xác nhận không trùng khớp';
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

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: colors.gray[300] };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass) && pass.length >= 8) score++;

    if (score === 1) return { score: 1, label: 'Yếu', color: colors.red[600] };
    if (score === 2) return { score: 2, label: 'Trung bình', color: '#F59E0B' };
    return { score: 3, label: 'Mạnh', color: colors.green[600] };
  };

  const passStrength = getPasswordStrength(form.password);

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
        'Vui lòng tích chọn đồng ý với Điều khoản dịch vụ để tiếp tục đăng ký.'
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
        form.phone.trim()
      );
      setLoading(false);

      if (result === true) {
        // Backend gửi OTP đến email — chuyển sang màn hình xác thực OTP
        navigation.navigate('OtpVerification', { email: form.email.trim() });
      } else {
        setApiError(typeof result === 'string' ? result : 'Đăng ký thất bại.');
      }
    } catch (err: any) {
      setLoading(false);
      setApiError(err?.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
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
                <Leaf size={28} color={colors.white} />
              </View>
              <Text style={styles.brandName}>
                Green<Text style={styles.brandAccent}>Slot</Text>
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.cardContainer}>
              {/* Accented Form Header */}
              <View style={styles.formHeader}>
                <View style={styles.titleRow}>
                  <View style={styles.titleIconBadge}>
                    <UserPlus size={18} color={colors.green[600]} />
                  </View>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.formTitle}>
                      Tạo <Text style={styles.titleHighlight}>Tài Khoản Mới</Text>
                    </Text>
                    <Text style={styles.formSub}>Nhập thông tin cá nhân của bạn để bắt đầu</Text>
                  </View>
                </View>
                <View style={styles.titleAccentLine} />
              </View>

              {/* Global API Error Alert */}
              {apiError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={15} color={colors.red[600]} />
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              {/* 1. Username */}
              <Input
                label="Tên đăng nhập *"
                value={form.username}
                onChangeText={v => update('username', v)}
                onBlur={() => handleBlur('username')}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Nhập tên đăng nhập"
                leftIcon={<AtSign size={17} color={colors.green[600]} />}
                error={touched.username ? errors.username : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* 2. Full Name */}
              <Input
                label="Họ và tên *"
                value={form.name}
                onChangeText={v => update('name', v)}
                onBlur={() => handleBlur('name')}
                placeholder="Nhập họ và tên"
                leftIcon={<User size={17} color={colors.green[600]} />}
                error={touched.name ? errors.name : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* 3. Email */}
              <Input
                label="Địa chỉ Email *"
                value={form.email}
                onChangeText={v => update('email', v)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Nhập địa chỉ email"
                leftIcon={<Mail size={17} color={colors.green[600]} />}
                error={touched.email ? errors.email : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* 4. Phone */}
              <Input
                label="Số điện thoại"
                value={form.phone}
                onChangeText={v => update('phone', v)}
                onBlur={() => handleBlur('phone')}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại (tùy chọn)"
                leftIcon={<Phone size={17} color={colors.green[600]} />}
                error={touched.phone ? errors.phone : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* 5. Password */}
              <Input
                label="Mật khẩu *"
                value={form.password}
                onChangeText={v => update('password', v)}
                onBlur={() => handleBlur('password')}
                isPassword
                placeholder="Nhập mật khẩu (≥6 ký tự)"
                leftIcon={<Lock size={17} color={colors.green[600]} />}
                error={touched.password ? errors.password : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* Password Strength Indicator */}
              {form.password ? (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBars}>
                    <View
                      style={[
                        styles.strengthBar,
                        passStrength.score >= 1 ? { backgroundColor: passStrength.color } : null,
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        passStrength.score >= 2 ? { backgroundColor: passStrength.color } : null,
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        passStrength.score >= 3 ? { backgroundColor: passStrength.color } : null,
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: passStrength.color }]}>
                    {passStrength.label}
                  </Text>
                </View>
              ) : null}

              {/* 6. Confirm Password */}
              <Input
                label="Xác nhận mật khẩu *"
                value={form.confirm}
                onChangeText={v => update('confirm', v)}
                onBlur={() => handleBlur('confirm')}
                isPassword
                placeholder="Nhập lại mật khẩu"
                leftIcon={<ShieldCheck size={17} color={colors.green[600]} />}
                error={touched.confirm ? errors.confirm : undefined}
                containerStyle={styles.inputWrapper}
                style={styles.inputField}
              />

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                {agreeTerms ? (
                  <CheckSquare size={18} color={colors.green[600]} />
                ) : (
                  <Square size={18} color={colors.gray[400]} />
                )}
                <Text style={styles.termsText}>
                  Tôi đồng ý với{' '}
                  <Text style={styles.termsHighlight}>Điều khoản sử dụng</Text> &{' '}
                  <Text style={styles.termsHighlight}>Bảo mật</Text> GreenSlot
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <Button
                title="Tạo tài khoản ngay"
                onPress={handleRegister}
                loading={loading}
                style={styles.registerBtn}
              />

              {/* Footer Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.7}
                  style={styles.loginLinkContainer}
                >
                  <Text style={styles.loginLink}>Đăng nhập ngay</Text>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  centeredWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: colors.green[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: colors.green[600],
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    shadowColor: colors.green[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeader: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  titleHighlight: {
    color: colors.green[600],
  },
  formSub: {
    ...typography.bodySmall,
    color: colors.gray[500],
    fontSize: 11,
    marginTop: 1,
  },
  titleAccentLine: {
    height: 2,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderRadius: 1,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.red[800],
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  inputWrapper: {
    marginBottom: 6,
  },
  inputField: {
    paddingVertical: 2,
    fontSize: 13,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
    marginBottom: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginRight: spacing.sm,
  },
  strengthBar: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.gray[200],
  },
  strengthLabel: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  termsText: {
    ...typography.bodySmall,
    color: colors.gray[600],
    flex: 1,
    fontSize: 12,
  },
  termsHighlight: {
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
  },
  registerBtn: {
    marginTop: 4,
    marginBottom: 6,
    minHeight: 44,
    borderRadius: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    fontSize: 13,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loginLink: {
    ...typography.bodySmall,
    color: colors.green[600],
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
