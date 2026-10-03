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

export interface ResumenPacientesHoy {
  totalHoy: number;
  porcentajeCambio: number;
}

export interface ResumenPacientesHoyResponse {
  success: boolean;
  data: ResumenPacientesHoy;
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
      timeout: 30000
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
 * Resumen por clase (suma + total) a partir de filas ya descargadas. Puro, sin red.
 */
export const resumenDesdeIndicadores = (
  indicadoresRaw: IndicadorData[],
  fechaInicio: string,
  fechaFin: string
): ResumenIndicadores => {
  const resumenPorClase: Record<string, number> = {};
  let totalGeneral = 0;

  (indicadoresRaw || []).forEach(item => {
    if (!resumenPorClase[item.ClasePaciente]) {
      resumenPorClase[item.ClasePaciente] = 0;
    }
    resumenPorClase[item.ClasePaciente] += item.TotalIngresos;
    totalGeneral += item.TotalIngresos;
  });

  return {
    resumenPorClase,
    totalGeneral,
    periodo: { fechaInicio, fechaFin },
  };
};

/**
 * Serie por fecha a partir de filas ya descargadas. Puro, sin red.
 */
export const porFechaDesdeIndicadores = (indicadoresRaw: IndicadorData[]): IndicadorPorFecha[] => {
  const datosPorFecha: Record<string, { total: number; porClase: Record<string, number> }> = {};

  (indicadoresRaw || []).forEach(item => {
    if (!datosPorFecha[item.Fecha]) {
      datosPorFecha[item.Fecha] = { total: 0, porClase: {} };
    }
    datosPorFecha[item.Fecha].total += item.TotalIngresos;
    datosPorFecha[item.Fecha].porClase[item.ClasePaciente] = item.TotalIngresos;
  });

  return Object.entries(datosPorFecha)
    .map(([fecha, datos]) => ({
      fecha: new Date(fecha).toISOString(),
      total: datos.total,
      porClase: datos.porClase,
    }))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
};

/**
 * Obtiene indicadores + resumen + serie con UNA sola request
 * (antes eran tres GET /indicadores idénticos).
 */
export const obtenerIndicadoresCompletos = async (
  tipoIndicador: string = 'Ingresos',
  fechaInicio: string,
  fechaFin: string
): Promise<{ indicadores: IndicadorData[]; resumen: ResumenIndicadores; porFecha: IndicadorPorFecha[] }> => {
  const indicadores = await obtenerIndicadores(tipoIndicador, fechaInicio, fechaFin);
  return {
    indicadores,
    resumen: resumenDesdeIndicadores(indicadores, fechaInicio, fechaFin),
    porFecha: porFechaDesdeIndicadores(indicadores),
  };
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
    const indicadoresRaw = await obtenerIndicadores(tipoIndicador, fechaInicio, fechaFin);
    return resumenDesdeIndicadores(indicadoresRaw, fechaInicio, fechaFin);
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
    const indicadoresRaw = await obtenerIndicadores(tipoIndicador, fechaInicio, fechaFin);
    return porFechaDesdeIndicadores(indicadoresRaw);
  } catch (error) {
    console.error('Error al obtener indicadores por fecha:', error);
    throw error;
  }
};

/**
 * Obtiene un resumen de pacientes para el día actual y lo compara con el día anterior.
 */
export const obtenerResumenPacientesHoy = async (): Promise<ResumenPacientesHoy> => {
  try {
    const response = await axiosInstance.get<ResumenPacientesHoyResponse>('/indicadores/pacientes/resumen-hoy', {
      timeout: 30000
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Error en la respuesta del servidor al obtener resumen de pacientes de hoy');
    }
  } catch (error) {
    console.error('Error al obtener resumen de pacientes de hoy:', error);
    return {
      totalHoy: 0,
      porcentajeCambio: 0
    };
  }
};

export const indicadoresService = {
  obtenerIndicadores,
  obtenerIndicadoresCompletos,
  obtenerResumenIndicadores,
  obtenerIndicadoresPorFecha,
  obtenerResumenPacientesHoy,
  resumenDesdeIndicadores,
  porFechaDesdeIndicadores,
};
