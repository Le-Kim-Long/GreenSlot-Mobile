import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, FileText, Activity, ChevronRight, RefreshCw, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { AdminStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeContent: 0,
  });

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Admin?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, contentRes] = await Promise.allSettled([
        adminApi.getAllUsers(0, 1),
        adminApi.getAllGlobalContent(),
      ]);

      let totalUsers = 0;
      if (usersRes.status === 'fulfilled' && usersRes.value) {
        totalUsers = usersRes.value.totalElements || 0;
      }

      let activeContent = 0;
      if (contentRes.status === 'fulfilled' && Array.isArray(contentRes.value)) {
        activeContent = contentRes.value.length;
      }

      setStats({
        totalUsers,
        activeContent,
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản trị Hệ thống</Text>
          <Text style={styles.headerSubtitle}>GreenSlot Admin Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchDashboardData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.green[600]} />
            ) : (
              <RefreshCw size={20} color={colors.green[600]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.red[100], marginLeft: spacing.xs }]}
            onPress={handleLogout}
          >
            <LogOut size={20} color={colors.red[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} tintColor={colors.green[600]} />
        }
      >
        {/* System Status Banner */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Activity size={20} color={colors.green[600]} />
            <Text style={styles.statusTitle}>Hệ thống hoạt động bình thường</Text>
          </View>
          <Text style={styles.statusDesc}>
            API Gateway & Database đang chạy ổn định. Phiên bản Mobile Admin 1.0.0
          </Text>
        </View>

        {/* Overview Stats */}
        <Text style={styles.sectionTitle}>Thống kê tổng quan</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.blue[50] }]}>
              <Users size={22} color={colors.blue[600]} />
            </View>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Người dùng</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.green[50] }]}>
              <FileText size={22} color={colors.green[600]} />
            </View>
            <Text style={styles.statValue}>{stats.activeContent}</Text>
            <Text style={styles.statLabel}>Nội dung</Text>
          </View>

        </View>

        {/* Quick Menu */}
        <Text style={styles.sectionTitle}>Chức năng Quản lý</Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('UserManagement')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.blue[50] }]}>
            <Users size={24} color={colors.blue[600]} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Quản lý Người dùng</Text>
            <Text style={styles.menuSubtitle}>Xem danh sách, phân quyền Role & trạng thái tài khoản</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('GlobalContent')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.green[50] }]}>
            <FileText size={24} color={colors.green[600]} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Quản lý Nội dung</Text>
            <Text style={styles.menuSubtitle}>Thông báo, banner & cấu hình thông tin toàn hệ thống</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>



        <TouchableOpacity
          style={[styles.menuCard, { borderColor: colors.red[100], backgroundColor: colors.red[100] + '30', marginTop: spacing.md }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.red[100] }]}>
            <LogOut size={24} color={colors.red[600]} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuTitle, { color: colors.red[600] }]}>Đăng xuất Tài khoản</Text>
            <Text style={styles.menuSubtitle}>Thoát khỏi phiên làm việc Quản trị viên</Text>
          </View>
          <ChevronRight size={20} color={colors.red[600]} />
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomColor: colors.gray[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  refreshButton: {
    padding: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.green[100],
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.green[50],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[200],
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green[800],
    marginLeft: spacing.xs,
  },
  statusDesc: {
    fontSize: 12,
    color: colors.green[700],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 2,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
  },
});
