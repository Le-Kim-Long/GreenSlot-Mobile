import apiClient from './client';

export interface CameraDTO {
  cam_id: string;
  name: string;
  ip: string;
  stream_url: string;
  capture_url: string;
}

export const cameraApi = {
  getActiveCameras: (): Promise<CameraDTO[]> =>
    apiClient.get('/cameras').then(r => r.data),
  getSnapshot: (slotId: number) =>
    apiClient.get(`/iot/camera/${slotId}`, { responseType: 'blob' }).then(r => r.data),
  getSlotStatus: (slotId: number) => apiClient.get(`/iot/camera/${slotId}/status`).then(r => r.data),
  controlSlot: (slotId: number, data: unknown) => apiClient.post(`/iot/camera/${slotId}/control`, data).then(r => r.data),
};
export default cameraApi;
