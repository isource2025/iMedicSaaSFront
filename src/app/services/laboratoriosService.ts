import { apiService } from './axios';
import {
  ExamenLabCabecera,
  ExamenLabDetalle,
  ExamenLabCompleto,
  OCRResult,
  ParametroConfig,
  PacienteInfo
} from '../types/laboratorios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const laboratoriosService = {
  /**
   * Procesa un archivo con OCR
   */
  async uploadAndProcessOCR(numeroVisita: number, file: File): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('numeroVisita', numeroVisita.toString());

      const response = await fetch(`${BASE_URL}/laboratorios/upload-ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar archivo');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error al procesar archivo con OCR:', error);
      throw error;
    }
  },

  /**
   * Guarda un examen completo
   */
  async saveExamen(
    cabecera: ExamenLabCabecera,
    detalles: ExamenLabDetalle[],
    pacienteInfo?: PacienteInfo
  ): Promise<ExamenLabCompleto> {
    try {
      const response = await apiService.post<{ success: boolean; data: ExamenLabCompleto }>(
        `${BASE_URL}/laboratorios/save`,
        { cabecera, detalles, pacienteInfo }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al guardar examen:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los exámenes de una visita
   */
  async getExamenesByVisita(numeroVisita: number): Promise<ExamenLabCompleto[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: ExamenLabCompleto[] }>(
        `${BASE_URL}/laboratorios/visita/${numeroVisita}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener exámenes:', error);
      throw error;
    }
  },

  /**
   * Obtiene un examen por su ID
   */
  async getExamenById(idExamen: number): Promise<ExamenLabCompleto> {
    try {
      const response = await apiService.get<{ success: boolean; data: ExamenLabCompleto }>(
        `${BASE_URL}/laboratorios/${idExamen}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener examen:', error);
      throw error;
    }
  },

  /**
   * Actualiza un examen
   */
  async updateExamen(idExamen: number, datos: Partial<ExamenLabCabecera>): Promise<ExamenLabCompleto> {
    try {
      const response = await apiService.put<{ success: boolean; data: ExamenLabCompleto }>(
        `${BASE_URL}/laboratorios/${idExamen}`,
        datos
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al actualizar examen:', error);
      throw error;
    }
  },

  /**
   * Elimina un examen
   */
  async deleteExamen(idExamen: number): Promise<void> {
    try {
      await apiService.delete(`${BASE_URL}/laboratorios/${idExamen}`);
    } catch (error) {
      console.error('Error al eliminar examen:', error);
      throw error;
    }
  },

  /**
   * Obtiene la configuración de parámetros
   */
  async getParametrosConfig(): Promise<ParametroConfig[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: ParametroConfig[] }>(
        `${BASE_URL}/laboratorios/parametros/config`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error al obtener configuración de parámetros:', error);
      throw error;
    }
  },

  /**
   * Actualiza la configuración de un parámetro
   */
  async updateParametroConfig(idParametro: number, datos: Partial<ParametroConfig>): Promise<ParametroConfig> {
    try {
      const response = await apiService.put<{ success: boolean; data: ParametroConfig }>(
        `${BASE_URL}/laboratorios/parametros/config/${idParametro}`,
        datos
      );
      return response.data.data;
    } catch (error) {
      console.error('Error al actualizar parámetro:', error);
      throw error;
    }
  },

  /**
   * Formatea la fecha para visualización
   */
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Formatea la hora para visualización
   */
  formatTime(timeString: string): string {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  },

  /**
   * Obtiene el color según el nivel de alerta
   */
  getAlertColor(fueraDeRango: boolean, nivel?: string): string {
    if (!fueraDeRango) return '#10b981'; // Verde
    if (nivel === 'CRITICO') return '#ef4444'; // Rojo
    if (nivel === 'ALTO') return '#f97316'; // Naranja
    return '#f59e0b'; // Amarillo
  },

  /**
   * Obtiene el icono según el tipo de estudio
   */
  getTipoEstudioIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'HEMOGRAMA': '🩸',
      'QUIMICA_CLINICA': '🧪',
      'HEPATOGRAMA': '🫀',
      'GASOMETRIA': '💨',
      'IONOGRAMA': '⚡',
      'COAGULOGRAMA': '🩹',
      'PERFIL_LIPIDICO': '💊',
      'GENERAL': '📋'
    };
    return icons[tipo] || '📋';
  },

  /**
   * Obtiene el nombre legible del tipo de estudio
   */
  getTipoEstudioNombre(tipo: string): string {
    const nombres: { [key: string]: string } = {
      'HEMOGRAMA': 'Hemograma',
      'QUIMICA_CLINICA': 'Química Clínica',
      'HEPATOGRAMA': 'Hepatograma',
      'GASOMETRIA': 'Gasometría',
      'IONOGRAMA': 'Ionograma',
      'COAGULOGRAMA': 'Coagulograma',
      'PERFIL_LIPIDICO': 'Perfil Lipídico',
      'GENERAL': 'General'
    };
    return nombres[tipo] || tipo;
  }
};
