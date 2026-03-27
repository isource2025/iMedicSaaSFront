import { apiService } from './axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Usuario {
  ValorPersonal: number;
  CodOperador: string;
  Apellido: string;
  Nombres: string;
  NombreRed: string;
  Password?: string;
  NumeroDocumento: string;
  Legajo: string;
  MarcadeBaja: number;
  FechaActual: string;
  sectores?: {
    idSector: string;
    descripcionSector: string;
  }[];
}

export interface CrearUsuarioData {
  codOperador?: string;
  apellido: string;
  nombres: string;
  nombreRed: string;
  password: string;
  numeroDocumento?: string;
  legajo?: string;
}

export interface ActualizarUsuarioData {
  codOperador?: string;
  apellido: string;
  nombres: string;
  nombreRed: string;
  numeroDocumento?: string;
  legajo?: string;
}

export const usersService = {
  /**
   * Obtiene todos los usuarios
   */
  getAll: async (): Promise<Usuario[]> => {
    try {
      const response = await apiService.get<{ success: boolean; data: Usuario[] }>(
        `${BASE_URL}/admin/users`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  },

  /**
   * Obtiene un usuario por ID
   */
  getById: async (id: number): Promise<Usuario> => {
    try {
      const response = await apiService.get<{ success: boolean; data: Usuario }>(
        `${BASE_URL}/admin/users/${id}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo usuario
   */
  create: async (data: CrearUsuarioData): Promise<Usuario> => {
    try {
      const response = await apiService.post<{ success: boolean; data: Usuario }>(
        `${BASE_URL}/admin/users`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de un usuario
   */
  update: async (id: number, data: ActualizarUsuarioData): Promise<Usuario> => {
    try {
      const response = await apiService.put<{ success: boolean; data: Usuario }>(
        `${BASE_URL}/admin/users/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  },

  /**
   * Cambia la contraseña de un usuario
   */
  changePassword: async (id: number, password: string): Promise<void> => {
    try {
      await apiService.put(`${BASE_URL}/admin/users/${id}/password`, { password });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      throw error;
    }
  },

  /**
   * Asigna un sector a un usuario
   */
  assignSector: async (id: number, idSector: string): Promise<void> => {
    try {
      await apiService.post(`${BASE_URL}/admin/users/${id}/sectores`, { idSector });
    } catch (error) {
      console.error('Error al asignar sector:', error);
      throw error;
    }
  },

  /**
   * Quita un sector de un usuario
   */
  removeSector: async (id: number, idSector: string): Promise<void> => {
    try {
      await apiService.delete(`${BASE_URL}/admin/users/${id}/sectores/${idSector}`);
    } catch (error) {
      console.error('Error al quitar sector:', error);
      throw error;
    }
  }
};
