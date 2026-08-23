import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, Calendar, MapPin, User, History } from 'lucide-react-native';
import { harvestHistoryApi } from '../../api/harvestHistoryApi';
import type { HarvestHistoryItem } from '../../types/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

export default function CustomerHarvestHistoryScreen() {
  const [items, setItems] = useState<HarvestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await harvestHistoryApi.getMyHistory();
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green[600]} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Chưa có lịch sử thu hoạch"
            subtitle="Các đợt thu hoạch hoàn tất trên các ô vườn bạn thuê sẽ hiển thị tại đây."
          />
        }
        renderItem={({ item }) => {
          const isSelf = item.harvestMethod === 'SELF';
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                  <View style={styles.treeIconWrapper}>
                    <Sprout size={18} color={colors.green[700]} />
                  </View>
                  <Text style={styles.treeName}>{item.treeName || 'Rau sạch GreenSlot'}</Text>
                </View>
                <View style={[styles.methodBadge, isSelf ? styles.selfBadge : styles.staffBadge]}>
                  <Text style={isSelf ? styles.selfText : styles.staffText}>
                    {isSelf ? 'Tự thu hoạch' : 'Nhân viên thu hoạch'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={15} color={colors.green[600]} />
                <Text style={styles.slotText}>
                  Ô {item.slotNumber} {item.locationName ? `· ${item.locationName}` : ''}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                {item.plantedAt && (
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={colors.gray[400]} />
                    <Text style={styles.metaLabel}>Gieo:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(item.plantedAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Calendar size={13} color={colors.green[600]} />
                  <Text style={styles.metaLabel}>Thu hoạch:</Text>
                  <Text style={styles.metaValueHighlight}>
                    {new Date(item.harvestedAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>

              {!isSelf && item.staffName && (
                <View style={styles.staffRow}>
                  <User size={13} color={colors.blue[600] ?? '#2563eb'} />
                  <Text style={styles.staffLabel}>Nhân viên phụ trách:</Text>
                  <Text style={styles.staffValue}>{item.staffName}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  treeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeName: { ...typography.label, fontSize: 16, color: colors.gray[900], flex: 1 },
  methodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  selfBadge: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
  },
  selfText: {
    color: colors.green[700],
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  staffBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  staffText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  slotText: {
    ...typography.bodySmall,
    color: colors.gray[600],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: 'Inter_400Regular',
  },
  metaValue: {
    fontSize: 12,
    color: colors.gray[700],
    fontFamily: 'Inter_500Medium',
  },
  metaValueHighlight: {
    fontSize: 12,
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  staffLabel: {
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: 'Inter_400Regular',
  },
  staffValue: {
    fontSize: 12,
    color: '#1d4ed8',
    fontFamily: 'Inter_600SemiBold',
  },
});
