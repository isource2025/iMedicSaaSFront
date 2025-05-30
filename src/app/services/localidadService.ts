import { apiService } from './axios';

/**
 * Interfaz para los datos de localidad
 */
export interface Localidad {
  valor: string;
  descripcion: string;
  valorProvincia: string;
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
 * Servicio para gestionar los datos de la tabla imLocalidades
 */
export const localidadService = {
  /**
   * Obtiene todos los registros de la tabla imLocalidades
   * @returns Promise con la lista de localidades
   */
  getLocalidades: async (): Promise<Localidad[]> => {
    try {
      const response = await apiService.get<ApiResponse<Localidad[]>>('/localidad');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al obtener localidades');
    } catch (error: any) {
      console.error('Error fetching localidades:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || 'Error al obtener localidades');
      }
      throw error;
    }
  },
  
  /**
   * Obtiene un registro de la tabla imLocalidades por su valor
   * @param valor Valor de la localidad
   * @returns Promise con la localidad encontrada
   */
  getLocalidadByValor: async (valor: string): Promise<Localidad> => {
    try {
      const response = await apiService.get<ApiResponse<Localidad>>(`/localidad/${valor}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Localidad no encontrada');
    } catch (error: any) {
      console.error(`Error fetching localidad with valor ${valor}:`, error);
      if (error.response) {
        throw new Error(error.response.data?.message || 'Error al obtener la localidad');
      }
      throw error;
    }
  }
};
