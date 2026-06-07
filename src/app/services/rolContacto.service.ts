/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de la entidad RolContacto
 * @module services/rolContacto.service
 */

import { RolContacto } from '../types/rolContacto.types';
import { apiFetch } from '@/app/utils/authFetch';

/**
 * Datos de ejemplo para usar como fallback si falla la conexión
 */
const ROL_CONTACTO_FALLBACK: RolContacto[] = [
  { Valor: 'FAM', Descripcion: 'Familiar' },
  { Valor: 'AMG', Descripcion: 'Amigo/a' },
  { Valor: 'TUT', Descripcion: 'Tutor Legal' },
  { Valor: 'MED', Descripcion: 'Médico de Cabecera' },
  { Valor: 'OTR', Descripcion: 'Otro' }
];

/**
 * Clase que implementa el servicio de gestión de roles de contacto
 */
export class RolContactoService {
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
    this.getRolesContacto = this.getRolesContacto.bind(this);
    this.getRolContacto = this.getRolContacto.bind(this);
    this.createRolContacto = this.createRolContacto.bind(this);
    this.updateRolContacto = this.updateRolContacto.bind(this);
    this.deleteRolContacto = this.deleteRolContacto.bind(this);
  }

  /**
   * Obtiene todos los roles de contacto
   * @returns {Promise<RolContacto[]>} Lista de roles de contacto
   */
  async getRolesContacto(): Promise<RolContacto[]> {
    try {
      console.log('Solicitando roles de contacto al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/rolcontacto`;
      console.log('URL de la solicitud:', url);
      
      const response = await apiFetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener roles de contacto:', response.status, response.statusText);
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
      console.error('Error en getRolesContacto:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Obtiene un rol de contacto por su valor
   * @param {string} valor - Valor del rol de contacto a buscar
   * @returns {Promise<RolContacto | null>} Rol de contacto encontrado o null si no se encuentra
   */
  async getRolContacto(valor: string): Promise<RolContacto | null> {
    try {
      console.log(`Solicitando rol de contacto con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/rolcontacto/${valor}`;
      const response = await apiFetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener rol de contacto:', response.status, response.statusText);
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
      console.error(`Error en getRolContacto(${valor}):`, error);
      return null;
    }
  }

  /**
   * Crea un nuevo rol de contacto
   * @param {RolContacto} rolContacto - Datos del rol de contacto a crear
   * @returns {Promise<RolContacto | null>} Rol de contacto creado o null si hay un error
   */
  async createRolContacto(rolContacto: RolContacto): Promise<RolContacto | null> {
    try {
      console.log('Creando nuevo rol de contacto:', rolContacto);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/rolcontacto`;
      const response = await apiFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rolContacto),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear rol de contacto:', response.status, response.statusText);
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
      console.error('Error en createRolContacto:', error);
      return null;
    }
  }

  /**
   * Actualiza un rol de contacto existente
   * @param {string} valor - Valor del rol de contacto a actualizar
   * @param {string} descripcion - Nueva descripción
   * @returns {Promise<RolContacto | null>} Rol de contacto actualizado o null si hay un error
   */
  async updateRolContacto(valor: string, descripcion: string): Promise<RolContacto | null> {
    try {
      console.log(`Actualizando rol de contacto ${valor} con nueva descripción:`, descripcion);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/rolcontacto/${valor}`;
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
        console.error('Error al actualizar rol de contacto:', response.status, response.statusText);
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
      console.error(`Error en updateRolContacto(${valor}):`, error);
      return null;
    }
  }

  /**
   * Elimina un rol de contacto
   * @param {string} valor - Valor del rol de contacto a eliminar
   * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario
   */
  async deleteRolContacto(valor: string): Promise<boolean> {
    try {
      console.log(`Eliminando rol de contacto con valor ${valor}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/rolcontacto/${valor}`;
      const response = await apiFetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar rol de contacto:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      
      return result.success === true;
    } catch (error) {
      console.error(`Error en deleteRolContacto(${valor}):`, error);
      return false;
    }
  }

  /**
   * Obtiene datos de ejemplo cuando falla la conexión al backend
   * @returns {RolContacto[]} Datos de ejemplo
   */
  private getFallbackData(): RolContacto[] {
    console.log('Utilizando datos de fallback para roles de contacto');
    return ROL_CONTACTO_FALLBACK;
  }
}

// Exportar las funciones del servicio como instancias para facilitar su uso
const rolContactoService = new RolContactoService();
export const { getRolesContacto, getRolContacto, createRolContacto, updateRolContacto, deleteRolContacto } = rolContactoService;
