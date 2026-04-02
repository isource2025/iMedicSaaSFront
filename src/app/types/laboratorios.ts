/**
 * Tipos TypeScript para el sistema de laboratorios
 */

export interface ExamenLabCabecera {
  IdExamen?: number;
  NumeroVisita: number;
  FechaExamen: string;
  HoraExamen: string;
  TipoEstudio: string;
  Laboratorio?: string;
  Protocolo?: string;
  Observaciones?: string;
  IdSector?: string;
  SectorDescripcion?: string;
  ArchivoAdjunto?: string;
  FechaCarga?: string;
  UsuarioCarga?: string;
  Estado?: string;
}

export interface ExamenLabDetalle {
  IdDetalle?: number;
  IdExamen?: number;
  CodigoParametro?: string;
  NombreParametro: string;
  Resultado: string;
  UnidadMedida?: string;
  ValorReferencia?: string;
  ValorMinimo?: number;
  ValorMaximo?: number;
  FueraDeRango: boolean;
  Metodo?: string;
  MarcaReactivo?: string;
  Orden?: number;
}

export interface ExamenLabCompleto extends ExamenLabCabecera {
  detalles: ExamenLabDetalle[];
  totalParametros?: number;
  parametrosFueraDeRango?: number;
}

export interface OCRResult {
  success: boolean;
  tipoEstudio: string;
  cabecera: {
    paciente?: string;
    dni?: string;
    fecha?: string;
    protocolo?: string;
    laboratorio?: string;
  };
  parametros: Array<{
    nombreParametro: string;
    resultado: string;
    unidadMedida?: string;
    valorReferencia?: string;
    metodo?: string;
    marcaReactivo?: string;
  }>;
  textoCompleto?: string;
}

export interface ParametroConfig {
  IdParametro: number;
  CodigoParametro: string;
  NombreParametro: string;
  Categoria: string;
  UnidadMedida: string;
  ValorMinimoAdulto?: number;
  ValorMaximoAdulto?: number;
  ValorMinimoNino?: number;
  ValorMaximoNino?: number;
  ValorMinimoHombre?: number;
  ValorMaximoHombre?: number;
  ValorMinimoMujer?: number;
  ValorMaximoMujer?: number;
  Activo: boolean;
  Sinonimos?: string;
  AlertaCritica: boolean;
}

export type TipoEstudio = 
  | 'HEMOGRAMA'
  | 'QUIMICA_CLINICA'
  | 'HEPATOGRAMA'
  | 'GASOMETRIA'
  | 'IONOGRAMA'
  | 'COAGULOGRAMA'
  | 'PERFIL_LIPIDICO'
  | 'GENERAL';

export type NivelAlerta = 'NORMAL' | 'FUERA_RANGO' | 'ALTO' | 'CRITICO';

export interface PacienteInfo {
  sexo?: 'M' | 'F';
  edad?: number;
}
