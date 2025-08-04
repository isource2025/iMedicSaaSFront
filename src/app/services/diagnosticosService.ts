import { DiagnosticoCie10, DiagnosticosResponse } from '../types/diagnosticos';
import { apiService } from './axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006/api';

/**
 * Normaliza un diagnóstico para asegurar que tenga la propiedad CodigoOMS
 * @param diagnostico Diagnóstico a normalizar
 * @returns Diagnóstico normalizado
 */
const normalizarDiagnostico = (diagnostico: any): DiagnosticoCie10 => {
  // Si no tiene CodigoOMS pero tiene codigoCie10, usar ese valor
  if (!diagnostico.CodigoOMS && diagnostico.codigoCie10) {
    return {
      ...diagnostico,
      CodigoOMS: diagnostico.codigoCie10
    };
  }
  return diagnostico;
};

/**
 * Servicio para interactuar con los diagnósticos CIE10
 */
const diagnosticosService = {
  /**
   * Obtiene todos los diagnósticos CIE10
   * @returns Promise con la lista de diagnósticos CIE10
   */
  getDiagnosticosCie10: async (): Promise<DiagnosticoCie10[]> => {
    try {
      console.log('Solicitando diagnósticos CIE10...');
      
      const response = await apiService.get<DiagnosticosResponse>(`${BASE_URL}/catalogs/diagnosticos`);
      
      if (response.data.success) {
        // Normalizar cada diagnóstico para asegurar que tenga CodigoOMS
        return response.data.data.map(normalizarDiagnostico);
      } else {
        throw new Error(response.data.message || 'Error al obtener diagnósticos CIE10');
      }
    } catch (error: any) {
      console.error('Error en getDiagnosticosCie10:', error);
      throw new Error('Error al obtener los diagnósticos CIE10');
    }
  },

  /**
   * Busca diagnósticos CIE10 que coincidan con un término de búsqueda
   * @param termino Término a buscar (código o descripción)
   * @returns Promise con la lista de diagnósticos que coinciden
   */
  buscarDiagnosticosCie10: async (termino: string): Promise<DiagnosticoCie10[]> => {
    try {
      console.log(`Buscando diagnósticos con el término: ${termino}`);
      
      const response = await apiService.get<DiagnosticosResponse>(
        `${BASE_URL}/catalogs/diagnosticos/buscar?termino=${encodeURIComponent(termino)}`
      );
      
      if (response.data.success) {
        // Normalizar cada diagnóstico para asegurar que tenga CodigoOMS
        return response.data.data.map(normalizarDiagnostico);
      } else {
        throw new Error(response.data.message || 'Error al buscar diagnósticos CIE10');
      }
    } catch (error: any) {
      console.error('Error en buscarDiagnosticosCie10:', error);
      throw new Error('Error al buscar diagnósticos CIE10');
    }
  },

  /**
   * Obtiene un diagnóstico CIE10 por su ID
   * @param id ID del diagnóstico a obtener
   * @returns Promise con el diagnóstico encontrado
   */
  getDiagnosticoCie10PorId: async (id: number): Promise<DiagnosticoCie10> => {
    try {
      console.log(`Obteniendo diagnóstico con ID: ${id}`);
      
      const response = await apiService.get<DiagnosticosResponse>(
        `${BASE_URL}/catalogs/diagnosticos/${id}`
      );
      
      if (response.data.success && response.data.data.length > 0) {
        // Normalizar el diagnóstico para asegurar que tenga CodigoOMS
        return normalizarDiagnostico(response.data.data[0]);
      } else {
        throw new Error(response.data.message || 'Diagnóstico no encontrado');
      }
    } catch (error: any) {
      console.error('Error en getDiagnosticoCie10PorId:', error);
      throw new Error('Error al obtener el diagnóstico CIE10');
    }
  }
};

export default diagnosticosService;