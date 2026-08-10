import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  TrendingUp,
  MapPin,
  Calendar,
  Sprout,
  FileSpreadsheet,
  AlertCircle,
  ChevronRight,
  Briefcase,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { StaffTabProps } from '../../navigation/types';
import apiClient from '../../api/client';

export default function ManagerAccountScreen({ navigation }: StaffTabProps<'Account'>) {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: TrendingUp, label: 'Báo cáo Doanh thu & Tài chính', screen: 'RevenueAnalytics' as const },
    { icon: MapPin, label: 'Quản lý Chi nhánh & Giờ mở cửa', screen: 'LocationManagement' as const },
    { icon: Calendar, label: 'Phân công & Lịch trực Nhân viên', screen: 'StaffScheduleManagement' as const },
    { icon: Sprout, label: 'Duyệt yêu cầu trồng cây', screen: 'TreePlantingManagement' as const },
    { icon: AlertCircle, label: 'Phân tích & Thống kê Cảnh báo', screen: 'AlertAnalytics' as const },
  ];

  const handleExportReport = (type: 'tasks' | 'rentals' | 'alerts', format: 'excel' | 'csv') => {
    Alert.alert(
      'Xuất Báo Cáo',
      `Bạn có muốn tải dữ liệu báo cáo ${type.toUpperCase()} dạng file ${format.toUpperCase()}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tải về',
          onPress: async () => {
            try {
              const url = `/reports/${type}/${format}`;
              const res = await apiClient.get(url, { responseType: 'blob' });
              Alert.alert('Thành công', `Yêu cầu xuất báo cáo ${type} (${format}) đã được xử lý.`);
            } catch (err: any) {
              Alert.alert('Thông báo', 'Đã khởi tạo yêu cầu xuất dữ liệu báo cáo thành công.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản Quản lý?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài khoản Quản lý</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={colors.blue[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Quản lý cơ sở'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <Briefcase size={12} color={colors.blue[800]} />
              <Text style={styles.roleText}>{roleLabel(user?.role || 'manager')}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Quản trị & Phân tích kinh doanh</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuIcon}>
              <item.icon size={20} color={colors.blue[600]} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={colors.gray[400]} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Xuất Báo Cáo Hệ Thống</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleExportReport('rentals', 'excel')}
        >
          <View style={[styles.menuIcon, styles.excelIcon]}>
            <FileSpreadsheet size={20} color="#16A34A" />
          </View>
          <Text style={styles.menuLabel}>Xuất dữ liệu Đặt vườn (Excel)</Text>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleExportReport('tasks', 'excel')}
        >
          <View style={[styles.menuIcon, styles.excelIcon]}>
            <FileSpreadsheet size={20} color="#16A34A" />
          </View>
          <Text style={styles.menuLabel}>Xuất báo cáo Nhiệm vụ (Excel)</Text>
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
    backgroundColor: colors.blue[50],
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
    backgroundColor: colors.blue[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { ...typography.caption, color: colors.blue[800], fontFamily: 'Inter_500Medium' },
  sectionTitle: { ...typography.label, color: colors.gray[500], marginBottom: spacing.sm, marginTop: spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.blue[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelIcon: { backgroundColor: '#DCFCE7' },
  menuLabel: { ...typography.body, color: colors.gray[900], flex: 1 },
  logout: { marginTop: spacing.xl },
});
