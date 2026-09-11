/**
 * Acompañantes, observación y novedades de una visita.
 *
 * Nombres legacy en la base: los acompañantes están en imVisitaFamiliarCercano
 * y las novedades en imVisiNovedades.
 */

export interface OpcionCatalogo {
  Valor: string;
  Descripcion: string;
}

export interface CatalogosAcompanantes {
  parentescos: OpcionCatalogo[];
  rolesContacto: OpcionCatalogo[];
}

export interface Acompanante {
  NumeroVisita: number;
  Apellidos: string;
  Parentesco: string;
  ParentescoDescripcion: string;
  RolContacto: string;
  RolContactoDescripcion: string;
  TipoDocumento: string;
  NumeroDocumento: number;
  Telefono: string;
  TelefonoAlternativo: string;
  Direccion: string;
  /** Parte de la PK legacy: hay que devolverlas para poder borrar la fila. */
  FechaComienzo: number;
  FechaFin: number;
  FechaCarga: number;
  HoraCarga: number;
  Operador: string;
  OperadorNombre: string;
  FechaCargaISO: string;
  HoraCargaISO: string;
}

export interface NuevoAcompanante {
  apellidos: string;
  parentesco: string;
  rolContacto: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  telefonoAlternativo: string;
  direccion: string;
}

export interface ClaveAcompanante {
  apellidos: string;
  parentesco: string;
  fechaComienzo: number;
  fechaFin: number;
  fechaCarga: number;
  horaCarga: number;
}

export interface Novedad {
  NumeroVisita: number;
  Novedad: string;
  CodOperador: number;
  OperadorNombre: string;
  /** FechaCarga y HoraCarga son la PK junto con NumeroVisita. */
  FechaCarga: number;
  HoraCarga: number;
  FechaCargaISO: string;
  HoraCargaISO: string;
}

export interface PanelAcompanantes {
  catalogos: CatalogosAcompanantes;
  acompanantes: Acompanante[];
  observaciones: string;
  novedades: Novedad[];
}
