import { apiService } from './axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Sector {
  IdSector: string;
  Descripcion: string;
  Activo: number;
}

export const sectoresService = {
  /**
   * Obtiene todos los sectores activos
   */
  async getSectores(): Promise<Sector[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: Sector[] }>(
        `${BASE_URL}/sectores`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener sectores:', error);
      throw error;
    }
  }
};
