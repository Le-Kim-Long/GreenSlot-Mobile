import apiClient from './client';

export type PumpStatus = 'ON' | 'OFF';

export const pumpApi = {
  getStatus: () => apiClient.get('/iot/pump/status').then(r => r.data),
  setStatus: (status: PumpStatus) => apiClient.post('/iot/pump/status', { status }).then(r => r.data),
  setAutoMode: (enabled: boolean) => apiClient.put('/iot/pump/auto-mode', { enabled }).then(r => r.data),
};
