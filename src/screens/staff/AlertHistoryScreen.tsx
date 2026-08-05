import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { alertApi } from '../../api/alertApi';
import type { AlertDTO } from '../../types/api';
import { colors } from '../../theme/colors';

export default function AlertHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchAlerts = async () => {
    try {
      if (filter === 'ALL') {
        const data = await alertApi.getAllAlerts();
        setAlerts(data);
      } else {
        const data = await alertApi.getAlertsByStatus(filter);
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alert history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return '#059669';
      case 'PENDING':
        return '#DC2626';
      case 'IN_PROGRESS':
        return '#D97706';
      default:
        return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: AlertDTO }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <AlertTriangle size={16} color={colors.green[600]} />
          <Text style={styles.typeText}>{item.alertType}</Text>
        </View>
        <Text style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.message}>{item.message || (item as any).description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.infoText}>Trụ: {item.pillarCode || 'N/A'}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch sử Cảnh báo</Text>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'PENDING', 'RESOLVED'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.activeFilterChip]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Đang chờ' : 'Đã xong'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.green[600]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không có lịch sử cảnh báo nào</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.gray[900], marginBottom: 12 },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  activeFilterChip: { backgroundColor: colors.green[600] },
  filterText: { fontSize: 14, color: colors.gray[700], fontWeight: '500' },
  activeFilterText: { color: '#FFFFFF' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeText: { fontSize: 14, fontWeight: 'bold', color: colors.gray[900] },
  statusBadge: { fontSize: 12, fontWeight: 'bold' },
  message: { fontSize: 14, color: colors.gray[600], marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  infoText: { fontSize: 12, color: colors.gray[500] },
  dateText: { fontSize: 12, color: colors.gray[400] },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.gray[400] },
});

