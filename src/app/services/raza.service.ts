/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Raza
 * @module services/raza.service
 */

import { Raza } from '../types/raza.types';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const RAZAS_FALLBACK: Raza[] = [
  { Valor: 1, Descripcion: 'Blanca' },
  { Valor: 2, Descripcion: 'Negra' },
  { Valor: 3, Descripcion: 'Amarilla' },
  { Valor: 4, Descripcion: 'Cobriza' }
];

/**
 * Clase que implementa el servicio de gestión de razas
 */
export class RazaService {
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
    this.getRazas = this.getRazas.bind(this);
    this.getRaza = this.getRaza.bind(this);
    this.createRaza = this.createRaza.bind(this);
    this.updateRaza = this.updateRaza.bind(this);
    this.deleteRaza = this.deleteRaza.bind(this);
  }

  /**
   * Obtiene todas las razas
   * @returns {Promise<Raza[]>} Lista de razas
   */
  async getRazas(): Promise<Raza[]> {
    try {
      console.log('Solicitando razas al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/raza`;
      console.log('URL de la solicitud:', url);
      
      const response = await fetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener razas:', response.status, response.statusText);
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
      console.error('Error en getRazas:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene una raza por su valor
   * @param {number} valor - Valor de la raza a buscar
   * @returns {Promise<Raza | null>} Raza encontrada o null si no se encuentra
   */
  async getRaza(valor: number): Promise<Raza | null> {
    try {
      console.log(`Solicitando raza con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/raza/${valor}`;
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener raza:', response.status, response.statusText);
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
      console.error(`Error en getRaza(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea una nueva raza
   * @param {Raza} raza - Datos de la raza a crear
   * @returns {Promise<Raza | null>} Raza creada o null si hay un error
   */
  async createRaza(raza: Raza): Promise<Raza | null> {
    try {
      console.log('Creando nueva raza:', raza);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/raza`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(raza),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear raza:', response.status, response.statusText);
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
      console.error('Error en createRaza:', error);
      return null;
    }
  }

  /**
   * Actualiza una raza existente
   * @param {number} valor - Valor de la raza a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<void>} Promise que se resuelve cuando la actualización es exitosa
   */
  async updateRaza(valor: number, descripcion: string): Promise<void> {
    try {
      console.log(`Actualizando raza ${valor} con descripción: ${descripcion}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/raza/${valor}`;
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
        console.error('Error al actualizar raza:', response.status, response.statusText);
        throw new Error(`Error al actualizar raza: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La actualización no fue exitosa:', result);
        throw new Error(result.message || 'Error al actualizar raza');
      }
    } catch (error) {
      console.error(`Error en updateRaza(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Elimina una raza
   * @param {number} valor - Valor de la raza a eliminar
   * @returns {Promise<void>} Promise que se resuelve cuando la eliminación es exitosa
   */
  async deleteRaza(valor: number): Promise<void> {
    try {
      console.log(`Eliminando raza con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/raza/${valor}`;
      const response = await fetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar raza:', response.status, response.statusText);
        throw new Error(`Error al eliminar raza: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La eliminación no fue exitosa:', result);
        throw new Error(result.message || 'Error al eliminar raza');
      }
    } catch (error) {
      console.error(`Error en deleteRaza(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {Raza[]} Datos de ejemplo
   */
  private getFallbackData(): Raza[] {
    console.log('Utilizando datos de fallback para razas');
    return RAZAS_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const razaService = new RazaService();
export const { getRazas, getRaza, createRaza, updateRaza, deleteRaza } = razaService;
