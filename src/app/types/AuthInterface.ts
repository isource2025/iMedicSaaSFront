/**
 * Authentication related interfaces
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserData;
  message?: string;
}

export interface UserData {
  id?: number | string;
  username?: string;
  role?: string;
  permissions?: string[];
  [key: string]: any; // Allow for additional user properties
}

export interface AuthError {
  status?: number;
  message: string;
  code?: string;
}
