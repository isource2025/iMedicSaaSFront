/**
 * Authentication related interfaces
 */

export interface LoginCredentials {
  username: string;
  password: string;
  sector?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: UserData;  // Cambiado de user a usuario para coincidir con el backend
  message?: string;    // Mantener por compatibilidad
  mensaje?: string;    // Añadido para coincidir con el backend
  fuente?: string;     // Origen de la autenticación (base de datos o temporal)
  sectorSeleccionado?: SectorInfo; // Información del sector seleccionado
}

export interface UserData {
  id?: number | string;
  username?: string;
  nombreUsuario?: string;  // Campo alternativo para el nombre de usuario
  role?: string;
  rol?: string;            // Campo alternativo para el rol
  nombre?: string;         // Nombre completo del usuario
  permissions?: string[];
  valorpersonal?: string;  // ID del personal del usuario
  [key: string]: any;      // Allow for additional user properties
}

export interface SectorInfo {
  idpersonal: string;  // ID del personal que tiene acceso a este sector
  idsector: string;    // ID del sector (valor que necesitamos usar globalmente)
  descripcion: string; // Descripción legible del sector
}

export interface AuthError {
  status?: number;
  message: string;
  code?: string;
}

export interface Sector {
  ValorPersonalSector: string;
  ValorSector: string;       // ID del sector (idsector) en la tabla impersonalsectores
  DescripcionPersonalSector: string;
}
