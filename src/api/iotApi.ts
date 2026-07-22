import apiClient from './client';
import type { SensorReadingResponseDTO } from '../types/api';

export const IOT_DEVICE_ID = 'ESP32_GARDEN_01';

export const iotApi = {
  getLatestReadings: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/readings/latest`, { params: { deviceId } }).then((r) => r.data),

  getReadingsHistory: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/readings/history`, { params: { deviceId } }).then((r) => r.data),
};
