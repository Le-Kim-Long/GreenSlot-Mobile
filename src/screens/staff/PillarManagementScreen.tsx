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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Layers, Plus, MapPin, X, Trash2, Edit3 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { businessManagerApi } from '../../api/businessManagerApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import type { PillarDTO, LocationDTO } from '../../types/api';

export default function PillarManagementScreen() {
  const navigation = useNavigation();
  const [pillars, setPillars] = useState<PillarDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPillar, setEditingPillar] = useState<PillarDTO | null>(null);
  const [form, setForm] = useState({
    pillarCode: '',
    locationId: 0,
    cameraStreamUrl: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pillarsData, locationsData] = await Promise.all([
        businessManagerApi.getAllPillars(),
        businessManagerApi.getAllLocations(),
      ]);
      setPillars(Array.isArray(pillarsData) ? pillarsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      if (locationsData.length > 0) {
        const firstLocId = locationsData[0].id ?? 0;
        setForm(prev => ({ ...prev, locationId: firstLocId }));
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách Trụ trồng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (pillar?: PillarDTO) => {
    const defaultLocId = locations[0]?.id ?? 0;
    if (pillar) {
      setEditingPillar(pillar);
      setForm({
        pillarCode: pillar.pillarCode,
        locationId: pillar.locationId || defaultLocId,
        cameraStreamUrl: pillar.cameraStreamUrl || '',
        active: pillar.active ?? true,
      });
    } else {
      setEditingPillar(null);
      setForm({
        pillarCode: '',
        locationId: defaultLocId,
        cameraStreamUrl: '',
        active: true,
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.pillarCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Mã Trụ!');
      return;
    }
    if (!form.locationId) {
      Alert.alert('Lỗi', 'Vui lòng chọn Cơ sở!');
      return;
    }

    setSubmitting(true);
    try {
      const payload: PillarDTO = {
        pillarCode: form.pillarCode,
        locationId: form.locationId,
        cameraStreamUrl: form.cameraStreamUrl,
        active: form.active,
      };

      if (editingPillar && editingPillar.id) {
        await businessManagerApi.updatePillar(editingPillar.id, payload);
        Alert.alert('Thành công', 'Cập nhật Trụ trồng thành công!');
      } else {
        await businessManagerApi.createPillar(payload);
        Alert.alert('Thành công', 'Tạo Trụ trồng mới thành công!');
      }
      setModalVisible(false);
      fetchData();
    } catch {
      Alert.alert('Lỗi', 'Lưu Trụ trồng thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Xác nhận Xóa', 'Bạn có chắc chắn muốn xóa Trụ trồng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await businessManagerApi.deletePillar(id);
            Alert.alert('Thành công', 'Đã xóa Trụ trồng!');
            fetchData();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa Trụ trồng!');
          }
        },
      },
    ]);
  };

  const renderPillarItem = ({ item }: { item: PillarDTO }) => {
    const locationName = locations.find(l => l.id === item.locationId)?.name || item.locationName || 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Layers size={20} color={colors.blue[600]} />
            <Text style={styles.cardTitle}>Trụ {item.pillarCode}</Text>
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

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.gray[500]} />
            <Text style={styles.infoText}>Cơ sở: {locationName}</Text>
          </View>
          {item.cameraStreamUrl ? (
            <Text style={styles.infoText}>Camera: <Text style={styles.boldText}>Đã cấu hình</Text></Text>
          ) : null}
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
        <Text style={styles.headerTitle}>Quản lý Trụ Trồng</Text>
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
          data={pillars}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderPillarItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchData}
          refreshing={loading}
        />
      )}

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPillar ? 'Sửa Trụ Trồng' : 'Thêm Trụ Trồng Mới'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.gray[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Mã Trụ (Pillar Code) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: P01, P02"
                value={form.pillarCode}
                onChangeText={text => setForm({ ...form, pillarCode: text })}
              />

              <Text style={styles.inputLabel}>Cơ sở Vận hành *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationSelector}>
                {locations.map(loc => {
                  const locId = loc.id ?? 0;
                  return (
                    <TouchableOpacity
                      key={locId}
                      style={[
                        styles.locationChip,
                        form.locationId === locId && styles.locationChipSelected,
                      ]}
                      onPress={() => setForm({ ...form, locationId: locId })}
                    >
                      <Text
                        style={[
                          styles.locationChipText,
                          form.locationId === locId && styles.locationChipTextSelected,
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Camera Stream URL (Tùy chọn)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="RTSP / HTTP stream URL..."
                value={form.cameraStreamUrl}
                onChangeText={text => setForm({ ...form, cameraStreamUrl: text })}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu Thông Tin</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
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
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  cardBody: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: colors.gray[700],
  },
  boldText: {
    fontWeight: '700',
    color: colors.gray[900],
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
  locationSelector: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  locationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginRight: spacing.xs,
    backgroundColor: colors.white,
  },
  locationChipSelected: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  locationChipText: {
    fontSize: 13,
    color: colors.gray[700],
  },
  locationChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
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
