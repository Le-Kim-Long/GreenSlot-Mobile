import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface CustomAlertButton {
  text?: string;
  onPress?: (() => void) | null;
  style?: 'default' | 'cancel' | 'destructive';
  isPreferred?: boolean;
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: CustomAlertButton[];
  cancelable?: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function CustomAlertModal({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'Đồng ý', style: 'default' }],
  cancelable = false,
  onClose,
}: CustomAlertProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color={colors.green[600]} strokeWidth={2.4} />,
          badgeBg: '#DCFCE7',
          badgeBorder: '#BBF7D0',
          accentColor: colors.green[600],
        };
      case 'error':
        return {
          icon: <AlertCircle size={32} color={colors.red[600]} strokeWidth={2.4} />,
          badgeBg: '#FEE2E2',
          badgeBorder: '#FECACA',
          accentColor: colors.red[600],
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} color={colors.orange[600]} strokeWidth={2.4} />,
          badgeBg: '#FEF3C7',
          badgeBorder: '#FDE68A',
          accentColor: colors.orange[600],
        };
      case 'confirm':
        return {
          icon: <HelpCircle size={32} color={colors.emerald[600]} strokeWidth={2.4} />,
          badgeBg: '#D1FAE5',
          badgeBorder: '#A7F3D0',
          accentColor: colors.emerald[600],
        };
      case 'info':
      default:
        return {
          icon: <Info size={32} color={colors.blue[600]} strokeWidth={2.4} />,
          badgeBg: '#DBEAFE',
          badgeBorder: '#BFDBFE',
          accentColor: colors.blue[600],
        };
    }
  };

  const theme = getThemeConfig();

  const handleButtonPress = (button: CustomAlertButton) => {
    onClose();
    if (button.onPress) {
      setTimeout(() => {
        button.onPress?.();
      }, 100);
    }
  };

  const handleBackdropPress = () => {
    if (cancelable) {
      onClose();
    }
  };

  const validButtons = buttons.length > 0 ? buttons : [{ text: 'Đồng ý', style: 'default' as const }];
  const isSingleButton = validButtons.length === 1;
  const isTwoButtons = validButtons.length === 2;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (cancelable) onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Close (X) button when cancelable */}
              {cancelable && (
                <TouchableOpacity
                  style={styles.closeIconBtn}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              )}

              {/* Icon Badge */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
                ]}
              >
                {theme.icon}
              </View>

              {/* Title & Message */}
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>{title}</Text>
                {message ? <Text style={styles.messageText}>{message}</Text> : null}
              </View>

              {/* Actions Footer */}
              <View
                style={[
                  styles.buttonContainer,
                  isTwoButtons ? styles.twoButtonsRow : styles.stackedButtons,
                ]}
              >
                {validButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  let btnStyle: ViewStyle = styles.defaultBtn;
                  let textStyle: TextStyle = styles.defaultBtnText;

                  if (isCancel) {
                    btnStyle = styles.cancelBtn;
                    textStyle = styles.cancelBtnText;
                  } else if (isDestructive) {
                    btnStyle = styles.destructiveBtn;
                    textStyle = styles.destructiveBtnText;
                  }

                  return (
                    <TouchableOpacity
                      key={`alert-btn-${index}`}
                      style={[
                        styles.baseBtn,
                        btnStyle,
                        isTwoButtons && styles.flexButton,
                        !isSingleButton && !isTwoButtons && { width: '100%' },
                      ]}
                      onPress={() => handleButtonPress(btn)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.baseBtnText, textStyle]}>
                        {btn.text || 'Đồng ý'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: Math.min(width - 48, 380),
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  closeIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  titleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: colors.gray[900],
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  messageText: {
    ...typography.bodySmall,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing.xs,
  },
  buttonContainer: {
    width: '100%',
  },
  twoButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  stackedButtons: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  flexButton: {
    flex: 1,
  },
  baseBtn: {
    minHeight: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  baseBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  defaultBtn: {
    backgroundColor: colors.green[600],
  },
  defaultBtnText: {
    color: colors.white,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: colors.gray[700],
  },
  destructiveBtn: {
    backgroundColor: colors.red[600],
  },
  destructiveBtnText: {
    color: colors.white,
  },
});
