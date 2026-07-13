import { LoginCredentials, LoginResponse } from '../types/AuthInterface';
import { apiService } from './axios';
import { apiFetch } from '@/app/utils/authFetch';
import { stopSessionActivityMonitor } from '@/app/utils/sessionActivity';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosErr = error as { response?: { data?: LoginResponse & { mensaje?: string }; status?: number } };
        const data = axiosErr.response?.data;
        const errorMessage = data?.mensaje || 'Usuario o contraseña incorrectos';
        throw new Error(errorMessage);
      }
      if (error instanceof Error) throw error;
      throw new Error('Error de conexión. Por favor, intente de nuevo más tarde.');
    }
  },

  logout: async () => {
    stopSessionActivityMonitor();
    try {
      await apiService.post('/auth/logout', {});
    } catch {
      /* limpiar cliente igual */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('rol');
    localStorage.removeItem('permisos');
    localStorage.removeItem('rememberUser');
    localStorage.removeItem('empresaInfo');
    localStorage.removeItem('empresaSeleccionada');
    localStorage.removeItem('empresaModulos');
  },

  /** Sesión actual (cookie httpOnly + validación servidor). */
  me: async () => {
    const res = await apiService.get<{ success: boolean; usuario?: unknown; rol?: unknown }>(
      '/auth/me',
    );
    return res.data;
  },

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

  refreshPermisos: async (): Promise<string[]> => {
    try {
      const res = await apiFetch('/permisos/me', { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      const permisos: string[] = Array.isArray(json?.data?.permisos) ? json.data.permisos : [];
      localStorage.setItem('permisos', JSON.stringify(permisos));
      window.dispatchEvent(new Event('imedic:permisos-refresh'));
      return permisos;
    } catch {
      return [];
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  /** Actualiza matrícula en localStorage (p. ej. sincronizada desde imPersonal tenant). */
  patchCurrentUser: (partial: Record<string, unknown>) => {
    if (typeof window === 'undefined') return null;
    const current = authService.getCurrentUser();
    if (!current || typeof current !== 'object') return null;
    const next = { ...current, ...partial };
    localStorage.setItem('user', JSON.stringify(next));
    return next;
  },
};
