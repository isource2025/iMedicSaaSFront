/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Sexo
 * @module services/sexo.service
 */

import { Sexo } from '../types/sexo.types';
import { apiFetch } from '@/app/utils/authFetch';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const SEXO_FALLBACK: Sexo[] = [
  { valor: 'M', descripcion: 'Masculino' },
  { valor: 'F', descripcion: 'Femenino' },
  { valor: 'O', descripcion: 'Otro' }
];

/**
 * Clase que implementa el servicio de gestión de sexos
 */
export class SexoService {
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
    this.getSexos = this.getSexos.bind(this);
    this.getSexo = this.getSexo.bind(this);
    this.createSexo = this.createSexo.bind(this);
    this.updateSexo = this.updateSexo.bind(this);
    this.deleteSexo = this.deleteSexo.bind(this);
  }

  /**
   * Obtiene todos los sexos
   * @returns {Promise<Sexo[]>} Lista de sexos
   */
  async getSexos(): Promise<Sexo[]> {
    try {
      console.log('Solicitando sexos al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/sexo`;
      console.log('URL de la solicitud:', url);
      
      const response = await apiFetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener sexos:', response.status, response.statusText);
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
      console.error('Error en getSexos:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene un sexo por su valor
   * @param {string} valor - Valor del sexo a buscar
   * @returns {Promise<Sexo | null>} Sexo encontrado o null si no se encuentra
   */
  async getSexo(valor: string): Promise<Sexo | null> {
    try {
      console.log(`Solicitando sexo con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/sexo/${valor}`;
      const response = await apiFetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener sexo:', response.status, response.statusText);
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
      console.error(`Error en getSexo(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo sexo
   * @param {Sexo} sexo - Datos del sexo a crear
   * @returns {Promise<Sexo | null>} Sexo creado o null si hay un error
   */
  async createSexo(sexo: Sexo): Promise<Sexo | null> {
    try {
      console.log('Creando nuevo sexo:', sexo);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/sexo`;
      const response = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sexo),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear sexo:', response.status, response.statusText);
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
      console.error('Error en createSexo:', error);
      return null;
    }
  }

  /**
   * Actualiza un sexo existente
   * @param {string} valor - Valor del sexo a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<Sexo | null>} Sexo actualizado o null si hay un error
   */
  async updateSexo(valor: string, descripcion: string): Promise<Sexo | null> {
    try {
      console.log(`Actualizando sexo ${valor} con nueva descripción:`, descripcion);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/sexo/${valor}`;
      const response = await apiFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Descripcion: descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al actualizar sexo:', response.status, response.statusText);
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
      console.error(`Error en updateSexo(${valor}):`, error);
      return null;
    }
  }

  /**
   * Elimina un sexo
   * @param {string} valor - Valor del sexo a eliminar
   * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario
   */
  async deleteSexo(valor: string): Promise<boolean> {
    try {
      console.log(`Eliminando sexo con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/sexo/${valor}`;
      const response = await apiFetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar sexo:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      
      return result.success === true;
    } catch (error) {
      console.error(`Error en deleteSexo(${valor}):`, error);
      return false;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {Sexo[]} Datos de ejemplo
   */
  private getFallbackData(): Sexo[] {
    console.log('Utilizando datos de fallback para sexos');
    return SEXO_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const sexoService = new SexoService();
export const { getSexos, getSexo, createSexo, updateSexo, deleteSexo } = sexoService;
