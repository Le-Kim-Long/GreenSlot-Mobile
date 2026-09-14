import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, RefreshCw, AlertCircle, Camera, Wifi, X, Eye, ChevronRight } from 'lucide-react-native';
import { cameraApi } from '../../api/cameraApi';
import type { CameraDTO } from '../../api/cameraApi';
import { colors } from '../../theme/colors';
import { spacing, radius, typography } from '../../theme/typography';

const { width } = Dimensions.get('window');

export default function CameraDashboardScreen() {
  const [cameras, setCameras] = useState<CameraDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCamera, setSelectedCamera] = useState<CameraDTO | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCameras = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await cameraApi.getActiveCameras();
      setCameras(list || []);
    } catch (err) {
      setError('Không thể lấy danh sách camera. Vui lòng kiểm tra backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
    // Tự động làm mới khung hình camera sau mỗi 2 giây (2000ms)
    intervalRef.current = setInterval(() => {
      setTick(Date.now());
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const refreshModalSnapshot = useCallback((captureUrl: string, initial = false) => {
    if (initial) setSnapshotLoading(true);
    const separator = captureUrl.includes('?') ? '&' : '?';
    setSnapshotUri(`${captureUrl}${separator}t=${Date.now()}`);
    if (initial) {
      setTimeout(() => setSnapshotLoading(false), 250);
    }
  }, []);

  const handleViewCamera = (cam: CameraDTO) => {
    setSelectedCamera(cam);
    setModalVisible(true);
    if (cam.capture_url) {
      refreshModalSnapshot(cam.capture_url, true);
      if (modalIntervalRef.current) clearInterval(modalIntervalRef.current);
      modalIntervalRef.current = setInterval(() => {
        refreshModalSnapshot(cam.capture_url, false);
      }, 2000);
    } else if (cam.stream_url) {
      setSnapshotUri(cam.stream_url);
    } else {
      setSnapshotUri(null);
    }
  };

  const handleCloseModal = () => {
    if (modalIntervalRef.current) {
      clearInterval(modalIntervalRef.current);
      modalIntervalRef.current = null;
    }
    setModalVisible(false);
    setSelectedCamera(null);
    setSnapshotUri(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header controls */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hệ thống Camera IoT</Text>
          <Text style={styles.subtitle}>
            {cameras.length > 0 ? `${cameras.length} camera đang hoạt động` : 'Giám sát trực tuyến các khu vực vườn'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchCameras} disabled={isLoading}>
          <RefreshCw size={18} color={colors.green[700]} style={isLoading && styles.spinning} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading && cameras.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loaderText}>Đang quét tìm kiếm camera trong mạng...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {cameras.length === 0 ? (
            <View style={styles.emptyState}>
              <Video size={48} color={colors.gray[300]} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Chưa có Camera nào kết nối</Text>
              <Text style={styles.emptySub}>
                Hãy đảm bảo mạch ESP32-CAM đã được cấp nguồn và kết nối cùng mạng LAN của hệ thống.
              </Text>
            </View>
          ) : (
            cameras.map((cam) => {
              const previewUrl = cam.capture_url
                ? `${cam.capture_url}${cam.capture_url.includes('?') ? '&' : '?'}t=${tick}`
                : cam.stream_url;

              return (
                <TouchableOpacity
                  key={cam.cam_id}
                  style={styles.camCard}
                  activeOpacity={0.88}
                  onPress={() => handleViewCamera(cam)}
                >
                  {/* Cam Header */}
                  <View style={styles.camHeader}>
                    <View style={styles.camTitleBox}>
                      <View style={styles.liveIndicator} />
                      <Text style={styles.camName}>{cam.name}</Text>
                    </View>
                    <View style={styles.onlineBadge}>
                      <Wifi size={10} color={colors.green[600]} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                  </View>

                  {/* Stream/Capture Box with LIVE badge */}
                  <View style={styles.streamBox}>
                    {previewUrl ? (
                      <Image
                        source={{ uri: previewUrl }}
                        style={styles.streamImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noStream}>
                        <Video size={36} color={colors.gray[400]} />
                        <Text style={{ color: colors.gray[400], marginTop: 8, fontSize: 12 }}>
                          Không có luồng video
                        </Text>
                      </View>
                    )}

                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>

                  {/* Footer Controls (No manual button, clean FE-style) */}
                  <View style={styles.camFooter}>
                    <Text style={styles.camIpText}>IP: {cam.ip}</Text>
                    <View style={styles.viewRow}>
                      <Eye size={13} color={colors.green[600]} />
                      <Text style={styles.viewText}>Xem trực tiếp</Text>
                      <ChevronRight size={14} color={colors.green[600]} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Camera Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalSafe}>
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
            {/* Modal Live Stream Container */}
            <View style={styles.modalStreamWrap}>
              {snapshotLoading ? (
                <View style={styles.modalPlaceholder}>
                  <ActivityIndicator size="large" color={colors.green[600]} />
                  <Text style={styles.modalLoadingText}>Đang tải luồng camera...</Text>
                </View>
              ) : snapshotUri ? (
                <View style={styles.modalStreamContainer}>
                  <Image
                    source={{ uri: snapshotUri }}
                    style={styles.modalImage}
                    resizeMode="contain"
                    onError={() => setSnapshotUri(null)}
                  />
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.modalPlaceholder}>
                  <Video size={48} color={colors.green[300]} />
                  <Text style={styles.modalPlaceholderText}>
                    {selectedCamera?.capture_url ? 'Đang kết nối...' : 'Không có hình ảnh'}
                  </Text>
                </View>
              )}
            </View>

            {/* Details Card */}
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
                <Text style={styles.detailLabel}>Capture URL</Text>
                <Text style={styles.detailValueMono} numberOfLines={2}>
                  {selectedCamera?.capture_url || '—'}
                </Text>
              </View>
            </View>

            {/* Live Status indicator */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Camera đang hoạt động (Tự động chụp 2s/lần)</Text>
              </View>
            </View>
          </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.green[100],
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.green[50],
  },
  spinning: {
    opacity: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fca5a5',
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loaderText: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 8,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray[800],
  },
  emptySub: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  camCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.green[100],
    marginBottom: spacing.md,
  },
  camHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  camTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  camName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[900],
  },
  camIp: {
    fontSize: 11,
    color: colors.gray[400],
    fontFamily: 'space-mono',
  },
  streamBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamImage: {
    width: '100%',
    height: '100%',
  },
  noStream: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  camFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  camIpText: {
    fontSize: 11,
    color: colors.gray[400],
    fontFamily: 'Inter_400Regular',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    fontSize: 12,
    color: colors.green[600],
    fontFamily: 'Inter_600SemiBold',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  onlineText: {
    fontSize: 11,
    color: colors.green[700],
    fontFamily: 'Inter_500Medium',
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
  modalStreamWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#0f1923',
    height: 230,
  },
  modalStreamContainer: { width: '100%', height: '100%', position: 'relative' },
  modalImage: { width: '100%', height: '100%' },
  modalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  modalLoadingText: { ...typography.body, color: colors.gray[400] },
  modalPlaceholderText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    textAlign: 'center',
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
