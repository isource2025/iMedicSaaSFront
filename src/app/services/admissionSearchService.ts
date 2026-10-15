import { apiService } from './axios';

export interface AdmissionSearchFilters {
  /** Nombre, DNI o número de visita. El back prueba los tres a la vez. */
  termino?: string;
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
  FechaEgresoClarion?: number | null;
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
  | 'interconsultas'
  | 'protocolos'
  | 'epicrisis'
  | 'controles'
  | 'dietas'
  | 'balanceHidrico'
  | 'evolucionEnfermeria'
  | 'insumos'
  | 'laboratorios'
  | 'movimientos'
  | 'adjuntos';

export interface VisitaResumenIa {
  resumen: string;
  puntos: string[];
  pendientes: string[];
  generadoConIA: boolean;
  fuente: 'openai' | 'plantilla' | 'plantilla_fallback';
  modelo?: string;
  generadoEn: string;
  aviso?: string;
}

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

type Fila = Record<string, unknown>;

/**
 * Payload de `exportarAdmisionSelectivo`: cada bloque tiene la misma forma que
 * el endpoint de su sección (solo viene si se pidió).
 */
export interface ExportVisitaData {
  numeroVisita: number;
  generadoEn: string;
  paciente: Fila;
  criterios: { exportAll: boolean; fechaInicio: string | null; fechaFin: string | null; sections: ExportSectionKey[] };
  admision?: Fila;
  historialClinico?: Fila[];
  practicasPaciente?: Fila[];
  indicaciones?: Fila[];
  medicamentos?: Fila[];
  evolucionesMedicas?: Fila[];
  /** Solicitudes agrupadas (`SolicitudEstudio`), como en la sección de estudios. */
  estudios?: Fila[];
  protocolos?: Fila[];
  epicrisis?: Fila[];
  interconsultas?: Fila[];
  practicas?: { laboratorios?: Fila[] };
  controles?: Fila[];
  dietas?: Fila[];
  balanceHidrico?: Fila[];
  evolucionesEnfermeria?: Fila[];
  insumos?: Fila[];
  movimientos?: Fila[];
  adjuntos?: Fila[];
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

  async resumenIa(numeroVisita: number): Promise<VisitaResumenIa> {
    const response = await apiService.post<{ success: boolean; data: VisitaResumenIa }>(
      `/admission-search/${numeroVisita}/resumen-ia`,
      {},
      { timeout: 90000 },
    );
    return response.data.data;
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

  /** Datos de la visita para armar el PDF global (ver `exportVisitaPdf`). */
  async exportSelectivo(numeroVisita: number, body: ExportSelectivoBody): Promise<ExportVisitaData> {
    try {
      const response = await apiService.post<{ success: boolean; data: ExportVisitaData }>(
        `/admission-search/${numeroVisita}/export-selective`,
        body,
        { timeout: 120000 },
      );
      return response.data.data;
    } catch (e: unknown) {
      throw new Error(admissionApiErrorMessage(e, 'Error al exportar'));
    }
  },

  /** Datos de todas las visitas del paciente (carpeta), de la más reciente a la más antigua. */
  async exportGeneralPaciente(idPaciente: number, body: ExportSelectivoBody): Promise<ExportVisitaData[]> {
    try {
      const response = await apiService.post<{ success: boolean; data: { visitas: ExportVisitaData[] } }>(
        `/admission-search/paciente/${idPaciente}/export-general`,
        body,
        { timeout: 300000 },
      );
      return response.data.data?.visitas ?? [];
    } catch (e: unknown) {
      throw new Error(admissionApiErrorMessage(e, 'Error al exportar'));
    }
  },
};
