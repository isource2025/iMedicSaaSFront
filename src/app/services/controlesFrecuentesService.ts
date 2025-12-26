import { ControlFrecuente, ControlesFrecuentesResponse } from '../types/controlesFrecuentes';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

/**
 * Timeout para las peticiones fetch
 */
const FETCH_TIMEOUT = 30000; // 30 segundos

/**
 * Fetch con timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
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
 * Obtener controles frecuentes por número de visita y fecha
 */
export const obtenerControlesPorVisitaYFecha = async (
  numeroVisita: number,
  fecha: string
): Promise<ControlFrecuente[]> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/controles-frecuentes/${numeroVisita}/byDate?date=${fecha}`
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data: ControlesFrecuentesResponse = await response.json();

    console.log('🔍 [Frontend] Datos recibidos del backend:', data);
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      console.log('🔍 [Frontend] Primer registro:', data.data[0]);
    }

    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error al obtener controles frecuentes:', error);
    throw error;
  }
};

/**
 * Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
 */
export const formatearFecha = (fecha: string | null): string => {
  if (!fecha) return '-';
  
  // Si ya viene en formato DD/MM/YYYY, retornar tal cual
  if (fecha.includes('/')) return fecha;
  
  // Si viene en formato YYYY-MM-DD o YYYY-MM-DD HH:mm:ss
  const partes = fecha.split(' ')[0].split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  
  return fecha;
};

/**
 * Formatear hora de HH:mm:ss a HH:mm
 */
export const formatearHora = (hora: string | null): string => {
  if (!hora) return '-';
  
  // Si viene en formato HH:mm:ss, extraer solo HH:mm
  const partes = hora.split(':');
  if (partes.length >= 2) {
    return `${partes[0]}:${partes[1]}`;
  }
  
  return hora;
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
 * Eliminar un control frecuente
 */
export const eliminarControl = async (
  valor: number
): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/controles-frecuentes/${valor}`,
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
    console.error('Error al eliminar control frecuente:', error);
    throw error;
  }
};
