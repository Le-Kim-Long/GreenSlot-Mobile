import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, RefreshCw, AlertCircle, Camera, Play } from 'lucide-react-native';
import { cameraApi } from '../../api/cameraApi';
import type { CameraDTO } from '../../api/cameraApi';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/typography';

const { width } = Dimensions.get('window');

export default function CameraDashboardScreen() {
  const [cameras, setCameras] = useState<CameraDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // Poll cameras status every 30 seconds
    const interval = setInterval(fetchCameras, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCapture = (cam: CameraDTO) => {
    Alert.alert('Chụp ảnh', `Đang chụp ảnh từ ${cam.name}. Đường dẫn: ${cam.capture_url}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header controls */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hệ thống Camera IoT</Text>
          <Text style={styles.subtitle}>Giám sát trực tuyến các khu vực vườn</Text>
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
            cameras.map((cam) => (
              <View key={cam.cam_id} style={styles.camCard}>
                {/* Cam Header */}
                <View style={styles.camHeader}>
                  <View style={styles.camTitleBox}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.camName}>{cam.name}</Text>
                  </View>
                  <Text style={styles.camIp}>{cam.ip}</Text>
                </View>

                {/* Stream Box */}
                <View style={styles.streamBox}>
                  {cam.stream_url ? (
                    <Image
                      source={{ uri: cam.stream_url }}
                      style={styles.streamImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noStream}>
                      <Play size={32} color={colors.gray[400]} />
                      <Text style={{ color: colors.gray[500], marginTop: 8 }}>Không có luồng video</Text>
                    </View>
                  )}
                </View>

                {/* Footer Controls */}
                <View style={styles.camFooter}>
                  <Text style={styles.camIdText}>ID: {cam.cam_id}</Text>
                  <TouchableOpacity style={styles.captureBtn} onPress={() => handleCapture(cam)}>
                    <Camera size={16} color={colors.white} />
                    <Text style={styles.captureText}>Chụp ảnh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  camIdText: {
    fontSize: 12,
    color: colors.gray[500],
    fontWeight: '500',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  captureText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
