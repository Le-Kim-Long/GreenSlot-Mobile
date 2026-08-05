import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Calendar, MapPin, Grid, Shield, ShieldCheck, Mail, Phone } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing, radius, typography } from '../../theme/typography';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StaffStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StaffStackParamList, 'ActiveRentalDetail'>;

export default function ActiveRentalDetailScreen({ route, navigation }: Props) {
  const { rental } = route.params;

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'Chưa cập nhật';
    try {
      const d = new Date(isoStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết hợp đồng</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Slot Badge Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrapper}>
            <Grid size={36} color={colors.green[600]} />
          </View>
          <Text style={styles.slotTitle}>Slot {rental.slotNumber}</Text>
          <Text style={styles.locationSub}>{rental.locationName}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, rental.status === 'ACTIVE' ? styles.statusBadgeActive : null]}>
              <Text style={[styles.statusText, rental.status === 'ACTIVE' ? styles.statusTextActive : null]}>
                {rental.status || 'Đang hoạt động'}
              </Text>
            </View>
          </View>
        </View>

        {/* Client Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color={colors.green[600]} />
            <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Họ và tên</Text>
              <Text style={styles.value}>{rental.fullName || 'Chưa cập nhật'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Tên tài khoản</Text>
              <Text style={styles.value}>{rental.username || 'Chưa cập nhật'}</Text>
            </View>
          </View>
        </View>

        {/* Slot and Location Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color={colors.green[600]} />
            <Text style={styles.cardTitle}>Thông tin vị trí & Cơ sở</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Cơ sở</Text>
              <Text style={styles.value}>{rental.locationName || 'Chưa cập nhật'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Cột vườn</Text>
              <Text style={styles.value}>{rental.pillarCode || 'Chưa cập nhật'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Mã ô vườn</Text>
              <Text style={styles.value}>{rental.slotNumber || 'Chưa cập nhật'}</Text>
            </View>
          </View>
        </View>

        {/* Contract Duration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={colors.green[600]} />
            <Text style={styles.cardTitle}>Thời hạn thuê</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.dateRangeWrapper}>
              <View style={styles.dateBox}>
                <Text style={styles.dateBoxLabel}>📅 Ngày bắt đầu</Text>
                <Text style={styles.dateBoxValue}>{formatDate(rental.startTime)}</Text>
              </View>
              <View style={styles.dateSeparator}>
                <Text style={styles.separatorText}>→</Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateBoxLabel}>🏁 Ngày kết thúc</Text>
                <Text style={styles.dateBoxValue}>{formatDate(rental.endTime)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer/Helper info */}
        <View style={styles.helperSection}>
          <ShieldCheck size={16} color={colors.gray[400]} />
          <Text style={styles.helperText}>
            Hợp đồng này được kích hoạt tự động sau khi hệ thống GreenSlot ghi nhận giao dịch thanh toán thành công của khách hàng.
          </Text>
        </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  content: {
    padding: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.md,
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  slotTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
  },
  locationSub: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 2,
  },
  badgeRow: {
    marginTop: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeActive: {
    backgroundColor: colors.green[50],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[600],
  },
  statusTextActive: {
    color: colors.green[600],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  cardBody: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: colors.gray[500],
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[800],
  },
  dateRangeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateBoxLabel: {
    fontSize: 11,
    color: colors.gray[500],
  },
  dateBoxValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[800],
    marginTop: 4,
  },
  dateSeparator: {
    paddingHorizontal: spacing.sm,
  },
  separatorText: {
    fontSize: 16,
    color: colors.green[400],
    fontWeight: '700',
  },
  helperSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    color: colors.gray[400],
    flex: 1,
    lineHeight: 16,
  },
});
