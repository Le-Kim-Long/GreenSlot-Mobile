import apiClient from './client';
import type { GardeningTask, ServiceRequest, ServiceType } from '../types/api';

export const taskApi = {
  requestService: (data: ServiceRequest) =>
    apiClient.post('/services/request', data).then(r => r.data),

  getMyTasks: (): Promise<GardeningTask[]> =>
    apiClient.get('/tasks/my-tasks').then(r => r.data),

  updateTaskStatus: (taskId: number, status: string, evidenceImageUrl?: string) =>
    apiClient.put(`/tasks/${taskId}/status`, { status, evidenceImageUrl }).then(r => r.data),

  reportIssue: (taskId: number, data: { issueTitle: string; description: string }) =>
    apiClient.post(`/tasks/${taskId}/report-issue`, data).then(r => r.data),
};

export const managerApi = {
  getServiceTypes: (): Promise<ServiceType[]> =>
    apiClient.get('/manager/service-types').then(r => r.data),
};
