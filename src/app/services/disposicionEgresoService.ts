import { DisposicionEgreso } from '../types/disposicionEgreso.types';
import { apiFetch } from '@/app/utils/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Obtiene todas las disposiciones de egreso
 * @returns Promise con el array de DisposicionEgreso
 */
export const getDisposicionesEgreso = async (): Promise<DisposicionEgreso[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/disposiciones-egreso`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener disposiciones de egreso:', error);
    return [];
  }
};

/**
 * Crea una nueva disposición de egreso
 * @param disposicionEgreso Datos de la nueva disposición
 * @returns Promise con los datos de la disposición creada
 */
export const createDisposicionEgreso = async (disposicionEgreso: DisposicionEgreso): Promise<DisposicionEgreso | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/disposiciones-egreso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disposicionEgreso),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data as DisposicionEgreso;
  } catch (error) {
    console.error('Error al crear disposición de egreso:', error);
    throw error;
  }
};

/**
 * Actualiza una disposición de egreso existente
 * @param valor Valor (clave primaria) de la disposición
 * @param descripcion Nueva descripción
 * @returns Promise con los datos actualizados
 */
export const updateDisposicionEgreso = async (valor: number, descripcion: string): Promise<DisposicionEgreso | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/disposiciones-egreso/${valor}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Descripcion: descripcion }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data as DisposicionEgreso;
  } catch (error) {
    console.error(`Error al actualizar disposición de egreso con valor ${valor}:`, error);
    throw error;
  }
};

/**
 * Elimina una disposición de egreso existente
 * @param valor Valor (clave primaria) de la disposición a eliminar
 * @returns Promise que resuelve cuando la eliminación se completa
 */
export const deleteDisposicionEgreso = async (valor: number): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/disposiciones-egreso/${valor}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error al eliminar disposición de egreso con valor ${valor}:`, error);
    throw error;
  }
};

// Exportar un objeto con todos los métodos para soportar importación por defecto
const disposicionEgresoService = {
  getDisposicionesEgreso,
  createDisposicionEgreso,
  updateDisposicionEgreso,
  deleteDisposicionEgreso
};

export default disposicionEgresoService;
