import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  CheckSquare,
  ShieldAlert,
  Star,
  Calendar,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Wifi,
  Video,
  History,
  Droplets,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { GardenStaffTabProps } from '../../navigation/types';
import apiClient from '../../api/client';
import { alertApi } from '../../api/alertApi';

export default function GardenStaffAccountScreen({ navigation }: GardenStaffTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [pendingAlertCount, setPendingAlertCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (user?.id) {
        apiClient
          .get(`/staff-ratings/staff/${user.id}/average-rating`)
          .then(res => {
            if (res.data) {
              setAvgRating(typeof res.data === 'number' ? res.data : res.data.averageRating);
            }
          })
          .catch(() => {});
      }

      // Tải số lượng cảnh báo IoT đang chờ xử lý
      alertApi
        .getPendingAlerts()
        .then(data => {
          setPendingAlertCount(Array.isArray(data) ? data.length : 0);
        })
        .catch(() => setPendingAlertCount(0));
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất tài khoản nhân viên?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
      >
        <Text style={styles.title}>Tài khoản Nhân viên Vườn</Text>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={colors.green[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || user?.fullName || 'Nhân viên chăm sóc'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color={colors.green[700]} />
              <Text style={styles.roleText}>{roleLabel(user?.role || 'garden_staff')}</Text>
            </View>
          </View>
        </Card>

        {/* Rating Card */}
        {avgRating !== null && (
          <Card style={styles.ratingCard}>
            <View style={styles.ratingLeft}>
              <Star size={24} color="#F59E0B" fill="#F59E0B" />
              <View>
                <Text style={styles.ratingTitle}>Đánh giá trung bình từ khách hàng</Text>
                <Text style={styles.ratingValue}>{avgRating.toFixed(1)} / 5.0 ⭐</Text>
              </View>
            </View>
          </Card>
        )}

        {/* SECTION: Sự cố & Cảnh báo IoT (Được chuyển vào đây theo yêu cầu) */}
        <Text style={styles.sectionTitle}>Sự cố & Cảnh báo IoT</Text>
        <TouchableOpacity
          style={[styles.menuItem, pendingAlertCount > 0 && styles.menuItemAlert]}
          onPress={() => navigation.navigate('GardenStaffAlert')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIcon, pendingAlertCount > 0 ? styles.menuIconAlert : styles.menuIconNormal]}>
            <ShieldAlert size={20} color={pendingAlertCount > 0 ? '#dc2626' : colors.green[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.alertTitleRow}>
              <Text style={[styles.menuLabel, pendingAlertCount > 0 && styles.menuLabelAlert]}>
                Xử lý Cảnh báo sự cố IoT
              </Text>
              {pendingAlertCount > 0 && (
                <View style={styles.alertBadgeCount}>
                  <Text style={styles.alertBadgeCountText}>{pendingAlertCount} mới</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuSub}>
              {pendingAlertCount > 0
                ? `Có ${pendingAlertCount} cảnh báo ô đất cần cập nhật khắc phục`
                : 'Tất cả thiết bị & ô đất đều hoạt động bình thường'}
            </Text>
          </View>
          <ChevronRight size={18} color={pendingAlertCount > 0 ? '#dc2626' : colors.gray[400]} />
        </TouchableOpacity>

        {/* SECTION: Quản lý công việc & Vận hành */}
        <Text style={styles.sectionTitle}>Công việc & Vận hành</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GardenStaffDashboard')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <CheckSquare size={20} color={colors.green[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Danh sách nhiệm vụ của tôi</Text>
            <Text style={styles.menuSub}>Tiến độ công việc chăm sóc ô vườn</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StaffMySchedule')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <Calendar size={20} color={colors.green[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Lịch trực ca làm việc</Text>
            <Text style={styles.menuSub}>Xem ngày trực và ca phân công tại cơ sở</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GardenStaffPumpControl')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <Droplets size={20} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Điều khiển máy bơm tưới</Text>
            <Text style={styles.menuSub}>Bật/tắt bơm thủ công & tự động theo trụ</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('IoTMonitoring')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <Wifi size={20} color="#ea580c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Giám sát chỉ số cảm biến IoT</Text>
            <Text style={styles.menuSub}>Nhiệt độ, độ ẩm đất, pH và ánh sáng</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GardenStaffCamera')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <Video size={20} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Camera giám sát trực tuyến</Text>
            <Text style={styles.menuSub}>Kiểm tra luồng trực tiếp các ô vườn</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GardenStaffHarvestHistory')}
          activeOpacity={0.8}
        >
          <View style={styles.menuIcon}>
            <History size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Lịch sử thu hoạch rau củ</Text>
            <Text style={styles.menuSub}>Các đợt thu hoạch đã hoàn thành</Text>
          </View>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        {/* SECTION: Cài đặt thông báo & Cá nhân */}
        <Text style={styles.sectionTitle}>Cài đặt thông báo & Cá nhân</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.menuIcon}>
              <Bell size={20} color={colors.green[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Thông báo sự cố khẩn cấp</Text>
              <Text style={styles.menuSub}>Báo rung & chuông khi ô đất vượt ngưỡng cảnh báo</Text>
            </View>
          </View>
          <Switch
            value={alertsEnabled}
            onValueChange={setAlertsEnabled}
            trackColor={{ false: colors.gray[300], true: colors.green[500] }}
          />
        </View>

        {/* Logout Button */}
        <Button
          title="Đăng xuất"
          onPress={handleLogout}
          variant="outline"
          style={styles.logout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  name: { ...typography.heading3, color: colors.gray[900] },
  email: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.xs },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.green[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { ...typography.caption, color: colors.green[800], fontFamily: 'Inter_500Medium' },
  ratingCard: {
    padding: spacing.md,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
  },
  ratingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingTitle: { ...typography.caption, color: '#92400E' },
  ratingValue: { ...typography.heading3, color: '#B45309' },
  sectionTitle: { ...typography.label, color: colors.gray[500], marginBottom: spacing.sm, marginTop: spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 14,
    marginBottom: spacing.sm,
    gap: 12,
  },
  menuItemAlert: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
    borderWidth: 1.5,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconNormal: {
    backgroundColor: colors.green[50],
  },
  menuIconAlert: {
    backgroundColor: '#fee2e2',
  },
  menuLabel: { ...typography.body, color: colors.gray[900], fontWeight: '600' },
  menuLabelAlert: { color: '#b91c1c', fontWeight: '700' },
  menuSub: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertBadgeCount: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertBadgeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: 14,
    marginBottom: spacing.sm,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  logout: { marginTop: spacing.lg, borderColor: '#f87171' },
});
