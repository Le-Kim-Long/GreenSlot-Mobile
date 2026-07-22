import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Shield, CheckCircle2, XCircle, Edit3, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { adminApi, PageResponse } from '../../api/adminApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { UserAdminDTO } from '../../types/api';

const AVAILABLE_ROLES = [
  { label: 'Customer (Khách hàng)', value: 'ROLE_CUSTOMER' },
  { label: 'Garden Staff (Nhân viên Vườn)', value: 'ROLE_GARDEN_STAFF' },
  { label: 'Location Manager (Quản lý Cơ sở)', value: 'ROLE_LOCATION_MANAGER' },
  { label: 'Manager (Quản lý Kinh doanh)', value: 'ROLE_MANAGER' },
  { label: 'Admin (Quản trị viên)', value: 'ROLE_ADMIN' },
];

export default function UserManagementScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<UserAdminDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserAdminDTO | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async (pageIndex = 0) => {
    setLoading(true);
    try {
      const res: PageResponse<UserAdminDTO> = await adminApi.getAllUsers(pageIndex, 15);
      if (res && res.content) {
        setUsers(res.content);
        setPage(res.number || 0);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách người dùng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(0);
  }, []);

  const handleOpenEdit = (user: UserAdminDTO) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setIsEnabled(user.enabled ?? true);
    setModalVisible(true);
  };

  const toggleRole = (roleValue: string) => {
    if (selectedRoles.includes(roleValue)) {
      if (selectedRoles.length === 1) {
        Alert.alert('Cảnh báo', 'Người dùng phải có ít nhất 1 Vai trò!');
        return;
      }
      setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
    } else {
      setSelectedRoles([...selectedRoles, roleValue]);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setUpdating(true);

    try {
      await adminApi.updateUserAuthorities(selectedUser.id, { roles: selectedRoles });
      if (selectedUser.enabled !== isEnabled) {
        await adminApi.updateUserStatus(selectedUser.id, { enabled: isEnabled });
      }

      Alert.alert('Thành công', `Cập nhật thông tin người dùng ${selectedUser.username} thành công!`);
      setModalVisible(false);
      fetchUsers(page);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin người dùng!');
    } finally {
      setUpdating(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserAdminDTO }) => (
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={styles.userAvatar}>
          <User size={20} color={colors.green[600]} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName || item.username}</Text>
          <Text style={styles.userMeta}>@{item.username} • {item.phone || item.email}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => handleOpenEdit(item)}>
          <Edit3 size={18} color={colors.green[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.userCardFooter}>
        <View style={styles.rolesRow}>
          <Shield size={14} color={colors.gray[500]} style={{ marginRight: 4 }} />
          <Text style={styles.rolesText}>
            {(item.roles || []).map(r => r.replace('ROLE_', '')).join(', ')}
          </Text>
        </View>

        <View style={styles.statusTag}>
          {item.enabled ? (
            <>
              <CheckCircle2 size={14} color={colors.green[600]} />
              <Text style={[styles.statusText, { color: colors.green[600] }]}>Hoạt động</Text>
            </>
          ) : (
            <>
              <XCircle size={14} color={colors.red[600]} />
              <Text style={[styles.statusText, { color: colors.red[600] }]}>Khóa</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Người dùng</Text>
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải danh sách người dùng...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          onRefresh={() => fetchUsers(0)}
          refreshing={loading}
        />
      )}

      {/* Edit User Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật Tài khoản</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.targetUserText}>
                  {selectedUser.fullName} (@{selectedUser.username})
                </Text>

                {/* Status Toggle */}
                <View style={styles.toggleRow}>
                  <Text style={styles.labelTitle}>Trạng thái Tài khoản:</Text>
                  <View style={styles.switchContainer}>
                    <Text style={{ marginRight: 8, fontSize: 12, color: isEnabled ? colors.green[600] : colors.red[600] }}>
                      {isEnabled ? 'Hoạt động' : 'Tạm khóa'}
                    </Text>
                    <Switch
                      value={isEnabled}
                      onValueChange={setIsEnabled}
                      trackColor={{ false: colors.gray[200], true: colors.green[200] }}
                      thumbColor={isEnabled ? colors.green[600] : '#f4f3f4'}
                    />
                  </View>
                </View>

                {/* Roles Selection */}
                <Text style={[styles.labelTitle, { marginTop: spacing.md }]}>Phân quyền (Roles):</Text>
                {AVAILABLE_ROLES.map(role => {
                  const isChecked = selectedRoles.includes(role.value);
                  return (
                    <TouchableOpacity
                      key={role.value}
                      style={[styles.roleOption, isChecked && styles.roleOptionActive]}
                      onPress={() => toggleRole(role.value)}
                    >
                      <Shield size={16} color={isChecked ? colors.green[600] : colors.gray[500]} />
                      <Text style={[styles.roleOptionText, isChecked && styles.roleOptionTextActive]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveUser}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu Thay Đổi</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  userCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  userMeta: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  editButton: {
    padding: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs + 2,
  },
  userCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rolesText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[500],
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  modalBody: {
    marginBottom: spacing.md,
  },
  targetUserText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green[600],
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  labelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.xs,
  },
  roleOptionActive: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.gray[900],
    marginLeft: spacing.sm,
  },
  roleOptionTextActive: {
    fontWeight: '700',
    color: colors.green[600],
  },
  saveBtn: {
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
