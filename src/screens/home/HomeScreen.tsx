import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Leaf, Wifi, Wrench, ArrowRight, Sprout, Droplets, Sun } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/common/Logo';
import { GradientHeader } from '../../components/common/GradientHeader';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { CustomerTabProps } from '../../navigation/types';

const features = [
  { icon: Leaf, title: 'Thuê ô vườn', desc: 'Chọn vị trí phù hợp', color: colors.green[600], bg: colors.green[50] },
  { icon: Wifi, title: 'Giám sát IoT', desc: 'Theo dõi cảm biến 24/7', color: colors.blue[600], bg: colors.blue[50] },
  { icon: Wrench, title: 'Chăm sóc', desc: 'Đặt dịch vụ chuyên nghiệp', color: colors.purple[600], bg: colors.purple[50] },
];

const steps = [
  { icon: Sprout, text: 'Đăng ký tài khoản' },
  { icon: Leaf, text: 'Chọn và thuê ô vườn' },
  { icon: Droplets, text: 'Giám sát & chăm sóc' },
  { icon: Sun, text: 'Thu hoạch thành quả' },
];

export default function HomeScreen({ navigation }: CustomerTabProps<'Home'>) {
  const { user } = useAuth();
  const parentNav = navigation.getParent();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Logo size="sm" />
        </View>

        <GradientHeader
          title={`Xin chào, ${user?.name?.split(' ').pop() || 'bạn'}!`}
          subtitle="Nền tảng thuê vườn canh tác thẳng đứng"
        />

        <Text style={styles.sectionTitle}>Tính năng nổi bật</Text>
        <View style={styles.featureGrid}>
          {features.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={styles.featureCard}
              onPress={() => {
                if (i === 0) navigation.navigate('Gardens');
                else if (i === 1) parentNav?.navigate('IoTMonitoring');
                else parentNav?.navigate('CareServices');
              }}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <f.icon size={22} color={f.color} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>Cách hoạt động</Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <s.icon size={18} color={colors.green[600]} />
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </Card>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('Gardens')}
        >
          <Text style={styles.ctaText}>Khám phá vườn ngay</Text>
          <ArrowRight size={18} color={colors.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.heading3, color: colors.gray[900], marginBottom: spacing.md },
  featureGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  featureCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: { ...typography.label, color: colors.gray[900], marginBottom: 2 },
  featureDesc: { ...typography.caption, color: colors.gray[500] },
  stepsCard: { marginBottom: spacing.lg },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { ...typography.caption, color: colors.white, fontFamily: 'Inter_700Bold' },
  stepText: { ...typography.body, color: colors.gray[700], flex: 1 },
  cta: {
    backgroundColor: colors.green[600],
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { ...typography.button, color: colors.white },
});
