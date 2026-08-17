import apiClient from './client';
import type { SensorReadingResponseDTO } from '../types/api';

export const IOT_DEVICE_ID = 'ESP32_GARDEN_01';

export const iotApi = {
  getLatestReadings: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/readings/latest`, { params: { deviceId } }).then((r) => r.data),

  getReadingsHistory: (deviceId: string = IOT_DEVICE_ID): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get(`/iot/readings/history`, { params: { deviceId } }).then((r) => r.data),

  /** Lấy chỉ số cảm biến mới nhất (hỗ trợ lọc theo slotId cho Customer) — API Docs §6.2 */
  getLatestSensorReadings: (params: { pillarId?: number; slotId?: number; deviceId?: string }): Promise<SensorReadingResponseDTO[]> =>
    apiClient.get('/iot/sensors/latest', { params }).then(r => r.data),

  /** Điều khiển bơm tưới tiêu — API Docs §6.4 */
  controlPump: (data: { deviceId: string; status: 'ON' | 'OFF' }): Promise<any> =>
    apiClient.post('/iot/pump/control', data).then(r => r.data),
};
