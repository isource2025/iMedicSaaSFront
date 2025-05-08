import { EstadoAmbulatorio } from '../types/estadoAmbulatorio';

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
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios`);
      
      if (!response.ok) {
        throw new Error('Error al obtener los estados ambulatorios');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw error;
    }
  }

  /**
   * Obtiene un estado ambulatorio por su valor
   * @param valor Valor del estado ambulatorio
   * @returns Promise con el estado ambulatorio
   */
  async getEstadoAmbulatorio(valor: string): Promise<EstadoAmbulatorio> {
    try {
      const response = await fetch(`${this.apiUrl}/estados-ambulatorios/${valor}`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener el estado ambulatorio con valor ${valor}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en el servicio de estados ambulatorios:', error);
      throw error;
    }
  }
}

const estadoAmbulatorioService = new EstadoAmbulatorioService();
export default estadoAmbulatorioService;
