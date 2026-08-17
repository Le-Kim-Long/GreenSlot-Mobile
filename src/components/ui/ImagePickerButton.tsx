import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

interface Props {
  label?: string;
  initialUrl?: string;
  onImageSelected: (url: string) => void;
  onImageCleared?: () => void;
  uploadFn: (uri: string) => Promise<{ publicUrl: string } | string>;
}

export function ImagePickerButton({
  label = 'Ảnh bằng chứng',
  initialUrl,
  onImageSelected,
  onImageCleared,
  uploadFn,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialUrl);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Quyền truy cập',
        'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để chọn ảnh bằng chứng.'
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        await uploadImage(localUri);
      }
    } catch (err) {
      console.warn('Lỗi chọn ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền sử dụng camera để chụp ảnh.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        await uploadImage(localUri);
      }
    } catch (err) {
      console.warn('Lỗi chụp ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chụp ảnh từ camera.');
    }
  };

  const uploadImage = async (uri: string) => {
    setLoading(true);
    try {
      const res = await uploadFn(uri);
      const url = typeof res === 'string' ? res : res.publicUrl;
      setImageUrl(url);
      onImageSelected(url);
    } catch (err) {
      console.warn('Lỗi tải ảnh lên:', err);
      Alert.alert('Thất bại', 'Không thể tải ảnh lên máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    if (onImageCleared) onImageCleared();
    onImageSelected('');
  };

  const handleSelectOption = () => {
    Alert.alert(
      'Chọn ảnh bằng chứng',
      'Vui lòng chọn phương thức tải ảnh',
      [
        { text: 'Chụp ảnh mới', onPress: handleTakePhoto },
        { text: 'Chọn từ thư viện', onPress: handlePickImage },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {loading ? (
        <View style={styles.previewContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
          <Text style={styles.loadingText}>Đang tải ảnh lên máy chủ...</Text>
        </View>
      ) : imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleRemoveImage}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickerBox}
          onPress={handleSelectOption}
          activeOpacity={0.7}
        >
          <Camera size={28} color={colors.green[600]} style={{ marginBottom: spacing.xs }} />
          <Text style={styles.pickerText}>Chụp ảnh hoặc tải lên bằng chứng</Text>
          <Text style={styles.pickerSub}>Định dạng hỗ trợ: JPG, PNG</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
  },
  label: {
    ...typography.bodySmall,
    color: colors.gray[700],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  pickerBox: {
    borderWidth: 2,
    borderColor: colors.green[200],
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  pickerText: {
    ...typography.label,
    color: colors.green[800],
  },
  pickerSub: {
    ...typography.caption,
    color: colors.gray[400],
    marginTop: 2,
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.sm,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  image: {
    width: '100%',
    height: 180,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
