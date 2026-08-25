import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, User, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';

// Helper for Base64 Url Encoding (for custom token generation in mobile environment)
function base64UrlEncode(str: string): string {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  let i = 0;
  while (i < len) {
    const byte1 = bytes[i++];
    const byte2 = i < len ? bytes[i++] : NaN;
    const byte3 = i < len ? bytes[i++] : NaN;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    let enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    let enc4 = byte3 & 63;

    if (isNaN(byte2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(byte3)) {
      enc4 = 64;
    }

    base64 += chars.charAt(enc1) + chars.charAt(enc2) + 
              (enc3 === 64 ? '=' : chars.charAt(enc3)) + 
              (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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

  const handleGoogleLogin = async (email: string, name: string) => {
    setShowGoogleModal(false);
    setApiError('');
    setGoogleLoading(true);
    try {
      const payload = {
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        sub: 'google_' + Math.random().toString(36).substring(2, 10),
      };
      
      const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
      const signature = 'mock_signature';
      const idToken = `${header}.${payloadEncoded}.${signature}`;
      
      const success = await loginWithGoogle(idToken);
      if (!success) {
        setApiError('Đăng nhập Google không thành công.');
      }
    } catch (err: any) {
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
                onPress={() => setShowGoogleModal(true)}
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
                    {googleLoading ? 'Đang xác thực tài khoản...' : 'Google'}
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

      {/* Google Account Chooser Modal (Premium UI mockup of Google Authenticator) */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.googleIconCircle, { width: 36, height: 36, borderRadius: 18, marginBottom: 8 }]}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4285F4' }}>G</Text>
              </View>
              <Text style={styles.modalTitle}>Chọn tài khoản</Text>
              <Text style={styles.modalSubtitle}>để tiếp tục đăng nhập GreenSlot</Text>
            </View>

            <View style={styles.accountsList}>
              {/* Customer Account */}
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => handleGoogleLogin('customer@gmail.com', 'Khách hàng GreenSlot')}
              >
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>KH</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Khách hàng GreenSlot</Text>
                  <Text style={styles.accountEmail}>customer@gmail.com</Text>
                </View>
              </TouchableOpacity>

              {/* Manager Account */}
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => handleGoogleLogin('manager@gmail.com', 'Quản lý GreenSlot')}
              >
                <View style={[styles.accountAvatar, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.accountAvatarText, { color: '#2563EB' }]}>QL</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>Quản lý GreenSlot</Text>
                  <Text style={styles.accountEmail}>manager@gmail.com</Text>
                </View>
              </TouchableOpacity>

              {/* Custom Account Link */}
              {!showCustomInput ? (
                <TouchableOpacity
                  style={styles.customLink}
                  onPress={() => setShowCustomInput(true)}
                >
                  <Text style={styles.customLinkText}>Sử dụng tài khoản Google khác</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.customInputSection}>
                  <Input
                    placeholder="Nhập email Google"
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    containerStyle={{ marginBottom: spacing.xs }}
                  />
                  <Input
                    placeholder="Họ và tên hiển thị (tùy chọn)"
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                    containerStyle={{ marginBottom: spacing.sm }}
                  />
                  <Button
                    title="Tiếp tục"
                    disabled={!customGoogleEmail.includes('@')}
                    onPress={() => handleGoogleLogin(customGoogleEmail, customGoogleName)}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowGoogleModal(false);
                setShowCustomInput(false);
              }}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 4,
  },
  accountsList: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray[100],
    marginBottom: spacing.xs,
    backgroundColor: '#F8FAFC',
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  accountAvatarText: {
    color: colors.green[700],
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.gray[800],
  },
  accountEmail: {
    ...typography.caption,
    color: colors.gray[500],
  },
  customLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  customLinkText: {
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  customInputSection: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.gray[500],
  },
});

