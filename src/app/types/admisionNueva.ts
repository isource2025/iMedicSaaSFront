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

/** Un requisito documental de imRequisitos aplicado a una cobertura. */
export interface RequisitoCobertura {
  Valor: number;
  Descripcion: string;
  /** 'Paciente' o 'Visita' */
  Aplicable: string;
  /** false = viene del set base (imClientesRequisitos con Cliente = 0) */
  DeCobertura: boolean;
}

export interface RequisitoVisita {
  Valor: number;
  Descripcion: string;
  Aplicable: string;
  Observaciones: string;
  tieneArchivo: boolean;
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
}
