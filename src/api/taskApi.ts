import apiClient from './client';
import type {
  GardeningTaskResponseDTO,
  IssueReportRequestDTO,
  ServiceRequestDTO,
  ServiceTypeDTO,
  TaskAssignmentDTO,
  TaskStatusUpdateDTO,
} from '../types/api';

export const taskApi = {
  requestService: (data: ServiceRequestDTO): Promise<GardeningTaskResponseDTO> =>
    apiClient.post('/services/request', data).then(r => r.data),

  getAllTasks: (): Promise<GardeningTaskResponseDTO[]> =>
    apiClient.get('/tasks').then(r => r.data),

  createTask: (data: { taskName: string; description?: string; taskType: string; targetSlotId: number; evidenceImageUrl?: string }): Promise<GardeningTaskResponseDTO> =>
    apiClient.post('/tasks/create', data).then(r => r.data),

  assignTask: (taskId: number, staffId: number): Promise<GardeningTaskResponseDTO> =>
    apiClient.put(`/tasks/${taskId}/assign`, { staffId }).then(r => r.data),

  assignTaskLegacy: (data: TaskAssignmentDTO): Promise<GardeningTaskResponseDTO> =>
    apiClient.post('/tasks/assign', data).then(r => r.data),

  assignTaskByPath: (taskId: number, data: TaskAssignmentDTO): Promise<GardeningTaskResponseDTO> =>
    apiClient.patch(`/tasks/${taskId}/assign`, data).then(r => r.data),

  getMyTasks: (): Promise<GardeningTaskResponseDTO[]> =>
    apiClient.get('/tasks/my-tasks').then(r => r.data),

  updateTaskStatus: (taskId: number, dataOrStatus: TaskStatusUpdateDTO | string, evidenceImageUrl?: string): Promise<GardeningTaskResponseDTO> => {
    const payload: TaskStatusUpdateDTO = typeof dataOrStatus === 'string'
      ? { status: dataOrStatus, evidenceImageUrl }
      : dataOrStatus;
    return apiClient.patch(`/tasks/${taskId}/status`, payload).then(r => r.data);
  },

  reviewTask: (taskId: number, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }): Promise<GardeningTaskResponseDTO> =>
    apiClient.post(`/tasks/${taskId}/review`, data).then(r => r.data),

  reportIssue: (taskId: number, data: IssueReportRequestDTO): Promise<GardeningTaskResponseDTO> =>
    apiClient.post(`/tasks/${taskId}/report-issue`, data).then(r => r.data),

  uploadEvidenceImage: (file: any): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/images/upload/evidence', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(r => r.data.publicUrl);
  },
};

export const managerApi = {
  getServiceTypes: (): Promise<ServiceTypeDTO[]> =>
    apiClient.get('/manager/service-types').then(r =>
      (r.data as Array<Record<string, unknown>>).map(s => ({
        id:                s.id as number | undefined,
        name:              (s.serviceName ?? s.name) as string,
        description:       s.description as string | undefined,
        price:             Number(s.price),
        serviceCategoryId: (s.categoryId ?? s.serviceCategoryId) as number,
        serviceCategoryName: s.serviceCategoryName as string | undefined,
      } as ServiceTypeDTO))
    ),
};
