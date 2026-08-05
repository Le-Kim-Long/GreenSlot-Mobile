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

  assignTask: (data: TaskAssignmentDTO): Promise<GardeningTaskResponseDTO> =>
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

  reportIssue: (taskId: number, data: IssueReportRequestDTO): Promise<GardeningTaskResponseDTO> =>
    apiClient.post(`/tasks/${taskId}/report-issue`, data).then(r => r.data),
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
