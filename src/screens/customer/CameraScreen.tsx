import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, RefreshCw, X, Video, Wifi, WifiOff, ChevronRight, Eye } from 'lucide-react-native';
import { cameraApi } from '../../api/cameraApi';
import type { CameraDTO } from '../../api/cameraApi';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen() {
  const [cameras, setCameras] = useState<CameraDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraDTO | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCameras = useCallback(async () => {
    try {
      const data = await cameraApi.getActiveCameras();
      setCameras(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể tải danh sách camera.';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCameras();
  };

  const refreshSnapshot = useCallback((captureUrl: string) => {
    setSnapshotUri(null);
    setSnapshotLoading(true);
    setTimeout(() => {
      setSnapshotUri(`${captureUrl}?t=${Date.now()}`);
      setSnapshotLoading(false);
    }, 300);
  }, []);

  const startAutoRefresh = useCallback((captureUrl: string) => {
    // Clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setCountdown(30);

    // Countdown tick every 1s
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    // Refresh snapshot every 30s
    intervalRef.current = setInterval(() => {
      refreshSnapshot(captureUrl);
      setCountdown(30);
    }, 30000);
  }, [refreshSnapshot]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const handleViewCamera = (camera: CameraDTO) => {
    setSelectedCamera(camera);
    setModalVisible(true);
    if (camera.capture_url) {
      refreshSnapshot(camera.capture_url);
      startAutoRefresh(camera.capture_url);
    } else {
      setSnapshotUri(null);
    }
  };

  const handleCloseModal = () => {
    stopAutoRefresh();
    setModalVisible(false);
    setSelectedCamera(null);
    setSnapshotUri(null);
    setCountdown(30);
  };

  const handleRefreshSnapshot = () => {
    if (!selectedCamera?.capture_url) return;
    refreshSnapshot(selectedCamera.capture_url);
    // Restart the 10s auto-refresh cycle from now
    startAutoRefresh(selectedCamera.capture_url);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green[600]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Camera size={28} color={colors.green[600]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Camera giám sát</Text>
            <Text style={styles.headerSub}>
              {cameras.length > 0 ? `${cameras.length} camera đang hoạt động` : 'Không có camera nào'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <RefreshCw size={18} color={colors.green[600]} />
          </TouchableOpacity>
        </View>

        {/* Camera list */}
        {cameras.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <WifiOff size={48} color={colors.gray[300]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có camera nào</Text>
            <Text style={styles.emptySub}>
              Hệ thống chưa ghi nhận camera nào đang hoạt động.
            </Text>
          </View>
        ) : (
          <View style={styles.cameraList}>
            {cameras.map((cam) => (
              <TouchableOpacity
                key={cam.cam_id}
                style={styles.cameraCard}
                activeOpacity={0.85}
                onPress={() => handleViewCamera(cam)}
              >
                {/* Thumbnail preview */}
                <View style={styles.thumbnail}>
                  {cam.capture_url ? (
                    <Image
                      source={{ uri: cam.capture_url }}
                      style={styles.thumbnailImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Video size={32} color={colors.green[400]} />
                    </View>
                  )}
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>

                {/* Camera info */}
                <View style={styles.cameraInfo}>
                  <View style={styles.cameraHeader}>
                    <Text style={styles.cameraName} numberOfLines={1}>{cam.name}</Text>
                    <View style={styles.onlineBadge}>
                      <Wifi size={10} color={colors.green[600]} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                  </View>
                  <Text style={styles.cameraIp}>IP: {cam.ip}</Text>
                  <View style={styles.viewRow}>
                    <Eye size={14} color={colors.green[600]} />
                    <Text style={styles.viewLabel}>Xem trực tiếp</Text>
                    <ChevronRight size={14} color={colors.gray[400]} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Camera Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Camera size={20} color={colors.green[600]} />
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedCamera?.name || 'Camera'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCloseModal}>
              <X size={22} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Snapshot View */}
            <View style={styles.snapshotWrap}>
              {snapshotLoading ? (
                <View style={styles.snapshotPlaceholder}>
                  <ActivityIndicator size="large" color={colors.green[600]} />
                  <Text style={styles.snapshotLoadingText}>Đang tải hình ảnh...</Text>
                </View>
              ) : snapshotUri ? (
                <Image
                  source={{ uri: snapshotUri }}
                  style={styles.snapshotImage}
                  resizeMode="contain"
                  onError={() => setSnapshotUri(null)}
                />
              ) : (
                <View style={styles.snapshotPlaceholder}>
                  <Video size={56} color={colors.green[300]} />
                  <Text style={styles.snapshotPlaceholderText}>
                    {selectedCamera?.stream_url
                      ? 'Nhấn làm mới để xem hình ảnh'
                      : 'Không có hình ảnh'}
                  </Text>
                </View>
              )}
            </View>

            {/* Refresh snapshot button with countdown */}
            {selectedCamera?.capture_url && (
              <TouchableOpacity style={styles.refreshSnapshot} onPress={handleRefreshSnapshot}>
                <RefreshCw size={16} color={colors.green[600]} />
                <Text style={styles.refreshSnapshotText}>Làm mới ảnh chụp</Text>
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdown}s</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Camera details */}
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Thông tin camera</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tên</Text>
                <Text style={styles.detailValue}>{selectedCamera?.name}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Camera ID</Text>
                <Text style={styles.detailValue}>{selectedCamera?.cam_id}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Địa chỉ IP</Text>
                <Text style={styles.detailValue}>{selectedCamera?.ip}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stream URL</Text>
                <Text style={styles.detailValueMono} numberOfLines={2}>
                  {selectedCamera?.stream_url || '—'}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Capture URL</Text>
                <Text style={styles.detailValueMono} numberOfLines={2}>
                  {selectedCamera?.capture_url || '—'}
                </Text>
              </View>
            </View>

            {/* Status indicator */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Camera đang hoạt động bình thường</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.body, color: colors.gray[500] },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.heading3, color: colors.gray[900] },
  headerSub: { ...typography.bodySmall, color: colors.gray[500], marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.heading3, color: colors.gray[600] },
  emptySub: { ...typography.body, color: colors.gray[400], textAlign: 'center' },

  cameraList: { gap: spacing.md },
  cameraCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.green[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#0f1923',
    position: 'relative',
  },
  thumbnailImg: { width: '100%', height: '100%' },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1923',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  cameraInfo: { padding: spacing.md, gap: spacing.xs },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraName: { ...typography.label, color: colors.gray[900], flex: 1 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  onlineText: { fontSize: 11, color: colors.green[700], fontFamily: 'Inter_500Medium' },
  cameraIp: { ...typography.caption, color: colors.gray[400] },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  viewLabel: {
    ...typography.bodySmall,
    color: colors.green[600],
    flex: 1,
    fontFamily: 'Inter_500Medium',
  },

  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
    backgroundColor: colors.white,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  modalTitle: { ...typography.heading3, color: colors.gray[900], flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  snapshotWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#0f1923',
    height: 220,
  },
  snapshotImage: { width: '100%', height: '100%' },
  snapshotPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  snapshotLoadingText: { ...typography.body, color: colors.gray[400] },
  snapshotPlaceholderText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    textAlign: 'center',
  },

  refreshSnapshot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.green[500],
    alignSelf: 'center',
  },
  refreshSnapshotText: {
    ...typography.bodySmall,
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
  },
  countdownBadge: {
    backgroundColor: colors.green[100],
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  countdownText: {
    fontSize: 11,
    color: colors.green[700],
    fontFamily: 'Inter_700Bold',
  },

  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  detailTitle: {
    ...typography.label,
    color: colors.green[900],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: { ...typography.bodySmall, color: colors.gray[500], minWidth: 90 },
  detailValue: {
    ...typography.bodySmall,
    color: colors.gray[900],
    fontFamily: 'Inter_500Medium',
    flex: 1,
    textAlign: 'right',
  },
  detailValueMono: { fontSize: 11, color: colors.gray[700], flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.green[50] },

  statusCard: {
    backgroundColor: colors.green[50],
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.green[100],
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green[500],
  },
  statusText: { ...typography.bodySmall, color: colors.green[800] },
});
