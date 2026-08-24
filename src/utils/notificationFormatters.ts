import {
  AlertTriangle,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Leaf,
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
  { key: 'CONTRACT', label: 'Hợp đồng' },
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

export function getNotificationMeta(type: string): NotificationMeta {
  const t = (type || '').toUpperCase();

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

  // Booking & Rental Expiration
  if (t === 'BOOKING_SUCCESS') {
    return {
      icon: CreditCard,
      color: colors.green[600],
      bgColor: colors.green[50],
      badgeLabel: 'Thanh toán thành công',
      badgeColor: colors.green[800],
      badgeBg: colors.green[100],
    };
  }
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

export function getNotificationActionRoute(notification: NotificationResponseDTO): {
  screen: string;
  params?: any;
} | null {
  const t = (notification.type || '').toUpperCase();

  if (t.includes('IOT') || t.includes('ALERT') || t.includes('SENSOR')) {
    return { screen: 'IoTMonitoring' };
  }

  if (t.startsWith('PLANTING_') || t.startsWith('TREE_PLANTING')) {
    return { screen: 'CustomerTreePlanting' };
  }

  if (t.includes('HARVEST') && (t.includes('COMPLETED') || t.includes('DONE'))) {
    return { screen: 'CustomerHarvestHistory' };
  }

  if (t.startsWith('HARVEST_')) {
    return { screen: 'Rentals' };
  }


  if (t.startsWith('TASK_')) {
    return { screen: 'CareServices' };
  }

  if (t === 'BOOKING_SUCCESS' || t.startsWith('PAYMENT_')) {
    return { screen: 'PaymentHistory' };
  }

  if (t.startsWith('RENTAL_') || t.startsWith('BOOKING_')) {
    return { screen: 'Rentals' };
  }

  return { screen: 'Rentals' };
}

