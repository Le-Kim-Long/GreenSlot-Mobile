import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  RefreshCw,
  X,
  Video,
  Wifi,
  WifiOff,
  Eye,
  Maximize2,
  ChevronLeft,
  Info,
} from 'lucide-react-native';
import { cameraApi } from '../../api/cameraApi';
import type { CameraDTO } from '../../api/cameraApi';
import CameraStreamPlayer from '../../components/common/CameraStreamPlayer';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const [cameras, setCameras] = useState<CameraDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraDTO | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

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

  const handleOpenDetail = (camera: CameraDTO) => {
    setSelectedCamera(camera);
    setDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setFullscreenVisible(false);
    setSelectedCamera(null);
  };

  const handleOpenFullscreen = () => {
    setFullscreenVisible(true);
  };

  const handleCloseFullscreen = () => {
    setFullscreenVisible(false);
  };

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
                onPress={() => handleOpenDetail(cam)}
              >
                {/* Left: icon + info */}
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconBox}>
                    <Camera size={22} color={colors.green[600]} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cameraName} numberOfLines={1}>{cam.name}</Text>
                    <Text style={styles.cameraIp}>IP: {cam.ip}</Text>
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>
                </View>

                {/* Right: badge + button */}
                <View style={styles.cardRight}>
                  <View style={styles.onlineBadge}>
                    <Wifi size={10} color={colors.green[600]} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                  <View style={styles.viewBtn}>
                    <Eye size={14} color={colors.white} />
                    <Text style={styles.viewBtnText}>Xem</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={handleCloseDetail}>
        <SafeAreaView style={styles.modalSafe}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={handleCloseDetail} activeOpacity={0.8}>
              <ChevronLeft size={22} color={colors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedCamera?.name || 'Camera'}
              </Text>
              <Text style={styles.modalSub}>IP: {selectedCamera?.ip}</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleCloseDetail} activeOpacity={0.8}>
              <X size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Stream Player */}
          <View style={styles.streamBox}>
            {selectedCamera?.stream_url ? (
              <CameraStreamPlayer
                streamUrl={selectedCamera.stream_url}
                resizeMode="contain"
                style={styles.streamPlayer}
              />
            ) : (
              <View style={styles.noStreamBox}>
                <WifiOff size={48} color={colors.gray[500]} />
                <Text style={styles.noStreamText}>
                  {selectedCamera?.stream_url
                    ? 'Đang kết nối...'
                    : 'Camera này không hỗ trợ xem trực tiếp'}
                </Text>
              </View>
            )}
            {/* Live badge overlay */}
            <View style={styles.streamLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            {/* Fullscreen button */}
            {selectedCamera?.stream_url && (
              <TouchableOpacity
                style={styles.fullscreenOverlayBtn}
                onPress={handleOpenFullscreen}
                activeOpacity={0.85}
              >
                <Maximize2 size={18} color={colors.white} />
                <Text style={styles.fullscreenOverlayText}>Phóng to toàn màn hình</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Camera Info */}
          <ScrollView contentContainerStyle={styles.detailContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Info size={15} color={colors.green[700]} />
                <Text style={styles.infoCardTitle}>Thông tin camera</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên camera</Text>
                <Text style={styles.infoValue}>{selectedCamera?.name}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Camera ID</Text>
                <Text style={styles.infoValue}>{selectedCamera?.cam_id}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ IP</Text>
                <Text style={styles.infoValue}>{selectedCamera?.ip}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stream URL</Text>
                <Text style={[styles.infoValue, styles.infoValueMono]} numberOfLines={2}>
                  {selectedCamera?.stream_url || '—'}
                </Text>
              </View>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Camera đang hoạt động và phát trực tiếp ổn định</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Fullscreen Modal ── */}
      <Modal visible={fullscreenVisible} animationType="fade" onRequestClose={handleCloseFullscreen}>
        <View style={styles.fullscreenContainer}>
          <SafeAreaView style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={handleCloseFullscreen}
              activeOpacity={0.8}
            >
              <X size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>{selectedCamera?.name}</Text>
          </SafeAreaView>
          {selectedCamera?.stream_url && (
            <CameraStreamPlayer
              streamUrl={selectedCamera.stream_url}
              style={styles.fullscreenPlayer}
            />
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.green[100],
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  cameraName: { ...typography.label, color: colors.gray[900] },
  cameraIp: { ...typography.caption, color: colors.gray[400] },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(220,38,38,0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
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
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.green[600],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },

  // Detail Modal
  modalSafe: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  streamBox: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  streamPlayer: { width: '100%', height: '100%' },
  noStreamBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noStreamText: { fontSize: 13, color: '#64748b', textAlign: 'center', paddingHorizontal: 24 },
  streamLiveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220,38,38,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullscreenOverlayBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fullscreenOverlayText: { fontSize: 12, fontWeight: '700', color: colors.white },

  detailContent: { padding: 16, gap: 12 },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoCardTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  infoLabel: { fontSize: 12, color: '#64748b', minWidth: 90 },
  infoValue: { fontSize: 12, color: '#e2e8f0', fontWeight: '600', flex: 1, textAlign: 'right' },
  infoValueMono: { fontWeight: '400', fontSize: 11, color: '#94a3b8' },
  infoDivider: { height: 1, backgroundColor: '#334155' },

  statusCard: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#166534',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  statusText: { fontSize: 12, color: '#86efac', fontWeight: '600', flex: 1 },

  // Fullscreen Modal
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  fullscreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.white },
  fullscreenPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
});
