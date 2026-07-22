import apiClient from './client';
import type { MessageResponseDTO, ProfileResponseDTO, UserProfileUpdateDTO } from '../types/api';

export const userApi = {
  getProfile: (): Promise<ProfileResponseDTO> =>
    apiClient.get('/users/profile').then(r => r.data),

  updateProfile: (data: UserProfileUpdateDTO): Promise<MessageResponseDTO> =>
    apiClient.patch('/users/profile', data).then(r => r.data),
};
