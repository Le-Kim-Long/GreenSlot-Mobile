import apiClient from './client';
import type { TreeDTO, TreePlantingRequestCreateDTO, TreePlantingRequestDTO } from '../types/api';

export const treeApi = {
  getAllTrees: (): Promise<TreeDTO[]> =>
    apiClient.get('/trees').then(r => r.data),

  getActiveTrees: (): Promise<TreeDTO[]> =>
    apiClient.get('/trees/active').then(r => r.data),

  getTreeById: (id: number): Promise<TreeDTO> =>
    apiClient.get(`/trees/${id}`).then(r => r.data),

  createTree: (data: TreeDTO): Promise<TreeDTO> =>
    apiClient.post('/trees', data).then(r => r.data),

  updateTree: (id: number, data: TreeDTO): Promise<TreeDTO> =>
    apiClient.put(`/trees/${id}`, data).then(r => r.data),

  deleteTree: (id: number): Promise<void> =>
    apiClient.delete(`/trees/${id}`).then(r => r.data),
};

export const treePlantingApi = {
  getAllRequests: (): Promise<TreePlantingRequestDTO[]> =>
    apiClient.get('/tree-planting').then(r => r.data),

  getRequestById: (id: number): Promise<TreePlantingRequestDTO> =>
    apiClient.get(`/tree-planting/${id}`).then(r => r.data),

  getMyRequests: (): Promise<TreePlantingRequestDTO[]> =>
    apiClient.get('/tree-planting/my-requests').then(r => r.data),

  getPendingRequests: (): Promise<TreePlantingRequestDTO[]> =>
    apiClient.get('/tree-planting/pending').then(r => r.data),

  createRequest: (data: TreePlantingRequestCreateDTO): Promise<TreePlantingRequestDTO> =>
    apiClient.post('/tree-planting', data).then(r => r.data),

  approveRequest: (id: number): Promise<TreePlantingRequestDTO> =>
    apiClient.post(`/tree-planting/${id}/approve`).then(r => r.data),

  rejectRequest: (id: number, reason?: string): Promise<TreePlantingRequestDTO> =>
    apiClient.post(`/tree-planting/${id}/reject`, reason, { headers: { 'Content-Type': 'text/plain' } }).then(r => r.data),

  completeRequest: (id: number): Promise<TreePlantingRequestDTO> =>
    apiClient.post(`/tree-planting/${id}/complete`).then(r => r.data),

  /** Lấy tất cả yêu cầu cho Staff/Manager — API Docs §3.3 */
  getAllRequestsForStaff: (): Promise<TreePlantingRequestDTO[]> =>
    apiClient.get('/tree-planting/requests').then(r => r.data),

  /** Xử lý yêu cầu duyệt trồng cây — API Docs §3.4 */
  processRequest: (data: { requestId: number; status: 'APPROVED' | 'REJECTED'; processNotes?: string }): Promise<TreePlantingRequestDTO> =>
    apiClient.post('/tree-planting/process', data).then(r => r.data),
};
