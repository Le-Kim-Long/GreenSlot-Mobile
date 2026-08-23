import apiClient from './client';

export const harvestApi = {
  getMine: () => apiClient.get('/harvest-history/my').then(r => r.data),
  getAll: () => apiClient.get('/harvest-history').then(r => r.data),
  recordDecision: (rentalId: number, decision: 'SELF' | 'STAFF') =>
    apiClient.post(`/bookings/${rentalId}/harvest-decision`, { decision }).then(r => r.data),
};
