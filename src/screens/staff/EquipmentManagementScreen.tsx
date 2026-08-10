import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search, Plus, Edit2, Trash2, X, Wrench, Layers, Calendar, ShieldCheck, Hash, ArrowLeft } from 'lucide-react-native';
import { equipmentApi } from '../../api/equipmentApi';
import { businessManagerApi } from '../../api/businessManagerApi';
import type { EquipmentDTO, PillarDTO } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

const emptyForm: Partial<EquipmentDTO> = {
  equipmentName: '',
  serialNumber: '',
  description: '',
  status: 'ACTIVE',
  pillarId: undefined,
  pillarCode: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  lastMaintenanceDate: '',
  imageUrl: '',
};

export default function EquipmentManagementScreen() {
  const navigation = useNavigation<any>();
  const [equipments, setEquipments] = useState<EquipmentDTO[]>([]);
  const [pillars, setPillars] = useState<PillarDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ALL');

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentDTO | null>(null);
  const [formData, setFormData] = useState<Partial<EquipmentDTO>>(emptyForm);

  // Selector modal
  const [isPillarSelectOpen, setIsPillarSelectOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eqList, pillarList] = await Promise.allSettled([
        equipmentApi.getEquipments(),
        businessManagerApi.getAllPillars(),
      ]);

      if (eqList.status === 'fulfilled') setEquipments(eqList.value);
      if (pillarList.status === 'fulfilled') setPillars(pillarList.value);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu thiết bị.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EquipmentDTO) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: EquipmentDTO) => {
    Alert.alert(
      'Xóa thiết bị',
      `Bạn có chắc chắn muốn xóa "${item.equipmentName}" (S/N: ${item.serialNumber})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await equipmentApi.deleteEquipment(item.id!);
              Alert.alert('Thành công', 'Đã xóa thiết bị.');
              fetchData();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa thiết bị. Thiết bị có thể đang được ràng buộc.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.equipmentName?.trim() || !formData.serialNumber?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thiết bị và số serial.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await equipmentApi.updateEquipment(editingItem.id!, formData);
        Alert.alert('Thành công', 'Đã cập nhật thiết bị.');
      } else {
        await equipmentApi.createEquipment(formData);
        Alert.alert('Thành công', 'Đã thêm thiết bị mới.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      Alert.alert('Lỗi', 'Thao tác thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: colors.green[50], txt: colors.green[700], label: 'Hoạt động' };
      case 'MAINTENANCE':
        return { bg: '#fef3c7', txt: '#d97706', label: 'Bảo trì' };
      default:
        return { bg: '#f3f4f6', txt: colors.gray[500], label: 'Tắt' };
    }
  };

  const filteredEquipments = equipments.filter((item) => {
    const matchSearch =
      item.equipmentName?.toLowerCase().includes(search.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Quản lý Thiết bị</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search & Add btn */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm thiết bị, Serial Number..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['ALL', 'ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.activeTab]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.activeTabText]}>
              {tab === 'ALL' ? 'Tất cả' : tab === 'ACTIVE' ? 'Hoạt động' : tab === 'MAINTENANCE' ? 'Bảo trì' : 'Ngưng dùng'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={filteredEquipments}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const status = getStatusBadge(item.status);
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.eqImg} />
                  ) : (
                    <View style={styles.eqPlaceholder}>
                      <Wrench size={22} color={colors.green[600]} />
                    </View>
                  )}

                  <View style={styles.textContainer}>
                    <Text style={styles.eqTitle}>{item.equipmentName}</Text>
                    <View style={styles.row}>
                      <Hash size={13} color={colors.gray[400]} />
                      <Text style={styles.serialText}>S/N: {item.serialNumber}</Text>
                    </View>

                    <View style={styles.row}>
                      <Layers size={13} color={colors.blue[600]} />
                      <Text style={styles.metaText}>
                        Trụ: {item.pillarCode || `Pillar #${item.pillarId}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.datesBox}>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color="#2563eb" />
                    <Text style={styles.dateText}>Mua: {item.purchaseDate || 'Chưa rõ'}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <ShieldCheck size={12} color={colors.green[600]} />
                    <Text style={styles.dateText}>Bảo trì: {item.lastMaintenanceDate || 'Chưa có'}</Text>
                  </View>
                </View>

                {/* Footer status & actions */}
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.txt }]}>{status.label}</Text>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                      <Edit2 size={15} color={colors.green[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                      <Trash2 size={15} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.gray[500] }}>Không tìm thấy thiết bị nào.</Text>
            </View>
          }
        />
      )}

      {/* FORM MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Sửa thông tin thiết bị' : 'Thêm thiết bị mới'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={styles.label}>Tên thiết bị *</Text>
              <TextInput
                style={styles.input}
                value={formData.equipmentName}
                onChangeText={(text) => setFormData({ ...formData, equipmentName: text })}
                placeholder="VD: Máy bơm nước 50W"
              />

              <Text style={styles.label}>Serial Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.serialNumber}
                onChangeText={(text) => setFormData({ ...formData, serialNumber: text })}
                placeholder="VD: SN-POMP-001"
              />

              <Text style={styles.label}>Chọn Trụ (Pillar) *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsPillarSelectOpen(true)}>
                <Text style={{ color: formData.pillarId ? colors.gray[900] : colors.gray[400] }}>
                  {formData.pillarId
                    ? `${formData.pillarCode || `Pillar #${formData.pillarId}`}`
                    : 'Nhấp để chọn trụ'}
                </Text>
              </TouchableOpacity>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Ngày mua</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.purchaseDate}
                    onChangeText={(val) => setFormData({ ...formData, purchaseDate: val })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Bảo trì gần nhất</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.lastMaintenanceDate}
                    onChangeText={(val) => setFormData({ ...formData, lastMaintenanceDate: val })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Trạng thái hoạt động</Text>
              <View style={styles.pickerInline}>
                {(['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.pickerBtn, formData.status === status && styles.pickerBtnActive]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.pickerBtnText, formData.status === status && styles.pickerBtnTextActive]}>
                      {status === 'ACTIVE' ? 'Hoạt động' : status === 'MAINTENANCE' ? 'Bảo trì' : 'Ngưng dùng'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Mô tả chi tiết</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả..."
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.label}>Ảnh thiết bị (URL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập URL hình ảnh..."
                value={formData.imageUrl}
                onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Lưu thiết bị</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* PILLAR SELECT MODAL */}
      <Modal visible={isPillarSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn trụ trồng (Pillar)</Text>
              <TouchableOpacity onPress={() => setIsPillarSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pillars}
              keyExtractor={(item) => item.id!.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({ ...formData, pillarId: item.id, pillarCode: item.pillarCode });
                    setIsPillarSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.pillarCode} (ID: {item.id})</Text>
                  <Text style={styles.pickerItemSub}>Địa điểm ID: {item.locationId}</Text>
                </TouchableOpacity>
              )}
            />
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 14,
    color: colors.gray[900],
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.green[50],
  },
  tabText: {
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: 'Inter_500Medium',
  },
  activeTabText: {
    color: colors.green[700],
    fontFamily: 'Inter_600SemiBold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: colors.green[100],
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eqImg: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  eqPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  eqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  serialText: {
    fontSize: 12,
    color: colors.gray[500],
    fontFamily: 'space-mono',
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.gray[600],
    marginLeft: 6,
  },
  datesBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: colors.gray[600],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    marginLeft: spacing.xs,
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  formContainer: {
    padding: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.gray[900],
    backgroundColor: colors.white,
    height: 44,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    height: 44,
    justifyContent: 'center',
  },
  formRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  pickerInline: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerBtnActive: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  pickerBtnText: {
    fontSize: 12,
    color: colors.gray[600],
    fontWeight: '500',
  },
  pickerBtnTextActive: {
    color: colors.green[700],
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  pickerBox: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: '60%',
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  pickerItemSub: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
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
