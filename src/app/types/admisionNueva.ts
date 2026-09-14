import type { AdmissionCatalogOption } from '../services/admissionSearchService';

export interface AdmisionNuevaCatalogos {
  clasesPaciente: AdmissionCatalogOption[];
  tiposAdmision: AdmissionCatalogOption[];
  tiposPaciente: AdmissionCatalogOption[];
  estadosAmbulatorios: AdmissionCatalogOption[];
  lugaresEpisodio: AdmissionCatalogOption[];
  /** imCentroAsistencial: el centro que derivó al paciente */
  centrosSalud: AdmissionCatalogOption[];
  coberturas: AdmissionCatalogOption[];
  convenios: AdmissionCatalogOption[];
}

/** Archivo que el paciente ya presentó de este requisito, en otra visita. */
export interface PresentacionPrevia {
  numeroVisita: number;
  fecha: string | null;
  ruta: string;
}

/** Un requisito documental de imRequisitos aplicado a una cobertura. */
export interface RequisitoCobertura {
  Valor: number;
  Descripcion: string;
  /** 'Paciente' o 'Visita' */
  Aplicable: string;
  /** false = viene del set base (imClientesRequisitos con Cliente = 0) */
  DeCobertura: boolean;
  /** Solo para los 'Paciente': el escaneo se hereda de la visita anterior. */
  Presentado: PresentacionPrevia | null;
}

export interface RequisitoVisita {
  Valor: number;
  Descripcion: string;
  Aplicable: string;
  Observaciones: string;
  tieneArchivo: boolean;
}

/**
 * Datos de la última admisión del paciente. Se usan como sugerencia al abrir el
 * formulario: nunca pisan un valor que el usuario ya haya cargado.
 */
export interface UltimaVisitaPaciente {
  numeroVisita: number;
  fechaAdmision: string;
  cliente: number;
  clienteDescripcion: string;
  contrato: number;
  contratoDescripcion: string;
  tipoPaciente: string;
  tipoPacienteDescripcion: string;
  idLugarEpisodio: number;
  lugarEpisodioDescripcion: string;
  doctorCabecera: number;
  doctorCabeceraDescripcion: string;
}

export interface CamaSeleccionada {
  bedId: string;
  valorSector: string;
}

export interface AdmisionNuevaPayload {
  idPaciente: number;
  fechaAdmision: string;
  horaAdmision: string;
  clasePaciente: string;
  tipoAdmision: string;
  tipoPaciente: string;
  idLugarEpisodio: string;
  /** imVisita.ORIGENADMISION */
  centroSalud: string;
  diagnostico: string;
  estadoAmbulatorio: string;
  doctorAdmisor: string;
  doctorAsistiendo: string;
  doctorCabecera: string;
  cliente: string;
  contrato: string;
  numeroInternacion: string;
  observaciones: string;
  requisitos: number[];
  cama?: CamaSeleccionada | null;
}

export interface AdmisionCreada {
  numeroVisita: number;
  idPaciente: number;
  paciente: string;
  requisitos: number[];
  cama: { asignada: boolean; bedId?: string; valorSector?: string; error?: string } | null;
}

/** Estado de subida de la imagen de cada requisito, en el formulario. */
export type EstadoArchivoRequisito = 'pendiente' | 'subiendo' | 'ok' | 'error';

export interface RequisitoFormulario {
  valor: number;
  descripcion: string;
  aplicable: string;
  deCobertura: boolean;
  archivo: File | null;
  estado: EstadoArchivoRequisito;
  error?: string;
  /** Presentación heredada de otra visita: se copia sola al crear la admisión. */
  presentado: PresentacionPrevia | null;
}
