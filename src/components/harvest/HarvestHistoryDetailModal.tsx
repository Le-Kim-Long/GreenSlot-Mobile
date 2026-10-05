import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {
  X,
  Sprout,
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  FileText,
  Layers,
  ZoomIn,
} from 'lucide-react-native';
import type { HarvestHistoryItem } from '../../types/api';
import { colors } from '../../theme/colors';
import { typography, spacing, radius } from '../../theme/typography';

interface HarvestHistoryDetailModalProps {
  visible: boolean;
  item: HarvestHistoryItem | null;
  onClose: () => void;
}

export function HarvestHistoryDetailModal({
  visible,
  item,
  onClose,
}: HarvestHistoryDetailModalProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  if (!item) return null;

  const images = item.evidenceImageUrl
    ? item.evidenceImageUrl.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const daysGrown = item.daysGrown ?? 0;
  const harvestDays = item.harvestDays ?? 0;
  const growthPercent =
    harvestDays > 0 ? Math.min(100, Math.round((daysGrown / harvestDays) * 100)) : 100;

  const isSelf = item.harvestMethod === 'SELF';

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    item.isEarlyHarvest ? styles.iconCircleAmber : styles.iconCircleGreen,
                  ]}
                >
                  <Sprout
                    size={20}
                    color={item.isEarlyHarvest ? '#d97706' : colors.green[700]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.headerTitle}>Đợt thu hoạch #{item.id}</Text>
                    {item.isEarlyHarvest ? (
                      <View style={styles.earlyHarvestBadge}>
                        <Text style={styles.earlyHarvestText}>Thu hoạch sớm</Text>
                      </View>
                    ) : (
                      <View style={styles.normalHarvestBadge}>
                        <Text style={styles.normalHarvestText}>✓ Đúng chu kỳ</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.headerSubtitle}>
                    {new Date(item.harvestedAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Thông tin Cây trồng & Vị trí */}
              <View style={styles.sectionCard}>
                <View style={styles.gridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Giống rau thu hoạch</Text>
                    <View style={styles.labelValRow}>
                      <Sprout size={16} color={colors.green[700]} />
                      <Text style={styles.treeTitle}>{item.treeName || 'Rau sạch GreenSlot'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.gridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Vị trí ô đất & Cơ sở</Text>
                    <View style={styles.labelValRow}>
                      <MapPin size={15} color="#d97706" />
                      <Text style={styles.slotLocationText}>
                        Ô {item.slotNumber || 'N/A'}{' '}
                        {item.locationName ? `· ${item.locationName}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.pillarCodes && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
                    <Text style={styles.sectionLabel}>Trụ thu hoạch</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {item.pillarCodes
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((pCode, idx) => (
                          <View key={idx} style={styles.pillarBadge}>
                            <Layers size={12} color={colors.green[700]} />
                            <Text style={styles.pillarBadgeText}>
                              Trụ {pCode}
                              {item.pillarHarvestCount
                                ? ` (Lần ${item.pillarHarvestCount})`
                                : ''}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 2. Chu kỳ sinh trưởng */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Clock size={16} color="#2563eb" />
                  <Text style={styles.sectionHeading}>Chu kỳ sinh trưởng</Text>
                </View>

                <View style={styles.growthGrid}>
                  <View style={styles.growthCol}>
                    <Text style={styles.growthLabel}>Ngày gieo</Text>
                    <View style={styles.growthValRow}>
                      <Calendar size={13} color={colors.gray[400]} />
                      <Text style={styles.growthVal}>
                        {item.plantedAt
                          ? new Date(item.plantedAt).toLocaleDateString('vi-VN')
                          : '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.growthCol}>
                    <Text style={styles.growthLabel}>Ngày thu hoạch</Text>
                    <View style={styles.growthValRow}>
                      <Calendar size={13} color={colors.green[600]} />
                      <Text style={[styles.growthVal, { color: colors.green[800] }]}>
                        {new Date(item.harvestedAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.growthCol}>
                    <Text style={styles.growthLabel}>Thời gian nuôi</Text>
                    <Text style={[styles.growthVal, { color: colors.gray[900] }]}>
                      {item.daysGrown != null ? `${item.daysGrown} ngày` : '—'}
                      {item.harvestDays ? ` / chuẩn ${item.harvestDays} ngày` : ''}
                    </Text>
                  </View>
                </View>

                {item.harvestDays ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Tiến độ chu kỳ:</Text>
                      <Text style={styles.progressPercent}>{growthPercent}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${growthPercent}%` as any,
                            backgroundColor: item.isEarlyHarvest ? '#f59e0b' : colors.green[600],
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              {/* 3. Hình thức thu hoạch & Người thực hiện (Xuống hàng riêng biệt) */}
              <View style={styles.sectionCard}>
                <View style={{ marginBottom: (!isSelf && item.staffName) ? 12 : 0 }}>
                  <Text style={styles.sectionLabel}>Hình thức thu hoạch</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View
                      style={[
                        styles.methodBadgeLarge,
                        isSelf ? styles.selfBadgeLarge : styles.staffBadgeLarge,
                      ]}
                    >
                      <CheckCircle2
                        size={15}
                        color={isSelf ? colors.green[700] : '#1d4ed8'}
                      />
                      <Text
                        style={[
                          styles.methodBadgeLargeText,
                          isSelf ? styles.selfTextLarge : styles.staffTextLarge,
                        ]}
                      >
                        {isSelf ? 'Khách hàng tự thu hoạch' : 'Nhân viên hỗ trợ thu hoạch'}
                      </Text>
                    </View>
                  </View>
                </View>

                {!isSelf && item.staffName && (
                  <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
                    <Text style={styles.sectionLabel}>Nhân viên phụ trách</Text>
                    <View style={[styles.staffNameRow, { marginTop: 6 }]}>
                      <View style={styles.staffAvatarCircle}>
                        <User size={13} color="#2563eb" />
                      </View>
                      <Text style={styles.staffNameText}>{item.staffName}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 4. Ghi chú / Dặn dò */}
              {item.staffNotes ? (
                <View style={styles.notesCard}>
                  <View style={styles.notesHeader}>
                    <FileText size={15} color="#b45309" />
                    <Text style={styles.notesTitle}>Ghi chú đợt thu hoạch</Text>
                  </View>
                  <Text style={styles.notesContent}>{item.staffNotes}</Text>
                </View>
              ) : null}

              {/* 5. Ảnh bằng chứng / Nghiệm thu */}
              {images.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <ZoomIn size={16} color={colors.gray[700]} />
                    <Text style={styles.sectionHeading}>Ảnh nghiệm thu thực tế</Text>
                  </View>

                  <View style={styles.evidenceGrid}>
                    {images.map((imgUrl, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.imageThumbnailWrapper}
                        onPress={() => setZoomImage(imgUrl)}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.imageThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.zoomHintBadge}>
                          <Text style={styles.zoomHintText}>Phóng to</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.btnCloseModal} onPress={onClose}>
                <Text style={styles.btnCloseModalText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal phóng to ảnh */}
      {zoomImage && (
        <Modal
          visible={!!zoomImage}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomImage(null)}
        >
          <View style={styles.zoomOverlay}>
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setZoomImage(null)}
            >
              <Text style={styles.zoomCloseText}>✕ Đóng</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: zoomImage }}
              style={styles.zoomFullImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '92%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    backgroundColor: colors.green[50],
  },
  iconCircleAmber: {
    backgroundColor: '#fef3c7',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
    marginTop: 2,
  },
  earlyHarvestBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  earlyHarvestText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  normalHarvestBadge: {
    backgroundColor: colors.green[50],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.green[200],
  },
  normalHarvestText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: colors.green[800],
  },
  closeBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.gray[500],
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  treeTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[900],
  },
  slotLocationText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[800],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.xs,
  },
  pillarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pillarBadgeText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green[800],
  },
  growthGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: 4,
  },
  growthCol: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  growthLabel: {
    fontSize: 10.5,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  growthValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  growthVal: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
  },
  progressContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.gray[500],
  },
  progressPercent: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    color: colors.gray[800],
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  methodInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  methodBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  selfBadgeLarge: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[200],
  },
  staffBadgeLarge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  methodBadgeLargeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  selfTextLarge: {
    color: colors.green[800],
  },
  staffTextLarge: {
    color: '#1d4ed8',
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  staffNameText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[900],
  },
  notesCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesTitle: {
    fontSize: 12.5,
    fontFamily: 'Inter_700Bold',
    color: '#92400e',
  },
  notesContent: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#78350f',
    lineHeight: 18,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  imageThumbnailWrapper: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  zoomHintText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  btnCloseModal: {
    backgroundColor: colors.gray[100],
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseModalText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.gray[700],
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    zIndex: 10,
  },
  zoomCloseText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  zoomFullImage: {
    width: '100%',
    height: '80%',
  },
});
