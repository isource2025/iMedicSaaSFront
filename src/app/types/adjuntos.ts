export interface Adjunto {
  IdAdjunto: number;
  NumeroVisita: number;
  NombreArchivo: string;
  RutaArchivo: string;
  TipoArchivo: string;
  TamanioBytes: number;
  CargadoPor: number;
  NombreUsuario: string;
  FechaCarga: string;
  TipoImagen?: string;
  TipoImagenNombre?: string;
}

export interface SubirAdjuntoResponse {
  success: boolean;
  data: {
    idAdjunto: number;
    nombreArchivo: string;
    rutaArchivo: string;
    tipoArchivo: string;
    tamanioBytes: number;
  };
}

export interface SubirMultiplesAdjuntosResponse {
  success: boolean;
  data: Array<{
    idAdjunto: number;
    nombreArchivo: string;
    rutaArchivo: string;
    tipoArchivo: string;
    tamanioBytes: number;
  }>;
  total: number;
}

export interface ListarAdjuntosResponse {
  success: boolean;
  data: Adjunto[];
  total: number;
}

export interface GrupoAdjuntos {
  tipo: string;
  nombre: string;
  adjuntos: Adjunto[];
  cantidad: number;
}

export interface AdjuntosAgrupadosResponse {
  success: boolean;
  data: GrupoAdjuntos[];
  totalGrupos: number;
  totalAdjuntos: number;
}
