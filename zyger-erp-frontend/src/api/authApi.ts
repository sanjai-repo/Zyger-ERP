import apiClient from './axiosClient';

export interface LoginRequest { username: string; password: string; }
export interface SignupRequest { displayName: string; username: string; email: string; password: string; }
export interface ForgotPasswordRequest { email: string; }
export interface AuthResponse { token: string; username: string; role: string; }
export interface SignupResponse { message: string; username: string; }
export interface MessageResponse { message: string; }

export interface ScreenAccess {
  screenKey: string;
  screenName: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(res => res.data),
  signup: (data: SignupRequest) =>
    apiClient.post<SignupResponse>('/auth/signup', data).then(res => res.data),
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', data).then(res => res.data),
  // Effective per-screen access for the logged-in user (drives UI visibility).
  getMyScreens: () =>
    apiClient.get<ScreenAccess[]>('/auth/screens').then(res => res.data),
};
