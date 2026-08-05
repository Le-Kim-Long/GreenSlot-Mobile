import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Tag, Wrench, Plus, Edit3, Trash2, X, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { ServiceTypeDTO, ServiceCategoryDTO } from '../../types/api';

type ActiveTab = 'categories' | 'services';

export default function ServiceManagementScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');

  // Data
  const [categories, setCategories] = useState<ServiceCategoryDTO[]>([]);
  const [services, setServices] = useState<ServiceTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Category modal
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<ServiceCategoryDTO | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Service modal
  const [svcModalVisible, setSvcModalVisible] = useState(false);
  const [editingSvc, setEditingSvc] = useState<ServiceTypeDTO | null>(null);
  const [svcForm, setSvcForm] = useState({ name: '', description: '', price: '', serviceCategoryId: 0 });
  const [svcSubmitting, setSvcSubmitting] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catData, svcData] = await Promise.all([
        businessManagerApi.getAllCategories(),
        businessManagerApi.getAllServiceTypes(),
      ]);
      setCategories(Array.isArray(catData) ? catData : []);
      setServices(Array.isArray(svcData) ? svcData : []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Category CRUD ───────────────────────────────────────────────────────────
  const openCatModal = (cat?: ServiceCategoryDTO) => {
    setEditingCat(cat ?? null);
    setCatForm({ name: cat?.name ?? '', description: cat?.description ?? '' });
    setCatModalVisible(true);
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục!'); return; }
    setCatSubmitting(true);
    try {
      const payload: ServiceCategoryDTO = { name: catForm.name.trim(), description: catForm.description.trim() || undefined };
      if (editingCat?.id) {
        await businessManagerApi.updateCategory(editingCat.id, payload);
        Alert.alert('Thành công', 'Đã cập nhật danh mục!');
      } else {
        await businessManagerApi.createCategory(payload);
        Alert.alert('Thành công', 'Đã tạo danh mục mới!');
      }
      setCatModalVisible(false);
      fetchAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message ?? 'Lưu danh mục thất bại!');
    } finally {
      setCatSubmitting(false);
    }
  };

  const deleteCat = (id: number) => {
    Alert.alert('Xác nhận', 'Xóa danh mục này? Các dịch vụ thuộc danh mục cũng sẽ bị ảnh hưởng.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await businessManagerApi.deleteCategory(id); fetchAll(); }
        catch { Alert.alert('Lỗi', 'Không thể xóa danh mục!'); }
      }},
    ]);
  };

  // ─── Service CRUD ────────────────────────────────────────────────────────────
  const openSvcModal = (svc?: ServiceTypeDTO) => {
    const defaultCatId = categories.length > 0 ? (categories[0].id ?? 0) : 0;
    setEditingSvc(svc ?? null);
    setSvcForm({
      name: svc?.name ?? '',
      description: svc?.description ?? '',
      price: svc?.price ? svc.price.toString() : '',
      serviceCategoryId: svc?.serviceCategoryId ?? defaultCatId,
    });
    setSvcModalVisible(true);
  };

  const saveSvc = async () => {
    if (!svcForm.name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên dịch vụ!'); return; }
    const priceNum = parseFloat(svcForm.price) || 0;
    if (priceNum < 1000) { Alert.alert('Lỗi', 'Đơn giá phải ít nhất 1.000 ₫!'); return; }
    if (!svcForm.serviceCategoryId || svcForm.serviceCategoryId <= 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục dịch vụ!'); return;
    }
    setSvcSubmitting(true);
    try {
      const payload: ServiceTypeDTO = {
        name: svcForm.name.trim(),
        description: svcForm.description.trim() || undefined,
        price: priceNum,
        serviceCategoryId: svcForm.serviceCategoryId,
      };
      if (editingSvc?.id) {
        await businessManagerApi.updateServiceType(editingSvc.id, payload);
        Alert.alert('Thành công', 'Đã cập nhật dịch vụ!');
      } else {
        await businessManagerApi.createServiceType(payload);
        Alert.alert('Thành công', 'Đã tạo dịch vụ mới!');
      }
      setSvcModalVisible(false);
      fetchAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Lỗi', err?.response?.data?.message ?? 'Lưu dịch vụ thất bại!');
    } finally {
      setSvcSubmitting(false);
    }
  };

  const deleteSvc = (id: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa dịch vụ này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await businessManagerApi.deleteServiceType(id); fetchAll(); }
        catch { Alert.alert('Lỗi', 'Không thể xóa dịch vụ!'); }
      }},
    ]);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const selectedCat = categories.find(c => c.id === svcForm.serviceCategoryId);

  const renderCatItem = ({ item }: { item: ServiceCategoryDTO }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Tag size={18} color={colors.green[600]} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.description ? <Text style={styles.cardSub}>{item.description}</Text> : null}
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openCatModal(item)}>
          <Edit3 size={17} color={colors.green[600]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => item.id && deleteCat(item.id)}>
          <Trash2 size={17} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSvcItem = ({ item }: { item: ServiceTypeDTO }) => {
    const cat = categories.find(c => c.id === item.serviceCategoryId);
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Wrench size={18} color={colors.green[600]} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {cat ? `📂 ${cat.name}  ·  ` : ''}{item.price?.toLocaleString('vi-VN')}₫
            </Text>
            {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openSvcModal(item)}>
            <Edit3 size={17} color={colors.green[600]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => item.id && deleteSvc(item.id)}>
            <Trash2 size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dịch vụ Chăm sóc</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => activeTab === 'categories' ? openCatModal() : openSvcModal()}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Tag size={15} color={activeTab === 'categories' ? colors.green[700] : colors.gray[400]} />
          <Text style={[styles.tabLabel, activeTab === 'categories' && styles.tabLabelActive]}>
            Danh mục ({categories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Wrench size={15} color={activeTab === 'services' ? colors.green[700] : colors.gray[400]} />
          <Text style={[styles.tabLabel, activeTab === 'services' && styles.tabLabelActive]}>
            Dịch vụ ({services.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* No categories warning (only on services tab) */}
      {activeTab === 'services' && !loading && categories.length === 0 && (
        <TouchableOpacity style={styles.warningBox} onPress={() => setActiveTab('categories')}>
          <Text style={styles.warningText}>
            ⚠️ Chưa có danh mục nào. Nhấn vào đây để tạo danh mục trước.
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.green[600]} /></View>
      ) : (
        <FlatList<ServiceCategoryDTO | ServiceTypeDTO>
          key={activeTab}
          data={(activeTab === 'categories' ? categories : services) as (ServiceCategoryDTO | ServiceTypeDTO)[]}
          keyExtractor={(item, i) => (item.id?.toString() ?? i.toString())}
          renderItem={activeTab === 'categories'
            ? (renderCatItem as ({ item }: { item: ServiceCategoryDTO | ServiceTypeDTO }) => React.ReactElement)
            : (renderSvcItem as ({ item }: { item: ServiceCategoryDTO | ServiceTypeDTO }) => React.ReactElement)}
          contentContainerStyle={styles.list}
          onRefresh={fetchAll}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              {activeTab === 'categories'
                ? <Tag size={40} color={colors.gray[300]} />
                : <Wrench size={40} color={colors.gray[300]} />}
              <Text style={styles.emptyText}>
                {activeTab === 'categories'
                  ? 'Chưa có danh mục. Nhấn + để thêm.'
                  : 'Chưa có dịch vụ. Nhấn + để thêm.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Category Modal ─────────────────────────────────────────────────── */}
      <Modal visible={catModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingCat ? 'Sửa danh mục' : 'Thêm danh mục mới'}</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}>
                <X size={22} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tên danh mục *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Chăm sóc cây, Vệ sinh..."
              placeholderTextColor={colors.gray[400]}
              value={catForm.name}
              onChangeText={t => setCatForm({ ...catForm, name: t })}
            />

            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Mô tả ngắn về danh mục..."
              placeholderTextColor={colors.gray[400]}
              multiline
              value={catForm.description}
              onChangeText={t => setCatForm({ ...catForm, description: t })}
            />

            <TouchableOpacity
              style={[styles.saveBtn, catSubmitting && styles.saveBtnDisabled]}
              onPress={saveCat}
              disabled={catSubmitting}
            >
              {catSubmitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Lưu danh mục</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Service Modal ──────────────────────────────────────────────────── */}
      <Modal visible={svcModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{editingSvc ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}</Text>
                <TouchableOpacity onPress={() => setSvcModalVisible(false)}>
                  <X size={22} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>

              {/* Category picker */}
              <Text style={styles.label}>Danh mục *</Text>
              {categories.length === 0 ? (
                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ color: colors.gray[400], fontSize: 14 }}>Chưa có danh mục — tạo danh mục trước</Text>
                </View>
              ) : (
                <TouchableOpacity style={[styles.input, styles.pickerRow]} onPress={() => setCatPickerVisible(true)}>
                  <Text style={{ flex: 1, fontSize: 14, color: selectedCat ? colors.gray[900] : colors.gray[400] }}>
                    {selectedCat ? selectedCat.name : 'Chọn danh mục...'}
                  </Text>
                  <ChevronDown size={18} color={colors.gray[500]} />
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Tên dịch vụ *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Tưới nước, Bón phân hữu cơ..."
                placeholderTextColor={colors.gray[400]}
                value={svcForm.name}
                onChangeText={t => setSvcForm({ ...svcForm, name: t })}
              />

              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Chi tiết công việc..."
                placeholderTextColor={colors.gray[400]}
                multiline
                value={svcForm.description}
                onChangeText={t => setSvcForm({ ...svcForm, description: t })}
              />

              <Text style={styles.label}>Đơn giá (₫) * <Text style={styles.hint}>(tối thiểu 1.000₫)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 50000"
                placeholderTextColor={colors.gray[400]}
                keyboardType="numeric"
                value={svcForm.price}
                onChangeText={t => setSvcForm({ ...svcForm, price: t })}
              />

              <TouchableOpacity
                style={[styles.saveBtn, svcSubmitting && styles.saveBtnDisabled]}
                onPress={saveSvc}
                disabled={svcSubmitting}
              >
                {svcSubmitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Lưu dịch vụ</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Category Picker Modal ──────────────────────────────────────────── */}
      <Modal visible={catPickerVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chọn danh mục</Text>
              <TouchableOpacity onPress={() => setCatPickerVisible(false)}>
                <X size={22} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pickerOption, svcForm.serviceCategoryId === cat.id && styles.pickerOptionSelected]}
                onPress={() => { setSvcForm({ ...svcForm, serviceCategoryId: cat.id ?? 0 }); setCatPickerVisible(false); }}
              >
                <Text style={[styles.pickerOptionText, svcForm.serviceCategoryId === cat.id && styles.pickerOptionTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray[200],
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },
  addBtn: { backgroundColor: colors.green[600], padding: spacing.xs + 2, borderRadius: radius.md },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.green[600] },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.gray[400] },
  tabLabelActive: { color: colors.green[700] },

  // Warning
  warningBox: {
    margin: spacing.md, padding: spacing.md,
    backgroundColor: '#fff3cd', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#ffc107',
  },
  warningText: { fontSize: 13, color: '#856404', lineHeight: 20 },

  // List
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray[400], textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.gray[200],
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.gray[900] },
  cardSub: { fontSize: 12, color: colors.gray[500], marginTop: 2 },
  cardDesc: { fontSize: 12, color: colors.gray[400], marginTop: 2, fontStyle: 'italic' },
  iconBtn: { padding: spacing.xs },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.gray[900] },

  // Form
  label: {
    fontSize: 13, fontWeight: '700', color: colors.gray[700],
    marginTop: spacing.sm, marginBottom: 4,
  },
  hint: { fontSize: 11, fontWeight: '400', color: colors.gray[400] },
  input: {
    borderWidth: 1, borderColor: colors.gray[200], borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 14, color: colors.gray[900], backgroundColor: colors.gray[50],
  },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },

  saveBtn: {
    backgroundColor: colors.green[600], borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg,
  },
  saveBtnDisabled: { backgroundColor: colors.green[300] },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Category picker
  pickerOption: {
    paddingVertical: 12, paddingHorizontal: spacing.md,
    borderRadius: radius.md, marginBottom: spacing.xs,
    backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.gray[200],
  },
  pickerOptionSelected: { backgroundColor: colors.green[50], borderColor: colors.green[400] },
  pickerOptionText: { fontSize: 15, color: colors.gray[800] },
  pickerOptionTextSelected: { fontWeight: '700', color: colors.green[700] },
});
