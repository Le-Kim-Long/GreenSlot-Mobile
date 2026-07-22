import apiClient from './client';
import type { DashboardMetricsDTO, RevenueAnalyticsResponseDTO } from '../types/api';

export const dashboardApi = {
  getMetrics: (locationId: number): Promise<DashboardMetricsDTO> =>
    apiClient.get(`/dashboard/metrics/${locationId}`).then(r => r.data),

  getLocationRevenue: (locationId: number, startDate: string, endDate: string): Promise<RevenueAnalyticsResponseDTO> =>
    apiClient.get(`/dashboard/metrics/${locationId}/revenue`, { params: { startDate, endDate } }).then(r => r.data),
};
