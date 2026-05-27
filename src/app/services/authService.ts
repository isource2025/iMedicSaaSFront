import { EmpresaLogin, LoginCredentials, LoginResponse, Sector } from '../types/AuthInterface';
import { apiService } from './axios';

export const authService = {
  
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      // Handle specific login errors
      if (error.response) {
        const data = error.response.data;
        if (error.response.status === 409 && Array.isArray(data?.empresas)) {
          const err = new Error(data?.mensaje || 'Seleccione la empresa para continuar') as Error & {
            empresas?: { idEmpresa: number; descripcionEmpresa: string }[];
          };
          err.empresas = data.empresas;
          throw err;
        }
        const errorMessage =
          data?.mensaje ||
          data?.message ||
          'Credenciales inválidas. Por favor, intente de nuevo.';
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
  getEmpresasPorUsuario: async (
    username: string,
  ): Promise<{ empresas: EmpresaLogin[]; esSuperAdmin: boolean; requiereSector: boolean }> => {
    if (!username) {
      return { empresas: [], esSuperAdmin: false, requiereSector: true };
    }

    try {
      const response = await apiService.get<{
        success: boolean;
        data: EmpresaLogin[];
        esSuperAdmin?: boolean;
        requiereSector?: boolean;
      }>(`/auth/empresas/${encodeURIComponent(username)}`);
      return {
        empresas: response.data.data || [],
        esSuperAdmin: !!response.data.esSuperAdmin,
        requiereSector: response.data.esSuperAdmin
          ? false
          : response.data.requiereSector !== false,
      };
    } catch (error: unknown) {
      console.error(`Error al obtener empresas para usuario ${username}:`, error);
      return { empresas: [], esSuperAdmin: false, requiereSector: true };
    }
  },

  getSectoresPorUsuario: async (
    username: string,
    idEmpresa?: string | number,
  ): Promise<{ sectores: Sector[]; requiereSector: boolean }> => {
    if (!username) {
      return { sectores: [], requiereSector: true };
    }

    try {
      const response = await apiService.get<{
        success: boolean;
        data: Sector[];
        requiereSector?: boolean;
      }>(`/auth/sectores/${encodeURIComponent(username)}`, {
        params: idEmpresa != null && idEmpresa !== '' ? { idEmpresa } : undefined,
      });
      return {
        sectores: response.data.data || [],
        requiereSector: response.data.requiereSector !== false,
      };
    } catch (error: unknown) {
      console.error(`Error al obtener sectores para usuario ${username}:`, error);
      return { sectores: [], requiereSector: true };
    }
  },

  /**
   * Log out the current user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('rol');
    localStorage.removeItem('permisos');
    localStorage.removeItem('rememberUser');
    localStorage.removeItem('empresaInfo');
    localStorage.removeItem('empresaSeleccionada');
  },

  /**
   * Devuelve el rol del usuario logueado tal como vino del backend en el login.
   * Devuelve null si el usuario no tiene rol asignado.
   */
  getCurrentRol: (): { id: number; nombre: string; nivel: number } | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('rol');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.nombre === 'string') {
        return {
          id: Number(parsed.id ?? 0),
          nombre: String(parsed.nombre).toUpperCase(),
          nivel: Number(parsed.nivel ?? 0),
        };
      }
    } catch {
      return null;
    }
    return null;
  },

  /**
   * Permisos efectivos del usuario logueado, tal como vinieron del backend
   * en el login. Devuelve [] si no hay nada cargado todavía.
   */
  getCurrentPermisos: (): string[] => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('permisos');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    } catch {
      return [];
    }
    return [];
  },

  /** Refresca los permisos del usuario desde /api/permisos/me. */
  refreshPermisos: async (): Promise<string[]> => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/permisos/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            Accept: 'application/json',
          },
        },
      );
      if (!res.ok) return [];
      const json = await res.json();
      const permisos: string[] = Array.isArray(json?.data?.permisos)
        ? json.data.permisos
        : [];
      localStorage.setItem('permisos', JSON.stringify(permisos));
      window.dispatchEvent(new Event('imedic:permisos-refresh'));
      return permisos;
    } catch {
      return [];
    }
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
