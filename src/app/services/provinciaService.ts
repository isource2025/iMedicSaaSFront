import { apiService } from './axios';

/**
 * Interfaz para los datos de provincia
 */
export interface Provincia {
  valor: string;
  descripcion: string;
}

/**
 * Interfaz para la respuesta de la API
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

/**
 * Servicio para gestionar los datos de provincias
 */
export const provinciaService = {
  /**
   * Obtiene una provincia por su valor (letra)
   * @param valorProvincia La letra que identifica la provincia
   * @returns Promise con los datos de la provincia
   */
  getProvincia: async (valorProvincia: string): Promise<Provincia | null> => {
    try {
      const response = await apiService.get<ApiResponse<Provincia>>(`/provincias/${valorProvincia}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al obtener provincia');
    } catch (error: any) {
      console.error('Error fetching provincia:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || 'Error al obtener provincia');
      }
      throw error;
    }
  },
};
