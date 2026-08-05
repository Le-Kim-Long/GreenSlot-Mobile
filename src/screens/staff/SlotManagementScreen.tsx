import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Grid, Edit3, X, CheckCircle, Clock, Plus, Trash2, MapPin, Layers, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius, typography } from '../../theme/typography';
import type { GardenSlotDTO, PillarDTO, LocationDTO } from '../../types/api';

type ModalMode = 'DETAIL' | 'EDIT' | 'CREATE';

export default function SlotManagementScreen() {
  const navigation = useNavigation();
  const [slots, setSlots] = useState<GardenSlotDTO[]>([]);
  const [pillars, setPillars] = useState<PillarDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal control
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('DETAIL');
  const [selectedSlot, setSelectedSlot] = useState<GardenSlotDTO | null>(null);

  // Form states
  const [slotNumber, setSlotNumber] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [selectedPillarId, setSelectedPillarId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  // Sub-modal for selecting pillar
  const [pillarPickerVisible, setPillarPickerVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const fetchSlotsPillarsAndLocations = async () => {
    setLoading(true);
    try {
      const [slotsData, pillarsData, locationsData] = await Promise.all([
        businessManagerApi.getAllSlots(),
        businessManagerApi.getAllPillars(),
        businessManagerApi.getAllLocations(),
      ]);
      setSlots(Array.isArray(slotsData) ? slotsData : []);
      setPillars(Array.isArray(pillarsData) ? pillarsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách ô Slot, Cột vườn và Cơ sở!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotsPillarsAndLocations();
  }, []);

  // Map pillars for easy lookup
  const pillarMap = useMemo(() => {
    const map = new Map<number, PillarDTO>();
    pillars.forEach(p => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [pillars]);

  // Map locations for easy lookup
  const locationMap = useMemo(() => {
    const map = new Map<number, LocationDTO>();
    locations.forEach(loc => {
      if (loc.id) map.set(loc.id, loc);
    });
    return map;
  }, [locations]);

  const getPillarLabel = (pillarId: number | null) => {
    if (!pillarId) return 'Chọn cột vườn...';
    const pil = pillarMap.get(pillarId);
    if (!pil) return 'Không xác định';
    
    // Find location name using locationId from mapped locations
    const loc = pil.locationId ? locationMap.get(pil.locationId) : null;
    const locName = loc ? loc.name : 'Không xác định';
    
    return `${pil.pillarCode} (${locName})`;
  };

  const handleOpenCreate = () => {
    setSelectedSlot(null);
    setSlotNumber('');
    setPrice('500000');
    setStatus('AVAILABLE');
    // Default to first pillar if available
    setSelectedPillarId(pillars.length > 0 ? (pillars[0].id ?? null) : null);
    setImageUrl('');
    setModalMode('CREATE');
    setModalVisible(true);
  };

  const handleOpenDetail = (slot: GardenSlotDTO) => {
    setSelectedSlot(slot);
    setSlotNumber(slot.slotNumber);
    setPrice(slot.price ? slot.price.toString() : '0');
    setStatus(slot.status || 'AVAILABLE');
    setSelectedPillarId(slot.pillarId || null);
    setImageUrl(slot.imageUrl || '');
    setModalMode('DETAIL');
    setModalVisible(true);
  };

  const handleSwitchToEdit = () => {
    setModalMode('EDIT');
  };

  const handleCreateSlot = async () => {
    if (!slotNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã số ô slot!');
      return;
    }
    if (!price || parseFloat(price) < 1000) {
      Alert.alert('Lỗi', 'Giá thuê tối thiểu là 1.000 VNĐ!');
      return;
    }
    if (!selectedPillarId) {
      Alert.alert('Lỗi', 'Vui lòng chọn cột vườn!');
      return;
    }

    setSubmitting(true);
    try {
      await businessManagerApi.createSlot({
        slotNumber: slotNumber.trim(),
        price: parseFloat(price) || 0,
        pillarId: selectedPillarId,
        status,
        imageUrl: imageUrl.trim() || undefined,
      });
      Alert.alert('Thành công', 'Tạo ô Slot mới thành công!');
      setModalVisible(false);
      fetchSlotsPillarsAndLocations();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể tạo ô Slot mới!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSlot = async () => {
    if (!selectedSlot || !selectedSlot.id) return;
    if (!slotNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã số ô slot!');
      return;
    }
    if (!price || parseFloat(price) < 1000) {
      Alert.alert('Lỗi', 'Giá thuê tối thiểu là 1.000 VNĐ!');
      return;
    }
    if (!selectedPillarId) {
      Alert.alert('Lỗi', 'Vui lòng chọn cột vườn!');
      return;
    }

    setSubmitting(true);
    try {
      await businessManagerApi.updateSlot(selectedSlot.id, {
        id: selectedSlot.id,
        slotNumber: slotNumber.trim(),
        price: parseFloat(price) || 0,
        pillarId: selectedPillarId,
        status,
        imageUrl: imageUrl.trim() || undefined,
      });
      Alert.alert('Thành công', 'Cập nhật ô Slot thành công!');
      setModalMode('DETAIL');
      // Update local state details
      const updated = {
        ...selectedSlot,
        slotNumber: slotNumber.trim(),
        price: parseFloat(price) || 0,
        pillarId: selectedPillarId,
        status,
        imageUrl: imageUrl.trim(),
      };
      setSelectedSlot(updated);
      fetchSlotsPillarsAndLocations();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể cập nhật ô Slot!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = () => {
    if (!selectedSlot || !selectedSlot.id) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ô slot ${selectedSlot.slotNumber} này không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await businessManagerApi.deleteSlot(selectedSlot.id!);
              Alert.alert('Thành công', 'Đã xóa ô slot!');
              setModalVisible(false);
              fetchSlotsPillarsAndLocations();
            } catch (e: any) {
              Alert.alert('Thất bại', e?.response?.data?.message || 'Không thể xóa ô slot này vì đã có dữ liệu ràng buộc!');
            }
          },
        },
      ]
    );
  };

  const renderSlotItem = ({ item }: { item: GardenSlotDTO }) => {
    const isAvailable = item.status === 'AVAILABLE';
    const isRented = item.status === 'RENTED';
    const associatedPillar = item.pillarId ? pillarMap.get(item.pillarId) : null;
    
    // Resolve location name via pillar locationId
    let locationLabel = '';
    if (associatedPillar && associatedPillar.locationId) {
      const loc = locationMap.get(associatedPillar.locationId);
      if (loc) {
        locationLabel = ` • ${loc.name}`;
      }
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleOpenDetail(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Grid size={18} color={colors.yellow[600]} />
            <Text style={styles.slotTitle}>Slot {item.slotNumber}</Text>
          </View>
          <View style={[styles.statusBadge, isAvailable ? styles.bgGreen : isRented ? styles.bgBlue : styles.bgYellow]}>
            <Text style={[styles.statusText, isAvailable ? styles.textGreen : isRented ? styles.textBlue : styles.textYellow]}>
              {isAvailable ? 'Sẵn sàng' : isRented ? 'Đã thuê' : 'Bảo trì'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceText}>
              {item.price ? item.price.toLocaleString('vi-VN') : 0}đ / tháng
            </Text>
            {associatedPillar && (
              <Text style={styles.pillarText}>
                📍 Cột: {associatedPillar.pillarCode}{locationLabel}
              </Text>
            )}
          </View>
          <Edit3 size={16} color={colors.gray[400]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={colors.gray[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý Ô Slot</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleOpenCreate}>
          <Plus size={20} color={colors.green[600]} />
          <Text style={styles.createBtnText}>Thêm Slot</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderSlotItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchSlotsPillarsAndLocations}
          refreshing={loading}
        />
      )}

      {/* Main Detail/Edit/Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'DETAIL' && `Chi tiết Ô Slot ${selectedSlot?.slotNumber}`}
                {modalMode === 'EDIT' && `Chỉnh sửa Ô Slot ${selectedSlot?.slotNumber}`}
                {modalMode === 'CREATE' && 'Thêm Ô Slot mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* DETAIL MODE */}
              {modalMode === 'DETAIL' && selectedSlot && (
                <View style={styles.detailContainer}>
                  {/* Slot Image */}
                  {selectedSlot.imageUrl ? (
                    <Image source={{ uri: selectedSlot.imageUrl }} style={styles.detailImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <ImageIcon size={40} color={colors.gray[300]} />
                      <Text style={styles.placeholderText}>Chưa có ảnh thực tế</Text>
                    </View>
                  )}

                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mã ô slot</Text>
                      <Text style={styles.detailValue}>{selectedSlot.slotNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Giá thuê hàng tháng</Text>
                      <Text style={[styles.detailValue, { color: colors.green[700] }]}>
                        {selectedSlot.price ? selectedSlot.price.toLocaleString('vi-VN') : 0} VNĐ
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trạng thái</Text>
                      <View style={[styles.statusBadge, selectedSlot.status === 'AVAILABLE' ? styles.bgGreen : selectedSlot.status === 'RENTED' ? styles.bgBlue : styles.bgYellow]}>
                        <Text style={[styles.statusText, selectedSlot.status === 'AVAILABLE' ? styles.textGreen : selectedSlot.status === 'RENTED' ? styles.textBlue : styles.textYellow]}>
                          {selectedSlot.status === 'AVAILABLE' ? 'Sẵn sàng' : selectedSlot.status === 'RENTED' ? 'Đã thuê' : 'Bảo trì'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Cột vườn</Text>
                      <Text style={styles.detailValue}>
                        {getPillarLabel(selectedSlot.pillarId)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity style={styles.editActionBtn} onPress={handleSwitchToEdit}>
                      <Edit3 size={16} color="#fff" />
                      <Text style={styles.editActionText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDeleteSlot}>
                      <Trash2 size={16} color={colors.red[600]} />
                      <Text style={styles.deleteActionText}>Xóa ô slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* EDIT / CREATE FORM MODE */}
              {(modalMode === 'EDIT' || modalMode === 'CREATE') && (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Mã số ô slot *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: S-Q1-01-A"
                    value={slotNumber}
                    onChangeText={setSlotNumber}
                  />

                  <Text style={styles.inputLabel}>Giá thuê hàng tháng (VNĐ) *</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="Ví dụ: 500000"
                    value={price}
                    onChangeText={setPrice}
                  />

                  <Text style={styles.inputLabel}>Cột vườn thuộc về *</Text>
                  <TouchableOpacity
                    style={styles.selectDropdown}
                    onPress={() => setPillarPickerVisible(true)}
                  >
                    <MapPin size={18} color={colors.green[600]} />
                    <Text style={styles.dropdownValue}>{getPillarLabel(selectedPillarId)}</Text>
                  </TouchableOpacity>

                  <Text style={styles.inputLabel}>Trạng thái Ô Slot *</Text>
                  <View style={styles.statusOptions}>
                    {['AVAILABLE', 'RENTED', 'MAINTENANCE'].map(st => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.statusOption, status === st && styles.statusOptionSelected]}
                        onPress={() => setStatus(st)}
                      >
                        <Text style={[styles.statusOptionText, status === st && styles.statusOptionTextSelected]}>
                          {st === 'AVAILABLE' ? 'Sẵn sàng' : st === 'RENTED' ? 'Đã thuê' : 'Bảo trì'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Đường dẫn ảnh mô tả (Tùy chọn)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://..."
                    value={imageUrl}
                    onChangeText={setImageUrl}
                  />

                  <View style={styles.formActionButtons}>
                    {modalMode === 'EDIT' ? (
                      <>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateSlot} disabled={submitting}>
                          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalMode('DETAIL')}>
                          <Text style={styles.cancelBtnText}>Quay lại</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSlot} disabled={submitting}>
                          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Tạo ô Slot</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                          <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub-modal: Pillar Picker */}
      <Modal visible={pillarPickerVisible} animationType="fade" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn cột vườn</Text>
              <TouchableOpacity onPress={() => setPillarPickerVisible(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pillars}
              keyExtractor={item => item.id!.toString()}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                // Find location label for picker item
                const locName = item.locationId ? (locationMap.get(item.locationId)?.name || 'Không xác định') : 'Không xác định';
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selectedPillarId === item.id && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedPillarId(item.id!);
                      setPillarPickerVisible(false);
                    }}
                  >
                    <Layers size={16} color={selectedPillarId === item.id ? colors.green[600] : colors.gray[500]} />
                    <View style={styles.pickerItemTextContainer}>
                      <Text style={[styles.pickerItemCode, selectedPillarId === item.id && styles.pickerItemTextActive]}>
                        Cột: {item.pillarCode}
                      </Text>
                      <Text style={styles.pickerItemLocation}>{locName}</Text>
                    </View>
                    {selectedPillarId === item.id && <CheckCircle size={16} color={colors.green[600]} />}
                  </TouchableOpacity>
                );
              }}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green[700],
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
  slotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
    marginLeft: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.xs + 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green[600],
  },
  pillarText: {
    fontSize: 11,
    color: colors.gray[400],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  bgGreen: { backgroundColor: colors.green[50] },
  bgBlue: { backgroundColor: colors.blue[50] },
  bgYellow: { backgroundColor: colors.yellow[50] },
  statusText: { fontSize: 12, fontWeight: '700' },
  textGreen: { color: colors.green[600] },
  textBlue: { color: colors.blue[600] },
  textYellow: { color: colors.yellow[600] },

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
    maxHeight: '90%',
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
  modalScroll: {
    marginBottom: spacing.md,
  },

  // Detail panel styles
  detailContainer: {
    gap: spacing.md,
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.gray[400],
  },
  detailCard: {
    backgroundColor: colors.gray[50],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  editActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 6,
  },
  editActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red[100],
    borderWidth: 1,
    borderColor: colors.red[600],
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 6,
  },
  deleteActionText: {
    color: colors.red[600],
    fontWeight: '700',
    fontSize: 14,
  },

  // Form Panel styles
  formContainer: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gray[700],
    marginTop: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    backgroundColor: colors.gray[50],
  },
  selectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
  },
  dropdownValue: {
    fontSize: 14,
    color: colors.gray[800],
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  statusOptionSelected: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  statusOptionText: {
    fontSize: 12,
    color: colors.gray[700],
  },
  statusOptionTextSelected: {
    fontWeight: '700',
    color: colors.green[600],
  },
  formActionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.green[600],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.gray[700],
    fontWeight: '700',
    fontSize: 14,
  },

  // Picker modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  pickerList: {
    gap: spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  pickerItemActive: {
    borderColor: colors.green[600],
    backgroundColor: colors.green[50],
  },
  pickerItemTextContainer: {
    flex: 1,
  },
  pickerItemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
  },
  pickerItemLocation: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
  },
  pickerItemTextActive: {
    color: colors.green[700],
  },
});
