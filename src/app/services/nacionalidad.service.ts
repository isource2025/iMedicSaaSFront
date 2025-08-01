import { Nacionalidad } from '../types/nacionalidad.types';

// Datos de fallback para usar cuando falla la conexión con el backend
const NACIONALIDADES_FALLBACK: Nacionalidad[] = [
  { Valor: 'AR', Descripcion: 'Argentina' },
  { Valor: 'BR', Descripcion: 'Brasil' },
  { Valor: 'CL', Descripcion: 'Chile' },
  { Valor: 'UY', Descripcion: 'Uruguay' },
  { Valor: 'PY', Descripcion: 'Paraguay' }
];

/**
 * Servicio para gestionar las nacionalidades
 */
class NacionalidadService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todas las nacionalidades
   * @returns Promise con la lista de nacionalidades
   */
  async getNacionalidades(): Promise<Nacionalidad[]> {
    try {
      // Asegurarnos que la URL esté correctamente formateada
      const url = `${this.apiUrl}/nacionalidad`;
      console.log('[DEBUG] Intentando acceder a:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      console.log('[DEBUG] Iniciando fetch con timeout de 5s');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal
      });
      console.log('[DEBUG] GET Nacionalidades - Status:', response.status);
      
      clearTimeout(timeoutId);
      
      // Si hay un problema con la respuesta, usar datos de fallback
      if (!response.ok) {
        console.warn(`[ERROR] Respuesta no válida: ${response.status} ${response.statusText}. URL: ${url}. Usando datos de fallback.`);
        return NACIONALIDADES_FALLBACK;
      }
      
      // Obtener el JSON directamente
      const responseData = await response.json();
      console.log('[DEBUG] Respuesta JSON recibida:', responseData);
      
      // Verificar la estructura de la respuesta
      if (!responseData || !responseData.success) {
        console.warn('[ERROR] La respuesta no tiene éxito o estructura incorrecta. Usando datos de fallback.');
        return NACIONALIDADES_FALLBACK;
      }

      // La API devuelve los datos en la propiedad data
      if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
        console.warn('[ERROR] No hay datos en la respuesta. Usando datos de fallback.');
        return NACIONALIDADES_FALLBACK;
      }
      
      // Mapear los datos para que coincidan con la interfaz Nacionalidad
      const mappedData = responseData.data.map((item: any) => ({
        Valor: item.Valor || '',
        Descripcion: item.Descripcion || ''
      }));
      
      return mappedData;
    } catch (error) {
      console.error('[ERROR] Error en el servicio de nacionalidades:', error);
      return NACIONALIDADES_FALLBACK;
    }
  }

  /**
   * Obtiene una nacionalidad por su valor
   * @param valor Valor de la nacionalidad a buscar
   * @returns Promise con la nacionalidad encontrada o null si no existe
   */
  async getNacionalidad(valor: string): Promise<Nacionalidad | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/nacionalidad/${valor}`, {
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
        Descripcion: data.Descripcion
      };
    } catch (error) {
      console.error('Error en el servicio de nacionalidades:', error);
      return null;
    }
  }

  /**
   * Crea una nueva nacionalidad
   * @param nacionalidad Datos de la nacionalidad a crear
   * @returns Promise con el resultado de la operación
   */
  async createNacionalidad(nacionalidad: Nacionalidad): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/nacionalidad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nacionalidad),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la nacionalidad');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de nacionalidades:', error);
      throw new Error(error.message || 'Error al crear la nacionalidad');
    }
  }

  /**
   * Actualiza una nacionalidad existente
   * @param valor Valor de la nacionalidad a actualizar
   * @param descripcion Nueva descripción para la nacionalidad
   * @returns Promise con el resultado de la operación
   */
  async updateNacionalidad(valor: string, descripcion: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/nacionalidad/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Descripcion: descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar la nacionalidad con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de nacionalidades:', error);
      throw new Error(error.message || `Error al actualizar la nacionalidad con valor ${valor}`);
    }
  }

  /**
   * Elimina una nacionalidad por su valor
   * @param valor Valor de la nacionalidad a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteNacionalidad(valor: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.apiUrl}/nacionalidad/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar la nacionalidad con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de nacionalidades:', error);
      throw new Error(error.message || `Error al eliminar la nacionalidad con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const nacionalidadService = new NacionalidadService();

// Exportamos las funciones pero vinculadas al servicio para mantener el contexto 'this'
export const getNacionalidades = nacionalidadService.getNacionalidades.bind(nacionalidadService);
export const getNacionalidad = nacionalidadService.getNacionalidad.bind(nacionalidadService);
export const createNacionalidad = nacionalidadService.createNacionalidad.bind(nacionalidadService);
export const updateNacionalidad = nacionalidadService.updateNacionalidad.bind(nacionalidadService);
export const deleteNacionalidad = nacionalidadService.deleteNacionalidad.bind(nacionalidadService);
