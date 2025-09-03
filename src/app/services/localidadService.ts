import { apiService } from './axios';

/**
 * Interfaz para los datos de localidad
 */
export interface Localidad {
  Valor: string;
  NombreLocalidad: string;
  ValorProvincia: string;
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
   * Obtiene registros de la tabla imLocalidades con paginación y búsqueda
   * @param page Número de página (por defecto 1)
   * @param limit Límite de registros por página (por defecto 50)
   * @param search Término de búsqueda opcional
   * @returns Promise con la lista paginada de localidades
   */
  getLocalidades: async (page = 1, limit = 50, search = ''): Promise<{
    data: Localidad[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
    };
  }> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        withCount: 'true'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await apiService.get<ApiResponse<Localidad[]> & {
        pagination?: {
          currentPage: number;
          totalPages: number;
          totalCount: number;
          limit: number;
        };
      }>(`/localidad?${params.toString()}`);
      
      if (response.data.success && response.data.data) {
        return {
          data: response.data.data,
          pagination: response.data.pagination
        };
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
   * Busca localidades por término de búsqueda (método de compatibilidad)
   * @param searchTerm Término de búsqueda
   * @returns Promise con la lista de localidades encontradas
   */
  searchLocalidades: async (searchTerm: string): Promise<Localidad[]> => {
    try {
      const result = await localidadService.getLocalidades(1, 100, searchTerm);
      return result.data;
    } catch (error: any) {
      console.error('Error searching localidades:', error);
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
