import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Users,
  ShieldAlert,
  FileText,
  Camera,
  Activity,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../navigation/types';
import apiClient from '../../api/client';

type AdminAccountScreenProps = NativeStackScreenProps<AdminStackParamList, any>;

export default function AdminAccountScreen({ navigation }: AdminAccountScreenProps) {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<'UP' | 'DOWN' | 'LOADING'>('LOADING');

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/system/health')
      .then(res => {
        if (isMounted) {
          const status = res.data?.status || res.data;
          setHealthStatus(status === 'UP' || status?.status === 'UP' ? 'UP' : 'DOWN');
        }
      })
      .catch(() => {
        if (isMounted) setHealthStatus('DOWN');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const menuItems = [
    { icon: Users, label: 'Quản lý Người dùng & Cấp quyền', screen: 'UserManagement' as const },
    { icon: FileText, label: 'Thấu thị Nhật ký Hệ thống (Audit Log)', screen: 'AuditLog' as const },
    { icon: ShieldAlert, label: 'Quản lý Nội dung & Cấu hình toàn cục', screen: 'GlobalContent' as const },
    { icon: Camera, label: 'Giám sát Camera & Thiết bị IoT', screen: 'CameraDashboard' as const },
  ];

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi tài khoản Quản trị viên?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài khoản Admin</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={colors.purple ? colors.purple[600] || '#7C3AED' : '#7C3AED'} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Quản trị viên'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color="#6D28D9" />
              <Text style={styles.roleText}>{roleLabel(user?.role || 'admin')}</Text>
            </View>
          </View>
        </Card>

        {/* System Health Summary Card */}
        <Card style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Activity size={20} color="#6D28D9" />
            <Text style={styles.healthTitle}>Sức khỏe Hệ thống API</Text>
          </View>
          <View style={styles.healthStatusRow}>
            {healthStatus === 'LOADING' ? (
              <ActivityIndicator size="small" color="#6D28D9" />
            ) : healthStatus === 'UP' ? (
              <>
                <CheckCircle2 size={20} color="#16A34A" />
                <Text style={styles.healthUpText}>Hệ thống hoạt động bình thường (UP)</Text>
              </>
            ) : (
              <>
                <XCircle size={20} color="#DC2626" />
                <Text style={styles.healthDownText}>Phát hiện gián đoạn kết nối (DOWN)</Text>
              </>
            )}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Quản trị Hệ thống</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuIcon}>
              <item.icon size={20} color="#6D28D9" />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={colors.gray[400]} />
          </TouchableOpacity>
        ))}

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
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#EDE9FE',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { ...typography.caption, color: '#6D28D9', fontFamily: 'Inter_500Medium' },
  healthCard: {
    padding: spacing.md,
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    marginBottom: spacing.lg,
  },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  healthTitle: { ...typography.label, color: '#5B21B6' },
  healthStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  healthUpText: { ...typography.bodySmall, color: '#15803D', fontFamily: 'Inter_600SemiBold' },
  healthDownText: { ...typography.bodySmall, color: '#B91C1C', fontFamily: 'Inter_600SemiBold' },
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
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { ...typography.body, color: colors.gray[900], flex: 1 },
  logout: { marginTop: spacing.xl },
});
