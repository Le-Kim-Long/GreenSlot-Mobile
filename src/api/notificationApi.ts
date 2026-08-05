import apiClient from './client';
import type { NotificationResponseDTO } from '../types/api';

export const notificationApi = {
  registerDeviceToken: (deviceToken: string): Promise<string> =>
    apiClient.post('/device-token/register', { deviceToken }).then(r => r.data),

  unregisterDeviceToken: (): Promise<string> =>
    apiClient.delete('/device-token/unregister').then(r => r.data),

  getMyNotifications: (): Promise<NotificationResponseDTO[]> =>
    apiClient.get<NotificationResponseDTO[]>('/notifications').then(r => r.data),

  markAsRead: (id: number): Promise<NotificationResponseDTO> =>
    apiClient.put<NotificationResponseDTO>(`/notifications/${id}/read`).then(r => r.data),
};
