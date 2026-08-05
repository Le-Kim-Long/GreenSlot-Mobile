import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Layers,
  Grid,
  Wrench,
  FileCheck,
  TrendingUp,
  Users,
  ClipboardList,
  ChevronRight,
  RefreshCw,
  Sprout,
  Calendar,
  Package,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { businessManagerApi } from '../../api/businessManagerApi';
import { taskApi } from '../../api/taskApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { StaffStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<StaffStackParamList>;

export default function StaffDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    locationsCount: 0,
    pillarsCount: 0,
    slotsCount: 0,
    rentalsCount: 0,
    tasksCount: 0,
  });

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [locations, pillars, slots, rentals, tasks] = await Promise.allSettled([
        businessManagerApi.getAllLocations(),
        businessManagerApi.getAllPillars(),
        businessManagerApi.getAllSlots(),
        businessManagerApi.getActiveRentals(),
        taskApi.getMyTasks(),
      ]);

      setStats({
        locationsCount: locations.status === 'fulfilled' ? locations.value.length : 0,
        pillarsCount: pillars.status === 'fulfilled' ? pillars.value.length : 0,
        slotsCount: slots.status === 'fulfilled' ? slots.value.length : 0,
        rentalsCount: rentals.status === 'fulfilled' ? rentals.value.length : 0,
        tasksCount: tasks.status === 'fulfilled' ? tasks.value.length : 0,
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý Vận hành</Text>
          <Text style={styles.headerSubtitle}>GreenSlot Staff Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchStats} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.green[600]} />
          ) : (
            <RefreshCw size={20} color={colors.green[600]} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={colors.green[600]} />
        }
      >
        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Tổng quan Nông trại</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.green[50] }]}>
              <MapPin size={20} color={colors.green[600]} />
            </View>
            <Text style={styles.statValue}>{stats.locationsCount}</Text>
            <Text style={styles.statLabel}>Cơ sở</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.blue[50] }]}>
              <Layers size={20} color={colors.blue[600]} />
            </View>
            <Text style={styles.statValue}>{stats.pillarsCount}</Text>
            <Text style={styles.statLabel}>Trụ trồng</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.yellow[50] }]}>
              <Grid size={20} color={colors.yellow[600]} />
            </View>
            <Text style={styles.statValue}>{stats.slotsCount}</Text>
            <Text style={styles.statLabel}>Ô Slot</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.emerald[50] }]}>
              <FileCheck size={20} color={colors.emerald[600]} />
            </View>
            <Text style={styles.statValue}>{stats.rentalsCount}</Text>
            <Text style={styles.statLabel}>Hợp đồng</Text>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Danh mục Quản lý</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('LocationManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.green[50] }]}>
            <MapPin size={22} color={colors.green[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Cơ sở</Text>
            <Text style={styles.menuDesc}>Danh sách địa điểm & cơ sở hạ tầng nông trại</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('PillarManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.blue[50] }]}>
            <Layers size={22} color={colors.blue[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Trụ trồng</Text>
            <Text style={styles.menuDesc}>Cấu hình số ô slot, vị trí trụ & loại cây trồng</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SlotManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.yellow[50] }]}>
            <Grid size={22} color={colors.yellow[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Ô Slot</Text>
            <Text style={styles.menuDesc}>Điều chỉnh giá thuê, trạng thái Available / Maintenance</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ServiceManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.purple[50] }]}>
            <Wrench size={22} color={colors.purple[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Dịch vụ Chăm sóc</Text>
            <Text style={styles.menuDesc}>Cấu hình gói tưới cây, bón phân & bắt sâu bệnh</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ActiveRentals')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.emerald[50] }]}>
            <FileCheck size={22} color={colors.emerald[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Hợp đồng Thuê</Text>
            <Text style={styles.menuDesc}>Danh sách slot đang được khách hàng thuê thực tế</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('RevenueAnalytics')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.teal[700] + '20' }]}>
            <TrendingUp size={22} color={colors.teal[700]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Báo cáo Doanh thu</Text>
            <Text style={styles.menuDesc}>Biểu đồ doanh thu & phân tích hiệu suất khai thác</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Quản lý Nông nghiệp</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TreeManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.green[50] }]}>
            <Sprout size={22} color={colors.green[600]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Giống cây</Text>
            <Text style={styles.menuDesc}>Thêm, sửa giống cây & thiết lập ngưỡng IoT cảnh báo</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('EquipmentManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#eff6ff' }]}>
            <Package size={22} color="#2563eb" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Quản lý Thiết bị</Text>
            <Text style={styles.menuDesc}>Theo dõi máy bơm, cảm biến IoT & lịch bảo trì</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StaffScheduleManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#fef3c7' }]}>
            <Calendar size={22} color="#d97706" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Phân ca Nhân viên</Text>
            <Text style={styles.menuDesc}>Lên lịch & điều phối ca làm việc cho nhân viên vườn</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TreePlantingManagement')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <ClipboardList size={22} color={colors.green[700]} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Duyệt Yêu cầu Trồng cây</Text>
            <Text style={styles.menuDesc}>Phê duyệt / từ chối yêu cầu thay giống cây từ khách hàng</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Phân Tích & Giám Sát</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AlertAnalytics')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#eff6ff' }]}>
            <TrendingUp size={22} color="#2563eb" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Thống kê Cảnh báo IoT</Text>
            <Text style={styles.menuDesc}>Phân tích mật độ & thời gian xử lý sự cố sensor</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AlertHistory')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#fef2f2' }]}>
            <ClipboardList size={22} color="#dc2626" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Lịch sử Cảnh báo</Text>
            <Text style={styles.menuDesc}>Xem lại toàn bộ lịch sử cảnh báo & nhật ký xử lý</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CustomerAnalytics')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: '#f5f3ff' }]}>
            <Users size={22} color="#7c3aed" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Phân tích Khách hàng (CLV)</Text>
            <Text style={styles.menuDesc}>Giá trị vòng đời khách hàng & chi tiêu dịch vụ</Text>
          </View>
          <ChevronRight size={20} color={colors.gray[400]} />
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
  refreshBtn: {
    padding: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.green[100],
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: 12,
    color: colors.gray[500],
  },
});
