import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  User as UserIcon,
  Wifi,
  Wrench,
  CreditCard,
  History,
  LayoutDashboard,
  ChevronRight,
  Sprout,
  Bell,
  UserX,
  MapPin,
  Edit2,
  Phone,
  Image as ImageIcon,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';
import { userApi } from '../../api/userApi';
import { preferenceApi } from '../../api/preferenceApi';
import type { ProfileResponseDTO } from '../../types/api';
import apiClient from '../../api/client';

export default function CustomerAccountScreen({ navigation }: CustomerTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    imageUrl: '',
  });
  const [updating, setUpdating] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Trang tổng quan', screen: 'CustomerDashboard' as const },
    { icon: Bell, label: 'Thông báo', screen: 'Notifications' as const },
    { icon: Wifi, label: 'Giám sát IoT', screen: 'IoTMonitoring' as const },
    { icon: Sprout, label: 'Yêu cầu trồng cây', screen: 'CustomerTreePlanting' as const },
    { icon: Wrench, label: 'Dịch vụ chăm sóc', screen: 'CareServices' as const },
    { icon: CreditCard, label: 'Lịch sử thanh toán', screen: 'PaymentHistory' as const },
    { icon: History, label: 'Lịch sử thu hoạch', screen: 'HarvestHistory' as const },
  ];

  const loadProfile = useCallback(async () => {
    try {
      const data = await userApi.getProfile();
      setProfile(data);
      setEditForm({
        fullName: data.fullName || '',
        phone: data.phone || '',
        address: data.address || '',
        imageUrl: data.imageUrl || '',
      });
    } catch (err: any) {
      console.warn('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleUpdateProfile = async () => {
    if (!editForm.fullName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống.');
      return;
    }
    const phone = editForm.phone.trim();
    if (phone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10 chữ số).');
      return;
    }

    setUpdating(true);
    try {
      await userApi.updateProfile({
        fullName: editForm.fullName.trim(),
        phone: phone || undefined,
        address: editForm.address.trim() || undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
      });
      await loadProfile();
      setIsEditing(false);
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật thông tin.');
    } finally {
      setUpdating(false);
    }
  };

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
              await apiClient.delete('/customer/account/deactivate');
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

        {/* Profile Info Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            {profile?.imageUrl ? (
              <Image source={{ uri: profile.imageUrl }} style={styles.avatarImage} />
            ) : (
              <UserIcon size={36} color={colors.green[600]} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.fullName || user?.name || 'Khách hàng'}</Text>
            <Text style={styles.email}>{profile?.email || user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel(user?.role || 'customer')}</Text>
            </View>
          </View>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
              <Edit2 size={18} color={colors.green[600]} />
            </TouchableOpacity>
          )}
        </Card>

        {/* EDIT PROFILE SECTION */}
        {isEditing && (
          <Card style={styles.editCard}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <Input
              label="Họ và tên *"
              value={editForm.fullName}
              onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
              placeholder="Nhập họ và tên"
              leftIcon={<UserIcon size={16} color={colors.green[600]} />}
            />

            <Input
              label="Số điện thoại"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại"
              leftIcon={<Phone size={16} color={colors.green[600]} />}
            />

            <Input
              label="Địa chỉ"
              value={editForm.address}
              onChangeText={(text) => setEditForm({ ...editForm, address: text })}
              placeholder="Nhập địa chỉ"
              leftIcon={<MapPin size={16} color={colors.green[600]} />}
            />

            <Input
              label="Link ảnh đại diện (avatar)"
              value={editForm.imageUrl}
              onChangeText={(text) => setEditForm({ ...editForm, imageUrl: text })}
              placeholder="Nhập link ảnh (URL)"
              leftIcon={<ImageIcon size={16} color={colors.green[600]} />}
            />

            <View style={styles.editActionRow}>
              <Button
                title="Hủy"
                onPress={() => setIsEditing(false)}
                variant="secondary"
                style={styles.actionBtn}
              />
              <Button
                title="Lưu"
                onPress={handleUpdateProfile}
                loading={updating}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        )}

        {/* Services & Utilities Menu */}
        {!isEditing && (
          <>
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
          </>
        )}

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
            onValueChange={async (enabled) => {
              setNotificationsEnabled(enabled);
              try { await preferenceApi.update({ enabled }); } catch { setNotificationsEnabled(!enabled); Alert.alert('Lỗi', 'Không thể cập nhật cài đặt thông báo.'); }
            }}
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  editBtn: {
    padding: spacing.sm,
    backgroundColor: colors.green[50],
    borderRadius: radius.md,
  },
  editCard: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editTitle: {
    ...typography.heading3,
    color: colors.gray[900],
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  passHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  passToggleText: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
    flex: 1,
  },
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
