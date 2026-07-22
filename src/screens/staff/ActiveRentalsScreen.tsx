import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileCheck, Calendar, User, Grid } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { ActiveRentalDTO } from '../../types/api';

export default function ActiveRentalsScreen() {
  const navigation = useNavigation();
  const [rentals, setRentals] = useState<ActiveRentalDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const data = await businessManagerApi.getActiveRentals();
      setRentals(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách hợp đồng thuê active!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  const renderRentalItem = ({ item }: { item: ActiveRentalDTO }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Grid size={18} color={colors.green[600]} />
          <Text style={styles.slotTitle}>Slot {item.slotNumber}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status || 'Đang hoạt động'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <User size={14} color={colors.gray[500]} />
          <Text style={styles.infoText}>
            Khách hàng: <Text style={styles.boldText}>{item.customerName || 'Chưa cập nhật'}</Text>
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Calendar size={14} color={colors.gray[500]} />
          <Text style={styles.infoText}>
            Thời hạn: {item.startTime ? new Date(item.startTime).toLocaleDateString('vi-VN') : ''} - {item.endTime ? new Date(item.endTime).toLocaleDateString('vi-VN') : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hợp đồng Thuê Slot Đang Chạy</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item, index) => (item.rentalId ? item.rentalId.toString() : index.toString())}
          renderItem={renderRentalItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchRentals}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileCheck size={40} color={colors.gray[400]} />
              <Text style={styles.emptyText}>Hiện chưa có hợp đồng thuê Slot nào đang hoạt động.</Text>
            </View>
          }
        />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
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
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginLeft: spacing.xs,
  },
  statusBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green[600],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs + 2,
  },
  cardBody: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: colors.gray[700],
    marginLeft: spacing.xs,
  },
  boldText: {
    fontWeight: '700',
    color: colors.gray[900],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.gray[500],
  },
});
