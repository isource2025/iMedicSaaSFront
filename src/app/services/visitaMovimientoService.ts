import apiService from './axios';

interface ApiResponse {
  success: boolean;
  data: any;
  message?: string;
}

interface VisitaMovimiento {
  idVisitaMovimiento?: number;
  numeroVisita: string | number;
  fechaEgreso?: string;
  horaEgreso?: string;
  disposicionEgreso?: number;
  diagnostico?: string;
  FechaAdmision?: number; // Formato Clarion
  HoraAdmision?: number; // Formato Clarion
  bedId?: string; // ID de la cama
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Servicio para gestionar los movimientos de visitas de pacientes
 */
const visitaMovimientoService = {
  /**
   * Obtiene el último movimiento de una visita específica
   * @param numeroVisita Número de visita a consultar
   * @returns Datos del último movimiento de la visita
   */
  getUltimoMovimiento: async (numeroVisita: string | number): Promise<VisitaMovimiento | null> => {
    try {
      console.log(`Solicitando último movimiento de visita ${numeroVisita}`);
      
      const response = await apiService.get<ApiResponse>(`${BASE_URL}/patients/visitas/${numeroVisita}/movimientos/ultimo`);
      
      if (!response.data || !response.data.success) {
        console.error('Error en respuesta:', response.data);
        throw new Error(response.data?.message || 'Error al obtener el último movimiento de la visita');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error al obtener último movimiento de visita:', error);
      return null;
    }
  },
  
  /**
   * Actualiza el último movimiento de una visita con los datos de egreso
   * @param numeroVisita Número de visita
   * @param datosEgreso Datos de egreso a actualizar
   * @returns Resultado de la actualización
   */
  actualizarUltimoMovimiento: async (numeroVisita: string | number, datosEgreso: {
    fechaEgreso: string;
    horaEgreso: string;
    disposicionEgreso?: number | null;
    diagnostico?: string | null;
    bedId?: string | null; // ID de la cama
  }): Promise<any> => {
    try {
      console.log('=== SERVICIO FRONTEND: ACTUALIZAR MOVIMIENTO ===');
      console.log(`Parámetro numeroVisita (tipo: ${typeof numeroVisita}): '${numeroVisita}'`);
      console.log('Datos de egreso:', JSON.stringify(datosEgreso, null, 2));
      
      const url = `${BASE_URL}/patients/visitas/${numeroVisita}/movimientos/ultimo`;
      console.log(`URL completa: ${url}`);
      console.log('=================================================');
      
      const response = await apiService.put<ApiResponse>(
        url,
        datosEgreso
      );
      
      if (!response.data || !response.data.success) {
        console.error('Error en respuesta de actualización:', response.data);
        throw new Error(response.data?.message || 'Error al actualizar el movimiento con datos de egreso');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar movimiento con datos de egreso:', error);
      throw error;
    }
  }
};

export default visitaMovimientoService;
