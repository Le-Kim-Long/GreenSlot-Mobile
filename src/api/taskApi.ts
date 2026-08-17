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

  /** Lấy danh sách tất cả các task — API Docs §4.1 */
  getAllTasks: (): Promise<GardeningTaskResponseDTO[]> =>
    apiClient.get('/tasks').then(r => r.data),

  /** Tạo task mới — API Docs §4.2 & Java Controller */
  createTask: (data: {
    taskName: string;
    description?: string;
    taskType: string;
    targetSlotId: number;
    scheduledDate: string;
    priority?: string;
  }): Promise<GardeningTaskResponseDTO> =>
    apiClient.post('/tasks/create', data).then(r => r.data),

  /** Manager duyệt/bác bỏ công việc hoàn thành của Staff */
  reviewTask: (taskId: number, data: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }): Promise<GardeningTaskResponseDTO> =>
    apiClient.post(`/tasks/${taskId}/review`, data).then(r => r.data),

  /** Customer xem danh sách yêu cầu dịch vụ đã gửi — API Docs §4 */
  getMyServiceRequests: (): Promise<GardeningTaskResponseDTO[]> =>
    apiClient.get('/customer/my-service-requests').then(r => r.data),

  /** Upload ảnh bằng chứng lên server */
  uploadEvidenceImage: async (uri: string): Promise<{ publicUrl: string }> => {
    const formData = new FormData();
    // Chế tạo cấu trúc Form File để upload lên React Native
    const filename = uri.split('/').pop() || 'evidence.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    return apiClient.post('/images/upload/evidence', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(r => r.data);
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
