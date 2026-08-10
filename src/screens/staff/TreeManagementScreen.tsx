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
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Droplets, Sun, Activity, DollarSign, Clock, ArrowLeft } from 'lucide-react-native';
import { treeApi } from '../../api/treeApi';
import type { TreeDTO } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

const emptyForm: Partial<TreeDTO> = {
  treeName: '',
  scientificName: '',
  description: '',
  harvestDays: 90,
  minRentalDays: 30,
  price: 100000,
  imageUrl: '',
  soilMoistureMin: 30,
  soilMoistureMax: 70,
  lightMin: 6,
  lightMax: 10,
  phMin: 5.5,
  phMax: 7.0,
  compensationPercentage: 50,
  careInstructions: '',
  isActive: true,
};

export default function TreeManagementScreen() {
  const navigation = useNavigation<any>();
  const [trees, setTrees] = useState<TreeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TreeDTO | null>(null);
  const [formData, setFormData] = useState<Partial<TreeDTO>>(emptyForm);

  const fetchTrees = async () => {
    setIsLoading(true);
    try {
      const data = await treeApi.getAllTrees();
      setTrees(data || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách cây.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrees();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TreeDTO) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: TreeDTO) => {
    Alert.alert(
      'Xóa giống cây',
      `Bạn có chắc chắn muốn xóa "${item.treeName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await treeApi.deleteTree(item.id!);
              Alert.alert('Thành công', 'Đã xóa giống cây.');
              fetchTrees();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa. Cây có thể đang được sử dụng.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.treeName?.trim() || !formData.scientificName?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên cây và tên khoa học.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await treeApi.updateTree(editingItem.id!, formData as TreeDTO);
        Alert.alert('Thành công', 'Đã cập nhật giống cây.');
      } else {
        await treeApi.createTree(formData as TreeDTO);
        Alert.alert('Thành công', 'Đã thêm giống cây mới.');
      }
      setIsModalOpen(false);
      fetchTrees();
    } catch (err) {
      Alert.alert('Lỗi', 'Thao tác thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTrees = trees.filter((t) => {
    const matchSearch =
      t.treeName?.toLowerCase().includes(search.toLowerCase()) ||
      t.scientificName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? t.isActive === true
        : t.isActive === false;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Quản lý Giống Cây</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Control Panel */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm tên cây, tên khoa học..."
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
        {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, statusFilter === tab && styles.activeTab]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text style={[styles.tabText, statusFilter === tab && styles.activeTabText]}>
              {tab === 'ALL' ? 'Tất cả' : tab === 'ACTIVE' ? 'Kinh doanh' : 'Ngưng bán'}
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
          data={filteredTrees}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.treeImg} />
                ) : (
                  <View style={styles.treePlaceholder}>
                    <Text style={styles.placeholderChar}>{item.treeName?.[0] || 'T'}</Text>
                  </View>
                )}

                <View style={styles.textContainer}>
                  <Text style={styles.treeTitle}>{item.treeName}</Text>
                  <Text style={styles.scientificText}>{item.scientificName}</Text>

                  <View style={styles.row}>
                    <DollarSign size={14} color={colors.green[600]} />
                    <Text style={styles.metaText}>{item.price?.toLocaleString('vi-VN')} đ</Text>
                    <View style={styles.dot} />
                    <Clock size={14} color={colors.gray[400]} />
                    <Text style={styles.metaText}>~{item.harvestDays} ngày</Text>
                  </View>
                </View>
              </View>

              {/* IoT Eco Limits */}
              <View style={styles.ecoBox}>
                <View style={styles.ecoItem}>
                  <Droplets size={12} color="#2563eb" />
                  <Text style={styles.ecoText}>{item.soilMoistureMin}% - {item.soilMoistureMax}%</Text>
                </View>
                <View style={styles.ecoItem}>
                  <Sun size={12} color="#ca8a04" />
                  <Text style={styles.ecoText}>{item.lightMin}h - {item.lightMax}h</Text>
                </View>
                <View style={styles.ecoItem}>
                  <Activity size={12} color="#9333ea" />
                  <Text style={styles.ecoText}>pH {item.phMin} - {item.phMax}</Text>
                </View>
              </View>

              {/* Status & Actions */}
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
                    {item.isActive ? 'Kinh doanh' : 'Ngưng bán'}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                    <Edit2 size={16} color={colors.green[600]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.gray[500] }}>Không tìm thấy giống cây nào.</Text>
            </View>
          }
        />
      )}

      {/* FORM MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Sửa giống cây' : 'Thêm giống cây mới'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={styles.label}>Tên cây trồng *</Text>
              <TextInput
                style={styles.input}
                value={formData.treeName}
                onChangeText={(text) => setFormData({ ...formData, treeName: text })}
                placeholder="VD: Cây xà lách"
              />

              <Text style={styles.label}>Tên khoa học *</Text>
              <TextInput
                style={styles.input}
                value={formData.scientificName}
                onChangeText={(text) => setFormData({ ...formData, scientificName: text })}
                placeholder="VD: Lactuca sativa"
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Giá thuê (đ/kỳ) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.price?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, price: Number(val) })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Tỷ lệ đền bù (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.compensationPercentage?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, compensationPercentage: Number(val) })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Ngày thu hoạch</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.harvestDays?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, harvestDays: Number(val) })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Thuê tối thiểu (ngày)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.minRentalDays?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, minRentalDays: Number(val) })}
                  />
                </View>
              </View>

              {/* IoT thresholds */}
              <Text style={styles.sectionHeader}>Định mức cảnh báo IoT</Text>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Độ ẩm đất Min (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.soilMoistureMin?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, soilMoistureMin: Number(val) })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Độ ẩm đất Max (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.soilMoistureMax?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, soilMoistureMax: Number(val) })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Giờ sáng Min</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.lightMin?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, lightMin: Number(val) })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Giờ sáng Max</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.lightMax?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, lightMax: Number(val) })}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Độ pH Min</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.phMin?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, phMin: Number(val) })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Độ pH Max</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.phMax?.toString()}
                    onChangeText={(val) => setFormData({ ...formData, phMax: Number(val) })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả về giống cây..."
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.label}>Ảnh giống cây (URL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập URL ảnh..."
                value={formData.imageUrl}
                onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Kích hoạt / Kinh doanh</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(val) => setFormData({ ...formData, isActive: val })}
                  trackColor={{ false: '#d1d5db', true: colors.green[200] }}
                  thumbColor={formData.isActive ? colors.green[600] : '#9ca3af'}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Lưu giống cây</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
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
  treeImg: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  treePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  placeholderChar: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green[700],
  },
  textContainer: {
    flex: 1,
  },
  treeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
  },
  scientificText: {
    fontSize: 12,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.gray[600],
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[300],
    marginHorizontal: 8,
  },
  ecoBox: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    justifyContent: 'space-between',
  },
  ecoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ecoText: {
    fontSize: 11,
    color: colors.gray[600],
    fontWeight: '500',
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
  activeBadge: {
    backgroundColor: colors.green[50],
  },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: colors.green[700],
  },
  inactiveText: {
    color: colors.gray[500],
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green[700],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
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
  formRow: {
    flexDirection: 'row',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
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
