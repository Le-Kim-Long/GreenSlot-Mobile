import apiClient from './client';
import type { SensorReadingResponseDTO } from '../types/api';

export const IOT_DEVICE_ID = 'ESP32_GARDEN_01';

export interface SlotDeviceInfo {
  slotId: number;
  slotNumber: string;
  deviceId: string;
  pillarId: number;
  pillarCode: string;
  deviceStatus: string;
  cameraStatus: string;
  cameraStreamUrl: string;
  locationId: number | null;
  locationName: string;
}

export const iotApi = {
  getLatestReadings: (params: { deviceId?: string; pillarId?: number; slotId?: number } = {}): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get('/iot/sensors/latest', { params: { deviceId: IOT_DEVICE_ID, ...params } }).then((r) => r.data),

  getReadingsHistory: (params: { deviceId?: string; pillarId?: number; slotId?: number; sensorType?: string; from?: string; to?: string } = {}): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get('/iot/sensors/history', { params: { deviceId: IOT_DEVICE_ID, ...params } }).then((r) => r.data),

  getSensorTypes: () => apiClient.get('/iot/sensors/types').then(r => r.data),
  getThresholds: (params?: { deviceId?: string; pillarId?: number }) => apiClient.get('/iot/sensors/thresholds', { params }).then(r => r.data),
  createThreshold: (data: unknown) => apiClient.post('/iot/sensors/thresholds', data).then(r => r.data),
  updateThreshold: (id: number, data: unknown) => apiClient.put(`/iot/sensors/thresholds/${id}`, data).then(r => r.data),
  deleteThreshold: (id: number) => apiClient.delete(`/iot/sensors/thresholds/${id}`).then(r => r.data),
  getSlotPillars: (slotId: number) => apiClient.get(`/iot/slot/${slotId}/pillars`).then(r => r.data),
  getCameraSnapshot: (slotId: number) => apiClient.get(`/iot/camera/${slotId}`, { responseType: 'blob' }).then(r => r.data),
};
