import { Localidad } from '../types/localidad.types';
import { apiFetch } from '@/app/utils/authFetch';

// Datos de fallback para usar cuando falla la conexión con el backend
const LOCALIDADES_FALLBACK: Localidad[] = [
  { Valor: 1, CodigoPostal: 1000, NombreLocalidad: 'Buenos Aires', ValorProvincia: 'BUE' },
  { Valor: 2, CodigoPostal: 2000, NombreLocalidad: 'Córdoba', ValorProvincia: 'CBA' },
  { Valor: 3, CodigoPostal: 3000, NombreLocalidad: 'Santa Fe', ValorProvincia: 'SFE' },
  { Valor: 4, CodigoPostal: 4000, NombreLocalidad: 'San Miguel de Tucumán', ValorProvincia: 'TUC' },
  { Valor: 5, CodigoPostal: 5000, NombreLocalidad: 'Mendoza', ValorProvincia: 'MZA' }
];

/**
 * Servicio para gestionar las localidades
 */
class LocalidadService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todas las localidades
   * @returns Promise con la lista de localidades
   */
  async getLocalidades(): Promise<Localidad[]> {
    try {
      // Asegurarnos que la URL esté correctamente formateada
      let baseUrl = this.apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1); // Eliminar slash final si existe
      }

      const url = `${baseUrl}/localidad`;
      console.log('[DEBUG] Intentando acceder a:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      console.log('[DEBUG] Iniciando fetch con timeout de 5s');
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('[DEBUG] Respuesta recibida, status:', response.status);
      
      // Si hay un problema con la respuesta, usar datos de fallback
      if (!response.ok) {
        console.warn(`[ERROR] Respuesta no válida: ${response.status} ${response.statusText}. URL: ${url}. Usando datos de fallback.`);
        return LOCALIDADES_FALLBACK;
      }
      
      // Usar texto primero para verificar el contenido
      const responseText = await response.text();
      console.log('[DEBUG] Texto de respuesta:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
      
      // Intentar parsear el JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[DEBUG] JSON parseado correctamente:', typeof data, Array.isArray(data?.data) ? 'Es un array' : 'No es un array');
        
        // El controlador del backend devuelve los datos en una propiedad data
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
      } catch (parseError) {
        console.warn('[ERROR] Fallo al parsear JSON, usando datos de fallback:', parseError);
        return LOCALIDADES_FALLBACK;
      }

      // Verificar que data es un array antes de intentar mapearlo
      if (!Array.isArray(data)) {
        console.warn('La respuesta no es un array, usando datos de fallback');
        return LOCALIDADES_FALLBACK;
      }
      
      // Si el array está vacío, usar datos de fallback
      if (data.length === 0) {
        console.warn('El backend devolvió un array vacío, usando datos de fallback');
        return LOCALIDADES_FALLBACK;
      }

      // Mapear los datos para que coincidan con la interfaz Localidad
      const mappedData = data.map((item: any) => ({
        Valor: item.Valor || 0,
        CodigoPostal: item.CodigoPostal || 0,
        NombreLocalidad: item.NombreLocalidad || '',
        ValorProvincia: item.ValorProvincia || ''
      }));
      
      return mappedData;
    } catch (error) {
      console.warn('Error en el servicio de localidades, usando datos de fallback:', error);
      return LOCALIDADES_FALLBACK;
    }
  }

  /**
   * Obtiene una localidad por su valor
   * @param valor Valor de la localidad a buscar
   * @returns Promise con la localidad encontrada o null si no existe
   */
  async getLocalidad(valor: number): Promise<Localidad | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/localidad/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Si es 404, no es un error, simplemente no existe
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        Valor: data.Valor,
        CodigoPostal: data.CodigoPostal,
        NombreLocalidad: data.NombreLocalidad,
        ValorProvincia: data.ValorProvincia
      };
    } catch (error) {
      console.error('Error en el servicio de localidades:', error);
      return null;
    }
  }

  /**
   * Crea una nueva localidad
   * @param localidad Datos de la localidad a crear
   * @returns Promise con el resultado de la operación
   */
  async createLocalidad(localidad: Localidad): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/localidad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localidad),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la localidad');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de localidades:', error);
      throw new Error(error.message || 'Error al crear la localidad');
    }
  }

  /**
   * Actualiza una localidad existente
   * @param valor Valor de la localidad a actualizar
   * @param localidadData Datos actualizados de la localidad
   * @returns Promise con el resultado de la operación
   */
  async updateLocalidad(valor: number, localidadData: Partial<Localidad>): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/localidad/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localidadData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar la localidad con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de localidades:', error);
      throw new Error(error.message || `Error al actualizar la localidad con valor ${valor}`);
    }
  }

  /**
   * Elimina una localidad por su valor
   * @param valor Valor de la localidad a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteLocalidad(valor: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/localidad/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar la localidad con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de localidades:', error);
      throw new Error(error.message || `Error al eliminar la localidad con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const localidadService = new LocalidadService();

// Exportar funciones wrapper para evitar problemas con 'this'
export const getLocalidades = () => localidadService.getLocalidades();
export const getLocalidad = (valor: number) => localidadService.getLocalidad(valor);
export const createLocalidad = (localidad: Localidad) => localidadService.createLocalidad(localidad);
export const updateLocalidad = (valor: number, localidadData: Partial<Localidad>) => 
  localidadService.updateLocalidad(valor, localidadData);
export const deleteLocalidad = (valor: number) => localidadService.deleteLocalidad(valor);

// Exportar la clase e interfaz para uso directo si es necesario
export type { Localidad };
export { LocalidadService };
