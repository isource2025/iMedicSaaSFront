/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Requisito
 * @module services/requisito.service
 */

import { Requisito } from '../types/requisito.types';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const REQUISITOS_FALLBACK: Requisito[] = [
  { Valor: 1, Descripcion: 'Documento de Identidad', AplicableAlPaciente: 'Sí' },
  { Valor: 2, Descripcion: 'Obra Social', AplicableAlPaciente: 'Sí' },
  { Valor: 3, Descripcion: 'Orden Médica', AplicableAlPaciente: 'Sí' },
  { Valor: 4, Descripcion: 'Solicitud de Internación', AplicableAlPaciente: 'No' }
];

/**
 * Clase que implementa el servicio de gestión de requisitos
 */
export class RequisitoService {
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
    this.getRequisitos = this.getRequisitos.bind(this);
    this.getRequisito = this.getRequisito.bind(this);
    this.createRequisito = this.createRequisito.bind(this);
    this.updateRequisito = this.updateRequisito.bind(this);
    this.deleteRequisito = this.deleteRequisito.bind(this);
  }

  /**
   * Obtiene todos los requisitos
   * @returns {Promise<Requisito[]>} Lista de requisitos
   */
  async getRequisitos(): Promise<Requisito[]> {
    try {
      console.log('Solicitando requisitos al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/requisitos`;
      console.log('URL de la solicitud:', url);
      
      const response = await fetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener requisitos:', response.status, response.statusText);
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
      console.error('Error en getRequisitos:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene un requisito por su valor
   * @param {number} valor - Valor del requisito a buscar
   * @returns {Promise<Requisito | null>} Requisito encontrado o null si no se encuentra
   */
  async getRequisito(valor: number): Promise<Requisito | null> {
    try {
      console.log(`Solicitando requisito con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/requisitos/${valor}`;
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener requisito:', response.status, response.statusText);
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
      console.error(`Error en getRequisito(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo requisito
   * @param {Requisito} requisito - Datos del requisito a crear
   * @returns {Promise<Requisito | null>} Requisito creado o null si hay un error
   */
  async createRequisito(requisito: Requisito): Promise<Requisito | null> {
    try {
      console.log('Creando nuevo requisito:', requisito);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/requisitos`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requisito),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear requisito:', response.status, response.statusText);
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
      console.error('Error en createRequisito:', error);
      return null;
    }
  }

  /**
   * Actualiza un requisito existente
   * @param {number} valor - Valor del requisito a actualizar
   * @param {Partial<Requisito>} datos - Datos a actualizar (descripción y/o aplicableAlPaciente)
   * @returns {Promise<void>} Promise que se resuelve cuando la actualización es exitosa
   */
  async updateRequisito(valor: number, datos: Partial<Omit<Requisito, 'Valor'>>): Promise<void> {
    try {
      console.log(`Actualizando requisito ${valor} con datos:`, datos);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/requisitos/${valor}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al actualizar requisito:', response.status, response.statusText);
        throw new Error(`Error al actualizar requisito: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La actualización no fue exitosa:', result);
        throw new Error(result.message || 'Error al actualizar requisito');
      }
    } catch (error) {
      console.error(`Error en updateRequisito(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Elimina un requisito
   * @param {number} valor - Valor del requisito a eliminar
   * @returns {Promise<void>} Promise que se resuelve cuando la eliminación es exitosa
   */
  async deleteRequisito(valor: number): Promise<void> {
    try {
      console.log(`Eliminando requisito con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/requisitos/${valor}`;
      const response = await fetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar requisito:', response.status, response.statusText);
        throw new Error(`Error al eliminar requisito: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.warn('La eliminación no fue exitosa:', result);
        throw new Error(result.message || 'Error al eliminar requisito');
      }
    } catch (error) {
      console.error(`Error en deleteRequisito(${valor}):`, error);
      throw error;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {Requisito[]} Datos de ejemplo
   */
  private getFallbackData(): Requisito[] {
    console.log('Utilizando datos de fallback para requisitos');
    return REQUISITOS_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const requisitoService = new RequisitoService();
export const { getRequisitos, getRequisito, createRequisito, updateRequisito, deleteRequisito } = requisitoService;
