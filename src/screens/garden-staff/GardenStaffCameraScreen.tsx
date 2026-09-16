import React, { useState, useEffect, useCallback } from 'react';
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
import { cameraApi, type CameraDTO } from '../../api/cameraApi';
import CameraStreamPlayer from '../../components/common/CameraStreamPlayer';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GardenStaffCameraScreen() {
  const [cameras, setCameras] = useState<CameraDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraDTO | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const loadCameras = useCallback(async () => {
    try {
      const data = await cameraApi.getActiveCameras();
      setCameras(data || []);
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

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Hệ thống Camera Vườn</Text>
          <Text style={styles.headerSub}>
            {cameras.length > 0
              ? `${cameras.length} camera đang hoạt động`
              : 'Giám sát trực tiếp các khu vực canh tác'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.8}>
          <RefreshCw size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.green[600]} />
        }
      >
        {cameras.length === 0 ? (
          <EmptyState
            title="Không có camera khả dụng"
            subtitle="Hiện tại không tìm thấy thiết bị camera đang hoạt động tại cơ sở vườn."
          />
        ) : (
          cameras.map(camera => (
            <TouchableOpacity
              key={camera.cam_id}
              style={styles.cameraCard}
              activeOpacity={0.85}
              onPress={() => handleOpenDetail(camera)}
            >
              {/* Card content: icon + info + arrow */}
              <View style={styles.cardLeft}>
                <View style={styles.iconBox}>
                  <Camera size={22} color={colors.green[600]} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cameraName} numberOfLines={1}>{camera.name}</Text>
                  <Text style={styles.cameraIp}>IP: {camera.ip}</Text>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardRight}>
                <View style={styles.onlineBadge}>
                  <Wifi size={12} color={colors.green[700]} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
                <View style={styles.viewBtn}>
                  <Eye size={14} color={colors.white} />
                  <Text style={styles.viewBtnText}>Xem</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── Detail Modal ── */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={handleCloseDetail}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={handleCloseDetail} activeOpacity={0.8}>
              <ChevronLeft size={22} color={colors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedCamera?.name}</Text>
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
                style={styles.streamPlayer}
              />
            ) : (
              <View style={styles.noStreamBox}>
                <WifiOff size={48} color={colors.gray[500]} />
                <Text style={styles.noStreamText}>Chưa có luồng stream trực tiếp</Text>
              </View>
            )}
            {/* Live badge overlay */}
            <View style={styles.streamLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            {/* Fullscreen button overlay */}
            {selectedCamera?.stream_url && (
              <TouchableOpacity
                style={styles.fullscreenBtn}
                onPress={handleOpenFullscreen}
                activeOpacity={0.85}
              >
                <Maximize2 size={18} color={colors.white} />
                <Text style={styles.fullscreenBtnText}>Phóng to toàn màn hình</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Camera Info Card */}
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
          <SafeAreaView style={styles.fullscreenSafe}>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.green[600],
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  refreshBtn: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  content: { padding: spacing.md, paddingBottom: 32, gap: 12 },

  // Camera list card
  cameraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.green[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  cameraName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cameraIp: { fontSize: 11, color: '#64748b' },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(220,38,38,0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#dc2626', letterSpacing: 0.5 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  onlineText: { fontSize: 11, fontWeight: '700', color: colors.green[700] },
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
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
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
  noStreamText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
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
  fullscreenBtn: {
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
  fullscreenBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },

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
  fullscreenSafe: {
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
