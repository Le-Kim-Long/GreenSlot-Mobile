import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Alert as RNAlert } from 'react-native';
import { CustomAlertModal, type AlertType, type CustomAlertButton } from '../components/ui/CustomAlertModal';

export interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: CustomAlertButton[];
  cancelable?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showSuccess: (title: string, message?: string, onOk?: () => void) => void;
  showError: (title: string, message?: string, onOk?: () => void) => void;
  showWarning: (title: string, message?: string, onOk?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

// Global handler pointer for Alert.alert monkey-patching and standalone calls
let globalAlertHandler: ((options: AlertOptions) => void) | null = null;

/**
 * Tự động phân loại type Alert dựa trên nội dung title và danh sách nút
 */
export function inferAlertType(title?: string | null, buttons?: Array<{ style?: string }>): AlertType {
  if (!title) return 'info';
  const lower = title.toLowerCase().trim();

  // Kiểm tra lỗi trước
  if (
    lower.includes('lỗi') ||
    lower.includes('thất bại') ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('sai') ||
    lower.includes('không thể')
  ) {
    return 'error';
  }

  // Kiểm tra thành công
  if (
    lower.includes('thành công') ||
    lower.includes('hoàn tất') ||
    lower.includes('success') ||
    lower.includes('đã lưu') ||
    lower.includes('đã gửi')
  ) {
    return 'success';
  }

  // Kiểm tra xác nhận / nguy hiểm
  if (
    lower.includes('xác nhận') ||
    lower.includes('bạn có chắc') ||
    lower.includes('chắc chắn') ||
    lower.includes('confirm') ||
    buttons?.some(b => b.style === 'destructive')
  ) {
    return 'confirm';
  }

  // Kiểm tra cảnh báo
  if (
    lower.includes('cảnh báo') ||
    lower.includes('chú ý') ||
    lower.includes('lưu ý') ||
    lower.includes('warning') ||
    lower.includes('nhắc nhở')
  ) {
    return 'warning';
  }

  return 'info';
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions & { visible: boolean }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
    cancelable: false,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type || inferAlertType(options.title, options.buttons),
      buttons: options.buttons && options.buttons.length > 0 ? options.buttons : [{ text: 'Đồng ý', style: 'default' }],
      cancelable: options.cancelable ?? false,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message?: string, onOk?: () => void) => {
    showAlert({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'Đồng ý', style: 'default', onPress: onOk }],
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string, onOk?: () => void) => {
    showAlert({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'Đóng', style: 'default', onPress: onOk }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string, onOk?: () => void) => {
    showAlert({
      title,
      message,
      type: 'warning',
      buttons: [{ text: 'Đã hiểu', style: 'default', onPress: onOk }],
    });
  }, [showAlert]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    showAlert({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Hủy', style: 'cancel', onPress: onCancel },
        { text: 'Xác nhận', style: 'default', onPress: onConfirm },
      ],
    });
  }, [showAlert]);

  useEffect(() => {
    // Đăng ký global handler
    globalAlertHandler = showAlert;

    // Ghi đè RNAlert.alert để toàn bộ code hiện tại tự động dùng CustomAlert
    const originalRNAlert = RNAlert.alert;
    RNAlert.alert = (
      title: string,
      message?: string,
      buttons?: Array<{
        text?: string;
        onPress?: ((value?: any) => void) | null;
        style?: 'default' | 'cancel' | 'destructive';
        isPreferred?: boolean;
      }>,
      options?: { cancelable?: boolean }
    ) => {
      if (globalAlertHandler) {
        const type = inferAlertType(title, buttons);
        const mappedButtons: CustomAlertButton[] = buttons && buttons.length > 0
          ? buttons.map(b => ({
              text: b.text,
              onPress: b.onPress ? () => b.onPress?.() : undefined,
              style: b.style,
              isPreferred: b.isPreferred,
            }))
          : [{ text: 'Đồng ý', style: 'default' }];

        globalAlertHandler({
          title: title || '',
          message: message || '',
          type,
          buttons: mappedButtons,
          cancelable: options?.cancelable ?? false,
        });
      } else {
        originalRNAlert(title, message, buttons as any, options);
      }
    };

    return () => {
      globalAlertHandler = null;
      RNAlert.alert = originalRNAlert;
    };
  }, [showAlert]);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showConfirm,
        hideAlert,
      }}
    >
      {children}
      <CustomAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        cancelable={alertState.cancelable}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

/**
 * Hook để sử dụng Custom Alert trong React Components
 */
export function useAlert(): AlertContextType {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    // Fallback if called outside of Provider
    return {
      showAlert: (opts) => globalAlertHandler?.(opts),
      showSuccess: (t, m, ok) => globalAlertHandler?.({ title: t, message: m, type: 'success', buttons: [{ text: 'Đồng ý', onPress: ok }] }),
      showError: (t, m, ok) => globalAlertHandler?.({ title: t, message: m, type: 'error', buttons: [{ text: 'Đóng', onPress: ok }] }),
      showWarning: (t, m, ok) => globalAlertHandler?.({ title: t, message: m, type: 'warning', buttons: [{ text: 'Đã hiểu', onPress: ok }] }),
      showConfirm: (t, m, conf, canc) => globalAlertHandler?.({
        title: t,
        message: m,
        type: 'confirm',
        buttons: [{ text: 'Hủy', style: 'cancel', onPress: canc }, { text: 'Xác nhận', onPress: conf }],
      }),
      hideAlert: () => {},
    };
  }
  return ctx;
}

/**
 * Các hàm gọi Alert trực tiếp ở bất kỳ đâu trong dự án (kể cả ngoài component tree)
 */
export const customAlert = {
  show: (options: AlertOptions) => {
    if (globalAlertHandler) {
      globalAlertHandler(options);
    } else {
      RNAlert.alert(options.title, options.message);
    }
  },
  success: (title: string, message?: string, onOk?: () => void) => {
    customAlert.show({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'Đồng ý', style: 'default', onPress: onOk }],
    });
  },
  error: (title: string, message?: string, onOk?: () => void) => {
    customAlert.show({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'Đóng', style: 'default', onPress: onOk }],
    });
  },
  warning: (title: string, message?: string, onOk?: () => void) => {
    customAlert.show({
      title,
      message,
      type: 'warning',
      buttons: [{ text: 'Đã hiểu', style: 'default', onPress: onOk }],
    });
  },
  confirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    customAlert.show({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Hủy', style: 'cancel', onPress: onCancel },
        { text: 'Xác nhận', style: 'default', onPress: onConfirm },
      ],
    });
  },
};
