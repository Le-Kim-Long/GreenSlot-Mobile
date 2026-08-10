import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  CheckSquare,
  AlertTriangle,
  Star,
  Calendar,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { GardenStaffTabProps } from '../../navigation/types';
import apiClient from '../../api/client';

export default function GardenStaffAccountScreen({ navigation }: GardenStaffTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      apiClient
        .get(`/staff-ratings/staff/${user.id}/average-rating`)
        .then(res => {
          if (isMounted && res.data) {
            setAvgRating(typeof res.data === 'number' ? res.data : res.data.averageRating);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất tài khoản nhân viên?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài khoản Nhân viên Vườn</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={36} color={colors.green[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Nhân viên chăm sóc'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color={colors.green[700]} />
              <Text style={styles.roleText}>{roleLabel(user?.role || 'garden_staff')}</Text>
            </View>
          </View>
        </Card>

        {avgRating !== null && (
          <Card style={styles.ratingCard}>
            <View style={styles.ratingLeft}>
              <Star size={24} color="#F59E0B" fill="#F59E0B" />
              <View>
                <Text style={styles.ratingTitle}>Đánh giá trung bình</Text>
                <Text style={styles.ratingValue}>{avgRating.toFixed(1)} / 5.0</Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Nhiệm vụ & Chăm sóc</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GardenStaffDashboard')}
        >
          <View style={styles.menuIcon}>
            <CheckSquare size={20} color={colors.green[600]} />
          </View>
          <Text style={styles.menuLabel}>Danh sách nhiệm vụ của tôi</Text>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('IoTMonitoring')}
        >
          <View style={styles.menuIcon}>
            <AlertTriangle size={20} color={colors.green[600]} />
          </View>
          <Text style={styles.menuLabel}>Giám sát & Sự cố cảm biến IoT</Text>
          <ChevronRight size={18} color={colors.gray[400]} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Cài đặt thông báo & Cá nhân</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.menuIcon}>
              <Bell size={20} color={colors.green[600]} />
            </View>
            <Text style={styles.menuLabel}>Thông báo sự cố khẩn cấp</Text>
          </View>
          <Switch
            value={alertsEnabled}
            onValueChange={setAlertsEnabled}
            trackColor={{ false: colors.gray[300], true: colors.green[500] }}
          />
        </View>

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
    marginBottom: spacing.lg,
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
  logout: { marginTop: spacing.xl },
});
