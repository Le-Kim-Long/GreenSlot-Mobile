import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Wifi,
  Wrench,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';

export default function AccountScreen({ navigation }: CustomerTabProps<'Account'>) {
  const { user, logout } = useAuth();
  const parentNav = navigation.getParent();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', screen: 'CustomerDashboard' as const },
    { icon: Wifi, label: 'Giám sát IoT', screen: 'IoTMonitoring' as const },
    { icon: Wrench, label: 'Dịch vụ chăm sóc', screen: 'CareServices' as const },
    { icon: CreditCard, label: 'Lịch sử thanh toán', screen: 'PaymentHistory' as const },
  ];

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài khoản</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={32} color={colors.green[600]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel(user?.role || 'customer')}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Dịch vụ</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => parentNav?.navigate(item.screen)}
          >
            <View style={styles.menuIcon}>
              <item.icon size={20} color={colors.green[600]} />
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
    backgroundColor: colors.blue[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  roleText: { ...typography.caption, color: colors.blue[800], fontFamily: 'Inter_500Medium' },
  sectionTitle: { ...typography.label, color: colors.gray[500], marginBottom: spacing.sm },
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
  logout: { marginTop: spacing.xl },
});
