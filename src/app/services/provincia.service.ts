import { Provincia } from '../types/provincia.types';

/**
 * Datos de fallback para cuando no se puede conectar al backend.
 * Útil para desarrollo y pruebas.
 */
export const PROVINCIAS_FALLBACK: Provincia[] = [
  {
    Valor: 1,
    LetraProvincia: 'BUE',
    Descripcion: 'Buenos Aires',
    ValorNacionalidad: 'AR'
  },
  {
    Valor: 2,
    LetraProvincia: 'CBA',
    Descripcion: 'Córdoba',
    ValorNacionalidad: 'AR'
  },
  {
    Valor: 3,
    LetraProvincia: 'SFE',
    Descripcion: 'Santa Fe',
    ValorNacionalidad: 'AR'
  }
];

/**
 * Servicio para manejar operaciones relacionadas con provincias
 */
class ProvinciaService {
  private apiUrl: string;
  private timeoutDuration: number = 5000; // 5 segundos de timeout

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006/api';
    
    // Binding de los métodos para preservar el contexto 'this'
    this.getProvincias = this.getProvincias.bind(this);
    this.getProvincia = this.getProvincia.bind(this);
    this.createProvincia = this.createProvincia.bind(this);
    this.updateProvincia = this.updateProvincia.bind(this);
    this.deleteProvincia = this.deleteProvincia.bind(this);
    this.getProvinciasByNacionalidad = this.getProvinciasByNacionalidad.bind(this);
  }

  /**
   * Obtiene todas las provincias
   * @returns {Promise<Provincia[]>} Lista de provincias
   */
  async getProvincias(): Promise<Provincia[]> {
    try {
      console.log('Solicitando provincias al backend...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia`;
      console.log('URL de la solicitud:', url);
      
      const response = await fetch(url, { 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener provincias:', response.status, response.statusText);
        return PROVINCIAS_FALLBACK;
      }
      
      const data = await response.json();
      console.log('Datos de provincias recibidos:', data);
      
      if (data && data.success && Array.isArray(data.data)) {
        return data.data;
      }
      
      return data || PROVINCIAS_FALLBACK;
    } catch (error) {
      console.error('Error en el servicio de provincias:', error);
      return PROVINCIAS_FALLBACK;
    }
  }

  /**
   * Obtiene una provincia específica por su valor
   * @param {number} valor - El identificador de la provincia
   * @returns {Promise<Provincia|null>} La provincia encontrada o null
   */
  async getProvincia(valor: number): Promise<Provincia | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia/${valor}`;
      console.log('Solicitando provincia específica:', url);
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener provincia:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al obtener provincia con valor ${valor}:`, error);
      return null;
    }
  }

  /**
   * Obtiene las provincias por nacionalidad
   * @param {string} valorNacionalidad - El código de nacionalidad
   * @returns {Promise<Provincia[]>} Lista de provincias de esa nacionalidad
   */
  async getProvinciasByNacionalidad(valorNacionalidad: string): Promise<Provincia[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia/nacionalidad/${valorNacionalidad}`;
      console.log('Solicitando provincias por nacionalidad:', url);
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al obtener provincias por nacionalidad:', response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      
      if (data && data.success && Array.isArray(data.data)) {
        return data.data;
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error al obtener provincias para nacionalidad ${valorNacionalidad}:`, error);
      return [];
    }
  }

  /**
   * Crea una nueva provincia
   * @param {Provincia} provincia - Datos de la provincia a crear
   * @returns {Promise<Provincia|null>} La provincia creada o null si falla
   */
  async createProvincia(provincia: Provincia): Promise<Provincia | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia`;
      console.log('Creando nueva provincia:', url, provincia);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(provincia),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al crear provincia:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error al crear provincia:', error);
      return null;
    }
  }

  /**
   * Actualiza una provincia existente
   * @param {number} valor - El identificador de la provincia a actualizar
   * @param {Partial<Provincia>} data - Datos a actualizar
   * @returns {Promise<Provincia|null>} La provincia actualizada o null
   */
  async updateProvincia(valor: number, data: Partial<Provincia>): Promise<Provincia | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia/${valor}`;
      console.log('Actualizando provincia:', url, data);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al actualizar provincia:', response.status, response.statusText);
        return null;
      }
      
      const responseData = await response.json();
      
      if (responseData && responseData.success) {
        return {
          Valor: valor,
          ...data
        } as Provincia;
      }
      
      return null;
    } catch (error) {
      console.error(`Error al actualizar provincia ${valor}:`, error);
      return null;
    }
  }

  /**
   * Elimina una provincia
   * @param {number} valor - El identificador de la provincia a eliminar
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  async deleteProvincia(valor: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutDuration);

      const url = `${this.apiUrl}/provincia/${valor}`;
      console.log('Eliminando provincia:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Error al eliminar provincia:', response.status, response.statusText);
        return false;
      }
      
      const data = await response.json();
      return data && data.success;
    } catch (error) {
      console.error(`Error al eliminar provincia ${valor}:`, error);
      return false;
    }
  }
}

// Exportamos una instancia del servicio
const provinciaService = new ProvinciaService();

// Exportamos los métodos individuales para facilitar su uso
export const {
  getProvincias,
  getProvincia,
  createProvincia,
  updateProvincia,
  deleteProvincia,
  getProvinciasByNacionalidad
} = provinciaService;
