/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Tipo de Admisión
 * @module services/tipoAdmision.service
 */

import { TipoAdmision } from '../types/tipoAdmision.types';
import { apiFetch } from '@/app/utils/authFetch';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const TIPO_ADMISION_FALLBACK: TipoAdmision[] = [
  { valor: 'A', descripcion: 'Admisión Regular' },
  { valor: 'E', descripcion: 'Emergencia' },
  { valor: 'C', descripcion: 'Consulta Externa' },
  { valor: 'T', descripcion: 'Transferencia' }
];

/**
 * Clase que implementa el servicio de gestión de tipos de admisión
 */
export class TipoAdmisionService {
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
    this.getTiposAdmision = this.getTiposAdmision.bind(this);
    this.getTipoAdmision = this.getTipoAdmision.bind(this);
    this.createTipoAdmision = this.createTipoAdmision.bind(this);
    this.updateTipoAdmision = this.updateTipoAdmision.bind(this);
    this.deleteTipoAdmision = this.deleteTipoAdmision.bind(this);
  }

  /**
   * Obtiene todos los tipos de admisión
   * @returns {Promise<TipoAdmision[]>} Lista de tipos de admisión
   */
  async getTiposAdmision(): Promise<TipoAdmision[]> {
    try {
      console.log('Solicitando tipos de admisión al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipoadmision`;
      console.log('URL de la solicitud:', url);
      
      const response = await apiFetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener tipos de admisión:', response.status, response.statusText);
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
      console.error('Error en getTiposAdmision:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene un tipo de admisión por su valor
   * @param {string} valor - Valor del tipo de admisión a buscar
   * @returns {Promise<TipoAdmision | null>} Tipo de admisión encontrado o null si no se encuentra
   */
  async getTipoAdmision(valor: string): Promise<TipoAdmision | null> {
    try {
      console.log(`Solicitando tipo de admisión con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipoadmision/${valor}`;
      const response = await apiFetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener tipo de admisión:', response.status, response.statusText);
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
      console.error(`Error en getTipoAdmision(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo tipo de admisión
   * @param {TipoAdmision} tipoAdmision - Datos del tipo de admisión a crear
   * @returns {Promise<TipoAdmision | null>} Tipo de admisión creado o null si hay un error
   */
  async createTipoAdmision(tipoAdmision: TipoAdmision): Promise<TipoAdmision | null> {
    try {
      console.log('Creando nuevo tipo de admisión:', tipoAdmision);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipoadmision`;
      const response = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tipoAdmision),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear tipo de admisión:', response.status, response.statusText);
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
      console.error('Error en createTipoAdmision:', error);
      return null;
    }
  }

  /**
   * Actualiza un tipo de admisión existente
   * @param {string} valor - Valor del tipo de admisión a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<TipoAdmision | null>} Tipo de admisión actualizado o null si hay un error
   */
  async updateTipoAdmision(valor: string, descripcion: string): Promise<TipoAdmision | null> {
    try {
      console.log(`Actualizando tipo de admisión ${valor} con nueva descripción:`, descripcion);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipoadmision/${valor}`;
      const response = await apiFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al actualizar tipo de admisión:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        console.warn('La actualización no fue exitosa:', result);
        return null;
      }
    } catch (error) {
      console.error(`Error en updateTipoAdmision(${valor}):`, error);
      return null;
    }
  }

  /**
   * Elimina un tipo de admisión
   * @param {string} valor - Valor del tipo de admisión a eliminar
   * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario
   */
  async deleteTipoAdmision(valor: string): Promise<boolean> {
    try {
      console.log(`Eliminando tipo de admisión con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipoadmision/${valor}`;
      const response = await apiFetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar tipo de admisión:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      
      return result.success === true;
    } catch (error) {
      console.error(`Error en deleteTipoAdmision(${valor}):`, error);
      return false;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {TipoAdmision[]} Datos de ejemplo
   */
  private getFallbackData(): TipoAdmision[] {
    console.log('Utilizando datos de fallback para tipos de admisión');
    return TIPO_ADMISION_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const tipoAdmisionService = new TipoAdmisionService();
export const { 
  getTiposAdmision, 
  getTipoAdmision, 
  createTipoAdmision, 
  updateTipoAdmision, 
  deleteTipoAdmision 
} = tipoAdmisionService;
