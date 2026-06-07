import { Diagnostico } from '../types/diagnostico.types';
import { apiFetch } from '@/app/utils/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Obtiene todos los diagnósticos desde la tabla imDiagnosticos
 * @returns Promise con el array de Diagnostico
 */
export const getDiagnosticos = async (): Promise<Diagnostico[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/diagnosticos`, {
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
    console.error('Error al obtener diagnósticos:', error);
    return [];
  }
};

/**
 * Crea un nuevo diagnóstico
 * @param diagnostico Datos del nuevo diagnóstico
 * @returns Promise con los datos del diagnóstico creado
 */
export const createDiagnostico = async (diagnostico: Diagnostico): Promise<Diagnostico | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/diagnosticos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(diagnostico),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data as Diagnostico;
  } catch (error) {
    console.error('Error al crear diagnóstico:', error);
    throw error;
  }
};

/**
 * Actualiza un diagnóstico existente
 * @param valor Valor (clave primaria) del diagnóstico
 * @param descripcion Nueva descripción
 * @returns Promise con los datos actualizados
 */
export const updateDiagnostico = async (valor: string, descripcion: string): Promise<Diagnostico | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/diagnosticos/${valor}`, {
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
    return data.data as Diagnostico;
  } catch (error) {
    console.error(`Error al actualizar diagnóstico con valor ${valor}:`, error);
    throw error;
  }
};

/**
 * Elimina un diagnóstico existente
 * @param valor Valor (clave primaria) del diagnóstico a eliminar
 * @returns Promise que resuelve cuando la eliminación se completa
 */
export const deleteDiagnostico = async (valor: string): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/diagnosticos/${valor}`, {
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
    console.error(`Error al eliminar diagnóstico con valor ${valor}:`, error);
    throw error;
  }
};
