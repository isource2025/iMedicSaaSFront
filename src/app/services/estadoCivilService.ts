import { EstadoCivil } from '../types/estadoCivil.types';
import { apiFetch } from '@/app/utils/authFetch';

class EstadoCivilService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Obtiene todos los estados civiles
   * @returns Promise con la lista de estados civiles
   */
  async getEstadosCiviles(): Promise<EstadoCivil[]> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-civiles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener los estados civiles');
      }
      
      const data = await response.json();
      // Mapear los datos para que coincidan con la interfaz EstadoCivil
      const mappedData = data.map((item: any) => ({
        Valor: item.valor,
        Descripcion: item.descripcion
      }));
      return mappedData;
    } catch (error) {
      console.error('Error en el servicio de estados civiles:', error);
      return [];
    }
  }

  /**
   * Obtiene un estado civil por su valor
   * @param valor Valor del estado civil
   * @returns Promise con el estado civil
   */
  async getEstadoCivil(valor: string): Promise<EstadoCivil | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-civiles/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener el estado civil con valor ${valor}`);
      }
      
      const data = await response.json();
      // Mapear los datos si es necesario (aunque aquí se espera un solo objeto)
      return data ? { Valor: data.valor, Descripcion: data.descripcion } : null;
    } catch (error) {
      console.error('Error en el servicio de estados civiles:', error);
      return null;
    }
  }
  
  /**
   * Crea un nuevo estado civil
   * @param estadoCivil Datos del estado civil a crear
   * @returns Promise con el estado civil creado
   */
  async createEstadoCivil(estadoCivil: EstadoCivil): Promise<EstadoCivil | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-civiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Enviamos los datos con las claves esperadas por el backend (probablemente minúsculas)
        body: JSON.stringify({ valor: estadoCivil.Valor, descripcion: estadoCivil.Descripcion })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el estado civil');
      }
      
      const data = await response.json();
      // Mapear los datos de respuesta a la interfaz EstadoCivil
      return data ? { Valor: data.valor, Descripcion: data.descripcion } : null;
    } catch (error: any) {
      console.error('Error en el servicio de estados civiles:', error);
      throw new Error(error.message || 'Error al crear el estado civil');
    }
  }
  
  /**
   * Actualiza un estado civil existente
   * @param valor Valor del estado civil a actualizar
   * @param descripcion Nueva descripción
   * @returns Promise con el estado civil actualizado
   */
  async updateEstadoCivil(valor: string, descripcion: string): Promise<EstadoCivil | null> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-civiles/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        // Enviamos los datos con las claves esperadas por el backend
        body: JSON.stringify({ descripcion: descripcion })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar el estado civil con valor ${valor}`);
      }
      
      const data = await response.json();
      // Mapear los datos de respuesta a la interfaz EstadoCivil
      return data ? { Valor: data.valor, Descripcion: data.descripcion } : null;
    } catch (error: any) {
      console.error('Error en el servicio de estados civiles:', error);
      throw new Error(error.message || `Error al actualizar el estado civil con valor ${valor}`);
    }
  }
  
  /**
   * Elimina un estado civil
   * @param valor Valor del estado civil a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteEstadoCivil(valor: string): Promise<boolean> {
    try {
      const response = await apiFetch(`${this.apiUrl}/estados-civiles/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el estado civil con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de estados civiles:', error);
      throw new Error(error.message || `Error al eliminar el estado civil con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio para su uso en la aplicación
const estadoCivilServiceInstance = new EstadoCivilService();

export const getEstadosCiviles = estadoCivilServiceInstance.getEstadosCiviles.bind(estadoCivilServiceInstance);
export const getEstadoCivil = estadoCivilServiceInstance.getEstadoCivil.bind(estadoCivilServiceInstance);
export const createEstadoCivil = estadoCivilServiceInstance.createEstadoCivil.bind(estadoCivilServiceInstance);
export const updateEstadoCivil = estadoCivilServiceInstance.updateEstadoCivil.bind(estadoCivilServiceInstance);
export const deleteEstadoCivil = estadoCivilServiceInstance.deleteEstadoCivil.bind(estadoCivilServiceInstance);

export default estadoCivilServiceInstance;
