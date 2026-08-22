import apiClient from './client';

export const preferenceApi = {
  get: () => apiClient.get('/notification-preferences').then(r => r.data),
  update: (data: unknown) => apiClient.put('/notification-preferences', data).then(r => r.data),
};
