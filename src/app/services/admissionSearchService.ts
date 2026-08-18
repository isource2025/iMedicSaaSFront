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
  NumeroSSN?: string;
  NumeroInternacion?: string;
  CentroSalud?: string;
  CoberturaOS?: string;
  Sector?: string;
  Habitacion?: string;
  FechaAdmision: string;
  FechaAdmisionDMY?: string;
  HoraAdmision: string;
  FechaEgreso?: string | null;
  FechaEgresoDMY?: string | null;
  HoraEgreso?: string | null;
  TipoPaciente?: string;
  TipoPacienteDescripcion?: string;
  ClasePaciente?: string;
  EstadoAmbulatorio?: string;
  EstadoAmbulatorioDescripcion?: string;
  TipoAtencion?: string;
  Diagnostico?: string;
  DiagnosticoDescripcion?: string;
  ServicioHospital?: string;
  LocalizacionEgresado?: string;
  ServicioEgresoDescripcion?: string;
  /** Días de internación (solo visitas internadas) */
  DiasInternacion?: number | null;
  /** Conteos por tipo de información (desde el listado de búsqueda) */
  CntHistoriaClinica?: number;
  CntPracticas?: number;
  CntIndicaciones?: number;
  CntMedicacion?: number;
  /** Pedidos imPedidosEstudios (paridad iMedicAD) */
  CntEstudios?: number;
  /** Legacy / labs opcionales */
  CntLaboratorios?: number;
  CntProtocolos?: number;
  CntAdjuntos?: number;
  CntEvoluciones?: number;
}

export interface AdmissionCatalogOption {
  Valor: string | number;
  Descripcion?: string | null;
}

export interface AdmissionDatosPrincipalesVisita {
  NumeroVisita: number;
  IdPaciente: number;
  ApellidoYNombre?: string;
  NumeroDocumento?: string | number;
  NumeroHC?: string;
  NumeroSSN?: string;
  FechaAdmision?: string;
  HoraAdmision?: string;
  FechaAdmisionDMY?: string;
  ClasePaciente?: string;
  ClasePacienteDescripcion?: string;
  NumeroInternacion?: string;
  TipoAdmision?: string;
  TipoAdmisionDescripcion?: string;
  IdLugarEpisodio?: number | null;
  LugarEpisodioDescripcion?: string;
  OrigenAdmision?: number | null;
  OrigenAdmisionDescripcion?: string;
  Diagnostico?: string;
  DiagnosticoDescripcion?: string;
  EstadoAmbulatorio?: string;
  EstadoAmbulatorioDescripcion?: string;
  DoctorAdmisor?: number | null;
  DoctorAdmisorNombre?: string;
  Cliente?: number | null;
  CoberturaOS?: string;
  Contrato?: number | null;
  ContratoDescripcion?: string;
  DoctorAsistiendo?: number | null;
  DoctorAsistiendoNombre?: string;
  TipoPaciente?: string;
  TipoPacienteDescripcion?: string;
  DoctorCabecera?: number | null;
  DoctorCabeceraNombre?: string;
  Sector?: string;
  Habitacion?: string;
  SectorDescripcion?: string;
  ServicioHospital?: string;
  ServicioHospitalDescripcion?: string;
  FechaEgreso?: string | null;
  HoraEgreso?: string | null;
  DisposicionEgreso?: number | null;
  DisposicionEgresoDescripcion?: string;
  DiagnosticoEgreso?: string;
  DiagnosticoEgresoDescripcion?: string;
  OperadorEgreso?: number | null;
  OperadorEgresoNombre?: string | null;
  CentroSalud?: string;
}

export interface AdmissionDatosPrincipalesPayload {
  visita: AdmissionDatosPrincipalesVisita;
  catalogos: {
    clasesPaciente: AdmissionCatalogOption[];
    tiposAdmision: AdmissionCatalogOption[];
    tiposPaciente: AdmissionCatalogOption[];
    estadosAmbulatorios: AdmissionCatalogOption[];
    lugaresEpisodio: AdmissionCatalogOption[];
    origenesAdmision: AdmissionCatalogOption[];
    convenios: AdmissionCatalogOption[];
  };
}

