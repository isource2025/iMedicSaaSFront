import { ClasePaciente } from '../types/clasePaciente.types';
import { apiFetch } from '@/app/utils/authFetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Obtiene todas las clases de paciente desde la tabla imClasePaciente
 * @returns Promise con el array de ClasePaciente
 */
export const getClasesPaciente = async (): Promise<ClasePaciente[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/clases-paciente`, {
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
    console.error('Error al obtener clases de paciente:', error);
    return [];
  }
};

/**
 * Crea una nueva clase de paciente
 * @param clasePaciente Datos de la nueva clase de paciente
 * @returns Promise con los datos de la clase de paciente creada
 */
export const createClasePaciente = async (clasePaciente: ClasePaciente): Promise<ClasePaciente | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/clases-paciente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clasePaciente),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data as ClasePaciente;
  } catch (error) {
    console.error('Error al crear clase de paciente:', error);
    throw error;
  }
};

/**
 * Actualiza una clase de paciente existente
 * @param valor Valor (clave primaria) de la clase de paciente
 * @param descripcion Nueva descripción
 * @returns Promise con los datos actualizados
 */
export const updateClasePaciente = async (valor: string, descripcion: string): Promise<ClasePaciente | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/clases-paciente/${valor}`, {
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
    return data.data as ClasePaciente;
  } catch (error) {
    console.error(`Error al actualizar clase de paciente con valor ${valor}:`, error);
    throw error;
  }
};

/**
 * Elimina una clase de paciente existente
 * @param valor Valor (clave primaria) de la clase de paciente a eliminar
 * @returns Promise que resuelve cuando la eliminación se completa
 */
export const deleteClasePaciente = async (valor: string): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await apiFetch(`${API_URL}/clases-paciente/${valor}`, {
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
    console.error(`Error al eliminar clase de paciente con valor ${valor}:`, error);
    throw error;
  }
};
