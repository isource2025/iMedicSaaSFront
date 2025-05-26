'use client';

import { OpcGrd, OpcGrdGroup, CreateOpcGrdDto, UpdateOpcGrdDto } from '../types/opcGrd.types';

// URL base de la API desde variables de entorno
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006/api';

class OpcGrdService {
  /**
   * Obtiene todas las opciones de grilla
   * @returns Promise con las opciones de grilla
   */
  async getAllOpcGrd(): Promise<OpcGrd[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/opcgrd`, {
        signal: AbortSignal.timeout(5000) // 5 segundos de timeout
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener opciones de grilla: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error en el servicio de opciones de grilla:', error);
      return [];
    }
  }
  
  /**
   * Obtiene todas las opciones de grilla agrupadas por rubro
   * @returns Promise con las opciones de grilla agrupadas
   */
  async getGroupedOpcGrd(): Promise<OpcGrdGroup[]> {
    try {
      const opciones = await this.getAllOpcGrd();
      
      // Agrupar por rubro
      const grupos: { [key: string]: OpcGrd[] } = {};
      
      opciones.forEach(opcion => {
        // Eliminar espacios en blanco del rubro
        const rubroLimpio = opcion.rubro.trim();
        
        if (!grupos[rubroLimpio]) {
          grupos[rubroLimpio] = [];
        }
        
        grupos[rubroLimpio].push(opcion);
      });
      
      // Convertir a array de grupos
      const result: OpcGrdGroup[] = Object.keys(grupos).map(rubro => ({
        rubro,
        opciones: grupos[rubro].sort((a, b) => a.orden - b.orden) // Ordenar por el campo orden
      }));
      
      return result;
    } catch (error) {
      console.error('Error al agrupar opciones de grilla:', error);
      return [];
    }
  }
  
  /**
   * Obtiene opciones de grilla por rubro
   * @param rubro Rubro de las opciones a buscar
   * @returns Promise con las opciones de grilla del rubro especificado
   */
  async getOpcGrdByRubro(rubro: string): Promise<OpcGrd[]> {
    try {
      const allOpciones = await this.getAllOpcGrd();
      return allOpciones.filter(opcion => opcion.rubro.trim() === rubro.trim())
                        .sort((a, b) => a.orden - b.orden);
    } catch (error) {
      console.error(`Error al obtener opciones de grilla del rubro ${rubro}:`, error);
      return [];
    }
  }
  
  /**
   * Crea una nueva opción de grilla
   * @param opcGrd Datos de la opción de grilla a crear
   * @returns Promise con la opción de grilla creada
   */
  async createOpcGrd(opcGrd: CreateOpcGrdDto): Promise<OpcGrd | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/opcgrd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(opcGrd)
      });
      
      if (!response.ok) {
        throw new Error(`Error al crear opción de grilla: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error al crear opción de grilla:', error);
      return null;
    }
  }
  
  /**
   * Actualiza una opción de grilla existente
   * @param rubro Rubro de la opción de grilla a actualizar
   * @param descripcion Descripción de la opción de grilla
   * @param opcGrd Datos actualizados de la opción de grilla
   * @returns Promise con la opción de grilla actualizada
   */
  async updateOpcGrd(rubro: string, descripcion: string, opcGrd: UpdateOpcGrdDto): Promise<OpcGrd | null> {
    try {
      // Como no tenemos un ID directo, necesitamos buscar la opción por rubro y descripción
      const opciones = await this.getOpcGrdByRubro(rubro);
      const opcion = opciones.find(o => o.descripcion.trim() === descripcion.trim());
      
      if (!opcion) {
        throw new Error(`No se encontró la opción con rubro ${rubro} y descripción ${descripcion}`);
      }
      
      const response = await fetch(`${API_BASE_URL}/admin/opcgrd/${opcion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(opcGrd)
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar opción de grilla: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error al actualizar opción de grilla:`, error);
      return null;
    }
  }
  
  /**
   * Elimina (borrado lógico) una opción de grilla
   * @param rubro Rubro de la opción de grilla a eliminar
   * @param descripcion Descripción de la opción de grilla
   * @returns Promise con el resultado de la operación
   */
  async deleteOpcGrd(rubro: string, descripcion: string): Promise<boolean> {
    try {
      // Como no tenemos un ID directo, necesitamos buscar la opción por rubro y descripción
      const opciones = await this.getOpcGrdByRubro(rubro);
      const opcion = opciones.find(o => o.descripcion.trim() === descripcion.trim());
      
      if (!opcion) {
        throw new Error(`No se encontró la opción con rubro ${rubro} y descripción ${descripcion}`);
      }
      
      const response = await fetch(`${API_BASE_URL}/admin/opcgrd/${opcion.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error al eliminar opción de grilla: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error(`Error al eliminar opción de grilla:`, error);
      return false;
    }
  }

}

export const opcGrdService = new OpcGrdService();
