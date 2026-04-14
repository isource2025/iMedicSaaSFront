import { apiService } from './axios';

export interface AdmissionSearchFilters {
  dni?: string;
  nombreApellido?: string;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}

export interface AdmissionSearchRow {
  NumeroVisita: number;
  IdPaciente: number;
  ApellidoYNombre: string;
  NumeroDocumento: string;
  NumeroHC: string;
  FechaAdmision: string;
  HoraAdmision: string;
  /** Conteos por tipo de información (desde el listado de búsqueda) */
  CntHistoriaClinica?: number;
  CntIndicaciones?: number;
  CntMedicacion?: number;
  CntLaboratorios?: number;
  CntProtocolos?: number;
  CntAdjuntos?: number;
  CntEvoluciones?: number;
}

interface AdmissionSearchResponse {
  success: boolean;
  data: AdmissionSearchRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AdmissionDetailResponse {
  success: boolean;
  data: any;
}

export type ExportSectionKey =
  | 'admision'
  | 'hcIngreso'
  | 'practicas'
  | 'medicamentos'
  | 'evoluciones'
  | 'estudios'
  | 'protocolos'
  | 'adjuntos';

export interface ExportSelectivoBody {
  sections: ExportSectionKey[];
  exportAll: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  /** Servicio (especialidad/sector normalizado) a incluir en evoluciones. Vacío = todos. */
  evolucionServicioIds?: string[];
  /** Si se envía y no está vacío, solo evoluciones de esos IdSector (servicio). Vacío = todos los servicios. */
  evolucionSectorIds?: string[];
}

async function parseBlobError(blob: Blob): Promise<string> {
  try {
    const text = await blob.text();
    const j = JSON.parse(text) as { message?: string };
    return j.message || text || 'Error al exportar';
  } catch {
    return 'Error al exportar';
  }
}

export const admissionSearchService = {
  async buscar(filters: AdmissionSearchFilters): Promise<AdmissionSearchResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value));
      }
    });

    const response = await apiService.get<AdmissionSearchResponse>(`/admission-search?${params.toString()}`);
    return response.data;
  },

  async detalle(numeroVisita: number): Promise<any> {
    const response = await apiService.get<AdmissionDetailResponse>(`/admission-search/${numeroVisita}/detail`);
    return response.data?.data;
  },

  async exportSelectivo(numeroVisita: number, body: ExportSelectivoBody): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(
        `/admission-search/${numeroVisita}/export-selective`,
        body,
        { responseType: 'blob', timeout: 120000 }
      );
      return response.data as Blob;
    } catch (e: unknown) {
      const err = e as { response?: { data?: Blob } };
      const blob = err.response?.data;
      if (blob instanceof Blob) {
        throw new Error(await parseBlobError(blob));
      }
      throw e instanceof Error ? e : new Error('Error al exportar');
    }
  },
};
