import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  User as UserIcon,
  Wifi,
  Camera,
  CreditCard,
  History,
  LayoutDashboard,
  ChevronRight,
  Sprout,
  Bell,
  MapPin,
  Edit3,
  Phone,
  Image as ImageIcon,
  X,
  UserX,
  LogOut,
  ShieldCheck,
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
import type { ProfileResponseDTO } from '../../types/api';
import apiClient from '../../api/client';
import { showInAppNotification } from '../../components/common/InAppNotificationBanner';

interface MenuItemConfig {
  icon: any;
  label: string;
  subtitle: string;
  screen: 'CustomerDashboard' | 'Notifications' | 'IoTMonitoring' | 'CustomerTreePlanting' | 'CustomerHarvestHistory' | 'Camera' | 'PaymentHistory';
  iconColor: string;
  iconBg: string;
}

export default function CustomerAccountScreen({ navigation }: CustomerTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    imageUrl: '',
  });
  const [updating, setUpdating] = useState(false);

  // All 7 services preserved with distinctive modern accents
  const menuItems: MenuItemConfig[] = [
    {
      icon: LayoutDashboard,
      label: 'Trang tổng quan',
      subtitle: 'Thống kê & tiến độ các ô vườn của bạn',
      screen: 'CustomerDashboard',
      iconColor: colors.green[700],
      iconBg: colors.green[50],
    },
    {
      icon: Bell,
      label: 'Thông báo',
      subtitle: 'Cập nhật tình trạng & hoạt động mới nhất',
      screen: 'Notifications',
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      icon: Wifi,
      label: 'Giám sát IoT',
      subtitle: 'Nhiệt độ, độ ẩm đất, độ ẩm khí & pH ô vườn',
      screen: 'IoTMonitoring',
      iconColor: '#0891b2',
      iconBg: '#ecfeff',
    },
    {
      icon: Sprout,
      label: 'Yêu cầu trồng cây',
      subtitle: 'Đăng ký trồng thêm cây giống vào ô vườn',
      screen: 'CustomerTreePlanting',
      iconColor: colors.green[600],
      iconBg: '#f0fdf4',
    },
    {
      icon: History,
      label: 'Lịch sử thu hoạch',
      subtitle: 'Nhật ký năng suất & các lần thu hoạch rau củ',
      screen: 'CustomerHarvestHistory',
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      icon: Camera,
      label: 'Camera giám sát',
      subtitle: 'Xem hình ảnh trực tiếp thời gian thực',
      screen: 'Camera',
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
    },
    {
      icon: CreditCard,
      label: 'Lịch sử thanh toán',
      subtitle: 'Tra cứu hóa đơn, biên lai & tải PDF hóa đơn',
      screen: 'PaymentHistory',
      iconColor: '#4f46e5',
      iconBg: '#eef2ff',
    },
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
      showInAppNotification({
        title: 'Cập nhật thành công',
        body: 'Thông tin hồ sơ cá nhân đã được lưu.',
        variant: 'success',
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật thông tin.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Vô hiệu hóa tài khoản',
      'Bạn có chắc chắn muốn vô hiệu hóa tài khoản? Thao tác này sẽ tạm ngưng quyền truy cập của bạn vào hệ thống GreenSlot.',
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
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng GreenSlot?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Tài khoản</Text>
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color={colors.green[700]} />
            <Text style={styles.verifiedText}>Đã xác thực</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {profile?.imageUrl ? (
              <Image source={{ uri: profile.imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserIcon size={34} color={colors.green[600]} />
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.fullName || user?.name || 'Khách hàng GreenSlot'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {profile?.email || user?.email || 'N/A'}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{roleLabel(user?.role || 'customer')}</Text>
              </View>
              {profile?.phone ? (
                <View style={styles.phoneTag}>
                  <Phone size={11} color={colors.gray[600]} />
                  <Text style={styles.phoneText}>{profile.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {!isEditing && (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.editBtn}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color={colors.green[700]} />
              <Text style={styles.editBtnText}>Sửa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Address tag if available */}
        {profile?.address && !isEditing ? (
          <View style={styles.addressBar}>
            <MapPin size={14} color={colors.gray[500]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {profile.address}
            </Text>
          </View>
        ) : null}

        {/* EDIT PROFILE CARD */}
        {isEditing && (
          <Card style={styles.editCard}>
            <View style={styles.editHeader}>
              <View>
                <Text style={styles.editTitle}>Chỉnh sửa thông tin</Text>
                <Text style={styles.editSubtitle}>Cập nhật thông tin cá nhân của bạn</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={styles.closeEditBtn}
              >
                <X size={18} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <Input
              label="Họ và tên *"
              value={editForm.fullName}
              onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
              placeholder="Nhập họ và tên đầy đủ"
              leftIcon={<UserIcon size={16} color={colors.green[600]} />}
            />

            <Input
              label="Số điện thoại"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại liên hệ"
              leftIcon={<Phone size={16} color={colors.green[600]} />}
            />

            <Input
              label="Địa chỉ"
              value={editForm.address}
              onChangeText={(text) => setEditForm({ ...editForm, address: text })}
              placeholder="Nhập địa chỉ của bạn"
              leftIcon={<MapPin size={16} color={colors.green[600]} />}
            />

            <Input
              label="Link ảnh đại diện (avatar)"
              value={editForm.imageUrl}
              onChangeText={(text) => setEditForm({ ...editForm, imageUrl: text })}
              placeholder="https://example.com/avatar.jpg"
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
                title="Lưu thay đổi"
                onPress={handleUpdateProfile}
                loading={updating}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        )}

        {/* Services & Utilities Section - Preserved all 7 items with grouped card */}
        {!isEditing && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>DỊCH VỤ & TIỆN ÍCH</Text>
              <Text style={styles.sectionCount}>{menuItems.length} chức năng</Text>
            </View>

            <View style={styles.groupedCard}>
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                const isLast = index === menuItems.length - 1;
                return (
                  <React.Fragment key={item.screen}>
                    <TouchableOpacity
                      style={styles.groupedItem}
                      onPress={() => navigation.navigate(item.screen)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                        <IconComponent size={20} color={item.iconColor} />
                      </View>
                      <View style={styles.menuTextBox}>
                        <Text style={styles.menuTitle}>{item.label}</Text>
                        <Text style={styles.menuSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.gray[400]} />
                    </TouchableOpacity>
                    {!isLast && <View style={styles.itemDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* Account & Security Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>TÀI KHOẢN & BẢO MẬT</Text>
          <View style={styles.groupedCard}>
            <TouchableOpacity
              style={styles.groupedItem}
              onPress={handleDeactivateAccount}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
                <UserX size={18} color="#dc2626" />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: '#dc2626' }]}>Vô hiệu hóa tài khoản</Text>
                <Text style={styles.menuSubtitle}>Tạm ngưng quyền truy cập GreenSlot</Text>
              </View>
              <ChevronRight size={18} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#dc2626" />
          <Text style={styles.logoutBtnText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>GreenSlot Mobile • Phiên bản 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.green[400],
  },
  avatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.green[50],
    borderWidth: 2,
    borderColor: colors.green[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: colors.green[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[600],
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.green[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.green[200],
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[700],
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[600],
    flex: 1,
  },
  editCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.green[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  editTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  editSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 2,
  },
  closeEditBtn: {
    padding: 4,
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[500],
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[400],
  },
  groupedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  groupedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  menuTextBox: {
    flex: 1,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 66,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 24,
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#dc2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[400],
    marginTop: 16,
    marginBottom: 8,
  },
});
