import { GrupoEtnico } from '../types/grupoEtnico.types';
import { apiFetch } from '@/app/utils/authFetch';

// Datos de fallback para usar cuando falla la conexión con el backend
const GRUPOS_ETNICOS_FALLBACK: GrupoEtnico[] = [
  { Valor: 'A', Descripcion: 'Afrodescendiente' },
  { Valor: 'B', Descripcion: 'Blanco' },
  { Valor: 'H', Descripcion: 'Hispánico o Latino' },
  { Valor: 'I', Descripcion: 'Indígena' },
  { Valor: 'M', Descripcion: 'Mestizo' },
  { Valor: 'U', Descripcion: 'Desconocido' }
];

/**
 * Servicio para gestionar los Grupos Étnicos
 */
class GrupoEtnicoService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006';
  }

  /**
   * Obtiene todos los grupos étnicos
   * @returns Promise con la lista de grupos étnicos
   */
  async getGruposEtnicos(): Promise<GrupoEtnico[]> {
    try {
      // Registra la URL a la que hacemos fetch para verificar
      const url = `${this.apiUrl}/grupos-etnicos`;
      console.log('Intentando obtener grupos étnicos de:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Si hay un problema con la respuesta, usar datos de fallback
      if (!response.ok) {
        console.warn(`Error en la respuesta: ${response.status} ${response.statusText}. Usando datos de fallback.`);
        return GRUPOS_ETNICOS_FALLBACK;
      }
      
      // Usar texto primero para verificar el contenido
      const responseText = await response.text();
      
      // Intentar parsear el JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Error al parsear JSON, usando datos de fallback:', parseError);
        return GRUPOS_ETNICOS_FALLBACK;
      }

      // Verificar que data es un array antes de intentar mapearlo
      if (!Array.isArray(data)) {
        console.warn('La respuesta no es un array, usando datos de fallback');
        return GRUPOS_ETNICOS_FALLBACK;
      }
      
      // Si el array está vacío, usar datos de fallback
      if (data.length === 0) {
        console.warn('El backend devolvió un array vacío, usando datos de fallback');
        return GRUPOS_ETNICOS_FALLBACK;
      }

      // Mapear los datos para que coincidan con la interfaz GrupoEtnico
      const mappedData = data.map((item: any) => ({
        Valor: item.Valor || '',
        Descripcion: item.Descripcion || ''
      }));
      
      return mappedData;
    } catch (error) {
      console.warn('Error en el servicio de grupos étnicos, usando datos de fallback:', error);
      return GRUPOS_ETNICOS_FALLBACK;
    }
  }

  /**
   * Obtiene un grupo étnico por su valor
   * @param valor Valor del grupo étnico
   * @returns Promise con el grupo étnico
   */
  async getGrupoEtnico(valor: string): Promise<GrupoEtnico | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/grupos-etnicos/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error al obtener el grupo étnico con valor ${valor}`);
      }
      
      const data = await response.json();
      // Mapear los datos si es necesario
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error) {
      console.error('Error en el servicio de grupos étnicos:', error);
      return null;
    }
  }
  
  /**
   * Crea un nuevo grupo étnico
   * @param grupoEtnico Datos del grupo étnico a crear
   * @returns Promise con el resultado de la operación
   */
  async createGrupoEtnico(grupoEtnico: GrupoEtnico): Promise<GrupoEtnico | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/grupos-etnicos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valor: grupoEtnico.Valor,
          descripcion: grupoEtnico.Descripcion
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el grupo étnico');
      }
      
      const data = await response.json();
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error: any) {
      console.error('Error en el servicio de grupos étnicos:', error);
      throw new Error(error.message || 'Error al crear el grupo étnico');
    }
  }
  
  /**
   * Actualiza un grupo étnico existente
   * @param valor Valor del grupo étnico a actualizar
   * @param descripcion Nueva descripción
   * @returns Promise con el resultado de la operación
   */
  async updateGrupoEtnico(valor: string, descripcion: string): Promise<GrupoEtnico | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/grupos-etnicos/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descripcion }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar el grupo étnico con valor ${valor}`);
      }
      
      const data = await response.json();
      return { Valor: data.valor, Descripcion: data.descripcion };
    } catch (error: any) {
      console.error('Error en el servicio de grupos étnicos:', error);
      throw new Error(error.message || `Error al actualizar el grupo étnico con valor ${valor}`);
    }
  }
  
  /**
   * Elimina un grupo étnico
   * @param valor Valor del grupo étnico a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteGrupoEtnico(valor: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await apiFetch(`${this.apiUrl}/grupos-etnicos/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el grupo étnico con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de grupos étnicos:', error);
      throw new Error(error.message || `Error al eliminar el grupo étnico con valor ${valor}`);
    }
  }
}

// Exportar una instancia del servicio
const grupoEtnicoService = new GrupoEtnicoService();

// Exportar funciones wrapper para evitar problemas con 'this'
export const getGruposEtnicos = () => grupoEtnicoService.getGruposEtnicos();
export const getGrupoEtnico = (valor: string) => grupoEtnicoService.getGrupoEtnico(valor);
export const createGrupoEtnico = (grupoEtnico: GrupoEtnico) => grupoEtnicoService.createGrupoEtnico(grupoEtnico);
export const updateGrupoEtnico = (valor: string, descripcion: string) => grupoEtnicoService.updateGrupoEtnico(valor, descripcion);
export const deleteGrupoEtnico = (valor: string) => grupoEtnicoService.deleteGrupoEtnico(valor);

// Exportar la clase e interfaz para uso directo si es necesario
export type { GrupoEtnico };
export { GrupoEtnicoService };
