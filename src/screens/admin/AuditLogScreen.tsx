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
import { ArrowLeft, ShieldAlert, Clock, User, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { adminApi, PageResponse } from '../../api/adminApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { AuditLogDTO } from '../../types/api';

export default function AuditLogScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: PageResponse<AuditLogDTO> = await adminApi.getAuditLogs(undefined, undefined, 0, 30);
      if (res && res.content) {
        setLogs(res.content);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải nhật ký hệ thống!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const renderLogItem = ({ item }: { item: AuditLogDTO }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.actionTag}>
          <ShieldAlert size={14} color={colors.green[600]} />
          <Text style={styles.actionText}>{item.action}</Text>
        </View>
        <View style={styles.timeTag}>
          <Clock size={12} color={colors.gray[500]} />
          <Text style={styles.timeText}>
            {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : 'Vừa xong'}
          </Text>
        </View>
      </View>

      <Text style={styles.logDetails}>{item.details || 'Thao tác không có thông tin chi tiết.'}</Text>

      <View style={styles.logFooter}>
        <View style={styles.userTag}>
          <User size={12} color={colors.gray[500]} />
          <Text style={styles.userText}>Tài khoản: {item.username || 'System'}</Text>
        </View>
        {item.ipAddress && (
          <Text style={styles.ipText}>IP: {item.ipAddress}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật ký Hệ thống</Text>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải nhật ký audit log...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchLogs}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Info size={40} color={colors.gray[400]} />
              <Text style={styles.emptyText}>Chưa có nhật ký hoạt động nào được ghi nhận.</Text>
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
  backButton: {
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
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.gray[500],
  },
  listContent: {
    padding: spacing.md,
  },
  logCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  actionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green[600],
    marginLeft: 4,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: colors.gray[500],
    marginLeft: 4,
  },
  logDetails: {
    fontSize: 14,
    color: colors.gray[900],
    marginVertical: spacing.xs,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  userTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    fontSize: 12,
    color: colors.gray[500],
    marginLeft: 4,
  },
  ipText: {
    fontSize: 11,
    color: colors.gray[500],
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
