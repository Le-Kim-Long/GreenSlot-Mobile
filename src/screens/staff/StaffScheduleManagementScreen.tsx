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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, X, Clock, MapPin, User, Search } from 'lucide-react-native';
import { staffScheduleApi } from '../../api/staffScheduleApi';
import { businessManagerApi } from '../../api/businessManagerApi';
import type { StaffScheduleDTO, LocationDTO, UserAdminDTO } from '../../types/api';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

const emptyForm: Partial<StaffScheduleDTO> = {
  staffId: 0,
  staffName: '',
  locationId: 0,
  locationName: '',
  scheduleDate: new Date().toISOString().split('T')[0],
  startTime: '08:00',
  endTime: '17:00',
  notes: '',
  isActive: true,
};

export default function StaffScheduleManagementScreen() {
  const [schedules, setSchedules] = useState<StaffScheduleDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [staffs, setStaffs] = useState<UserAdminDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StaffScheduleDTO | null>(null);
  const [formData, setFormData] = useState<Partial<StaffScheduleDTO>>(emptyForm);

  // Pickers
  const [isLocSelectOpen, setIsLocSelectOpen] = useState(false);
  const [isStaffSelectOpen, setIsStaffSelectOpen] = useState(false);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      let list = [];
      if (dateFilter) {
        list = await staffScheduleApi.getSchedulesByDate(dateFilter);
      } else {
        list = await staffScheduleApi.getSchedules();
      }
      setSchedules(list || []);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải danh sách ca trực.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const locs = await businessManagerApi.getAllLocations();
      setLocations(locs);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [dateFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Fetch staff when location selected
  useEffect(() => {
    if (!formData.locationId) return;
    businessManagerApi
      .getGardenStaffsByLocation(formData.locationId)
      .then(setStaffs)
      .catch(() => setStaffs([]));
  }, [formData.locationId]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StaffScheduleDTO) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: StaffScheduleDTO) => {
    Alert.alert(
      'Hủy ca trực',
      `Bạn có muốn xóa ca trực của "${item.staffName}" ngày ${item.scheduleDate}?`,
      [
        { text: 'Hủy ca', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffScheduleApi.deleteSchedule(item.id!);
              Alert.alert('Thành công', 'Đã xóa ca trực.');
              fetchSchedules();
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa ca trực.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.staffId || !formData.locationId || !formData.scheduleDate) {
      Alert.alert('Lỗi', 'Vui lòng chọn nhân viên, địa điểm và ngày trực.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await staffScheduleApi.updateSchedule(editingItem.id!, formData);
        Alert.alert('Thành công', 'Đã cập nhật ca trực.');
      } else {
        await staffScheduleApi.createSchedule(formData);
        Alert.alert('Thành công', 'Đã phân ca trực mới.');
      }
      setIsModalOpen(false);
      fetchSchedules();
    } catch (err) {
      Alert.alert('Lỗi', 'Thao tác thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    const matchSearch =
      s.staffName?.toLowerCase().includes(search.toLowerCase()) ||
      s.locationName?.toLowerCase().includes(search.toLowerCase()) ||
      s.notes?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.gray[400]} />
          <TextInput
            placeholder="Tìm theo nhân viên, địa điểm..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Date Filter */}
      <View style={styles.filterRow}>
        <View style={styles.dateFilterBox}>
          <CalendarIcon size={16} color={colors.green[600]} />
          <TextInput
            placeholder="Lọc theo ngày (YYYY-MM-DD)"
            style={styles.dateInput}
            value={dateFilter}
            onChangeText={setDateFilter}
          />
          {dateFilter ? (
            <TouchableOpacity onPress={() => setDateFilter('')}>
              <X size={16} color="#dc2626" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.row}>
                  <User size={16} color={colors.green[600]} />
                  <Text style={styles.staffNameText}>{item.staffName}</Text>
                </View>
                <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
                    {item.isActive ? 'Đang trực' : 'Đã hủy'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={14} color={colors.gray[400]} />
                <Text style={styles.infoText}>{item.locationName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={14} color="#2563eb" />
                <Text style={styles.infoText}>
                  {item.scheduleDate}  •  {item.startTime} - {item.endTime}
                </Text>
              </View>

              {item.notes ? <Text style={styles.notesText}>Ghi chú: {item.notes}</Text> : null}

              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                  <Edit2 size={14} color={colors.green[600]} />
                  <Text style={styles.actionBtnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                  <Trash2 size={14} color="#dc2626" />
                  <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.gray[500] }}>Không tìm thấy ca trực nào.</Text>
            </View>
          }
        />
      )}

      {/* FORM MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Sửa ca trực' : 'Phân ca trực mới'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={24} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              {/* Location Picker */}
              <Text style={styles.label}>Cơ sở / Vị trí *</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setIsLocSelectOpen(true)}>
                <Text style={{ color: formData.locationId ? colors.gray[900] : colors.gray[400] }}>
                  {formData.locationId ? formData.locationName : 'Nhấp để chọn cơ sở'}
                </Text>
              </TouchableOpacity>

              {/* Staff Picker */}
              <Text style={styles.label}>Nhân viên làm vườn *</Text>
              <TouchableOpacity
                style={[styles.selector, !formData.locationId && { opacity: 0.5 }]}
                onPress={() => {
                  if (!formData.locationId) {
                    Alert.alert('Thông báo', 'Vui lòng chọn cơ sở trước.');
                    return;
                  }
                  setIsStaffSelectOpen(true);
                }}
              >
                <Text style={{ color: formData.staffId ? colors.gray[900] : colors.gray[400] }}>
                  {formData.staffId ? formData.staffName : 'Nhấp để chọn nhân viên'}
                </Text>
              </TouchableOpacity>

              {/* Work Date */}
              <Text style={styles.label}>Ngày trực *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.scheduleDate}
                onChangeText={(val) => setFormData({ ...formData, scheduleDate: val })}
              />

              {/* Shifts */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.label}>Giờ bắt đầu *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={formData.startTime}
                    onChangeText={(val) => setFormData({ ...formData, startTime: val })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Giờ kết thúc *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={formData.endTime}
                    onChangeText={(val) => setFormData({ ...formData, endTime: val })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Ghi chú ca trực</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập ghi chú thêm cho ca trực..."
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Kích hoạt ca trực</Text>
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
                  <Text style={styles.submitBtnText}>Lưu ca trực</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* LOCATION PICKER */}
      <Modal visible={isLocSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn cơ sở</Text>
              <TouchableOpacity onPress={() => setIsLocSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id!.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      locationId: item.id,
                      locationName: item.name,
                      staffId: 0,
                      staffName: '',
                    });
                    setIsLocSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  <Text style={styles.pickerItemSub}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* STAFF PICKER */}
      <Modal visible={isStaffSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nhân viên</Text>
              <TouchableOpacity onPress={() => setIsStaffSelectOpen(false)}>
                <X size={20} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={staffs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      staffId: Number(item.id),
                      staffName: item.fullName || item.username,
                    });
                    setIsStaffSelectOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.fullName || item.username}</Text>
                  <Text style={styles.pickerItemSub}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.gray[500], padding: 20 }}>
                    Không có nhân viên nào tại cơ sở này.
                  </Text>
                </View>
              }
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
  filterRow: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  dateFilterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  dateInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.gray[900],
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[900],
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: colors.gray[600],
  },
  notesText: {
    fontSize: 12,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green[700],
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
  selector: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
    marginTop: spacing.xs,
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
});
