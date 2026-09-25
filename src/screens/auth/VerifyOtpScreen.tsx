import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { authApi } from '../../api/authApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { AuthScreenProps } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

export default function VerifyOtpScreen({ navigation, route }: AuthScreenProps<'VerifyOtp'>) {
  const { email } = route.params;
  const { loginWithJwtData } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focused, setFocused] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [success, setSuccess] = useState(false);
  const [errorBoxes, setErrorBoxes] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Focus first box
    setTimeout(() => inputRefs.current[0]?.focus(), 350);
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const triggerShake = () => {
    setErrorBoxes(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setTimeout(() => setErrorBoxes(false), 600));
  };

  const triggerSuccess = () => {
    setSuccess(true);
    Animated.spring(successScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  };

  const handleDigitChange = (index: number, value: string) => {
    // Allow paste of full OTP
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (cleaned.length === OTP_LENGTH) {
        const newDigits = cleaned.split('');
        setDigits(newDigits);
        setFocused(OTP_LENGTH - 1);
        inputRefs.current[OTP_LENGTH - 1]?.focus();
        // Auto submit on paste
        handleVerifyDigits(newDigits);
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocused(index + 1);
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const allFilled = newDigits.every(d => d !== '');
      if (allFilled) {
        handleVerifyDigits(newDigits);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
        setFocused(index - 1);
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  const handleVerifyDigits = useCallback(async (digitArr: string[]) => {
    const otp = digitArr.join('');
    if (otp.length < OTP_LENGTH) {
      Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} chữ số.`);
      return;
    }
    setLoading(true);
    try {
      const jwtData = await authApi.verifyOtp({ email, otp });
      triggerSuccess();
      Alert.alert('🎉 Đăng nhập thành công', 'Chào mừng bạn đến với GreenSlot!');
      await new Promise(r => setTimeout(r, 800));
      await loginWithJwtData(jwtData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      Alert.alert('Xác thực thất bại', msg);
      triggerShake();
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => { inputRefs.current[0]?.focus(); setFocused(0); }, 200);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleVerify = () => handleVerifyDigits(digits);

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp(email);
      Alert.alert('Đã gửi lại ✉️', 'Mã xác thực mới đã được gửi vào email.');
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => { inputRefs.current[0]?.focus(); setFocused(0); }, 100);
      // Restart timer
      clearInterval(timerRef.current!);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể gửi lại mã OTP.';
      Alert.alert('Lỗi', msg);
    } finally {
      setResending(false);
    }
  };

  const allFilled = digits.every(d => d !== '');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* ── Icon Header ── */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#dcfce7', '#bbf7d0']}
              style={styles.iconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ShieldCheck size={40} color={colors.green[600]} strokeWidth={1.8} />
            </LinearGradient>
            {/* Decorative rings */}
            <View style={[styles.ring, styles.ring1]} />
            <View style={[styles.ring, styles.ring2]} />
          </View>

          <Text style={styles.title}>Xác thực OTP</Text>
          <Text style={styles.sub}>Nhập mã 6 chữ số đã được gửi đến</Text>
          <View style={styles.emailRow}>
            <Mail size={14} color={colors.green[600]} />
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* ── OTP Boxes ── */}
          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {digits.map((digit, index) => (
              <Pressable key={index} onPress={() => { inputRefs.current[index]?.focus(); setFocused(index); }}>
                <View
                  style={[
                    styles.otpBox,
                    focused === index && styles.otpBoxFocused,
                    digit !== '' && styles.otpBoxFilled,
                    errorBoxes && styles.otpBoxError,
                    success && styles.otpBoxSuccess,
                  ]}
                >
                  <TextInput
                    ref={el => { inputRefs.current[index] = el; }}
                    style={[
                      styles.otpInput,
                      digit !== '' && styles.otpInputFilled,
                      errorBoxes && styles.otpInputError,
                      success && styles.otpInputSuccess,
                    ]}
                    value={digit}
                    onChangeText={v => handleDigitChange(index, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    onFocus={() => setFocused(index)}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    selectTextOnFocus
                    caretHidden
                    editable={!loading && !success}
                  />
                  {/* Cursor blink for focused empty */}
                  {focused === index && digit === '' && !loading && (
                    <View style={styles.cursor} />
                  )}
                  {/* Divider line below */}
                  <View
                    style={[
                      styles.underline,
                      focused === index && styles.underlineFocused,
                      digit !== '' && styles.underlineFilled,
                      errorBoxes && styles.underlineError,
                      success && styles.underlineSuccess,
                    ]}
                  />
                </View>
              </Pressable>
            ))}
          </Animated.View>

          {/* ── Verify Button ── */}
          <TouchableOpacity
            style={[styles.verifyBtn, (!allFilled || loading || success) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!allFilled || loading || success}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={allFilled && !loading && !success ? ['#16a34a', '#15803d'] : ['#d1d5db', '#9ca3af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyGradient}
            >
              {success ? (
                <>
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.verifyText}>Xác thực thành công!</Text>
                </>
              ) : loading ? (
                <Text style={styles.verifyText}>Đang xác thực...</Text>
              ) : (
                <Text style={styles.verifyText}>Xác minh tài khoản</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Resend ── */}
          <View style={styles.resendWrap}>
            <Text style={styles.resendLabel}>Không nhận được mã?</Text>
            {countdown > 0 ? (
              <View style={styles.countdownWrap}>
                <RefreshCw size={12} color={colors.gray[400]} />
                <Text style={styles.countdownText}>Gửi lại sau {countdown}s</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
                <RefreshCw size={13} color={colors.green[600]} />
                <Text style={styles.resendLink}>{resending ? 'Đang gửi...' : 'Gửi lại mã'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Separator ── */}
          <View style={styles.separator}>
            <View style={styles.sepLine} />
            <Text style={styles.sepText}>hoặc</Text>
            <View style={styles.sepLine} />
          </View>

          {/* ── Back Button ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
            <ArrowLeft size={16} color={colors.gray[600]} />
            <Text style={styles.backText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BOX_SIZE = 48;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Icon
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, position: 'relative' },
  iconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.green[200],
  },
  ring1: { width: 110, height: 110, opacity: 0.6 },
  ring2: { width: 132, height: 132, opacity: 0.3 },

  // Header text
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    textAlign: 'center',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 36,
    backgroundColor: colors.green[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  emailText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.green[800],
  },

  // OTP Boxes
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFocused: {
    borderColor: colors.green[500],
    shadowColor: colors.green[400],
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#f0fdf4',
  },
  otpBoxFilled: {
    borderColor: colors.green[400],
    backgroundColor: '#f0fdf4',
  },
  otpBoxError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
    shadowColor: '#ef4444',
    shadowOpacity: 0.2,
  },
  otpBoxSuccess: {
    borderColor: colors.green[500],
    backgroundColor: '#dcfce7',
  },
  otpInput: {
    width: BOX_SIZE,
    height: BOX_SIZE + 8,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
    padding: 0,
  },
  otpInputFilled: { color: colors.green[800] },
  otpInputError: { color: '#dc2626' },
  otpInputSuccess: { color: colors.green[700] },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: colors.green[500],
    borderRadius: 2,
  },
  underline: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gray[200],
  },
  underlineFocused: { backgroundColor: colors.green[500] },
  underlineFilled: { backgroundColor: colors.green[400] },
  underlineError: { backgroundColor: '#ef4444' },
  underlineSuccess: { backgroundColor: colors.green[600] },

  // Verify button
  verifyBtn: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.green[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  verifyText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Resend
  resendWrap: { alignItems: 'center', gap: 8, marginBottom: 24 },
  resendLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.gray[500] },
  countdownWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countdownText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.gray[400] },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.green[50],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  resendLink: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },

  // Separator
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%' },
  sepLine: { flex: 1, height: 1, backgroundColor: colors.gray[200] },
  sepText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.gray[400] },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.xl,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.gray[200],
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },
});
