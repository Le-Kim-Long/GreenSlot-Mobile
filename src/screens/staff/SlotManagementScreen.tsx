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
import { ArrowLeft, Grid, Edit3, X, CheckCircle, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { GardenSlotDTO } from '../../types/api';

export default function SlotManagementScreen() {
  const navigation = useNavigation();
  const [slots, setSlots] = useState<GardenSlotDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [selectedSlot, setSelectedSlot] = useState<GardenSlotDTO | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const data = await businessManagerApi.getAllSlots();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách ô Slot!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleOpenEdit = (slot: GardenSlotDTO) => {
    setSelectedSlot(slot);
    setPrice(slot.price ? slot.price.toString() : '0');
    setStatus(slot.status || 'AVAILABLE');
    setModalVisible(true);
  };

  const handleSaveSlot = async () => {
    if (!selectedSlot || !selectedSlot.id) return;
    setSubmitting(true);

    try {
      await businessManagerApi.updateSlot(selectedSlot.id, {
        ...selectedSlot,
        price: parseFloat(price) || 0,
        status,
      });
      Alert.alert('Thành công', 'Cập nhật ô Slot thành công!');
      setModalVisible(false);
      fetchSlots();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật ô Slot!');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlotItem = ({ item }: { item: GardenSlotDTO }) => {
    const isAvailable = item.status === 'AVAILABLE';
    const isRented = item.status === 'RENTED';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Grid size={18} color={colors.yellow[600]} />
            <Text style={styles.slotTitle}>Slot {item.slotNumber}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(item)}>
            <Edit3 size={18} color={colors.green[600]} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>
            {item.price ? item.price.toLocaleString('vi-VN') : 0}đ / tháng
          </Text>

          <View style={[styles.statusBadge, isAvailable ? styles.bgGreen : isRented ? styles.bgBlue : styles.bgYellow]}>
            <Text style={[styles.statusText, isAvailable ? styles.textGreen : isRented ? styles.textBlue : styles.textYellow]}>
              {isAvailable ? 'Sẵn sàng' : isRented ? 'Đã được thuê' : 'Bảo trì'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Ô Slot</Text>
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
          onRefresh={fetchSlots}
          refreshing={loading}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cấu hình Slot {selectedSlot?.slotNumber}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            {selectedSlot && (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Giá thuê hàng tháng (VNĐ) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />

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

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSlot} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu Thay Đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  backBtn: {
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
  editBtn: {
    padding: spacing.xs,
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
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginHorizontal: 2,
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
