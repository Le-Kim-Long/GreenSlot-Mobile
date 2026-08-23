import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { harvestApi } from '../../api/harvestApi';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/typography';
import type { CustomerStackProps } from '../../navigation/types';

export default function HarvestHistoryScreen(_props: CustomerStackProps<'HarvestHistory'>) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { setItems(await harvestApi.getMine()); } catch { setItems([]); }
  }, []);
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  if (loading) return <LoadingScreen />;
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Text style={styles.title}>Lịch sử thu hoạch</Text>
      {items.length === 0 ? <EmptyState title="Chưa có lịch sử thu hoạch" subtitle="Các vụ thu hoạch đã hoàn tất sẽ hiển thị tại đây." /> : items.map((item, index) => <Card key={item.id ?? index} style={styles.card}>
        <Text style={styles.name}>{item.treeName || item.slotNumber || 'Vụ thu hoạch'}</Text>
        <Text style={styles.meta}>Ô vườn: {item.slotNumber || item.rentalId || '--'}</Text>
        <Text style={styles.meta}>Ngày thu hoạch: {item.harvestDate || item.createdAt || '--'}</Text>
        <Text style={styles.status}>{item.status || 'COMPLETED'}</Text>
      </Card>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg }, title: { ...typography.heading2, color: colors.gray[900], marginBottom: spacing.lg }, card: { marginBottom: spacing.md }, name: { ...typography.heading3, color: colors.gray[900] }, meta: { ...typography.bodySmall, color: colors.gray[500], marginTop: spacing.xs }, status: { ...typography.label, color: colors.green[700], marginTop: spacing.sm } });
