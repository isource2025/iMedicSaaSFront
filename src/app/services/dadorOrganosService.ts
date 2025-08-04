import { DadorOrganos } from '../types/dadorOrganos.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Obtiene todos los registros de dador de órganos desde la tabla imDadorOrganos
 * @returns Promise con el array de DadorOrganos
 */
export const getDadoresOrganos = async (): Promise<DadorOrganos[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await fetch(`${API_URL}/dadores-organos`, {
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
    console.error('Error al obtener dadores de órganos:', error);
    return [];
  }
};

/**
 * Crea un nuevo registro de dador de órganos
 * @param dadorOrganos Datos del nuevo registro
 * @returns Promise con los datos del registro creado
 */
export const createDadorOrganos = async (dadorOrganos: DadorOrganos): Promise<DadorOrganos | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await fetch(`${API_URL}/dadores-organos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadorOrganos),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data as DadorOrganos;
  } catch (error) {
    console.error('Error al crear dador de órganos:', error);
    throw error;
  }
};

/**
 * Actualiza un registro de dador de órganos existente
 * @param valor Valor (clave primaria) del registro
 * @param descripcion Nueva descripción
 * @returns Promise con los datos actualizados
 */
export const updateDadorOrganos = async (valor: string, descripcion: string): Promise<DadorOrganos | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await fetch(`${API_URL}/dadores-organos/${valor}`, {
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
    return data.data as DadorOrganos;
  } catch (error) {
    console.error(`Error al actualizar dador de órganos con valor ${valor}:`, error);
    throw error;
  }
};

/**
 * Elimina un registro de dador de órganos existente
 * @param valor Valor (clave primaria) del registro a eliminar
 * @returns Promise que resuelve cuando la eliminación se completa
 */
export const deleteDadorOrganos = async (valor: string): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos
    
    const response = await fetch(`${API_URL}/dadores-organos/${valor}`, {
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
    console.error(`Error al eliminar dador de órganos con valor ${valor}:`, error);
    throw error;
  }
};
