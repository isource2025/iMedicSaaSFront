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
  serviciosDefecto?: string[];
  altaCompletada?: boolean;
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
  idEmpresa?: number;
  dbServer?: string;
  dbPort?: number | null;
  dbInstance?: string;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  /** URL pública del file server / túnel Cloudflare para adjuntos */
  fileServerUrl?: string;
  tienePassword?: boolean;
}

export type TipoServidor = 'NUBE' | 'FISICO';

export type EstrategiaImport = 'nube' | 'tenant';

export interface TablaImportable {
  tabla: string;
  label: string;
  estrategia?: EstrategiaImport;
  existeOrigen: boolean;
  existeDestino: boolean;
  filasOrigen: number | null;
  desdeNube?: boolean;
}

export interface ResultadoImportTabla {
  tabla: string;
  estrategia?: EstrategiaImport;
  leidas: number;
  escritas: number;
  omitida?: boolean;
  nota?: string | null;
  error: string | null;
}

export interface ResultadoImport {
  idEmpresa: number;
  resultados: ResultadoImportTabla[];
}

export interface PreviewTabla {
  tabla: string;
  label: string;
  estrategia?: EstrategiaImport;
  total: number | null;
  columnas: string[];
  filas: Record<string, unknown>[];
  nota?: string | null;
}

export interface EmpresaAdmin {
  id: string;
  descripcion: string;
  tipoServidor?: TipoServidor;
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
  altaCompletada?: boolean;
  motivoAtencion?: string | null;
  checklist?: EmpresaChecklist;
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
  servicios?: SectorUsuario[];
}

export interface ActualizarUsuarioEmpresaBody {
  nombreRed?: string;
  apellido?: string;
  nombres?: string;
  numeroDocumento?: string;
  password?: string;
  idRol?: number;
  sectores?: string[];
  servicios?: string[];
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
  pendientesAtencion?: number;
  totalUsuarios: number;
  empresasRecientes: EmpresaAdmin[];
  empresasAtencion?: EmpresaAtencion[];
}

export interface EmpresaAtencion {
  id: string;
  descripcion: string;
  tipoServidor?: TipoServidor;
  plan?: string | null;
  estado?: string | null;
  motivoAtencion: string;
}

export interface ChecklistItem {
  id: string;
  grupo: 'alta' | 'infra' | 'comercial' | 'ciclo' | string;
  label: string;
  ok: boolean;
  seccion: EmpresaSeccion;
  opcional?: boolean;
}

export interface EmpresaChecklist {
  items: ChecklistItem[];
  altaCompletada: boolean;
  listaParaActivar: boolean;
  pendientes: number;
  motivoAtencion: string | null;
  tipoServidor?: TipoServidor;
  estado?: string;
}

export type EmpresaSeccion =
  | 'resumen'
  | 'datos'
  | 'infra'
  | 'modulos'
  | 'sectores'
  | 'servicios'
  | 'usuarios'
  | 'cobranza';

export interface AltaEmpresaBody {
  descripcion: string;
  cuit?: string;
  email?: string;
  telefono?: string;
  calle?: string;
  calle_nro?: string;
  localidad?: string;
  provincia?: string;
  tipoServidor: TipoServidor;
  plan?: string;
  importeMensual?: number | null;
  packs?: string[];
  sector: {
    valor: string;
    descripcion: string;
    ambInt?: string;
  };
  admin: {
    nombreRed: string;
    password: string;
    apellido: string;
    nombres: string;
    numeroDocumento?: string;
    idRol?: number;
  };
}

export interface CatalogoServicio {
  id: string;
  descripcion: string;
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
  idRol?: number;
  sectores?: string[];
  servicios?: string[];
}

export interface SuperAdminCatalogos {
  packs: ModuloPack[];
  modulosGenerales: string[];
  pasosOnboarding: { id: string; label: string }[];
  planes: { id: string; label: string; importeSugerido: number }[];
  estadosSuscripcion: string[];
  sectores?: CatalogoSector[];
  servicios?: CatalogoServicio[];
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
  | 'editar'
  | 'onboarding'
  | 'usuarios'
  | 'configuracion'
  | 'seguridad';
