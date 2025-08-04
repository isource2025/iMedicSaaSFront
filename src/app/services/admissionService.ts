import { fetchWithTimeout } from '../utils/fetchUtils';

// Interfaz para opciones de tabla dinámicas
export interface TableOption {
  rubro: string;
  descripcion: string;
  icono: string;
  orden: number;
}

// Interfaz para datos de tabla estándar
export interface TableData {
  Valor: string | number;
  Descripcion: string;
  [key: string]: any; // Para campos adicionales
}

// URLs de servicios
const BASE_URL = 'http://localhost:5006';
const API_TIMEOUT = 5000; // 5 segundos

/**
 * Obtiene todas las opciones de tablas de admisión desde la API
 */
export async function getAdmissionTablesOptions(): Promise<TableOption[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/admin/opcgrd`, {}, API_TIMEOUT);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching admission tables options:', error);
    return [];
  }
}

/**
 * Obtiene datos de clases de paciente
 */
export async function getClasesPaciente(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/clasespac`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching clases de paciente:', error);
    return [];
  }
}

/**
 * Obtiene datos de dadores de órganos
 */
export async function getDadoresOrganos(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/dadores`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching dadores de órganos:', error);
    return [];
  }
}

/**
 * Obtiene datos de diagnósticos
 */
export async function getDiagnosticos(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/diagnosticos`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching diagnósticos:', error);
    return [];
  }
}

/**
 * Obtiene datos de disposiciones de egreso
 */
export async function getDisposicionesEgreso(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/dispegreso`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching disposiciones de egreso:', error);
    return [];
  }
}

/**
 * Obtiene datos de estados ambulatorios
 */
export async function getEstadosAmbulatorios(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/estadosamb`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching estados ambulatorios:', error);
    return [];
  }
}

/**
 * Obtiene datos de estados civiles
 */
export async function getEstadosCiviles(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/estadosciv`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching estados civiles:', error);
    return [];
  }
}

/**
 * Obtiene datos de estados militares
 */
export async function getEstadosMilitares(): Promise<TableData[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/tables/estadosmil`, {}, API_TIMEOUT);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching estados militares:', error);
    return [];
  }
}
