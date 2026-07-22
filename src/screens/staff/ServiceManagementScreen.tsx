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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wrench, Plus, Edit3, Trash2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { ServiceTypeDTO } from '../../types/api';

export default function ServiceManagementScreen() {
  const navigation = useNavigation();
  const [services, setServices] = useState<ServiceTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceTypeDTO | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    serviceCategoryId: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await businessManagerApi.getAllServiceTypes();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách dịch vụ chăm sóc!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenModal = (service?: ServiceTypeDTO) => {
    if (service) {
      setEditingService(service);
      setForm({
        name: service.name || '',
        description: service.description || '',
        price: service.price ? service.price.toString() : '0',
        serviceCategoryId: service.serviceCategoryId || 1,
      });
    } else {
      setEditingService(null);
      setForm({
        name: '',
        description: '',
        price: '0',
        serviceCategoryId: 1,
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên dịch vụ!');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ServiceTypeDTO = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        serviceCategoryId: form.serviceCategoryId,
      };

      if (editingService && editingService.id) {
        await businessManagerApi.updateServiceType(editingService.id, payload);
        Alert.alert('Thành công', 'Cập nhật loại dịch vụ thành công!');
      } else {
        await businessManagerApi.createServiceType(payload);
        Alert.alert('Thành công', 'Tạo gói dịch vụ mới thành công!');
      }
      setModalVisible(false);
      fetchServices();
    } catch {
      Alert.alert('Lỗi', 'Lưu gói dịch vụ thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xác nhận Xóa', 'Bạn có chắc chắn muốn xóa dịch vụ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await businessManagerApi.deleteServiceType(id);
            Alert.alert('Thành công', 'Đã xóa dịch vụ!');
            fetchServices();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa dịch vụ!');
          }
        },
      },
    ]);
  };

  const renderServiceItem = ({ item }: { item: ServiceTypeDTO }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Wrench size={20} color={colors.purple[600]} />
          <Text style={styles.serviceName}>{item.name}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleOpenModal(item)}>
            <Edit3 size={18} color={colors.green[600]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => item.id && handleDelete(item.id)}>
            <Trash2 size={18} color={colors.red[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.description}>{item.description || 'Chưa có mô tả dịch vụ.'}</Text>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.priceLabel}>Giá dịch vụ:</Text>
        <Text style={styles.priceValue}>
          {item.price ? item.price.toLocaleString('vi-VN') : 0}đ
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Dịch vụ Chăm sóc</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal()}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderServiceItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchServices}
          refreshing={loading}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Sửa Gói Dịch vụ' : 'Thêm Dịch vụ Chăm sóc Mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tên Dịch vụ *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Tưới nước tự động, Bón phân hữu cơ"
                value={form.name}
                onChangeText={text => setForm({ ...form, name: text })}
              />

              <Text style={styles.inputLabel}>Mô tả Dịch vụ</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                multiline
                placeholder="Chi tiết công việc và tần suất thực hiện..."
                value={form.description}
                onChangeText={text => setForm({ ...form, description: text })}
              />

              <Text style={styles.inputLabel}>Đơn giá (VNĐ) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={form.price}
                onChangeText={text => setForm({ ...form, price: text })}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu Dịch Vụ</Text>
                )}
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  addBtn: {
    backgroundColor: colors.green[600],
    padding: spacing.xs + 2,
    borderRadius: radius.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginLeft: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 13,
    color: colors.gray[500],
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green[600],
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    backgroundColor: colors.gray[50],
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
