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
  getLatestReadings: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/sensors/latest`, { params: { deviceId } }).then((r) => r.data),

  getReadingsHistory: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/sensors/history`, { params: { deviceId } }).then((r) => r.data),

  getDeviceBySlot: (slotId: number): Promise<SlotDeviceInfo> =>
    apiClient.get(`/iot/device/slot/${slotId}`).then((r) => r.data),

  getLatestBySlot: (slotId: number): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/sensors/slot/${slotId}/latest`).then((r) => r.data),

  getHistoryBySlot: (slotId: number, sensorType?: string, limit = 50): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/sensors/slot/${slotId}/history`, { params: { sensorType, limit } }).then((r) => r.data),
};
