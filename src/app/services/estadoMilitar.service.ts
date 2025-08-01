import { EstadoMilitar } from '../types/estadoMilitar.types';

/**
 * Servicio para gestionar los Estados Militares
 */
class EstadoMilitarService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todos los estados militares
   * @returns Promise con la lista de estados militares
   */
  async getEstadosMilitares(): Promise<EstadoMilitar[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/estados-militares`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Error al obtener los estados militares');
      }
      
      const data = await response.json();
      // Mapear los datos para que coincidan con la interfaz EstadoMilitar
      const mappedData = data.map((item: any) => ({
        Valor: item.valor,
        Descripcion: item.descripcion
      }));
      return mappedData;
    } catch (error) {
      console.error('Error en el servicio de estados militares:', error);
      return [];
    }
  }

  /**
   * Obtiene un estado militar por su valor
   * @param valor Valor del estado militar
   * @returns Promise con el estado militar
   */
  async getEstadoMilitar(valor: string): Promise<EstadoMilitar | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/estados-militares/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error al obtener el estado militar con valor ${valor}`);
      }
      
      const data = await response.json();
      // Mapear los datos si es necesario
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error) {
      console.error('Error en el servicio de estados militares:', error);
      return null;
    }
  }
  
  /**
   * Crea un nuevo estado militar
   * @param estadoMilitar Datos del estado militar a crear
   * @returns Promise con el resultado de la operación
   */
  async createEstadoMilitar(estadoMilitar: EstadoMilitar): Promise<EstadoMilitar | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/estados-militares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valor: estadoMilitar.Valor,
          descripcion: estadoMilitar.Descripcion
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el estado militar');
      }
      
      const data = await response.json();
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error: any) {
      console.error('Error en el servicio de estados militares:', error);
      throw new Error(error.message || 'Error al crear el estado militar');
    }
  }
  
  /**
   * Actualiza un estado militar existente
   * @param valor Valor del estado militar a actualizar
   * @param descripcion Nueva descripción
   * @returns Promise con el resultado de la operación
   */
  async updateEstadoMilitar(valor: string, descripcion: string): Promise<EstadoMilitar | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/estados-militares/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar el estado militar con valor ${valor}`);
      }
      
      const data = await response.json();
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error: any) {
      console.error('Error en el servicio de estados militares:', error);
      throw new Error(error.message || `Error al actualizar el estado militar con valor ${valor}`);
    }
  }
  
  /**
   * Elimina un estado militar
   * @param valor Valor del estado militar a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteEstadoMilitar(valor: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/estados-militares/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el estado militar con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de estados militares:', error);
      throw new Error(error.message || `Error al eliminar el estado militar con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const estadoMilitarService = new EstadoMilitarService();

// Exportar métodos individuales para mayor comodidad
export const getEstadosMilitares = estadoMilitarService.getEstadosMilitares.bind(estadoMilitarService);
export const getEstadoMilitar = estadoMilitarService.getEstadoMilitar.bind(estadoMilitarService);
export const createEstadoMilitar = estadoMilitarService.createEstadoMilitar.bind(estadoMilitarService);
export const updateEstadoMilitar = estadoMilitarService.updateEstadoMilitar.bind(estadoMilitarService);
export const deleteEstadoMilitar = estadoMilitarService.deleteEstadoMilitar.bind(estadoMilitarService);

// Exportar la clase e interfaz para uso directo si es necesario
export type { EstadoMilitar };
export { EstadoMilitarService };
