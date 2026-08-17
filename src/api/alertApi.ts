import apiClient from './client';
import type { AlertDTO, AlertAnalyticsDTO, AlertProcessingLogDTO } from '../types/api';

export interface ProcessAlertPayload {
  alertId?: number;
  status: string; // 'RESOLVED' | 'PENDING' | 'IGNORED' | 'ESCALATED'
  comment?: string;
  evidenceImageUrl?: string;
  actionsTaken?: string; // API Docs §7.2
  notes?: string; // API Docs §7.2
}

export const alertApi = {
  processAlert: async (data: ProcessAlertPayload): Promise<any> => {
    const response = await apiClient.post('/alerts/process', data);
    return response.data;
  },

  /** Escalates alert to location manager/manager — API Docs §7.3 */
  escalateAlert: async (alertId: number, escalateToUserId: number, reason: string): Promise<any> => {
    const response = await apiClient.post(`/alerts/${alertId}/escalate`, null, {
      params: { escalateToUserId, reason }
    });
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

  getAlertProcessingLogs: async (alertId: number): Promise<AlertProcessingLogDTO[]> => {
    const response = await apiClient.get(`/alerts/${alertId}/logs`);
    return response.data;
  },
};

