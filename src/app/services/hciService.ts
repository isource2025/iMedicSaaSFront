import { HCIItem, HCIItemWithMedicoAndSector, NuevaHCPayload, HCIResponse } from '../types/hci';
import { apiFetch } from '@/app/utils/authFetch';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Servicio para gestionar Historia Clínica de Ingreso
 */
export const hciService = {
  /**
   * Obtiene HC por número de visita
   */
  async getByNumeroVisita(numeroVisita: number): Promise<HCIItemWithMedicoAndSector[]> {
    try {
      const res = await apiFetch(`${BASE_URL}/hci/visita/${numeroVisita}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json: HCIResponse = await res.json();
      
      if (!json.success) {
        throw new Error(json.mensaje || 'Error al obtener HC');
      }

      return Array.isArray(json.data) ? json.data : [json.data];
    } catch (error) {
      console.error('Error fetching HC:', error);
      return [];
    }
  },

  /**
   * Obtiene HC por ID
   */
  async getById(id: number): Promise<HCIItemWithMedicoAndSector | null> {
    try {
      const res = await apiFetch(`${BASE_URL}/hci/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json: HCIResponse = await res.json();
      
      if (!json.success) {
        throw new Error(json.mensaje || 'Error al obtener HC');
      }

      return Array.isArray(json.data) ? json.data[0] : json.data as HCIItemWithMedicoAndSector;
    } catch (error) {
      console.error('Error fetching HC by ID:', error);
      return null;
    }
  },

  /**
   * Obtiene HC por ID de paciente
   */
  async getByIdPaciente(idPaciente: number): Promise<HCIItemWithMedicoAndSector[]> {
    try {
      const res = await apiFetch(`${BASE_URL}/hci/paciente/${idPaciente}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json: HCIResponse = await res.json();
      
      if (!json.success) {
        throw new Error(json.mensaje || 'Error al obtener HC');
      }

      return Array.isArray(json.data) ? json.data : [json.data];
    } catch (error) {
      console.error('Error fetching HC by patient:', error);
      return [];
    }
  },

  /**
   * Crea una nueva HC
   */
  async crear(data: NuevaHCPayload): Promise<HCIItem> {
    const res = await apiFetch(`${BASE_URL}/hci`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
    }

    const json: HCIResponse = await res.json();
    
    if (!json.success) {
      throw new Error(json.mensaje || 'Error al crear HC');
    }

    return Array.isArray(json.data) ? json.data[0] : json.data as HCIItem;
  },

  /**
   * Actualiza una HC existente
   */
  async actualizar(id: number, data: Partial<NuevaHCPayload>): Promise<HCIItem> {
    const res = await apiFetch(`${BASE_URL}/hci/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
    }

    const json: HCIResponse = await res.json();
    
    if (!json.success) {
      throw new Error(json.mensaje || 'Error al actualizar HC');
    }

    return Array.isArray(json.data) ? json.data[0] : json.data as HCIItem;
  },

  /**
   * Elimina una HC
   */
  async eliminar(id: number): Promise<boolean> {
    try {
      const res = await apiFetch(`${BASE_URL}/hci/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      return json.success ?? false;
    } catch (error) {
      console.error('Error deleting HC:', error);
      throw error;
    }
  },

  /**
   * Formatea fecha para visualización
   */
  formatearFecha(fecha: string): string {
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }
};
