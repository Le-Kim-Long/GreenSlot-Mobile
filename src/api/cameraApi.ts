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
};
export default cameraApi;
