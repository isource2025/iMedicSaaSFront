import { apiService } from './axios';
import type {
  AdmisionCreada,
  AdmisionNuevaCatalogos,
  AdmisionNuevaPayload,
  RequisitoCobertura,
  RequisitoVisita,
} from '../types/admisionNueva';

const BASE = '/admision-nueva';

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const admisionNuevaService = {
  async getCatalogos(cliente?: number | null): Promise<AdmisionNuevaCatalogos> {
    const q = cliente != null && Number(cliente) > 0 ? `?cliente=${Number(cliente)}` : '';
    const { data } = await apiService.get<Envelope<AdmisionNuevaCatalogos>>(
      `${BASE}/catalogos${q}`,
    );
    return data.data;
  },

  /** Requisitos de la cobertura más los de base. Cliente 0 devuelve solo los de base. */
  async getRequisitosCobertura(cliente: number): Promise<RequisitoCobertura[]> {
    const { data } = await apiService.get<Envelope<RequisitoCobertura[]>>(
      `${BASE}/requisitos/cobertura/${Number(cliente) || 0}`,
    );
    return data.data ?? [];
  },

  /** Catálogo completo de imRequisitos, para agregar uno que la cobertura no trae. */
  async getRequisitosCatalogo(): Promise<RequisitoCobertura[]> {
    const { data } = await apiService.get<Envelope<RequisitoCobertura[]>>(`${BASE}/requisitos`);
    return data.data ?? [];
  },

  async crear(payload: AdmisionNuevaPayload): Promise<AdmisionCreada> {
    const { data } = await apiService.post<Envelope<AdmisionCreada>>(BASE, payload);
    return data.data;
  },

  async getRequisitosVisita(numeroVisita: number): Promise<RequisitoVisita[]> {
    const { data } = await apiService.get<Envelope<RequisitoVisita[]>>(
      `${BASE}/${numeroVisita}/requisitos`,
    );
    return data.data ?? [];
  },

  async agregarRequisito(numeroVisita: number, valor: number, idPaciente: number): Promise<void> {
    await apiService.post(`${BASE}/${numeroVisita}/requisitos`, { valor, idPaciente });
  },

  async quitarRequisito(numeroVisita: number, valor: number): Promise<void> {
    await apiService.delete(`${BASE}/${numeroVisita}/requisitos/${valor}`);
  },

  async subirArchivoRequisito(
    numeroVisita: number,
    valor: number,
    archivo: File,
  ): Promise<{ ruta: string; nombreArchivo: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    const { data } = await apiService.post<Envelope<{ ruta: string; nombreArchivo: string }>>(
      `${BASE}/${numeroVisita}/requisitos/${valor}/archivo`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
    );
    return data.data;
  },
};

export default admisionNuevaService;
