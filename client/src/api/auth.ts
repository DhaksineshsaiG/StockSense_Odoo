import apiClient, { TOKEN_STORAGE_KEY, AUTH_USER_KEY } from './client';
import { AuthResponse, User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  resetToken?: string;
  email?: string;
  otp?: string;
  newPassword: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string; otp?: string }> {
    const response = await apiClient.post<{ message: string; otp?: string }>('/auth/forgot-password', payload);
    return response.data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<{ message: string; resetToken: string }> {
    const response = await apiClient.post<{ message: string; resetToken: string }>('/auth/verify-otp', payload);
    return response.data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', payload);
    return response.data;
  },
};
