import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Monitor } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleMap';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function StaffSummaryScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Logo size="lg" />
        <View style={styles.iconBox}>
          <Monitor size={48} color={colors.green[600]} />
        </View>
        <Text style={styles.title}>Xin chào, {user?.name}</Text>
        <Text style={styles.role}>{roleLabel(user?.role || '')}</Text>
        <Text style={styles.desc}>
          Các tính năng quản lý chi tiết (CRUD cơ sở, doanh thu, quản trị user) được tối ưu trên phiên bản web GreenSlot-FrontEnd.
        </Text>
        <Text style={styles.hint}>
          Vui lòng truy cập web dashboard để sử dụng đầy đủ công cụ quản lý.
        </Text>
        <Button title="Đăng xuất" onPress={logout} variant="outline" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.xs },
  role: {
    ...typography.label,
    color: colors.green[600],
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  desc: { ...typography.body, color: colors.gray[500], textAlign: 'center', marginBottom: spacing.md },
  hint: { ...typography.bodySmall, color: colors.gray[400], textAlign: 'center', marginBottom: spacing.xxl },
  btn: { width: '100%' },
});
