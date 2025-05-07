import apiService from './axios';

interface DisposicionEgreso {
  valor: string;
  descripcion: string;
}

interface ApiResponse {
  success: boolean;
  data: DisposicionEgreso[];
  message?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Servicio para gestionar las disposiciones de egreso
 */
const disposicionEgresoService = {
  /**
   * Obtiene todas las disposiciones de egreso desde la tabla imdisposicionegreso
   * @returns Promise con array de disposiciones de egreso
   */
  getDisposicionesEgreso: async (): Promise<DisposicionEgreso[]> => {
    try {
      // Utilizar el nuevo endpoint específico para disposiciones de egreso
      const response = await apiService.get<ApiResponse>(`${BASE_URL}/catalogs/disposiciones-egreso`);
      
      if (!response.data || !response.data.success) {
        throw new Error('Error al obtener disposiciones de egreso');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener disposiciones de egreso:', error);
      
      // Si hay error, devolver array vacío para que el componente maneje este caso
      return [];
    }
  }
};

export default disposicionEgresoService;
