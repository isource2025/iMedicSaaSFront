import apiService from './axios';

interface ApiResponse {
  success: boolean;
  data: any;
  message?: string;
  mensaje?: string;
}

interface VisitaMovimiento {
  idVisitaMovimiento?: number;
  numeroVisita: string | number;
  fechaEgreso?: string;
  horaEgreso?: string;
  disposicionEgreso?: number;
  diagnostico?: string;
  FechaAdmision?: number;
  HoraAdmision?: number;
  bedId?: string;
  ValorHabitacionCama?: string;
  ValorSector?: string;
  EstadoAmbulatorio?: string | number;
}

export interface InternadoSinCama {
  numeroVisita: number;
  idPaciente: number;
  apellidoYNombre: string;
  numeroDocumento: string;
  numeroHC?: string;
  sexo?: string;
  fechaAdmision?: string;
  horaAdmision?: string;
  valorSector?: string;
  diagnostico?: string;
  diagnosticoDescripcion?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const visitaMovimientoService = {
  getUltimoMovimiento: async (numeroVisita: string | number): Promise<VisitaMovimiento | null> => {
    try {
      const response = await apiService.get<ApiResponse>(`${BASE_URL}/patients/visitas/${numeroVisita}/movimientos/ultimo`);
      
      if (!response.data || !response.data.success) {
        return null;
      }
      
      return response.data.data;
    } catch (error: any) {
      // 404 = visita sin movimientos aún (p.ej. internado sin cama)
      if (error?.response?.status === 404) {
        return null;
      }
      console.error('Error al obtener último movimiento de visita:', error);
      return null;
    }
  },
  
  actualizarUltimoMovimiento: async (numeroVisita: string | number, datosEgreso: {
    fechaEgreso: string;
    horaEgreso: string;
    disposicionEgreso?: number | null;
    diagnostico?: string | null;
    bedId?: string | null;
  }): Promise<any> => {
    try {
      const url = `${BASE_URL}/patients/visitas/${numeroVisita}/movimientos/ultimo`;
      const response = await apiService.put<ApiResponse>(url, datosEgreso);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || response.data?.mensaje || 'Error al actualizar el movimiento con datos de egreso');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar movimiento con datos de egreso:', error);
      throw error;
    }
  },
  
  moverPacienteACamaVacia: async (numeroVisita: string | number, datosCambio: {
    FechaAdmision: number;
    HoraAdmision: number;
    FechaEgreso: number;
    HoraEgreso: number;
    EstadoAmbulatorio: string;
    Diagnostico?: string;
    bedId: string;
    ValorSector: string;
    Operador: string;
    FechaCarga: number;
    HoraCarga: number;
  }): Promise<any> => {
    try {
      const url = `${BASE_URL}/patients/visitas/${numeroVisita}/mover-cama`;
      const response = await apiService.put<ApiResponse>(url, datosCambio);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || response.data?.mensaje || 'Error al mover al paciente a la nueva cama');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error al mover paciente a nueva cama:', error);
      throw error;
    }
  },

  /**
   * Internados vigentes (sin egreso) que aún no tienen cama en imHabitacionCamas
   */
  getInternadosSinCama: async (termino = ''): Promise<InternadoSinCama[]> => {
    try {
      const q = termino.trim()
        ? `?termino=${encodeURIComponent(termino.trim())}`
        : '';
      const response = await apiService.get<ApiResponse>(
        `${BASE_URL}/patients/visitas/internados-sin-cama${q}`,
      );
      if (!response.data?.success) {
        throw new Error(response.data?.mensaje || 'Error al buscar internados sin cama');
      }
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error al buscar internados sin cama:', error);
      throw error;
    }
  },

  /**
   * Primera asignación de cama a un internado sin ubicación
   */
  asignarPacienteACama: async (
    numeroVisita: string | number,
    datos: {
      FechaAdmision: number;
      HoraAdmision: number;
      EstadoAmbulatorio: string;
      Diagnostico?: string;
      bedId: string;
      ValorSector: string;
      Operador: string;
      FechaCarga: number;
      HoraCarga: number;
    },
  ): Promise<any> => {
    try {
      const url = `${BASE_URL}/patients/visitas/${numeroVisita}/asignar-cama`;
      const response = await apiService.post<ApiResponse>(url, datos);
      if (!response.data?.success) {
        throw new Error(response.data?.mensaje || 'Error al asignar la cama');
      }
      return response.data;
    } catch (error: any) {
      console.error('Error al asignar cama:', error);
      throw error;
    }
  },
};

export default visitaMovimientoService;
