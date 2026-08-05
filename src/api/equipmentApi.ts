import apiClient from './client';
import type { EquipmentDTO } from '../types/api';

export interface EquipmentImageUploadResponse {
  id?: number;
  fileName?: string;
  publicUrl: string;
  contentType?: string;
  fileSize?: number;
  message?: string;
  uploadType?: string;
}

export const equipmentApi = {
  getEquipments: (): Promise<EquipmentDTO[]> =>
    apiClient.get('/equipment').then(r => r.data),

  getEquipment: (id: number): Promise<EquipmentDTO> =>
    apiClient.get(`/equipment/${id}`).then(r => r.data),

  createEquipment: (data: Partial<EquipmentDTO>): Promise<EquipmentDTO> =>
    apiClient.post('/equipment', data).then(r => r.data),

  updateEquipment: (id: number, data: Partial<EquipmentDTO>): Promise<EquipmentDTO> =>
    apiClient.put(`/equipment/${id}`, data).then(r => r.data),

  deleteEquipment: (id: number): Promise<void> =>
    apiClient.delete(`/equipment/${id}`).then(r => r.data),

  uploadImage: (file: any): Promise<EquipmentImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/equipment/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(r => r.data);
  },
};
