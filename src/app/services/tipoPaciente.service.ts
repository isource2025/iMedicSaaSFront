/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad Tipo de Paciente
 * @module services/tipoPaciente.service
 */

import { TipoPaciente } from '../types/tipoPaciente.types';
import { apiFetch } from '@/app/utils/authFetch';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const TIPO_PACIENTE_FALLBACK: TipoPaciente[] = [
  { valor: 'A', descripcion: 'Ambulatorio' },
  { valor: 'I', descripcion: 'Internado' },
  { valor: 'U', descripcion: 'Urgencia' },
  { valor: 'C', descripcion: 'Consulta Externa' }
];

/**
 * Clase que implementa el servicio de gestión de tipos de paciente
 */
export class TipoPacienteService {
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
    this.getTiposPaciente = this.getTiposPaciente.bind(this);
    this.getTipoPaciente = this.getTipoPaciente.bind(this);
    this.createTipoPaciente = this.createTipoPaciente.bind(this);
    this.updateTipoPaciente = this.updateTipoPaciente.bind(this);
    this.deleteTipoPaciente = this.deleteTipoPaciente.bind(this);
  }

  /**
   * Obtiene todos los tipos de paciente
   * @returns {Promise<TipoPaciente[]>} Lista de tipos de paciente
   */
  async getTiposPaciente(): Promise<TipoPaciente[]> {
    try {
      console.log('Solicitando tipos de paciente al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipopaciente`;
      console.log('URL de la solicitud:', url);
      
      const response = await apiFetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener tipos de paciente:', response.status, response.statusText);
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
      console.error('Error en getTiposPaciente:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene un tipo de paciente por su valor
   * @param {string} valor - Valor del tipo de paciente a buscar
   * @returns {Promise<TipoPaciente | null>} Tipo de paciente encontrado o null si no se encuentra
   */
  async getTipoPaciente(valor: string): Promise<TipoPaciente | null> {
    try {
      console.log(`Solicitando tipo de paciente con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipopaciente/${valor}`;
      const response = await apiFetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener tipo de paciente:', response.status, response.statusText);
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
      console.error(`Error en getTipoPaciente(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo tipo de paciente
   * @param {TipoPaciente} tipoPaciente - Datos del tipo de paciente a crear
   * @returns {Promise<TipoPaciente | null>} Tipo de paciente creado o null si hay un error
   */
  async createTipoPaciente(tipoPaciente: TipoPaciente): Promise<TipoPaciente | null> {
    try {
      console.log('Creando nuevo tipo de paciente:', tipoPaciente);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipopaciente`;
      const response = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tipoPaciente),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear tipo de paciente:', response.status, response.statusText);
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
      console.error('Error en createTipoPaciente:', error);
      return null;
    }
  }

  /**
   * Actualiza un tipo de paciente existente
   * @param {string} valor - Valor del tipo de paciente a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<TipoPaciente | null>} Tipo de paciente actualizado o null si hay un error
   */
  async updateTipoPaciente(valor: string, descripcion: string): Promise<TipoPaciente | null> {
    try {
      console.log(`Actualizando tipo de paciente ${valor} con nueva descripción:`, descripcion);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipopaciente/${valor}`;
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
        console.error('Error al actualizar tipo de paciente:', response.status, response.statusText);
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
      console.error(`Error en updateTipoPaciente(${valor}):`, error);
      return null;
    }
  }

  /**
   * Elimina un tipo de paciente
   * @param {string} valor - Valor del tipo de paciente a eliminar
   * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario
   */
  async deleteTipoPaciente(valor: string): Promise<boolean> {
    try {
      console.log(`Eliminando tipo de paciente con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/tipopaciente/${valor}`;
      const response = await apiFetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar tipo de paciente:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      
      return result.success === true;
    } catch (error) {
      console.error(`Error en deleteTipoPaciente(${valor}):`, error);
      return false;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {TipoPaciente[]} Datos de ejemplo
   */
  private getFallbackData(): TipoPaciente[] {
    console.log('Utilizando datos de fallback para tipos de paciente');
    return TIPO_PACIENTE_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const tipoPacienteService = new TipoPacienteService();
export const { 
  getTiposPaciente, 
  getTipoPaciente, 
  createTipoPaciente, 
  updateTipoPaciente, 
  deleteTipoPaciente 
} = tipoPacienteService;
