import apiClient from './client';
import type { JwtResponse } from '../types/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  address?: string;
}

export const authApi = {
  login: (credentials: LoginRequest): Promise<JwtResponse> =>
    apiClient.post('/auth/login', credentials).then(r => r.data),

  register: (userData: RegisterRequest) =>
    apiClient.post('/auth/register', userData).then(r => r.data),

  forgotPassword: (data: { email: string }) =>
    apiClient.post('/auth/forgot-password', data).then(r => r.data),
};
