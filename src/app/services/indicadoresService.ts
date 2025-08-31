import axiosInstance from './axios';

export interface IndicadorData {
  Fecha: string;
  ClasePaciente: string;
  TotalIngresos: number;
}

export interface ResumenIndicadores {
  resumenPorClase: Record<string, number>;
  totalGeneral: number;
  periodo: {
    fechaInicio: string;
    fechaFin: string;
  };
}

export interface IndicadorPorFecha {
  fecha: string;
  total: number;
  porClase: Record<string, number>;
}

export interface IndicadoresResponse {
  success: boolean;
  data: IndicadorData[];
  total: number;
  parametros: {
    tipoIndicador: string;
    fechaInicio: string;
    fechaFin: string;
  };
}

export interface ResumenIndicadoresResponse {
  success: boolean;
  data: ResumenIndicadores;
}

export interface IndicadoresPorFechaResponse {
  success: boolean;
  data: IndicadorPorFecha[];
}

/**
 * Obtiene indicadores básicos de pacientes
 */
export const obtenerIndicadores = async (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
): Promise<IndicadorData[]> => {
  try {
    const response = await axiosInstance.get<IndicadoresResponse>('/indicadores', {
      params: {
        tipoIndicador,
        fechaInicio,
        fechaFin
      },
      timeout: 10000
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
  } catch (error) {
    console.error('Error al obtener indicadores:', error);
    throw error;
  }
};

/**
 * Obtiene resumen de indicadores agrupados por clase de paciente
 */
export const obtenerResumenIndicadores = async (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
): Promise<ResumenIndicadores> => {
  try {
    const response = await axiosInstance.get<ResumenIndicadoresResponse>('/indicadores/resumen', {
      params: {
        tipoIndicador,
        fechaInicio,
        fechaFin
      },
      timeout: 10000
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
  } catch (error) {
    console.error('Error al obtener resumen de indicadores:', error);
    throw error;
  }
};

/**
 * Obtiene indicadores agrupados por fecha para gráficos temporales
 */
export const obtenerIndicadoresPorFecha = async (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
): Promise<IndicadorPorFecha[]> => {
  try {
    const response = await axiosInstance.get<IndicadoresPorFechaResponse>('/indicadores/por-fecha', {
      params: {
        tipoIndicador,
        fechaInicio,
        fechaFin
      },
      timeout: 10000
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
  } catch (error) {
    console.error('Error al obtener indicadores por fecha:', error);
    throw error;
  }
};

export const indicadoresService = {
  obtenerIndicadores,
  obtenerResumenIndicadores,
  obtenerIndicadoresPorFecha
};
