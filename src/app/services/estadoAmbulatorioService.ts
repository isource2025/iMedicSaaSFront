import { EstadoAmbulatorio } from '../types/estadoAmbulatorio.types';

class EstadoAmbulatorioService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  /**
   * Obtiene todos los estados ambulatorios
   * @returns Promise con la lista de estados ambulatorios
   */
  async getEstadosAmbulatorios(): Promise<EstadoAmbulatorio[]> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener los estados ambulatorios');
      }
      
      const data = await response.json();
      // Mapear los datos para que coincidan con la interfaz EstadoAmbulatorio
      const mappedData = data.map((item: any) => ({
        Valor: item.valor,
        Descripcion: item.descripcion
      }));
      return mappedData;
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      return [];
    }
  }

  /**
   * Obtiene un estado ambulatorio por su valor
   * @param valor Valor del estado ambulatorio
   * @returns Promise con el estado ambulatorio
   */
  async getEstadoAmbulatorio(valor: string): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener el estado ambulatorio con valor ${valor}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      return null;
    }
  }
  
  /**
   * Crea un nuevo estado ambulatorio
   * @param estadoAmbulatorio Datos del estado ambulatorio a crear
   * @returns Promise con el resultado de la operación
   */
  async createEstadoAmbulatorio(estadoAmbulatorio: EstadoAmbulatorio): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(estadoAmbulatorio)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el estado ambulatorio');
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(error.message || 'Error al crear el estado ambulatorio');
    }
  }
  
  /**
   * Actualiza un estado ambulatorio existente
   * @param valor Valor del estado ambulatorio a actualizar
   * @param descripcion Nueva descripción
   * @returns Promise con el resultado de la operación
   */
  async updateEstadoAmbulatorio(valor: string, descripcion: string): Promise<EstadoAmbulatorio | null> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Descripcion: descripcion })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al actualizar el estado ambulatorio con valor ${valor}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(error.message || `Error al actualizar el estado ambulatorio con valor ${valor}`);
    }
  }
  
  /**
   * Elimina un estado ambulatorio
   * @param valor Valor del estado ambulatorio a eliminar
   * @returns Promise con el resultado de la operación
   */
  async deleteEstadoAmbulatorio(valor: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios/${valor}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al eliminar el estado ambulatorio con valor ${valor}`);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw new Error(error.message || `Error al eliminar el estado ambulatorio con valor ${valor}`);
    }
  }
}

class EstadoAmbulatorioServiceExport {
  private service: EstadoAmbulatorioService;

  constructor() {
    this.service = new EstadoAmbulatorioService();
  }

  getEstadosAmbulatorios = () => this.service.getEstadosAmbulatorios();
  getEstadoAmbulatorio = (valor: string) => this.service.getEstadoAmbulatorio(valor);
  createEstadoAmbulatorio = (estadoAmbulatorio: EstadoAmbulatorio) => this.service.createEstadoAmbulatorio(estadoAmbulatorio);
  updateEstadoAmbulatorio = (valor: string, descripcion: string) => this.service.updateEstadoAmbulatorio(valor, descripcion);
  deleteEstadoAmbulatorio = (valor: string) => this.service.deleteEstadoAmbulatorio(valor);
}

const estadoAmbulatorioService = new EstadoAmbulatorioServiceExport();
export const { 
  getEstadosAmbulatorios, 
  getEstadoAmbulatorio, 
  createEstadoAmbulatorio, 
  updateEstadoAmbulatorio, 
  deleteEstadoAmbulatorio 
} = estadoAmbulatorioService;

export default estadoAmbulatorioService;
