import apiClient from './client';
import type {
  AuditLogDTO,
  GlobalContentDTO,
  UserAdminDTO,
  UserAuthorityUpdateDTO,
  UserStatusUpdateDTO,
} from '../types/api';

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export const adminApi = {
  getAllUsers: (page = 0, size = 20): Promise<PageResponse<UserAdminDTO>> =>
    apiClient.get('/admin/users', { params: { page, size } }).then(r => r.data),

  updateUserAuthorities: (id: number, data: UserAuthorityUpdateDTO): Promise<UserAdminDTO> =>
    apiClient.put(`/admin/users/${id}/authorities`, data).then(r => r.data),

  updateUserStatus: (id: number, data: UserStatusUpdateDTO): Promise<UserAdminDTO> =>
    apiClient.put(`/admin/users/${id}/status`, data).then(r => r.data),

  getAuditLogs: (startDate?: string, endDate?: string, page = 0, size = 20): Promise<PageResponse<AuditLogDTO>> =>
    apiClient.get('/admin/audit-logs', { params: { startDate, endDate, page, size } }).then(r => r.data),

  createGlobalContent: (data: GlobalContentDTO): Promise<GlobalContentDTO> =>
    apiClient.post('/admin/global-content', data).then(r => r.data),

  updateGlobalContent: (id: number, data: GlobalContentDTO): Promise<GlobalContentDTO> =>
    apiClient.put(`/admin/global-content/${id}`, data).then(r => r.data),

  getAllGlobalContent: (): Promise<GlobalContentDTO[]> =>
    apiClient.get('/admin/global-content').then(r => r.data),
};
