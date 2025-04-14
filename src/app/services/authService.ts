import { LoginCredentials, LoginResponse } from '../types/AuthInterface';
import { apiService } from './axios';

/**
 * Service for authentication related API calls
 */
export const authService = {
  /**
   * Log in a user with the provided credentials
   * @param credentials User login credentials
   * @returns Promise with the login response
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      // Handle specific login errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = error.response.data?.message || 'Credenciales inválidas. Por favor, intente de nuevo.';
        throw new Error(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Error de conexión. Por favor, intente de nuevo más tarde.');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error('Error al procesar la solicitud.');
      }
    }
  },

  /**
   * Log out the current user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberUser');
    // Redirect to login page is handled by the component or router
  },

  /**
   * Check if a user is authenticated
   * @returns Boolean indicating if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  /**
   * Get the current user data from localStorage
   * @returns User data or null if not authenticated
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  }
};
