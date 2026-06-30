import apiClient from './client';
import type { SensorReading, SensorTypeInfo } from '../types/api';

export const iotApi = {
  getLatestReadings: (deviceId: string): Promise<SensorReading[]> =>
    apiClient.get(`/iot/sensors/latest`, { params: { deviceId } }).then(r => r.data),

  getHistory: (deviceId: string, sensorType: string, hours = 24): Promise<SensorReading[]> =>
    apiClient
      .get('/iot/sensors/history', { params: { deviceId, sensorType, hours } })
      .then(r => r.data),

  getSensorTypes: (): Promise<SensorTypeInfo[]> =>
    apiClient.get('/iot/sensors/types').then(r => r.data),
};

export const IOT_DEVICE_ID = 'arduino-greenhouse-01';
