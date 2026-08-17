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

export interface OtpVerifyRequest {
  email: string;
  otp: string;
}

export interface MessageResponseDTO {
  message: string;
  success?: boolean;
}

export const authApi = {
  login: (credentials: LoginRequest): Promise<JwtResponse> =>
    apiClient.post('/auth/login', credentials).then(r => r.data),

  register: (userData: RegisterRequest) =>
    apiClient.post('/auth/register', userData).then(r => r.data),

  forgotPassword: (data: { email: string }) =>
    apiClient.post('/auth/forgot-password', data).then(r => r.data),

  /** Xác thực OTP sau đăng ký — API Docs §1.2 */
  verifyOtp: (data: OtpVerifyRequest): Promise<JwtResponse> =>
    apiClient.post('/auth/verify-otp', data).then(r => r.data),

  /** Gửi lại OTP — API Docs §1.3 */
  resendOtp: (email: string): Promise<MessageResponseDTO> =>
    apiClient.post('/auth/resend-otp', null, { params: { email } }).then(r => r.data),

  /** Đăng nhập bằng Google — API Docs §1.4 */
  loginWithGoogle: (idToken: string): Promise<JwtResponse> =>
    apiClient.post('/auth/google', { idToken }).then(r => r.data),
};

