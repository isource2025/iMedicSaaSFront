import { apiService } from './axios';

/**
 * Interfaz para los datos de sexo
 */
export interface Sexo {
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
 * Servicio para gestionar los datos de la tabla imSexo
 */
export const sexoService = {
  /**
   * Obtiene todos los registros de la tabla imSexo
   * @returns Promise con la lista de sexos
   */
  getSexos: async (): Promise<Sexo[]> => {
    try {
      const response = await apiService.get<ApiResponse<Sexo[]>>('/sexo');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al obtener sexos');
    } catch (error: any) {
      console.error('Error fetching sexos:', error);
      if (error.response) {
        throw new Error(error.response.data?.message || 'Error al obtener sexos');
      }
      throw error;
    }
  },
  
  /**
   * Obtiene un registro de la tabla imSexo por su valor
   * @param valor Valor del sexo
   * @returns Promise con el sexo encontrado
   */
  getSexoByValor: async (valor: string): Promise<Sexo> => {
    try {
      const response = await apiService.get<ApiResponse<Sexo>>(`/sexo/${valor}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Sexo no encontrado');
    } catch (error: any) {
      console.error(`Error fetching sexo with valor ${valor}:`, error);
      if (error.response) {
        throw new Error(error.response.data?.message || 'Error al obtener el sexo');
      }
      throw error;
    }
  }
};
