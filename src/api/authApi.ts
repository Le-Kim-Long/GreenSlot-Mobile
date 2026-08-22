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

  verifyOtp: (data: { email: string; otp: string }) =>
    apiClient.post('/auth/verify-otp', data).then(r => r.data),

  resendOtp: (email: string) =>
    apiClient.post('/auth/resend-otp', { email }).then(r => r.data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.post('/auth/reset-password', data).then(r => r.data),

  googleLogin: (data: { idToken: string }): Promise<JwtResponse> =>
    apiClient.post('/auth/google', data).then(r => r.data),
};
