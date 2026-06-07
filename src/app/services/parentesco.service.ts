import { Parentesco } from '../types/parentesco.types';
import { apiFetch } from '@/app/utils/authFetch';

// Datos de fallback para usar cuando falla la conexión con el backend
const PARENTESCOS_FALLBACK: Parentesco[] = [
  { Valor: 'MAD', Descripcion: 'MADRE' },
  { Valor: 'PAD', Descripcion: 'PADRE' },
  { Valor: 'HIJ', Descripcion: 'HIJO/A' },
  { Valor: 'HER', Descripcion: 'HERMANO/A' },
  { Valor: 'CON', Descripcion: 'CÓNYUGE' }
];

/**
 * Servicio para gestionar los parentescos
 */
class ParentescoService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todos los parentescos
   * @returns Promise con la lista de parentescos
   */
  async getParentescos(): Promise<Parentesco[]> {
    try {
      // Asegurarnos que la URL esté correctamente formateada
      const url = `${this.apiUrl}/parentesco`;
      console.log('[DEBUG] Intentando acceder a:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      console.log('[DEBUG] Iniciando fetch con timeout de 5s');
      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal
      });
      console.log('[DEBUG] GET Parentescos - Status:', response.status);
      
      clearTimeout(timeoutId);
      
      // Si hay un problema con la respuesta, usar datos de fallback
      if (!response.ok) {
        console.warn(`[ERROR] Respuesta no válida: ${response.status} ${response.statusText}. URL: ${url}. Usando datos de fallback.`);
        return PARENTESCOS_FALLBACK;
      }
      
      // Obtener el JSON directamente
      const responseData = await response.json();
      console.log('[DEBUG] Respuesta JSON recibida:', responseData);
      
      // Verificar la estructura de la respuesta
      if (!responseData || !responseData.success) {
        console.warn('[ERROR] La respuesta no tiene éxito o estructura incorrecta. Usando datos de fallback.');
        return PARENTESCOS_FALLBACK;
      }

      // La API devuelve los datos en la propiedad data
      if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
        console.warn('[ERROR] No hay datos en la respuesta. Usando datos de fallback.');
        return PARENTESCOS_FALLBACK;
      }
      
      // Mapear los datos para que coincidan con la interfaz Parentesco
      const mappedData = responseData.data.map((item: any) => ({
        Valor: item.Valor || '',
        Descripcion: item.Descripcion || ''
      }));
      
      return mappedData;
    } catch (error) {
      console.error('[ERROR] Error en el servicio de parentescos:', error);
      return PARENTESCOS_FALLBACK;
    }
  }

  /**
   * Obtiene un parentesco por su valor
   * @param valor Valor del parentesco a buscar
   * @returns Promise con el parentesco encontrado o null si no existe
   */
  async getParentesco(valor: string): Promise<Parentesco | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/parentesco/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
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
      console.error('Error en el servicio de parentescos:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo parentesco
   * @param parentesco Datos del parentesco a crear
   * @returns Promise con el resultado de la operación
   */
  async createParentesco(parentesco: Parentesco): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/parentesco`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parentesco),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el parentesco');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de parentescos:', error);
      throw new Error(error.message || 'Error al crear el parentesco');
    }
  }

  /**
   * Actualiza un parentesco existente
   * @param valor Valor del parentesco a actualizar
   * @param descripcion Nueva descripción para el parentesco
   * @returns Promise con el resultado de la operación
   */
  async updateParentesco(valor: string, descripcion: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/parentesco/${valor}`, {
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
        throw new Error(errorData.error || `Error al actualizar el parentesco con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de parentescos:', error);
      throw new Error(error.message || `Error al actualizar el parentesco con valor ${valor}`);
    }
  }

  /**
   * Elimina un parentesco por su valor
   * @param valor Valor del parentesco a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteParentesco(valor: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/parentesco/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el parentesco con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de parentescos:', error);
      throw new Error(error.message || `Error al eliminar el parentesco con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const parentescoService = new ParentescoService();

// Exportamos las funciones pero vinculadas al servicio para mantener el contexto 'this'
export const getParentescos = parentescoService.getParentescos.bind(parentescoService);
export const getParentesco = parentescoService.getParentesco.bind(parentescoService);
export const createParentesco = parentescoService.createParentesco.bind(parentescoService);
export const updateParentesco = parentescoService.updateParentesco.bind(parentescoService);
export const deleteParentesco = parentescoService.deleteParentesco.bind(parentescoService);
