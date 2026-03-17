import api from '../lib/axios';

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'PATIENT' | 'CAREGIVER' | 'CLINICIAN';
}

export interface LoginResponse {
  user: User;
  token?: string;
}

// Login API call
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

// Register API call
export const register = async (data: {
  email: string;
  username: string;
  password: string;
  role?: string;
}): Promise<LoginResponse> => {
  const response = await api.post('/api/auth/register', data);
  return response.data;
};

// Get current user
export const getCurrentUser = async (): Promise<{ user: User | null }> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Logout
export const logout = async (): Promise<void> => {
  await api.post('/api/auth/logout');
};

