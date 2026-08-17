import AsyncStorage from '@react-native-async-storage/async-storage';

const SLOT_CACHE_KEY = 'greenslot_slot_id_cache';

// In-memory cache to allow synchronous access after init
let _cache: Record<string, number> = {};

/** Gọi khi app khởi động để load cache từ AsyncStorage vào RAM. */
export async function initSlotCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SLOT_CACHE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
}

async function persistCache(): Promise<void> {
  try {
    await AsyncStorage.setItem(SLOT_CACHE_KEY, JSON.stringify(_cache));
  } catch {
    // Bỏ qua lỗi ghi cache
  }
}

/** Lưu mapping slotNumber → slotId khi user đặt thuê ô vườn. */
export function cacheSlotId(slotNumber: string, slotId: number): void {
  _cache[slotNumber] = slotId;
  persistCache();
}

/** Lưu mapping rentalId → slotId để giải quyết qua lịch sử thuê. */
export function cacheSlotForRental(rentalId: number, slotId: number): void {
  _cache[`rental:${rentalId}`] = slotId;
  persistCache();
}

/** Lấy slotId từ cache theo slotNumber hoặc rentalId. */
export function resolveSlotId(slotNumber: string, rentalId?: number): number | undefined {
  if (_cache[slotNumber]) return _cache[slotNumber];
  if (rentalId && _cache[`rental:${rentalId}`]) return _cache[`rental:${rentalId}`];
  return undefined;
}

export function getCachedSlotId(slotNumber: string): number | undefined {
  return _cache[slotNumber];
}
