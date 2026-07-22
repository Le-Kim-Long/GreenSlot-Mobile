import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle2, Info, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  read: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Xác nhận Đặt slot thành công',
    message: 'Bạn đã đăng ký thuê thành công ô Slot A-01 tại Cơ sở Nông nghiệp Xanh.',
    time: '10 phút trước',
    type: 'SUCCESS',
    read: false,
  },
  {
    id: '2',
    title: 'Lịch tưới cây định kỳ',
    message: 'Hệ thống tự động đã hoàn thành chu kỳ tưới nước lúc 07:00 AM.',
    time: '2 giờ trước',
    type: 'INFO',
    read: false,
  },
  {
    id: '3',
    title: 'Nhắc nhở Gia hạn Hợp đồng',
    message: 'Ô Slot B-04 của bạn còn 5 ngày nữa sẽ hết hạn hợp đồng thuê. Vui lòng gia hạn.',
    time: '1 ngày trước',
    type: 'WARNING',
    read: true,
  },
];

export default function CustomerNotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.card, !item.read && styles.unreadCard]}>
      <View style={styles.iconContainer}>
        {item.type === 'SUCCESS' ? (
          <CheckCircle2 size={22} color={colors.green[600]} />
        ) : item.type === 'WARNING' ? (
          <AlertTriangle size={22} color={colors.yellow[600]} />
        ) : (
          <Info size={22} color={colors.blue[600]} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markReadText}>Đã đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={40} color={colors.gray[400]} />
            <Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  markReadText: {
    fontSize: 13,
    color: colors.green[600],
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  unreadCard: {
    backgroundColor: colors.green[50] + '40',
    borderColor: colors.green[200],
  },
  iconContainer: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: colors.gray[700],
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.gray[500],
  },
});
