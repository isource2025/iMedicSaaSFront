/**
 * Authentication related interfaces
 */

export interface LoginCredentials {
  username: string;
  password: string;
  sector?: string;
  idSector?: string;
  idEmpresa?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: UserData;  // Cambiado de user a usuario para coincidir con el backend
  rol?: RolInfo | null; // Rol resuelto en el backend (Fase 1)
  permisos?: string[]; // Códigos 'MODULO.SUB.ACC' (Fase 2 con BD)
  message?: string;    // Mantener por compatibilidad
  mensaje?: string;    // Añadido para coincidir con el backend
  fuente?: string;     // Origen de la autenticación (base de datos o temporal)
  sectorSeleccionado?: SectorInfo;
  idEmpresa?: number | null;
  empresaSeleccionada?: EmpresaInfoLogin | null;
  modulosEmpresa?: ModulosEmpresaLogin | null;
}

export interface ModulosEmpresaLogin {
  packs: string[];
  modulosHabilitados: string[];
  modulosGenerales: string[];
}

/** Empresa en login (lista desplegable) */
export interface EmpresaLogin {
  idEmpresa: number;
  descripcionEmpresa: string;
}

/** Datos completos de empresa devueltos tras el login */
export interface EmpresaInfoLogin {
  id: string;
  descripcion: string;
  razonSocial?: string;
  cuit?: string;
  calle?: string;
  calle_nro?: string;
  Depto?: string;
  piso?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  condicionIva?: string;
  ingresosBrutos?: string;
  fax?: string;
  logo?: string;
}

export interface RolInfo {
  id: number;        // IdRol (1=ADMIN, 2=MEDICO, 3=ENFERMERO, 4=ADMINISTRATIVO)
  nombre: string;    // 'ADMIN' | 'MEDICO' | 'ENFERMERO' | 'ADMINISTRATIVO'
  nivel: number;     // 100 / 50 / 40 / 20
}

export interface UserData {
  codigoOperador?: number | string;
  idCodOperador?: number | string;
  idValorpersonal?: number | string;
  nombreRed?: string | null;
  role?: string;         
  nombre?: string;    
  apellido?: string;     
  permissions?: string[];
  valorPersonal?: string;  
  [key: string]: any;     
}

export interface SectorInfo {
  idPersonal: string;  // ID del personal que tiene acceso a este sector
  idSector: string;    // ID del sector (valor que necesitamos usar globalmente)
  descripcion: string; // Descripción legible del sector
}

export interface AuthError {
  status?: number;
  message: string;
  code?: string;
}

export interface Sector {
  idPersonal: string;   // ID del personal (corresponde a ValorPersonal de imPersonal)
  idSector: string;     // ID del sector (corresponde a Valor de imSectores)
  descripcionSector: string;  // Descripción del sector desde imSectores
}
