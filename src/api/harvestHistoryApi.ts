import apiClient from './client';
import type { HarvestHistoryItem } from '../types/api';

export const harvestHistoryApi = {
  // Khách hàng xem lịch sử thu hoạch của chính mình
  getMyHistory: (): Promise<HarvestHistoryItem[]> =>
    apiClient.get<HarvestHistoryItem[]>('/harvest-history/my').then(r => r.data),

  // Quản lý/staff xem lịch sử thu hoạch
  getManagerHistory: (): Promise<HarvestHistoryItem[]> =>
    apiClient.get<HarvestHistoryItem[]>('/harvest-history').then(r => r.data),
};
