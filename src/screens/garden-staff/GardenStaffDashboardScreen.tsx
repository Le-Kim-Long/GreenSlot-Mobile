import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Alert, TouchableOpacity, Image, Modal, TextInput,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle, LogOut, ShieldAlert, ChevronRight,
  X, AlertTriangle, Send, Camera,
  Calendar, Inbox, RotateCcw, Image as ImageIcon,
  Search, MapPin, Clock, User, Tag, Info,
  Droplets, Video, Wifi,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GardenStaffStackParamList } from '../../navigation/types';
import { taskApi } from '../../api/taskApi';
import type { GardeningTaskResponseDTO } from '../../types/api';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

type Tab = 'MY_TASKS' | 'AVAILABLE';
type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'PENDING' | 'REJECTED' | 'COMPLETED';

export const taskStatusToBadge = (status: string): { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' } => {
  switch (status) {
    case 'PENDING':
      return { label: 'Chờ thực hiện', variant: 'yellow' };
    case 'IN_PROGRESS':
      return { label: 'Đang làm', variant: 'blue' };
    case 'PENDING_APPROVAL':
      return { label: 'Chờ duyệt', variant: 'yellow' };
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', variant: 'green' };
    case 'REJECTED':
      return { label: 'Bị từ chối', variant: 'red' };
    case 'CANCELLED':
      return { label: 'Đã hủy', variant: 'gray' };
    default:
      return { label: status, variant: 'gray' };
  }
};

export const taskTypeToLabel = (type?: string): string => {
  switch (type) {
    case 'PLANTING':
      return 'Gieo giống';
    case 'MAINTENANCE':
      return 'Chăm sóc / Bảo dưỡng';
    case 'CLEANING':
      return 'Vệ sinh ô đất';
    case 'HARVEST':
      return 'Thu hoạch vụ mùa';
    case 'INSPECTION':
      return 'Kiểm tra kỹ thuật';
    case 'PEST_CONTROL':
      return 'Xử lý sâu bệnh';
    case 'WATERING':
      return 'Tưới tiêu';
    case 'FERTILIZING':
      return 'Bón phân';
    default:
      return type || 'Nhiệm vụ chung';
  }
};

