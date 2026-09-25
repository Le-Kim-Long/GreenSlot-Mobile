/**
 * InAppNotificationBanner
 * A drop-down toast banner that animates from the top of the screen.
 * Usage: call `showInAppNotification({ title, body, onPress })` from anywhere.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  View,
} from 'react-native';
import { Bell, CheckCircle, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { navigateToNotifications } from '../../navigation/navigationRef';

const SCREEN_W = Dimensions.get('window').width;
const BANNER_HEIGHT = 76;
const TOP_OFFSET = Platform.OS === 'ios' ? 54 : 36;

export type InAppNotifOptions = {
  title: string;
  body: string;
  variant?: 'success' | 'info' | 'warning';
  durationMs?: number;
  onPress?: () => void;
};

// ── Singleton state ──────────────────────────────────────────────────────────
let _showFn: ((opts: InAppNotifOptions) => void) | null = null;

export function showInAppNotification(opts: InAppNotifOptions) {
  _showFn?.(opts);
}

// ── Provider component (mount once in root navigator) ────────────────────────
export function InAppNotificationProvider() {
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + TOP_OFFSET + 20))).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [current, setCurrent] = React.useState<InAppNotifOptions | null>(null);
  const [visible, setVisible] = React.useState(false);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -(BANNER_HEIGHT + TOP_OFFSET + 20), duration: 280, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => { setVisible(false); setCurrent(null); });
  };

  const show = (opts: InAppNotifOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(opts);
    setVisible(true);
    // Reset position before animating in
    translateY.setValue(-(BANNER_HEIGHT + TOP_OFFSET + 20));
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: TOP_OFFSET, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(dismiss, opts.durationMs ?? 4000);
  };

  useEffect(() => {
    _showFn = show;
    return () => { _showFn = null; };
  }, []);

  if (!visible || !current) return null;

  const variantColor =
    current.variant === 'success' ? colors.green[700]
    : current.variant === 'warning' ? '#d97706'
    : colors.green[600];

  const variantBg =
    current.variant === 'success' ? '#f0fdf4'
    : current.variant === 'warning' ? '#fffbeb'
    : '#f0fdf4';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { transform: [{ translateY }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.banner, { backgroundColor: variantBg, borderLeftColor: variantColor }]}
        onPress={() => {
          dismiss();
          if (current.onPress) {
            current.onPress();
          } else {
            navigateToNotifications();
          }
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: variantColor + '22' }]}>
          {current.variant === 'success'
            ? <CheckCircle size={20} color={variantColor} />
            : <Bell size={20} color={variantColor} />
          }
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: variantColor }]} numberOfLines={1}>{current.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{current.body}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={styles.close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={14} color={colors.gray[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[600],
    lineHeight: 16,
  },
  close: {
    padding: 4,
  },
});
