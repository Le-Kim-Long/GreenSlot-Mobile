import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Wifi,
  Wrench,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Sprout,
  Bell,
  UserX,
  History,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';
import apiClient from '../../api/client';

export default function CustomerAccountScreen({ navigation }: CustomerTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Trang tổng quan', screen: 'CustomerDashboard' as const },
    { icon: Bell, label: 'Thông báo', screen: 'Notifications' as const },
    { icon: Wifi, label: 'Giám sát IoT', screen: 'IoTMonitoring' as const },
    { icon: Sprout, label: 'Yêu cầu trồng cây', screen: 'CustomerTreePlanting' as const },
    { icon: History, label: 'Lịch sử thu hoạch', screen: 'CustomerHarvestHistory' as const },
    { icon: Wrench, label: 'Dịch vụ chăm sóc', screen: 'CareServices' as const },
    { icon: CreditCard, label: 'Lịch sử thanh toán', screen: 'PaymentHistory' as const },
  ];

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Vô hiệu hóa tài khoản',
      'Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Thao tác này sẽ tạm ngưng quyền truy cập của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Vô hiệu hóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/customer/account/deactivate');
              Alert.alert('Thành công', 'Tài khoản của bạn đã được vô hiệu hóa.');
              logout();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể vô hiệu hóa tài khoản.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài khoản Khách hàng</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={colors.green[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Khách hàng'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel(user?.role || 'customer')}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Dịch vụ & Tiện ích</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuIcon}>
              <item.icon size={20} color={colors.green[600]} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={colors.gray[400]} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Thiết lập & Quyền riêng tư</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.menuIcon}>
              <Bell size={20} color={colors.green[600]} />
            </View>
            <Text style={styles.menuLabel}>Thông báo Push</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.gray[300], true: colors.green[500] }}
          />
        </View>

        <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleDeactivateAccount}>
          <View style={[styles.menuIcon, styles.dangerIcon]}>
            <UserX size={20} color={colors.red[600]} />
          </View>
          <Text style={[styles.menuLabel, styles.dangerText]}>Vô hiệu hóa tài khoản</Text>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

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
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
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
  email: { ...typography.bodySmall, color: colors.gray[500], marginBottom: spacing.sm },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { ...typography.caption, color: colors.green[800], fontFamily: 'Inter_500Medium' },
  sectionTitle: { ...typography.label, color: colors.gray[500], marginBottom: spacing.sm, marginTop: spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.body, color: colors.gray[900], flex: 1 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  dangerItem: { borderColor: colors.red[100], backgroundColor: '#FFF5F5' },
  dangerIcon: { backgroundColor: '#FEE2E2' },
  dangerText: { color: colors.red[600] },
  logout: { marginTop: spacing.xl },
});
