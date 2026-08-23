import apiClient from './client';

export interface ImageUploadResult { publicUrl: string; id?: number; fileName?: string; message?: string }

function upload(path: string, file: any): Promise<ImageUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
}

export const imageApi = {
  uploadAvatar: (file: any) => upload('/images/upload/avatar', file),
  uploadTree: (file: any) => upload('/images/upload/trees', file),
  uploadEquipment: (file: any) => upload('/images/upload/equipment', file),
  uploadEvidence: (file: any) => upload('/images/upload/evidence', file),
};
