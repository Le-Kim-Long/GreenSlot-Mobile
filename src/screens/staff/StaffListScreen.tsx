import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Mail, Phone } from 'lucide-react-native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { roleLabel } from '../../utils/roleMap';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { UserAdminDTO, LocationDTO } from '../../types/api';

export default function StaffListScreen() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [staffs, setStaffs] = useState<UserAdminDTO[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingStaffs, setLoadingStaffs] = useState(false);

  useEffect(() => {
    businessManagerApi
      .getAllLocations()
      .then((locs: LocationDTO[]) => {
        setLocations(locs);
        if (locs.length > 0 && locs[0].id) {
          setSelectedLocationId(locs[0].id);
        }
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoadingLocations(false));
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;
    setLoadingStaffs(true);
    businessManagerApi
      .getGardenStaffsByLocation(selectedLocationId)
      .then((data: UserAdminDTO[]) => setStaffs(data))
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoadingStaffs(false));
  }, [selectedLocationId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh sách nhân viên</Text>
        <Text style={styles.subtitle}>Xem danh sách nhân viên theo cơ sở</Text>
      </View>

      {/* Location Filter Selector */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Chọn cơ sở:</Text>
        {loadingLocations ? (
          <ActivityIndicator size="small" color={colors.green[600]} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.chip,
                  selectedLocationId === loc.id && styles.chipActive,
                ]}
                onPress={() => loc.id && setSelectedLocationId(loc.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedLocationId === loc.id && styles.chipTextActive,
                  ]}
                >
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {loadingStaffs ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : staffs.length === 0 ? (
        <View style={styles.empty}>
          <Users size={48} color={colors.gray[400]} />
          <Text style={styles.emptyText}>Chưa có nhân viên nào tại cơ sở này</Text>
        </View>
      ) : (
        <FlatList
          data={staffs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.name}>{item.fullName || item.username}</Text>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
                <Text style={item.enabled ? styles.badgeActive : styles.badgeDisabled}>
                  {item.enabled ? 'Hoạt động' : 'Khóa'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Mail size={14} color={colors.gray[400]} />
                <Text style={styles.infoText}>{item.email}</Text>
              </View>

              {item.phone ? (
                <View style={styles.infoRow}>
                  <Phone size={14} color={colors.gray[400]} />
                  <Text style={styles.infoText}>{item.phone}</Text>
                </View>
              ) : null}

              <View style={styles.roleRow}>
                {item.roles?.map((r) => (
                  <Text key={r} style={styles.roleBadge}>
                    {roleLabel(r)}
                  </Text>
                ))}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: { ...typography.heading2, color: colors.gray[900] },
  subtitle: { ...typography.bodySmall, color: colors.gray[500] },
  filterSection: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterLabel: { ...typography.caption, color: colors.gray[500], marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.green[600] },
  chipText: { ...typography.bodySmall, color: colors.gray[700] },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.gray[400], marginTop: spacing.md },
  list: { padding: spacing.md },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  name: { ...typography.heading2, color: colors.gray[900] },
  username: { ...typography.caption, color: colors.gray[400] },
  badgeActive: {
    ...typography.caption,
    color: colors.green[700],
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeDisabled: {
    ...typography.caption,
    color: colors.red[600],
    backgroundColor: colors.red[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  infoText: { ...typography.bodySmall, color: colors.gray[700] },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  roleBadge: {
    ...typography.caption,
    color: colors.blue[800],
    backgroundColor: colors.blue[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
