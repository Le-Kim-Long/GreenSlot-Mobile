import {
  AlertTriangle,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Layers,
  Leaf,
  RotateCcw,
  Sprout,
  Wrench,
  XCircle
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { NotificationResponseDTO } from '../types/api';

export type NotificationCategory = 'ALL' | 'UNREAD' | 'IOT' | 'CARE_HARVEST' | 'CONTRACT';

export interface CategoryTab {
  key: NotificationCategory;
  label: string;
}

export const CATEGORY_TABS: CategoryTab[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNREAD', label: 'Chưa đọc' },
  { key: 'IOT', label: 'Cảnh báo IoT' },
  { key: 'CARE_HARVEST', label: 'Chăm sóc & Thu hoạch' },
  { key: 'CONTRACT', label: 'Hợp đồng & Thanh toán' },
];

export function filterNotificationByCategory(
  item: NotificationResponseDTO,
  category: NotificationCategory
): boolean {
  if (category === 'ALL') return true;
  if (category === 'UNREAD') return !item.isRead;

  const t = (item.type || '').toUpperCase();

  if (category === 'IOT') {
    return t.includes('IOT') || t.includes('ALERT') || t.includes('SENSOR') || t.includes('THRESHOLD');
  }

  if (category === 'CARE_HARVEST') {
    return (
      t.startsWith('TASK_') ||
      t.startsWith('HARVEST_') ||
      t.startsWith('PLANTING_') ||
      t.includes('CARE') ||
      t.includes('TREE')
    );
  }

  if (category === 'CONTRACT') {
    return (
      t.startsWith('RENTAL_') ||
      t.startsWith('BOOKING_') ||
      t.includes('PAYMENT') ||
      t.includes('EXPIR')
    );
  }

  return true;
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) {
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `Hôm qua lúc ${hh}:${mm}`;
    }
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

export interface NotificationMeta {
  icon: any;
  color: string;
  bgColor: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
}

export function getNotificationMeta(type: string, title?: string, message?: string): NotificationMeta {
  const t = (type || '').toUpperCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();

  // Payment Events
  if (t === 'PAYMENT_SUCCESS' || t === 'BOOKING_SUCCESS') {
    // 1. Check tree planting / seed payment FIRST
    if (
      lowerTitle.includes('giống') ||
      lowerTitle.includes('phôi giống') ||
      lowerTitle.includes('cây trồng') ||
      lowerTitle.includes('trồng cây') ||
      lowerMsg.includes('tiền giống') ||
      lowerMsg.includes('giống rau') ||
      lowerMsg.includes('mua giống')
    ) {
      return {
        icon: Sprout,
        color: colors.green[600],
        bgColor: colors.green[50],
        badgeLabel: 'Thanh toán giống rau',
        badgeColor: colors.green[800],
        badgeBg: colors.green[100],
      };
    }

    // 2. Extension
    if (lowerTitle.includes('gia hạn') || lowerMsg.includes('gia hạn')) {
      return {
        icon: RotateCcw,
        color: colors.blue[600],
        bgColor: colors.blue[50],
        badgeLabel: 'Gia hạn thành công',
        badgeColor: colors.blue[800],
        badgeBg: colors.blue[100],
      };
    }

    // 3. Add Pillar
    if (
      lowerTitle.includes('thuê thêm trụ') ||
      lowerTitle.includes('bổ sung trụ') ||
      lowerTitle.includes('thuê trụ') ||
      lowerMsg.includes('thuê bổ sung') ||
      lowerMsg.includes('thuê thêm trụ')
    ) {
      return {
        icon: Layers,
        color: colors.emerald[600],
        bgColor: colors.emerald[50],
        badgeLabel: 'Thuê trụ thành công',
        badgeColor: colors.emerald[800],
        badgeBg: colors.emerald[100],
      };
    }

    return {
      icon: CreditCard,
      color: colors.green[600],
      bgColor: colors.green[50],
      badgeLabel: 'Thanh toán thành công',
      badgeColor: colors.green[800],
      badgeBg: colors.green[100],
    };
  }

  if (t === 'PAYMENT_FAILED') {
    return {
      icon: XCircle,
      color: colors.red[600],
      bgColor: colors.red[100],
      badgeLabel: 'Thanh toán thất bại',
      badgeColor: colors.red[800],
      badgeBg: colors.red[100],
    };
  }

  // Task Events
  if (t === 'TASK_ASSIGNED' || t === 'TASK_ASSIGNMENT') {
    return {
      icon: Wrench,
      color: colors.blue[600],
      bgColor: colors.blue[50],
      badgeLabel: 'Nhiệm vụ mới',
      badgeColor: colors.blue[800],
      badgeBg: colors.blue[100],
    };
  }
  if (t === 'TASK_SUBMITTED') {
    return {
      icon: Clock,
      color: colors.yellow[600],
      bgColor: colors.yellow[50],
      badgeLabel: 'Chờ duyệt',
      badgeColor: colors.yellow[800],
      badgeBg: colors.yellow[100],
    };
  }
  if (t === 'TASK_APPROVED' || t === 'TASK_COMPLETED') {
    return {
      icon: CheckCircle2,
      color: colors.green[600],
      bgColor: colors.green[50],
      badgeLabel: 'Hoàn thành',
      badgeColor: colors.green[800],
      badgeBg: colors.green[100],
    };
  }
  if (t === 'TASK_REJECTED') {
    return {
      icon: XCircle,
      color: colors.red[600],
      bgColor: colors.red[100],
      badgeLabel: 'Từ chối',
      badgeColor: colors.red[800],
      badgeBg: colors.red[100],
    };
  }

  // Harvest Events
  if (t === 'HARVEST_READY' || t === 'HARVEST_CHOICE') {
    return {
      icon: Leaf,
      color: colors.emerald[600],
      bgColor: colors.emerald[50],
      badgeLabel: 'Sẵn sàng thu hoạch',
      badgeColor: colors.emerald[700],
      badgeBg: colors.emerald[100],
    };
  }
  if (t === 'HARVEST_DECISION_RECEIVED' || t === 'HARVEST_COMPLETED') {
    return {
      icon: CheckCheck,
      color: colors.green[700],
      bgColor: colors.green[50],
      badgeLabel: 'Thu hoạch',
      badgeColor: colors.green[800],
      badgeBg: colors.green[100],
    };
  }

  // Tree Planting Events
  if (t === 'PLANTING_REQUEST_CREATED' || t === 'PLANTING_REQUEST_APPROVED' || t === 'PLANTING_REQUEST_COMPLETED') {
    return {
      icon: Sprout,
      color: colors.green[600],
      bgColor: colors.green[50],
      badgeLabel: 'Trồng cây',
      badgeColor: colors.green[800],
      badgeBg: colors.green[100],
    };
  }
  if (t === 'PLANTING_REQUEST_REJECTED') {
    return {
      icon: XCircle,
      color: colors.red[600],
      bgColor: colors.red[100],
      badgeLabel: 'Từ chối trồng cây',
      badgeColor: colors.red[800],
      badgeBg: colors.red[100],
    };
  }

  // Rental Expiration
  if (t === 'RENTAL_EXPIRING_7D' || t === 'RENTAL_EXPIRING_3D' || t === 'RENTAL_EXPIRING_1D') {
    return {
      icon: Clock,
      color: colors.orange[600],
      bgColor: colors.orange[50],
      badgeLabel: 'Sắp hết hạn',
      badgeColor: colors.orange[800],
      badgeBg: colors.orange[100],
    };
  }
  if (t === 'RENTAL_EXPIRED') {
    return {
      icon: Calendar,
      color: colors.red[600],
      bgColor: colors.red[100],
      badgeLabel: 'Hết hạn hợp đồng',
      badgeColor: colors.red[800],
      badgeBg: colors.red[100],
    };
  }

  // IoT & Sensor Alerts
  if (t === 'IOT_ALERT' || t === 'ALERT_ESCALATED' || t === 'SENSOR_ALERT') {
    return {
      icon: AlertTriangle,
      color: colors.orange[600],
      bgColor: colors.orange[50],
      badgeLabel: 'Cảnh báo IoT',
      badgeColor: colors.orange[800],
      badgeBg: colors.orange[100],
    };
  }

  // Default / Generic
  return {
    icon: Info,
    color: colors.blue[600],
    bgColor: colors.blue[50],
    badgeLabel: 'Thông báo',
    badgeColor: colors.blue[800],
    badgeBg: colors.blue[100],
  };
}

export function extractSlotNumberFromNotification(notification: NotificationResponseDTO): string | undefined {
  const text = `${notification.title || ''} ${notification.message || ''}`;
  const match = text.match(/(?:ô\s*vườn|tại\s*ô|ô)\s*([A-Za-z0-9_-]+)/i);
  return match ? match[1] : undefined;
}

export function getNotificationActionRoute(notification: NotificationResponseDTO): {
  screen: string;
  params?: any;
} | null {
  const t = (notification.type || '').toUpperCase();
  const title = (notification.title || '').toLowerCase();
  const msg = (notification.message || '').toLowerCase();
  const slotNumber = extractSlotNumberFromNotification(notification);
  const rentalId = notification.referenceId ?? undefined;

  // 1. IoT & Sensor Alerts
  if (t.includes('IOT') || t.includes('ALERT') || t.includes('SENSOR')) {
    return { screen: 'IoTMonitoring' };
  }

  // 2. Successful Payments & Booking:
  if (t === 'PAYMENT_SUCCESS' || t === 'BOOKING_SUCCESS') {
    // 2a. Tree planting payment (check first to avoid conflict with pillar text in message)
    if (
      title.includes('giống') ||
      title.includes('phôi giống') ||
      title.includes('cây trồng') ||
      title.includes('trồng cây') ||
      msg.includes('tiền giống') ||
      msg.includes('giống rau') ||
      msg.includes('mua giống')
    ) {
      const treeMatch = (notification.message || '').match(/giống\s+(?:rau\s+)?([^tạivào(]+?)(?:\s+tại|\s+vào|\s+ở|\s*\()/i);
      const treeName = treeMatch ? treeMatch[1].trim() : undefined;
      return {
        screen: 'CustomerTreePlanting',
        params: {
          requestId: notification.referenceId ?? undefined,
          slotNumber,
          treeName,
          autoOpenDetail: true,
        },
      };
    }

    // 2b. Add Pillar
    if (
      title.includes('thuê thêm trụ') ||
      title.includes('bổ sung trụ') ||
      title.includes('thuê trụ') ||
      msg.includes('thuê bổ sung') ||
      msg.includes('thuê thêm trụ')
    ) {
      return {
        screen: 'RentalDetail',
        params: { slotNumber, rentalId },
      };
    }

    // 2c. Extension
    if (title.includes('gia hạn') || msg.includes('gia hạn')) {
      return {
        screen: 'RentalDetail',
        params: { slotNumber, rentalId },
      };
    }

    // 2d. New booking / garden rental payment
    return {
      screen: 'RentalDetail',
      params: { slotNumber, rentalId },
    };
  }

  // 3. Tree Planting Requests (non-payment events)
  if (t.startsWith('PLANTING_')) {
    const treeMatch = (notification.message || '').match(/giống\s+(?:rau\s+)?([^tạivào(]+?)(?:\s+tại|\s+vào|\s+ở|\s*\()/i);
    const treeName = treeMatch ? treeMatch[1].trim() : undefined;
    return {
      screen: 'CustomerTreePlanting',
      params: {
        requestId: notification.referenceId ?? undefined,
        slotNumber,
        treeName,
        autoOpenDetail: true,
      },
    };
  }

  // 4. Failed Payments
  if (t === 'PAYMENT_FAILED') {
    if (title.includes('giống') || msg.includes('giống')) {
      return { screen: 'CustomerTreePlanting' };
    }
    return { screen: 'PaymentHistory' };
  }

  // 5. Harvest Events
  if (t.startsWith('HARVEST_')) {
    return { screen: 'CustomerHarvestHistory' };
  }

  // 6. Gardening Tasks
  if (t.startsWith('TASK_')) {
    if (slotNumber || rentalId) {
      return {
        screen: 'RentalDetail',
        params: { slotNumber, rentalId },
      };
    }
    return { screen: 'Rentals' };
  }

  // 7. Rental Events (expiring, etc.)
  if (t.startsWith('RENTAL_')) {
    if (slotNumber || rentalId) {
      return {
        screen: 'RentalDetail',
        params: { slotNumber, rentalId },
      };
    }
    return { screen: 'Rentals' };
  }

  return null;
}
