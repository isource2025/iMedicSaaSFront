import { apiService } from './axios';
import type {
  AdmisionCreada,
  AdmisionNuevaCatalogos,
  AdmisionNuevaPayload,
  RequisitoCobertura,
  RequisitoVisita,
  UltimaVisitaPaciente,
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

  /**
   * Requisitos de la cobertura. Si no tiene ninguno, el back responde con los de base.
   * Con idPaciente marca los que ese paciente ya presentó en visitas anteriores.
   */
  async getRequisitosCobertura(
    cliente: number,
    idPaciente?: number | null,
  ): Promise<RequisitoCobertura[]> {
    const q = Number(idPaciente) > 0 ? `?idPaciente=${Number(idPaciente)}` : '';
    const { data } = await apiService.get<Envelope<RequisitoCobertura[]>>(
      `${BASE}/requisitos/cobertura/${Number(cliente) || 0}${q}`,
    );
    return data.data ?? [];
  },

  /** Archivo ya subido de un requisito, como blob para el visor. */
  async getArchivoRequisito(
    numeroVisita: number,
    valor: number,
  ): Promise<{ blob: Blob; blobUrl: string }> {
    const { data } = await apiService.get<Blob>(
      `${BASE}/${Number(numeroVisita)}/requisitos/${Number(valor)}/archivo`,
      { responseType: 'blob' },
    );
    if (!data.size) throw new Error('El archivo está vacío o no se pudo obtener');
    return { blob: data, blobUrl: URL.createObjectURL(data) };
  },

  /** Catálogo completo de imRequisitos, para agregar uno que la cobertura no trae. */
  async getRequisitosCatalogo(): Promise<RequisitoCobertura[]> {
    const { data } = await apiService.get<Envelope<RequisitoCobertura[]>>(`${BASE}/requisitos`);
    return data.data ?? [];
  },

  /** Última admisión del paciente, para sugerir valores. null si es su primera vez. */
  async getUltimaVisita(idPaciente: number): Promise<UltimaVisitaPaciente | null> {
    const { data } = await apiService.get<Envelope<UltimaVisitaPaciente | null>>(
      `${BASE}/paciente/${Number(idPaciente)}/ultima-visita`,
    );
    return data.data ?? null;
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
