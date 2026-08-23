import apiClient from './client';

export const locationApi = {
  getAll: () => apiClient.get('/locations').then(r => r.data),
  getById: (id: number) => apiClient.get(`/locations/${id}`).then(r => r.data),
  getOperatingHours: (id: number) => apiClient.get(`/locations/${id}/operating-hours`).then(r => r.data),
  updateOperatingHours: (id: number, data: unknown) => apiClient.put(`/locations/${id}/operating-hours`, data).then(r => r.data),
};
