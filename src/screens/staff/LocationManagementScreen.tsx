import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { LocationDTO } from '../../types/api';

export default function LocationManagementScreen() {
  const navigation = useNavigation();
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationDTO | null>(null);
  const [form, setForm] = useState({ name: '', address: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLocations = () => {
    setIsLoading(true);
    businessManagerApi
      .getAllLocations()
      .then(setLocations)
      .catch((err: unknown) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenModal = (loc?: LocationDTO) => {
    if (loc) {
      setEditingLoc(loc);
      setForm({
        name: loc.name || '',
        address: loc.address || '',
        description: loc.description || '',
      });
    } else {
      setEditingLoc(null);
      setForm({ name: '', address: '', description: '' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Tên cơ sở và Địa chỉ!');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingLoc && editingLoc.id) {
        await businessManagerApi.updateLocation(editingLoc.id, form);
        Alert.alert('Thành công', 'Đã cập nhật cơ sở!');
      } else {
        await businessManagerApi.createLocation(form);
        Alert.alert('Thành công', 'Thêm cơ sở thành công!');
      }
      setModalVisible(false);
      fetchLocations();
    } catch {
      Alert.alert('Lỗi', 'Lưu thông tin cơ sở thất bại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa cơ sở này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await businessManagerApi.deleteLocation(id);
            fetchLocations();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa cơ sở!');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={{ paddingRight: 8 }} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Quản lý Cơ sở</Text>
          <Text style={styles.subtitle}>{locations.length} cơ sở trong hệ thống</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd} onPress={() => handleOpenModal()}>
          <Plus size={18} color="#fff" />
          <Text style={styles.btnAddText}>Thêm mới</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : locations.length === 0 ? (
        <View style={styles.empty}>
          <MapPin size={48} color={colors.gray[400]} />
          <Text style={styles.emptyText}>Chưa có cơ sở nào được tạo</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.locName}>{item.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleOpenModal(item)}>
                    <Edit2 size={16} color={colors.blue[600]} style={styles.iconBtn} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => item.id && handleDelete(item.id)}>
                    <Trash2 size={16} color={colors.red[600]} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <MapPin size={14} color={colors.gray[400]} />
                <Text style={styles.address}>{item.address}</Text>
              </View>

              {item.description ? (
                <Text style={styles.desc}>{item.description}</Text>
              ) : null}
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLoc ? 'Sửa cơ sở' : 'Thêm cơ sở mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tên cơ sở *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: GreenSlot Quận 9"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />

            <Text style={styles.label}>Địa chỉ *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Khu Công Nghệ Cao, Q.9, TP.HCM"
              value={form.address}
              onChangeText={(t) => setForm({ ...form, address: t })}
            />

            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả cơ sở..."
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={isSubmitting}>
                <Text style={styles.btnSaveText}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: { ...typography.heading2, color: colors.gray[900] },
  subtitle: { ...typography.bodySmall, color: colors.gray[500] },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  btnAddText: { ...typography.label, color: '#fff' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locName: { ...typography.heading2, color: colors.gray[900], flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { marginRight: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  address: { ...typography.bodySmall, color: colors.gray[700] },
  desc: { ...typography.caption, color: colors.gray[400], marginTop: spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.heading2, color: colors.gray[900] },
  label: { ...typography.label, color: colors.gray[700], marginTop: spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  btnCancelText: { ...typography.label, color: colors.gray[700] },
  btnSave: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.green[600],
  },
  btnSaveText: { ...typography.label, color: '#fff' },
});
