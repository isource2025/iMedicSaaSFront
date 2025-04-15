import { LoginCredentials, LoginResponse, Sector } from '../types/AuthInterface';
import { apiService } from './axios';


const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const authService = {
  
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await apiService.post<LoginResponse>(`${BASE_URL}/auth/login`, credentials);
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
   * Obtiene los sectores disponibles desde la tabla impersonalsectores
   * @returns Promise con la lista de sectores
   */
  getSectores: async (): Promise<Sector[]> => {
    try {
      const response = await apiService.get<{success: boolean, data: Sector[]}>('/auth/sectores');
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error al obtener sectores:', error);
      return [];
    }
  },

  /**
   * Obtiene los sectores disponibles para un usuario específico
   * @param username Nombre de usuario
   * @returns Promise con la lista de sectores filtrados
   */
  getSectoresPorUsuario: async (username: string): Promise<Sector[]> => {
    if (!username) {
      return [];
    }
    
    try {
      const response = await apiService.get<{success: boolean, data: Sector[]}>(`/auth/sectores/${username}`);
      return response.data.data || [];
    } catch (error: any) {
      console.error(`Error al obtener sectores para usuario ${username}:`, error);
      return [];
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
