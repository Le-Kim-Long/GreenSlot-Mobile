import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Inbox,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import { notificationApi } from '../../api/notificationApi';
import type { NotificationResponseDTO } from '../../types/api';
import {
  NotificationCategory,
  CATEGORY_TABS,
  filterNotificationByCategory,
  formatRelativeTime,
  getNotificationMeta,
  getNotificationActionRoute,
} from '../../utils/notificationFormatters';

export default function CustomerNotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationResponseDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('ALL');
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.getMyNotifications();
      setNotifications(Array.isArray(data) ? data : []);
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

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(
    () => notifications.filter(item => filterNotificationByCategory(item, selectedCategory)),
    [notifications, selectedCategory]
  );

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

  const handlePressNotification = async (item: NotificationResponseDTO) => {
    if (!item.isRead) {
      void handleMarkAsRead(item.id);
    }

    const actionRoute = getNotificationActionRoute(item);
    if (actionRoute) {
      try {
        navigation.navigate(actionRoute.screen, actionRoute.params);
      } catch (err) {
        console.log('Navigation route not available:', actionRoute.screen, err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) {
      Alert.alert('Thông báo', 'Tất cả thông báo đã được đọc.');
      return;
    }

    setMarkingAll(true);
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (err) {
      // Fallback: batch mark individual items
      try {
        await Promise.all(unread.map(n => notificationApi.markAsRead(n.id)));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
      } catch {
        Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc toàn bộ thông báo.');
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: NotificationResponseDTO }) => {
    const meta = getNotificationMeta(item.type);
    const IconComponent = meta.icon;
    const actionRoute = getNotificationActionRoute(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.isRead && styles.unreadCard,
        ]}
        onPress={() => handlePressNotification(item)}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadIndicatorBar} />}

        <View style={[styles.iconBox, { backgroundColor: meta.bgColor }]}>
          <IconComponent size={20} color={meta.color} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
              <Text style={[styles.badgeText, { color: meta.badgeColor }]}>
                {meta.badgeLabel}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
          </View>

          <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.message}>
            {item.message}
          </Text>

          {actionRoute && (
            <View style={styles.actionFooter}>
              <Text style={styles.actionText}>Xem chi tiết</Text>
              <ChevronRight size={14} color={colors.green[600]} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.gray[900]} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Thông báo</Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.markAllBtn, (unreadCount === 0 || markingAll) && styles.markAllBtnDisabled]}
          onPress={handleMarkAllAsRead}
          disabled={unreadCount === 0 || markingAll}
          activeOpacity={0.7}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={colors.green[600]} />
          ) : (
            <>
              <CheckCheck size={16} color={unreadCount > 0 ? colors.green[600] : colors.gray[400]} />
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 && styles.markAllTextDisabled,
                ]}
              >
                Đọc tất cả
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs / Pills */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORY_TABS.map(tab => {
            const isActive = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setSelectedCategory(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {tab.label}
                </Text>
                {tab.key === 'UNREAD' && unreadCount > 0 && (
                  <View
                    style={[
                      styles.pillBadge,
                      isActive && styles.pillBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBadgeText,
                        isActive && styles.pillBadgeTextActive,
                      ]}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green[600]}
              colors={[colors.green[600]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Inbox size={36} color={colors.green[600]} />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'UNREAD'
                  ? 'Tuyệt vời! Không có thông báo chưa đọc'
                  : 'Chưa có thông báo nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory === 'UNREAD'
                  ? 'Bạn đã xem tất cả các cập nhật mới nhất từ hệ thống.'
                  : 'Các thông tin về vườn thuê, chăm sóc cây và cảnh báo IoT sẽ hiển thị tại đây.'}
              </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.gray[900],
  },
  headerBadge: {
    backgroundColor: colors.red[500],
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
  },
  markAllBtnDisabled: {
    backgroundColor: colors.gray[50],
  },
  markAllText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  markAllTextDisabled: {
    color: colors.gray[400],
  },
  filterSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.green[600],
  },
  pillText: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[700],
  },
  pillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
  },
  pillBadge: {
    backgroundColor: colors.red[500],
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadgeActive: {
    backgroundColor: colors.white,
  },
  pillBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
  pillBadgeTextActive: {
    color: colors.green[700],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
    position: 'relative',
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: '#f6fbf8',
    borderColor: colors.green[200],
  },
  unreadIndicatorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.green[600],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 11,
    color: colors.gray[400],
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.green[600],
  },
  title: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
    marginBottom: 2,
  },
  unreadTitle: {
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  message: {
    ...typography.bodySmall,
    color: colors.gray[600],
    lineHeight: 19,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  actionText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[600],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 19,
  },
});
