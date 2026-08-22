import apiClient from './client';
import type { AlertDTO, AlertAnalyticsDTO, AlertProcessingLogDTO } from '../types/api';

export interface ProcessAlertPayload {
  alertId?: number;
  status: string; // 'RESOLVED' | 'PENDING' | 'IGNORED'
  comment: string;
  evidenceImageUrl?: string;
}

export const alertApi = {
  processAlert: async (data: ProcessAlertPayload): Promise<any> => {
    const response = await apiClient.post('/alerts/process', data);
    return response.data;
  },

  getAlertAnalytics: async (startDate: string, endDate: string): Promise<AlertAnalyticsDTO> => {
    const response = await apiClient.get('/analytics/alerts', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPendingAlerts: async (): Promise<AlertDTO[]> => {
    const response = await apiClient.get('/alerts/pending');
    return response.data;
  },

  getAllAlerts: async (): Promise<AlertDTO[]> => {
    const response = await apiClient.get('/alerts');
    return response.data;
  },

  getAlertsByStatus: async (status: string): Promise<AlertDTO[]> => {
    const response = await apiClient.get(`/alerts/status/${status}`);
    return response.data;
  },

  getAlertsByTree: async (treeId: number): Promise<AlertDTO[]> => {
    const response = await apiClient.get(`/alerts/tree/${treeId}`);
    return response.data;
  },

  getAlertsBySlot: async (slotId: number): Promise<AlertDTO[]> => {
    const response = await apiClient.get(`/alerts/slot/${slotId}`);
    return response.data;
  },

  getAlertProcessingLogs: async (alertId: number): Promise<AlertProcessingLogDTO[]> => {
    const response = await apiClient.get(`/alerts/${alertId}/logs`);
    return response.data;
  },
  escalateAlert: (alertId: number, escalateToUserId: number, reason: string) =>
    apiClient.post(`/alerts/${alertId}/escalate`, null, { params: { escalateToUserId, reason } }).then(r => r.data),
};