export interface AdmissionDatosPrincipalesUpdate {
  fechaAdmision?: string;
  horaAdmision?: string;
  clasePaciente?: string;
  numeroInternacion?: string;
  tipoAdmision?: string;
  idLugarEpisodio?: number | null;
  origenAdmision?: number | null;
  diagnostico?: string;
  estadoAmbulatorio?: string;
  doctorAdmisor?: number | null;
  cliente?: number | null;
  contrato?: number | null;
  doctorAsistiendo?: number | null;
  tipoPaciente?: string;
  doctorCabecera?: number | null;
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
  | 'indicaciones'
  | 'medicamentos'
  | 'evoluciones'
  | 'estudios'
  | 'protocolos'
  | 'epicrisis'
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

export function admissionApiErrorMessage(e: unknown, fallback: string): string {
  const err = e as {
    response?: { data?: { message?: string; detail?: string; mensaje?: string } };
    message?: string;
  };
  const data = err?.response?.data;
  const msg = data?.message || data?.mensaje || err?.message || fallback;
  const detail = typeof data?.detail === 'string' ? data.detail.trim() : '';
  if (detail && detail !== msg) return `${msg} (${detail})`;
  return msg;
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
    const response = await apiService.get<AdmissionDetailResponse>(
      `/admission-search/${numeroVisita}/detail`,
      { timeout: 60000 },
    );
    return response.data?.data;
  },

  async getDatosPrincipales(numeroVisita: number): Promise<AdmissionDatosPrincipalesPayload> {
    const response = await apiService.get<{ success: boolean; data: AdmissionDatosPrincipalesPayload }>(
      `/admission-search/${numeroVisita}/datos-principales`,
    );
    return response.data.data;
  },

  async updateDatosPrincipales(
    numeroVisita: number,
    body: AdmissionDatosPrincipalesUpdate,
  ): Promise<AdmissionDatosPrincipalesPayload> {
    const response = await apiService.put<{ success: boolean; data: AdmissionDatosPrincipalesPayload }>(
      `/admission-search/${numeroVisita}/datos-principales`,
      body,
    );
    return response.data.data;
  },

  async getCatalogos(cliente?: number | null): Promise<AdmissionDatosPrincipalesPayload['catalogos']> {
    const q = cliente != null && Number(cliente) > 0 ? `?cliente=${Number(cliente)}` : '';
    const response = await apiService.get<{
      success: boolean;
      data: AdmissionDatosPrincipalesPayload['catalogos'];
    }>(`/admission-search/catalogos${q}`);
    return response.data.data;
  },

  async getTurnosActivos(idPaciente: number): Promise<
    {
      idTurno: number;
      fecha: string;
      hora: string | null;
      profesional: number;
      profesionalNombre?: string | null;
      sector: string;
      observaciones?: string | null;
      estado: string;
      esSobreturno?: boolean;
    }[]
  > {
    const response = await apiService.get<{
      success: boolean;
      data: {
        idTurno: number;
        fecha: string;
        hora: string | null;
        profesional: number;
        profesionalNombre?: string | null;
        sector: string;
        observaciones?: string | null;
        estado: string;
        esSobreturno?: boolean;
      }[];
    }>(`/admission-search/paciente/${idPaciente}/turnos-activos`);
    return response.data?.data ?? [];
  },

  async exportSelectivo(numeroVisita: number, body: ExportSelectivoBody): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(
        `/admission-search/${numeroVisita}/export-selective`,
        body,
        { responseType: 'blob', timeout: 120000 },
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

  async exportGeneralPaciente(idPaciente: number, body: ExportSelectivoBody): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(
        `/admission-search/paciente/${idPaciente}/export-general`,
        body,
        { responseType: 'blob', timeout: 300000 },
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
