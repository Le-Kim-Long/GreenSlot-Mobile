import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CheckCircle2, Info, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import { notificationApi } from '../../api/notificationApi';
import type { NotificationResponseDTO } from '../../types/api';

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hôm qua';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoString;
  }
}

export default function CustomerNotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<NotificationResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getMyNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: number) => {
    const item = notifications.find(n => n.id === id);
    if (!item || item.isRead) return;

    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      await Promise.all(unread.map(n => notificationApi.markAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc.');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc toàn bộ thông báo.');
    }
  };

  const renderItem = ({ item }: { item: NotificationResponseDTO }) => {
    const iconColor =
      item.type === 'SUCCESS' || item.type === 'BOOKING_SUCCESS'
        ? colors.green[600]
        : item.type === 'WARNING' || item.type === 'IOT_ALERT'
        ? colors.yellow[600]
        : colors.blue[600];

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {item.type === 'SUCCESS' || item.type === 'BOOKING_SUCCESS' ? (
            <CheckCircle2 size={22} color={iconColor} />
          ) : item.type === 'WARNING' || item.type === 'IOT_ALERT' ? (
            <AlertTriangle size={22} color={iconColor} />
          ) : (
            <Info size={22} color={iconColor} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green[600]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={40} color={colors.gray[400]} />
              <Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>
            </View>
          }
        />
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f0faf4',
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
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.gray[900],
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
