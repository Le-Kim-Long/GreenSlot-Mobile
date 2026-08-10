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
import { useNavigation } from '@react-navigation/native';
import { BellRing, AlertCircle, CheckCircle, Clock, ArrowLeft } from 'lucide-react-native';
import { alertApi } from '../../api/alertApi';
import type { AlertAnalyticsDTO } from '../../types/api';
import { colors } from '../../theme/colors';

export default function AlertAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AlertAnalyticsDTO | null>(null);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Backend expects Instant format (ISO-8601 with timezone, e.g. 2026-07-06T00:00:00Z)
      // Using start of day for startDate and end of day for endDate
      const startDate = new Date(thirtyDaysAgo);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      const data = await alertApi.getAlertAnalytics(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch alert analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.green[600]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Back Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Thống kê Cảnh báo IoT</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>Thống kê tổng quan trong 30 ngày qua</Text>
        </View>

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: '#EFF6FF' }]}>
          <BellRing size={28} color="#2563EB" />
          <Text style={styles.cardNumber}>{analytics?.totalAlerts ?? 0}</Text>
          <Text style={styles.cardLabel}>Tổng số cảnh báo</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#FEF2F2' }]}>
          <AlertCircle size={28} color="#DC2626" />
          <Text style={[styles.cardNumber, { color: '#DC2626' }]}>
            {analytics?.pendingAlerts ?? 0}
          </Text>
          <Text style={styles.cardLabel}>Đang chờ xử lý</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#ECFDF5' }]}>
          <CheckCircle size={28} color="#059669" />
          <Text style={[styles.cardNumber, { color: '#059669' }]}>
            {analytics?.resolvedAlerts ?? 0}
          </Text>
          <Text style={styles.cardLabel}>Đã giải quyết</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#FFFBEB' }]}>
          <Clock size={28} color="#D97706" />
          <Text style={[styles.cardNumber, { color: '#D97706' }]}>
            {analytics?.averageResolutionTimeMinutes ?? 0} phút
          </Text>
          <Text style={styles.cardLabel}>Thời gian xử lý TB</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phân loại theo Cảm biến</Text>
        {analytics?.alertsBySensorType && Object.keys(analytics.alertsBySensorType).length > 0 ? (
          Object.entries(analytics.alertsBySensorType).map(([sensor, count]) => (
            <View key={sensor} style={styles.listItem}>
              <Text style={styles.listKey}>{sensor}</Text>
              <Text style={styles.listVal}>{count} cảnh báo</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Chưa có dữ liệu phân loại</Text>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.gray[900] },
  subtitle: { fontSize: 14, color: colors.gray[500], marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardNumber: { fontSize: 24, fontWeight: 'bold', marginVertical: 8, color: colors.gray[900] },
  cardLabel: { fontSize: 13, color: colors.gray[600] },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.gray[900], marginBottom: 12 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listKey: { fontSize: 14, color: colors.gray[700], fontWeight: '500' },
  listVal: { fontSize: 14, color: colors.green[600], fontWeight: 'bold' },
  emptyText: { fontSize: 14, color: colors.gray[400], textAlign: 'center', marginVertical: 12 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