export default function GardenStaffDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GardenStaffStackParamList>>();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('MY_TASKS');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const [myTasks, setMyTasks] = useState<GardeningTaskResponseDTO[]>([]);
  const [availableTasks, setAvailableTasks] = useState<GardeningTaskResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Modal Chi tiết nhiệm vụ (Task Detail)
  const [detailTask, setDetailTask] = useState<GardeningTaskResponseDTO | null>(null);

  // Modal Submit Bằng chứng Camera
  const [activeTask, setActiveTask] = useState<GardeningTaskResponseDTO | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modal Báo cáo sự cố
  const [issueTask, setIssueTask] = useState<GardeningTaskResponseDTO | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, avail] = await Promise.all([
        taskApi.getMyTasks().catch(() => [] as GardeningTaskResponseDTO[]),
        taskApi.getAvailableTasks().catch(() => [] as GardeningTaskResponseDTO[]),
      ]);
      setMyTasks(mine);
      setAvailableTasks(avail);
    } catch {
      setMyTasks([]);
      setAvailableTasks([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const updateStatus = async (taskId: number, status: string, imageUrl?: string) => {
    try {
      await taskApi.updateTaskStatus(taskId, { status, evidenceImageUrl: imageUrl });
      await load();
      if (detailTask && detailTask.id === taskId) {
        setDetailTask(prev => prev ? { ...prev, status, evidenceImageUrl: imageUrl ?? prev.evidenceImageUrl } : null);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể cập nhật trạng thái';
      Alert.alert('Lỗi', msg);
    }
  };

  const handleClaimTask = (task: GardeningTaskResponseDTO) => {
    Alert.alert(
      'Xác nhận nhận việc',
      `Bạn có chắc chắn muốn nhận nhiệm vụ "${task.taskName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Nhận việc',
          onPress: async () => {
            setClaimingId(task.id);
            try {
              await taskApi.claimTask(task.id);
              Alert.alert('Thành công', 'Đã nhận nhiệm vụ thành công!');
              await load();
              if (detailTask?.id === task.id) {
                setDetailTask(null);
              }
              setActiveTab('MY_TASKS');
            } catch (e: any) {
              const msg = e?.response?.data?.message || 'Không thể nhận việc lúc này';
              Alert.alert('Lỗi', msg);
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  };

  // Camera & Image handling
  const handleOpenEvidenceModal = (task: GardeningTaskResponseDTO) => {
    setActiveTask(task);
    setCapturedUri(task.evidenceImageUrl || null);
  };

  const handleCloseEvidenceModal = () => {
    if (isUploading) return;
    setActiveTask(null);
    setCapturedUri(null);
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền sử dụng Camera để chụp ảnh bằng chứng công việc.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể khởi động camera: ' + (e?.message || ''));
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh bằng chứng.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể mở thư viện: ' + (e?.message || ''));
    }
  };

  const handleSubmitEvidence = async () => {
    if (!activeTask || !capturedUri) return;

    setIsUploading(true);
    try {
      let finalUrl = capturedUri;

      if (capturedUri.startsWith('file:') || capturedUri.startsWith('content:') || capturedUri.startsWith('ph:')) {
        finalUrl = await taskApi.uploadEvidenceImage(capturedUri);
      }

      await taskApi.updateTaskStatus(activeTask.id, {
        status: 'PENDING_APPROVAL',
        evidenceImageUrl: finalUrl,
      });

      Alert.alert('Thành công', 'Đã nộp bằng chứng hoàn thành! Đang chờ Quản lý phê duyệt.');
      if (detailTask && detailTask.id === activeTask.id) {
        setDetailTask(prev => prev ? { ...prev, status: 'PENDING_APPROVAL', evidenceImageUrl: finalUrl } : null);
      }
      setActiveTask(null);
      setCapturedUri(null);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Lỗi khi gửi bằng chứng hoàn thành';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Report Issue handling
  const handleOpenIssueModal = (task: GardeningTaskResponseDTO) => {
    setIssueTask(task);
    setIssueTitle('');
    setIssueDesc('');
  };

  const handleSubmitIssue = async () => {
    if (!issueTask) return;
    if (!issueTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề sự cố');
      return;
    }
    if (!issueDesc.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả chi tiết sự cố');
      return;
    }

    setIsReportingIssue(true);
    try {
      await taskApi.reportIssue(issueTask.id, {
        issueTitle: issueTitle.trim(),
        description: issueDesc.trim(),
      });
      Alert.alert('Thành công', 'Đã gửi báo cáo sự cố tới Quản lý!');
      setIssueTask(null);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Lỗi khi gửi báo cáo sự cố';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsReportingIssue(false);
    }
  };

  // Lọc danh sách theo Search & Status Filter
  const filteredMyTasks = myTasks.filter(item => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.taskName?.toLowerCase().includes(q) ||
      item.targetSlotNumber?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.id.toString().includes(q);
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredAvailableTasks = availableTasks.filter(item => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      item.taskName?.toLowerCase().includes(q) ||
      item.targetSlotNumber?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.id.toString().includes(q)
    );
  });

  const filterCounts = {
    ALL: myTasks.length,
    IN_PROGRESS: myTasks.filter(t => t.status === 'IN_PROGRESS').length,
    PENDING_APPROVAL: myTasks.filter(t => t.status === 'PENDING_APPROVAL').length,
    PENDING: myTasks.filter(t => t.status === 'PENDING').length,
    REJECTED: myTasks.filter(t => t.status === 'REJECTED').length,
    COMPLETED: myTasks.filter(t => t.status === 'COMPLETED').length,
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarMini}>
            <User size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.roleBadgeRow}>
              <Text style={styles.greeting}>Xin chào,</Text>
              {user?.locationName && (
                <View style={styles.locationTag}>
                  <MapPin size={10} color="#dcfce7" />
                  <Text style={styles.locationTagText} numberOfLines={1}>{user.locationName}</Text>
                </View>
              )}
            </View>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || user?.fullName || 'Nhân viên Vườn'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <LogOut size={16} color={colors.white} />
        </TouchableOpacity>
      </View>



      {/* Main Tabs (Việc của tôi vs Nhận việc mới) */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'MY_TASKS' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('MY_TASKS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainTabText, activeTab === 'MY_TASKS' && styles.mainTabTextActive]}>
            Việc của tôi ({myTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'AVAILABLE' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('AVAILABLE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainTabText, activeTab === 'AVAILABLE' && styles.mainTabTextActive]}>
            Nhận việc mới ({availableTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên việc, ô vườn, mô tả..."
          placeholderTextColor={colors.gray[400]}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Horizontal Chips (Dành cho tab Việc của tôi) */}
      {activeTab === 'MY_TASKS' && (
        <View style={styles.filterScrollViewWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipContainer}>
            {[
              { key: 'ALL', label: 'Tất cả', count: filterCounts.ALL },
              { key: 'IN_PROGRESS', label: 'Đang làm', count: filterCounts.IN_PROGRESS },
              { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: filterCounts.PENDING_APPROVAL },
              { key: 'PENDING', label: 'Chưa làm', count: filterCounts.PENDING },
              { key: 'REJECTED', label: 'Từ chối', count: filterCounts.REJECTED },
              { key: 'COMPLETED', label: 'Hoàn thành', count: filterCounts.COMPLETED },
            ].map(f => {
              const active = statusFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f.key as StatusFilter)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Danh sách nhiệm vụ */}
      <FlatList
        data={activeTab === 'MY_TASKS' ? filteredMyTasks : filteredAvailableTasks}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.green[600]}
          />
        }
        ListEmptyComponent={
          activeTab === 'MY_TASKS' ? (
            <EmptyState
              title={search ? 'Không tìm thấy nhiệm vụ' : 'Không có nhiệm vụ'}
              subtitle={search ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có nhiệm vụ nào trong mục này.'}
            />
          ) : (
            <EmptyState
              title={search ? 'Không tìm thấy việc mới' : 'Không có việc mới'}
              subtitle={search ? 'Thử tìm kiếm với từ khóa khác' : 'Hiện tại vườn chưa có nhiệm vụ nào cần nhận.'}
            />
          )
        }
        renderItem={({ item }) => {
          if (activeTab === 'AVAILABLE') {
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setDetailTask(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.taskName} numberOfLines={2}>#{item.id} {item.taskName}</Text>
                  <Badge label="Chờ nhận" variant="blue" />
                </View>

                <View style={styles.metaRow}>
                  {item.targetSlotNumber ? (
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={colors.green[700]} />
                      <Text style={styles.metaSlot}>Ô: {item.targetSlotNumber}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Tag size={12} color={colors.gray[500]} />
                    <Text style={styles.metaType}>{taskTypeToLabel(item.taskType)}</Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <View style={styles.cardBottomRow}>
                  <Text style={styles.detailHintText}>Chạm để xem chi tiết →</Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnClaim]}
                    onPress={() => handleClaimTask(item)}
                    disabled={claimingId === item.id}
                    activeOpacity={0.8}
                  >
                    {claimingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Inbox size={15} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionBtnText}>Nhận việc</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }

          // Tab MY_TASKS
          const badge = taskStatusToBadge(item.status);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setDetailTask(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Text style={styles.taskName} numberOfLines={2}>#{item.id} {item.taskName}</Text>
                <Badge label={badge.label} variant={badge.variant} />
              </View>

              <View style={styles.metaRow}>
                {item.targetSlotNumber ? (
                  <View style={styles.metaItem}>
                    <MapPin size={12} color={colors.green[700]} />
                    <Text style={styles.metaSlot}>Ô: {item.targetSlotNumber}</Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Tag size={12} color={colors.gray[500]} />
                  <Text style={styles.metaType}>{taskTypeToLabel(item.taskType)}</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              ) : null}

              {/* Thông báo nếu bị từ chối */}
              {item.status === 'REJECTED' && item.rejectionReason ? (
                <View style={styles.rejectedBanner}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <Text style={styles.rejectedText} numberOfLines={2}>Từ chối: {item.rejectionReason}</Text>
                </View>
              ) : null}

              {/* Hiển thị Ảnh Bằng Chứng nếu có */}
              {item.evidenceImageUrl ? (
                <View style={styles.evidenceContainer}>
                  <Text style={styles.evidenceLabel}>Ảnh bằng chứng đã gửi:</Text>
                  <Image
                    source={{ uri: item.evidenceImageUrl }}
                    style={styles.evidenceImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              <View style={styles.cardBottomRow}>
                <Text style={styles.detailHintText}>Chạm để xem chi tiết →</Text>
              </View>

              {/* Actions Button */}
              {item.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnStart]}
                    onPress={() => updateStatus(item.id, 'IN_PROGRESS')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Bắt đầu làm</Text>
                  </TouchableOpacity>
                </View>
              ) : (item.status === 'IN_PROGRESS' || item.status === 'REJECTED') ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnIssue]}
                    onPress={() => handleOpenIssueModal(item)}
                    activeOpacity={0.8}
                  >
                    <AlertTriangle size={14} color="#b45309" style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnIssueText}>Báo sự cố</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDone]}
                    onPress={() => handleOpenEvidenceModal(item)}
                    activeOpacity={0.8}
                  >
                    <Camera size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnText}>
                      {item.status === 'REJECTED' ? 'Nộp lại ảnh' : 'Chụp nộp ảnh'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : item.status === 'PENDING_APPROVAL' ? (
                <View style={styles.pendingRow}>
                  <Text style={styles.pendingText}>⏳ Đang chờ Quản lý duyệt hoàn thành</Text>
                </View>
              ) : item.status === 'COMPLETED' ? (
                <View style={styles.doneRow}>
                  <CheckCircle size={15} color={colors.green[600]} />
                  <Text style={styles.doneText}>Đã hoàn thành</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* MODAL 1: CHI TIẾT CÔNG VIỆC (TASK DETAIL MODAL) */}
      <Modal visible={!!detailTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết nhiệm vụ</Text>
              <TouchableOpacity onPress={() => setDetailTask(null)}>
                <X size={20} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {detailTask && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 1 }}>
                {/* Header card detail */}
                <View style={styles.detailHeaderCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={styles.detailTaskId}>Mã nhiệm vụ #{detailTask.id}</Text>
                    <Badge
                      label={taskStatusToBadge(detailTask.status).label}
                      variant={taskStatusToBadge(detailTask.status).variant}
                    />
                  </View>
                  <Text style={styles.detailTaskName}>{detailTask.taskName}</Text>
                </View>

                {/* Thông tin thuộc tính */}
                <View style={styles.detailInfoBox}>
                  <View style={styles.detailInfoRow}>
                    <MapPin size={16} color={colors.green[700]} />
                    <Text style={styles.detailInfoLabel}>Vị trí ô đất:</Text>
                    <Text style={styles.detailInfoValue}>{detailTask.targetSlotNumber || 'Toàn vườn'}</Text>
                  </View>

                  <View style={styles.detailInfoRow}>
                    <Tag size={16} color={colors.gray[600]} />
                    <Text style={styles.detailInfoLabel}>Phân loại việc:</Text>
                    <Text style={styles.detailInfoValue}>{taskTypeToLabel(detailTask.taskType)}</Text>
                  </View>

                  {detailTask.createdAt ? (
                    <View style={styles.detailInfoRow}>
                      <Clock size={16} color={colors.gray[600]} />
                      <Text style={styles.detailInfoLabel}>Thời gian tạo:</Text>
                      <Text style={styles.detailInfoValue}>
                        {new Date(detailTask.createdAt).toLocaleString('vi-VN')}
                      </Text>
                    </View>
                  ) : null}

                  {detailTask.assignedStaffName ? (
                    <View style={styles.detailInfoRow}>
                      <User size={16} color={colors.gray[600]} />
                      <Text style={styles.detailInfoLabel}>Phụ trách:</Text>
                      <Text style={styles.detailInfoValue}>{detailTask.assignedStaffName}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Mô tả chi tiết */}
                <Text style={styles.detailSectionTitle}>Nội dung công việc:</Text>
                <View style={styles.detailDescBox}>
                  <Text style={styles.detailDescText}>
                    {detailTask.description || 'Không có mô tả chi tiết kèm theo.'}
                  </Text>
                </View>

                {/* Nếu bị từ chối */}
                {detailTask.status === 'REJECTED' && detailTask.rejectionReason ? (
                  <View style={styles.detailRejectedBox}>
                    <AlertTriangle size={18} color="#dc2626" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.detailRejectedTitle}>Lý do Quản lý từ chối:</Text>
                      <Text style={styles.detailRejectedReason}>{detailTask.rejectionReason}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Ảnh bằng chứng nếu có */}
                {detailTask.evidenceImageUrl ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.detailSectionTitle}>Ảnh bằng chứng nghiệm thu:</Text>
                    <Image
                      source={{ uri: detailTask.evidenceImageUrl }}
                      style={styles.detailEvidenceImg}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {/* Banner trạng thái chờ duyệt */}
                {detailTask.status === 'PENDING_APPROVAL' ? (
                  <View style={[styles.pendingRow, { marginTop: 14 }]}>
                    <Text style={styles.pendingText}>⏳ Nhiệm vụ đã nộp bằng chứng. Đang chờ Quản lý duyệt.</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            {/* Modal Detail Footer Actions */}
            {detailTask && (
              <View style={styles.detailFooter}>
                {activeTab === 'AVAILABLE' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnClaim, { paddingVertical: 12 }]}
                    onPress={() => handleClaimTask(detailTask)}
                    disabled={claimingId === detailTask.id}
                    activeOpacity={0.8}
                  >
                    {claimingId === detailTask.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Inbox size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.actionBtnText}>Nhận việc này ngay</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : detailTask.status === 'PENDING' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnStart, { paddingVertical: 12 }]}
                    onPress={() => updateStatus(detailTask.id, 'IN_PROGRESS')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Bắt đầu làm nhiệm vụ</Text>
                  </TouchableOpacity>
                ) : (detailTask.status === 'IN_PROGRESS' || detailTask.status === 'REJECTED') ? (
                  <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnIssue, { flex: 1, paddingVertical: 12 }]}
                      onPress={() => {
                        handleOpenIssueModal(detailTask);
                      }}
                      activeOpacity={0.8}
                    >
                      <AlertTriangle size={15} color="#b45309" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnIssueText}>Báo sự cố</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDone, { flex: 1.3, paddingVertical: 12 }]}
                      onPress={() => {
                        handleOpenEvidenceModal(detailTask);
                      }}
                      activeOpacity={0.8}
                    >
                      <Camera size={15} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>
                        {detailTask.status === 'REJECTED' ? 'Nộp lại ảnh' : 'Chụp nộp ảnh'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.btnCancel, { width: '100%', alignItems: 'center', paddingVertical: 12 }]}
                    onPress={() => setDetailTask(null)}
                  >
                    <Text style={styles.btnCancelText}>Đóng</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CHỤP ẢNH BẰNG CHỨNG HOÀN THÀNH (CAMERA / THƯ VIỆN) */}
      <Modal visible={!!activeTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bằng chứng hoàn thành</Text>
              <TouchableOpacity onPress={handleCloseEvidenceModal} disabled={isUploading}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.modalSub}>
                Công việc: <Text style={{ fontWeight: '700', color: colors.gray[900] }}>{activeTask?.taskName}</Text>
              </Text>

              {!capturedUri ? (
                <View style={styles.cameraPickerBox}>
                  <Text style={styles.pickerInstruction}>
                    Vui lòng chụp ảnh thực tế tại vườn để làm bằng chứng nghiệm thu cho Quản lý.
                  </Text>

                  <TouchableOpacity
                    style={styles.btnCapturePrimary}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <Camera size={26} color="#fff" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.btnCaptureTitle}>Mở Camera Chụp Ảnh</Text>
                      <Text style={styles.btnCaptureSub}>Chụp ảnh trực tiếp cây trồng / ô đất</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnCaptureSecondary}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                  >
                    <ImageIcon size={20} color={colors.gray[700]} />
                    <Text style={styles.btnCaptureSecText}>Chọn ảnh có sẵn từ thư viện</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.btnRetake}
                    onPress={handleTakePhoto}
                    disabled={isUploading}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={16} color={colors.gray[700]} style={{ marginRight: 6 }} />
                    <Text style={styles.btnRetakeText}>Chụp lại ảnh khác</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isUploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color={colors.green[600]} />
                  <Text style={styles.uploadingText}>Đang tải hình ảnh lên máy chủ...</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={handleCloseEvidenceModal}
                disabled={isUploading}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSubmit, (!capturedUri || isUploading) && styles.btnDisabled]}
                onPress={handleSubmitEvidence}
                disabled={!capturedUri || isUploading}
              >
                <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSubmitText}>
                  {isUploading ? 'Đang gửi...' : 'Gửi duyệt'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: BÁO CÁO SỰ CỐ */}
      <Modal visible={!!issueTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={20} color="#b45309" />
                <Text style={styles.modalTitle}>Báo cáo sự cố</Text>
              </View>
              <TouchableOpacity onPress={() => setIssueTask(null)} disabled={isReportingIssue}>
                <X size={20} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSub}>
                Nhiệm vụ: <Text style={{ fontWeight: '700', color: colors.gray[900] }}>{issueTask?.taskName}</Text>
              </Text>

              <Text style={styles.inputLabel}>Tiêu đề sự cố *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Sâu bệnh lây lan, hỏng vòi tưới..."
                value={issueTitle}
                onChangeText={setIssueTitle}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Mô tả chi tiết sự cố *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Mô tả cụ thể hiện trạng cần hỗ trợ hoặc xử lý..."
                value={issueDesc}
                onChangeText={setIssueDesc}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIssueTask(null)}
                disabled={isReportingIssue}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSubmit, styles.btnSubmitIssue, isReportingIssue && styles.btnDisabled]}
                onPress={handleSubmitIssue}
                disabled={isReportingIssue}
              >
                <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnSubmitText}>
                  {isReportingIssue ? 'Đang gửi...' : 'Gửi báo cáo'}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.green[600],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  locationTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 120,
  },
  userName: { fontSize: 16, fontWeight: '700', color: colors.white },
  logoutBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alertShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertShortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 1,
  },
  alertShortcutSub: {
    fontSize: 11,
    color: '#991b1b',
  },
  alertActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  alertActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },

  mainTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 10,
    padding: 3,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: colors.green[600],
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  mainTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.gray[900],
    paddingVertical: 0,
  },

  filterScrollViewWrapper: {
    marginTop: 8,
    marginBottom: 2,
  },
  filterChipContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: colors.green[600],
    borderColor: colors.green[600],
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  taskName: {
    fontSize: 14,
    color: colors.gray[900],
    flex: 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaSlot: { fontSize: 12, color: colors.green[700], fontWeight: '600' },
  metaType: { fontSize: 12, color: colors.gray[500], fontWeight: '500' },
  desc: { fontSize: 12, color: colors.gray[600], lineHeight: 17, marginBottom: 8 },

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  rejectedText: { fontSize: 12, color: '#dc2626', fontWeight: '500', flex: 1 },

  evidenceContainer: {
    marginTop: 4,
    marginBottom: 8,
    padding: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  evidenceLabel: { fontSize: 11, fontWeight: '600', color: '#4b5563', marginBottom: 4 },
  evidenceImage: { width: '100%', height: 140, borderRadius: 6, backgroundColor: '#111827' },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  detailHintText: {
    fontSize: 11,
    color: colors.green[600],
    fontWeight: '600',
  },

  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnStart: { backgroundColor: colors.green[600] },
  actionBtnClaim: { backgroundColor: colors.green[700], paddingVertical: 7, paddingHorizontal: 12, flex: 0 },
  actionBtnDone: { backgroundColor: '#7c3aed' },
  actionBtnIssue: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  actionBtnIssueText: { fontSize: 12, fontWeight: '700', color: '#b45309' },
  actionBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  pendingRow: { marginTop: 6, padding: 8, backgroundColor: '#f5f3ff', borderRadius: 8, alignItems: 'center' },
  pendingText: { fontSize: 12, color: '#6d28d9', fontWeight: '600' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  doneText: { fontSize: 12, color: colors.green[600], fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 18 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalBody: { marginBottom: 16 },
  modalSub: { fontSize: 13, color: '#4b5563', marginBottom: 14 },

  // Detail Modal styles
  detailHeaderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  detailTaskId: { fontSize: 12, color: colors.gray[500], fontWeight: '600' },
  detailTaskName: { fontSize: 15, fontWeight: '700', color: colors.gray[900], marginTop: 4, lineHeight: 21 },
  detailInfoBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailInfoLabel: { fontSize: 12, color: colors.gray[500], width: 100 },
  detailInfoValue: { fontSize: 12, color: colors.gray[800], fontWeight: '600', flex: 1 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.gray[800], marginBottom: 6 },
  detailDescBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  detailDescText: { fontSize: 13, color: colors.gray[700], lineHeight: 19 },
  detailRejectedBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  detailRejectedTitle: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  detailRejectedReason: { fontSize: 12, color: '#b91c1c', marginTop: 2 },
  detailEvidenceImg: { width: '100%', height: 180, borderRadius: 8, marginTop: 4, backgroundColor: '#111827' },
  detailFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

  // Evidence Picker modal
  cameraPickerBox: {
    paddingVertical: 8,
  },
  pickerInstruction: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  btnCapturePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[600],
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnCaptureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  btnCaptureSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  btnCaptureSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  btnCaptureSecText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },

  previewContainer: {
    marginVertical: 6,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  btnRetake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  btnRetakeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },

  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.green[700],
    fontWeight: '500',
  },

  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#f9fafb' },
  textArea: { height: 90 },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  btnCancelText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  btnSubmitIssue: {
    backgroundColor: '#b45309',
  },
  btnSubmitText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  // Quick access shortcuts
  quickAccessScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    height: 64,
    marginTop: 6,
    marginBottom: 2,
  },
  quickAccessContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 125,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickCardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardTextBox: {
    justifyContent: 'center',
  },
  quickCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[800],
  },
  quickCardSub: {
    fontSize: 10,
    color: colors.gray[500],
    marginTop: 1,
  },
});
