import { apiFetch } from '@/app/utils/authFetch';
import {
  MedicacionControl,
  MedicacionControlResponse,
  MedicacionControlSingleResponse,
} from '../types/medicacionControl';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT = 10000; // 10 segundos

/**
 * Helper para realizar fetch con timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await apiFetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Obtener medicación suministrada por número de visita
 */
export const obtenerMedicacionPorVisita = async (
  numeroVisita: number
): Promise<MedicacionControl[]> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/medicacion-control/${numeroVisita}`
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data: MedicacionControlResponse = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error al obtener medicación por visita:', error);
    return [];
  }
};

/**
 * Obtener medicación suministrada por número de visita y fecha
 */
export const obtenerMedicacionPorVisitaYFecha = async (
  numeroVisita: number,
  fecha: string
): Promise<MedicacionControl[]> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/medicacion-control/${numeroVisita}/byDate?fecha=${fecha}`
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data: MedicacionControlResponse = await response.json();

    console.log('🔍 [Frontend] Datos recibidos del backend:', data);
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      console.log('🔍 [Frontend] Primer registro:', data.data[0]);
    }

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error al obtener medicación por visita y fecha:', error);
    return [];
  }
};

/**
 * Obtener un registro de medicación por ID
 */
export const obtenerMedicacionPorId = async (
  idCtrlMedica: number
): Promise<MedicacionControl | null> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/medicacion-control/detalle/${idCtrlMedica}`
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data: MedicacionControlSingleResponse = await response.json();

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('Error al obtener medicación por ID:', error);
    return null;
  }
};

/**
 * Formatear fecha para mostrar (DD/MM/YYYY)
 */
export const formatearFecha = (fecha: string | null): string => {
  if (!fecha) return '-';
  try {
    // Si viene en formato YYYY-MM-DD, parsearlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Si viene como DateTime string, usar Date
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

/**
 * Formatear hora para mostrar (HH:mm)
 */
export const formatearHora = (hora: string | null): string => {
  if (!hora) return '-';
  try {
    // Si viene en formato HH:mm:ss, extraer solo HH:mm
    const parts = hora.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return hora;
  } catch {
    return '-';
  }
};

/**
 * Obtener nombre completo del operador
 */
export const obtenerNombreCompleto = (
  apellido: string | null,
  nombres: string | null
): string => {
  if (!apellido && !nombres) return '-';
  if (!apellido) return nombres || '-';
  if (!nombres) return apellido;
  return `${apellido}, ${nombres}`;
};

/**
 * Eliminar un registro de medicación
 */
export const eliminarMedicacion = async (
  idCtrlMedica: number
): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/medicacion-control/${idCtrlMedica}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error al eliminar medicación:', error);
    throw error;
  }
};
