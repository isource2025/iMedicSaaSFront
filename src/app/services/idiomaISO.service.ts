import { IdiomaISO } from '../types/idiomaISO.types';
import { apiFetch } from '@/app/utils/authFetch';

// Datos de fallback para usar cuando falla la conexión con el backend
const IDIOMAS_ISO_FALLBACK: IdiomaISO[] = [
  { Valor: 'ESP', Descripcion: 'Español' },
  { Valor: 'ENG', Descripcion: 'Inglés' },
  { Valor: 'POR', Descripcion: 'Portugués' },
  { Valor: 'FRA', Descripcion: 'Francés' },
  { Valor: 'DEU', Descripcion: 'Alemán' }
];

/**
 * Servicio para gestionar los Idiomas ISO
 */
class IdiomaISOService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todos los idiomas ISO
   * @returns Promise con la lista de idiomas ISO
   */
  async getIdiomasISO(): Promise<IdiomaISO[]> {
    try {
      // Asegurarnos que la URL esté correctamente formateada
      let baseUrl = this.apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1); // Eliminar slash final si existe
      }

      const url = `${baseUrl}/idiomas-iso`;
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
        return IDIOMAS_ISO_FALLBACK;
      }
      
      // Usar texto primero para verificar el contenido
      const responseText = await response.text();
      console.log('[DEBUG] Texto de respuesta:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
      
      // Intentar parsear el JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[DEBUG] JSON parseado correctamente:', typeof data, Array.isArray(data) ? 'Es un array' : 'No es un array');
      } catch (parseError) {
        console.warn('[ERROR] Fallo al parsear JSON, usando datos de fallback:', parseError);
        return IDIOMAS_ISO_FALLBACK;
      }

      // Verificar que data es un array antes de intentar mapearlo
      if (!Array.isArray(data)) {
        console.warn('La respuesta no es un array, usando datos de fallback');
        return IDIOMAS_ISO_FALLBACK;
      }
      
      // Si el array está vacío, usar datos de fallback
      if (data.length === 0) {
        console.warn('El backend devolvió un array vacío, usando datos de fallback');
        return IDIOMAS_ISO_FALLBACK;
      }

      // Mapear los datos para que coincidan con la interfaz IdiomaISO
      const mappedData = data.map((item: any) => ({
        Valor: item.Valor || '',
        Descripcion: item.Descripcion || ''
      }));
      
      return mappedData;
    } catch (error) {
      console.warn('Error en el servicio de idiomas ISO, usando datos de fallback:', error);
      return IDIOMAS_ISO_FALLBACK;
    }
  }

  /**
   * Obtiene un idioma ISO por su valor
   * @param valor Valor del idioma ISO a buscar
   * @returns Promise con el idioma ISO encontrado o null si no existe
   */
  async getIdiomaISO(valor: string): Promise<IdiomaISO | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/idiomas-iso/${valor}`, {
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
        throw new Error(`Error al obtener el idioma ISO con valor ${valor}`);
      }
      
      const data = await response.json();
      return {
        Valor: data.Valor,
        Descripcion: data.Descripcion
      };
    } catch (error) {
      console.error('Error en el servicio de idiomas ISO:', error);
      // Para búsqueda por valor, si falla devolvemos null
      return null;
    }
  }

  /**
   * Crea un nuevo idioma ISO
   * @param idiomaISO Datos del idioma ISO a crear
   * @returns Promise con el resultado de la operación
   */
  async createIdiomaISO(idiomaISO: IdiomaISO): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/idiomas-iso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(idiomaISO),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el idioma ISO');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de idiomas ISO:', error);
      throw new Error(error.message || 'Error al crear el idioma ISO');
    }
  }

  /**
   * Actualiza un idioma ISO existente
   * @param valor Valor del idioma ISO a actualizar
   * @param descripcion Nueva descripción del idioma ISO
   * @returns Promise con el resultado de la operación
   */
  async updateIdiomaISO(valor: string, descripcion: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/idiomas-iso/${valor}`, {
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
        throw new Error(errorData.error || `Error al actualizar el idioma ISO con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de idiomas ISO:', error);
      throw new Error(error.message || `Error al actualizar el idioma ISO con valor ${valor}`);
    }
  }

  /**
   * Elimina un idioma ISO
   * @param valor Valor del idioma ISO a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteIdiomaISO(valor: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/idiomas-iso/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el idioma ISO con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de idiomas ISO:', error);
      throw new Error(error.message || `Error al eliminar el idioma ISO con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const idiomaISOService = new IdiomaISOService();

// Exportar funciones wrapper para evitar problemas con 'this'
export const getIdiomasISO = () => idiomaISOService.getIdiomasISO();
export const getIdiomaISO = (valor: string) => idiomaISOService.getIdiomaISO(valor);
export const createIdiomaISO = (idiomaISO: IdiomaISO) => idiomaISOService.createIdiomaISO(idiomaISO);
export const updateIdiomaISO = (valor: string, descripcion: string) => idiomaISOService.updateIdiomaISO(valor, descripcion);
export const deleteIdiomaISO = (valor: string) => idiomaISOService.deleteIdiomaISO(valor);

// Exportar la clase e interfaz para uso directo si es necesario
export type { IdiomaISO };
export { IdiomaISOService };
