export interface ModuloPack {
  codigo: string;
  label: string;
  descripcion: string;
  modulos: string[];
  orden: number;
}

export interface EmpresaOnboarding {
  pasoActual: string;
  completado: boolean;
  notas?: string;
  sectoresDefecto?: string[];
}

export interface EmpresaSuscripcion {
  plan: string;
  estado: string;
  importeMensual: number | null;
  moneda: string;
  fechaProximoCobro?: string | null;
  metodoPago?: string;
  notas?: string;
}

export interface EmpresaConexion {
  dbServer?: string;
  dbPort?: number | null;
  dbInstance?: string;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  tienePassword?: boolean;
}

export interface EmpresaAdmin {
  id: string;
  descripcion: string;
  conexion?: EmpresaConexion;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  email?: string;
  telefono?: string;
  calle?: string;
  calle_nro?: string;
  packs?: string[];
  modulosHabilitados?: string[];
  modulosGenerales?: string[];
  onboarding?: EmpresaOnboarding;
  suscripcion?: EmpresaSuscripcion;
  cantUsuarios?: number;
  usuarios?: EmpresaUsuario[];
}

export interface EmpresaUsuario {
  idPersonal: number;
  usuario: string;
  nombre: string;
  apellido: string;
  numeroDocumento?: string;
  rol: string | null;
  idRol?: number | null;
  activo: boolean;
  sectores?: SectorUsuario[];
}

export interface ActualizarUsuarioEmpresaBody {
  nombreRed?: string;
  apellido?: string;
  nombres?: string;
  numeroDocumento?: string;
  password?: string;
  idRol?: number;
  sectores?: string[];
}

export interface SectorBody {
  idEmpresa?: number;
  valor?: string;
  descripcion: string;
  ambInt?: string;
}

export interface UsuarioPlataforma {
  idPersonal: number;
  usuario: string;
  nombre: string;
  apellido: string;
  rol: string | null;
  empresas: string;
}

export interface SuperAdminDashboard {
  totalEmpresas: number;
  suscripcionesActivas: number;
  enPrueba: number;
  suspendidas: number;
  onboardingPendiente: number;
  totalUsuarios: number;
  empresasRecientes: EmpresaAdmin[];
}

export interface CatalogoSector {
  id: string;
  descripcion: string;
  ambInt?: string;
}

export interface SectorUsuario {
  id: string;
  descripcion: string;
}

export interface CatalogoRol {
  idRol: number;
  nombre: string;
  descripcion: string;
  nivel: number;
}

export interface CrearUsuarioEmpresaBody {
  nombreRed: string;
  password: string;
  apellido: string;
  nombres: string;
  numeroDocumento?: string;
  legajo?: string;
  codOperador?: string;
  idRol: number;
  sectores?: string[];
}

export interface SuperAdminCatalogos {
  packs: ModuloPack[];
  modulosGenerales: string[];
  pasosOnboarding: { id: string; label: string }[];
  planes: { id: string; label: string; importeSugerido: number }[];
  estadosSuscripcion: string[];
  sectores?: CatalogoSector[];
  roles?: CatalogoRol[];
}

export interface ModulosEmpresa {
  packs: string[];
  modulosHabilitados: string[];
  modulosGenerales: string[];
}

export interface ConfigPlataforma {
  clave: string;
  valor: string;
  descripcion: string;
}

export type SuperAdminTab =
  | 'panel'
  | 'empresas'
  | 'onboarding'
  | 'usuarios'
  | 'configuracion';
