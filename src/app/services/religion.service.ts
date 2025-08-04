/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Religion
 * @module services/religion.service
 */

import { Religion } from '../types/religion.types';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const RELIGIONES_FALLBACK: Religion[] = [
  { Valor: 'CAT', Descripcion: 'Católica' },
  { Valor: 'JUD', Descripcion: 'Judía' },
  { Valor: 'PRO', Descripcion: 'Protestante' },
  { Valor: 'EVA', Descripcion: 'Evangélica' },
  { Valor: 'MUS', Descripcion: 'Musulmana' },
  { Valor: 'BUD', Descripcion: 'Budista' },
  { Valor: 'ATN', Descripcion: 'Ateo/Agnóstico' },
  { Valor: 'OTR', Descripcion: 'Otra' }
];

/**
 * Clase que implementa el servicio de gestión de religiones
 */
export class ReligionService {
  private apiUrl: string;
  private timeoutDuration: number;

  /**
   * Constructor del servicio
   * @param apiBaseUrl URL base de la API (opcional, por defecto usa la variable de entorno)
   */
  constructor(apiBaseUrl?: string) {
    // Usar la URL de la API proporcionada o la variable de entorno
    this.apiUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || '';
    
    // Establecer el timeout en 5 segundos para evitar esperas indefinidas
    this.timeoutDuration = 5000;

    // Binding de los métodos para preservar el contexto 'this'
    this.getReligiones = this.getReligiones.bind(this);
    this.getReligion = this.getReligion.bind(this);
    this.createReligion = this.createReligion.bind(this);
    this.updateReligion = this.updateReligion.bind(this);
    this.deleteReligion = this.deleteReligion.bind(this);
  }

  /**
   * Obtiene todas las religiones
   * @returns {Promise<Religion[]>} Lista de religiones
   */
  async getReligiones(): Promise<Religion[]> {
    try {
      console.log('Solicitando religiones al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/religion`;
      console.log('URL de la solicitud:', url);
      
      const response = await fetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener religiones:', response.status, response.statusText);
        return this.getFallbackData();
      }

      const result = await response.json();
      console.log('Respuesta del backend:', result);
      
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      } else {
        console.warn('El formato de respuesta no es el esperado:', result);
        return this.getFallbackData();
      }
    } catch (error) {
      console.error('Error en getReligiones:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene una religión por su valor
   * @param {string} valor - Valor de la religión a buscar
   * @returns {Promise<Religion | null>} Religión encontrada o null si no se encuentra
   */
  async getReligion(valor: string): Promise<Religion | null> {
    try {
      console.log(`Solicitando religión con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/religion/${valor}`;
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener religión:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('El formato de respuesta no es el esperado:', result);
        return null;
      }
    } catch (error) {
      console.error(`Error en getReligion(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea una nueva religión
   * @param {Religion} religion - Datos de la religión a crear
   * @returns {Promise<Religion | null>} Religión creada o null si hay un error
   */
  async createReligion(religion: Religion): Promise<Religion | null> {
    try {
      console.log('Creando nueva religión:', religion);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/religion`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(religion),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear religión:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('El formato de respuesta no es el esperado:', result);
        return null;
      }
    } catch (error) {
      console.error('Error en createReligion:', error);
      return null;
    }
  }

  /**
   * Actualiza una religión existente
   * @param {string} valor - Valor de la religión a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<void>} Promise que se resuelve cuando la actualización es exitosa
   */
  async updateReligion(valor: string, descripcion: string): Promise<void> {
    try {
      console.log(`Actualizando religión ${valor} con descripción: ${descripcion}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/religion/${valor}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Descripcion: descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al actualizar religión:', response.status, response.statusText);
        throw new Error(`Error al actualizar religión: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La actualización no fue exitosa:', result);
        throw new Error(result.message || 'Error al actualizar religión');
      }
    } catch (error) {
      console.error(`Error en updateReligion(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Elimina una religión
   * @param {string} valor - Valor de la religión a eliminar
   * @returns {Promise<void>} Promise que se resuelve cuando la eliminación es exitosa
   */
  async deleteReligion(valor: string): Promise<void> {
    try {
      console.log(`Eliminando religión con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/religion/${valor}`;
      const response = await fetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar religión:', response.status, response.statusText);
        throw new Error(`Error al eliminar religión: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La eliminación no fue exitosa:', result);
        throw new Error(result.message || 'Error al eliminar religión');
      }
    } catch (error) {
      console.error(`Error en deleteReligion(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {Religion[]} Datos de ejemplo
   */
  private getFallbackData(): Religion[] {
    console.log('Utilizando datos de fallback para religiones');
    return RELIGIONES_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const religionService = new ReligionService();
export const { getReligiones, getReligion, createReligion, updateReligion, deleteReligion } = religionService;
