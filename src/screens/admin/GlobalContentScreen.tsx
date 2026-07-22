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
import { FileText, Plus, Edit2, X, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../api/adminApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';
import type { GlobalContentDTO } from '../../types/api';

export default function GlobalContentScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<GlobalContentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GlobalContentDTO | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    contentType: 'ANNOUNCEMENT',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = () => {
    setIsLoading(true);
    adminApi
      .getAllGlobalContent()
      .then((data: GlobalContentDTO[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => Alert.alert('Lỗi', 'Không thể tải danh sách nội dung!'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenModal = (item?: GlobalContentDTO) => {
    if (item) {
      setEditingItem(item);
      setForm({
        title: item.title,
        content: item.content,
        contentType: item.contentType || 'ANNOUNCEMENT',
        active: item.active ?? true,
      });
    } else {
      setEditingItem(null);
      setForm({
        title: '',
        content: '',
        contentType: 'ANNOUNCEMENT',
        active: true,
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Tiêu đề và Nội dung!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem && editingItem.id) {
        await adminApi.updateGlobalContent(editingItem.id, form);
        Alert.alert('Thành công', 'Đã cập nhật nội dung!');
      } else {
        await adminApi.createGlobalContent(form);
        Alert.alert('Thành công', 'Đã thêm nội dung mới!');
      }
      setModalVisible(false);
      fetchItems();
    } catch {
      Alert.alert('Lỗi', 'Lưu nội dung thất bại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (item: GlobalContentDTO) => {
    if (!item.id) return;
    try {
      await adminApi.updateGlobalContent(item.id, {
        ...item,
        active: !item.active,
      });
      fetchItems();
    } catch {
      Alert.alert('Lỗi', 'Cập nhật trạng thái thất bại!');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={{ paddingRight: 8 }} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Quản lý Nội dung</Text>
          <Text style={styles.subtitle}>Thông báo & Cấu hình toàn hệ thống</Text>
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
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={48} color={colors.gray[400]} />
          <Text style={styles.emptyText}>Chưa có nội dung nào</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.badgeGroup}>
                  <Text style={styles.badgeType}>
                    {item.contentType === 'ANNOUNCEMENT' ? 'Thông báo' : 'Cấu hình'}
                  </Text>
                  <Text style={item.active ? styles.badgeActive : styles.badgeDisabled}>
                    {item.active ? 'Hiện' : 'Ẩn'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardContent}>{item.content}</Text>

              <View style={styles.cardFooter}>
                <TouchableOpacity onPress={() => toggleActive(item)}>
                  <Text style={styles.btnToggleText}>
                    {item.active ? 'Ẩn nội dung' : 'Hiển thị'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleOpenModal(item)}>
                  <Edit2 size={16} color={colors.blue[600]} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Sửa nội dung' : 'Thêm nội dung'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Thông báo bảo trì hệ thống"
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
            />

            <Text style={styles.label}>Loại nội dung *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  form.contentType === 'ANNOUNCEMENT' && styles.typeChipActive,
                ]}
                onPress={() => setForm({ ...form, contentType: 'ANNOUNCEMENT' })}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.contentType === 'ANNOUNCEMENT' && styles.typeChipTextActive,
                  ]}
                >
                  Thông báo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeChip,
                  form.contentType === 'CONFIG' && styles.typeChipActive,
                ]}
                onPress={() => setForm({ ...form, contentType: 'CONFIG' })}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.contentType === 'CONFIG' && styles.typeChipTextActive,
                  ]}
                >
                  Cấu hình
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nội dung chi tiết *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Chi tiết thông báo..."
              multiline
              numberOfLines={4}
              value={form.content}
              onChangeText={(t) => setForm({ ...form, content: t })}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm({ ...form, active: !form.active })}
            >
              <View style={[styles.checkbox, form.active && styles.checkboxActive]} />
              <Text style={styles.checkboxLabel}>Hiển thị ngay lập tức</Text>
            </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSave}
                disabled={isSubmitting}
              >
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { ...typography.heading2, color: colors.gray[900], flex: 1 },
  badgeGroup: { flexDirection: 'row', gap: 4 },
  badgeType: {
    ...typography.caption,
    color: colors.blue[800],
    backgroundColor: colors.blue[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
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
  cardContent: { ...typography.bodySmall, color: colors.gray[700], marginTop: spacing.xs },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  btnToggleText: { ...typography.caption, color: colors.green[600], fontWeight: '600' },
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
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: 4 },
  typeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: colors.blue[600] },
  typeChipText: { ...typography.bodySmall, color: colors.gray[700] },
  typeChipTextActive: { color: '#fff', fontWeight: 'bold' },
  textArea: { height: 90, textAlignVertical: 'top' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.gray[400], borderRadius: 3 },
  checkboxActive: { backgroundColor: colors.green[600], borderColor: colors.green[600] },
  checkboxLabel: { ...typography.bodySmall, color: colors.gray[700] },
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
