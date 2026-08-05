import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { User } from 'lucide-react-native';
import { customerAnalyticsApi } from '../../api/customerAnalyticsApi';
import type { CustomerLifetimeValue } from '../../types/api';
import { colors } from '../../theme/colors';

export default function CustomerAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<CustomerLifetimeValue[]>([]);

  const fetchCLVs = async () => {
    try {
      const data = await customerAnalyticsApi.getAllCLVs();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customer analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCLVs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCLVs();
  };

  const renderItem = ({ item }: { item: CustomerLifetimeValue }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <User size={24} color={colors.green[600]} />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{item.userName || `User #${item.userId}`}</Text>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Tổng chi tiêu</Text>
          <Text style={styles.statValue}>
            {item.totalSpent ? item.totalSpent.toLocaleString('vi-VN') + ' đ' : '0 đ'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lượt thuê</Text>
          <Text style={styles.statValue}>{item.totalRentals || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Giá trị CLV</Text>
          <Text style={[styles.statValue, { color: colors.green[600] }]}>
            {item.customerLifetimeValue
              ? item.customerLifetimeValue.toLocaleString('vi-VN') + ' đ'
              : '0 đ'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phân Tích Khách Hàng (CLV)</Text>
      <Text style={styles.subtitle}>Giá trị đời sống khách hàng & tổng quan dịch vụ</Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.green[600]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.userId.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Chưa có dữ liệu khách hàng</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500], marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  headerInfo: { marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: colors.gray[900] },
  userEmail: { fontSize: 13, color: colors.gray[500] },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: colors.gray[500], marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: colors.gray[800] },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.gray[400] },
});

