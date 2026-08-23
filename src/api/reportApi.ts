import apiClient from './client';

export type ReportFormat = 'csv' | 'excel';

export const reportApi = {
  rentals: (format: ReportFormat, params?: Record<string, string>) => apiClient.get(`/reports/rentals/${format}`, { params, responseType: 'blob' }).then(r => r.data),
  alerts: (format: ReportFormat, params?: Record<string, string>) => apiClient.get(`/reports/alerts/${format}`, { params, responseType: 'blob' }).then(r => r.data),
  tasks: (format: ReportFormat, params?: Record<string, string>) => apiClient.get(`/reports/tasks/${format}`, { params, responseType: 'blob' }).then(r => r.data),
};
