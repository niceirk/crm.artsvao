export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER';
  status: 'ACTIVE' | 'BLOCKED';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthError {
  message: string | string[];
  error: string;
  statusCode: number;
}
