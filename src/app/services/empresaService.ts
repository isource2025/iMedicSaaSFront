/**
 * Servicio para gestionar la información de la empresa
 */

import { apiService } from './axios';
import { getIdEmpresaFromToken } from '@/app/utils/jwtSession';

/**
 * Interfaz para la información de la empresa
 */
export interface EmpresaInfo {
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
  idTipoIva?: number | null;
  ingresosBrutos?: string;
  fax?: string;
  logo?: string;
}

/**
 * Obtiene la información de la empresa desde el backend
 * @returns Promesa con la información de la empresa
 */
export const obtenerInfoEmpresa = async (idEmpresa?: string | number): Promise<EmpresaInfo> => {
  try {
    const id =
      idEmpresa != null && idEmpresa !== ''
        ? idEmpresa
        : getIdEmpresaFromToken() ?? obtenerInfoEmpresaLocal()?.id;
    if (!id) {
      throw new Error('Sin empresa activa en la sesión');
    }
    const params = { id: String(id) };
    const response = await apiService.get<{
      success: boolean;
      data: EmpresaInfo;
      message?: string;
    }>('/empresa', { params });

    const data = response.data;

    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Error al obtener los datos de la empresa');
  } catch (error) {
    console.error('Error al cargar datos de la empresa:', error);
    const local = obtenerInfoEmpresaLocal();
    if (local?.id) return local;
    throw error instanceof Error ? error : new Error('Error al obtener los datos de la empresa');
  }
};

/**
 * Obtiene la información de la empresa desde localStorage o usa valores por defecto
 * @returns Información de la empresa almacenada localmente
 */
export const obtenerInfoEmpresaLocal = (): EmpresaInfo | null => {
  try {
    const storedEmpresa = localStorage.getItem('empresaInfo');
    if (storedEmpresa) {
      return JSON.parse(storedEmpresa);
    }
  } catch (error) {
    console.error('Error al leer información de empresa del localStorage:', error);
  }
  return null;
};

export interface EmpresaLogoResponse {
  hasLogo: boolean;
  mime?: string;
  dataUrl?: string;
}

let logoCache: Promise<string | null> | null = null;
let logoCacheEmpresa: string | null = null;

/** Logo de la empresa activa como data URL (null si no tiene). Se cachea en memoria por empresa. */
export const obtenerLogoEmpresa = (): Promise<string | null> => {
  const empresa = String(getIdEmpresaFromToken() ?? '');
  if (logoCacheEmpresa !== empresa) logoCache = null;
  if (!logoCache) {
    logoCacheEmpresa = empresa;
    logoCache = apiService
      .get<{ success: boolean; data?: EmpresaLogoResponse }>('/empresa/logo')
      .then((r) => (r.data.success && r.data.data?.hasLogo ? r.data.data.dataUrl || null : null))
      .catch(() => {
        logoCache = null;
        return null;
      });
  }
  return logoCache;
};

export const subirLogoEmpresa = async (archivo: Blob, nombre = 'logo.png'): Promise<void> => {
  const fd = new FormData();
  fd.append('archivo', archivo, nombre);
  const res = await apiService.put<{ success: boolean; mensaje?: string }>('/empresa/logo', fd, {
    transformRequest: [
      (data: unknown, headers: Record<string, string>) => {
        if (data instanceof FormData) delete headers['Content-Type'];
        return data;
      },
    ],
  });
  logoCache = null;
  if (!res.data.success) throw new Error(res.data.mensaje || 'Error al subir el logo');
};

export const eliminarLogoEmpresa = async (): Promise<void> => {
  const res = await apiService.delete<{ success: boolean; mensaje?: string }>('/empresa/logo');
  logoCache = null;
  if (!res.data.success) throw new Error(res.data.mensaje || 'Error al quitar el logo');
};

let disenoCache: Promise<unknown | null> | null = null;
let disenoCacheEmpresa: string | null = null;

/** Diseño de PDF guardado (JSON crudo; lo normaliza `pdfDiseno.normalizarDiseno`). Cacheado por empresa. */
export const obtenerPdfDiseno = (): Promise<unknown | null> => {
  const empresa = String(getIdEmpresaFromToken() ?? '');
  if (disenoCacheEmpresa !== empresa) disenoCache = null;
  if (!disenoCache) {
    disenoCacheEmpresa = empresa;
    disenoCache = apiService
      .get<{ success: boolean; data?: unknown }>('/empresa/pdf-diseno')
      .then((r) => (r.data.success ? r.data.data ?? null : null))
      .catch(() => {
        disenoCache = null;
        return null;
      });
  }
  return disenoCache;
};

/** `diseno` null restablece el diseño por defecto. */
export const guardarPdfDiseno = async (diseno: object | null): Promise<unknown | null> => {
  const res = await apiService.put<{ success: boolean; data?: unknown; mensaje?: string }>('/empresa/pdf-diseno', {
    diseno,
  });
  disenoCache = null;
  if (!res.data.success) throw new Error(res.data.mensaje || 'Error al guardar el diseño');
  return res.data.data ?? null;
};

/** Campos que el admin de la clínica puede corregir desde Configuración → Institución. */
export interface DatosInstitucion {
  descripcion: string;
  cuit: string;
  idTipoIva: number | null;
  ingresosBrutos: string;
  calle: string;
  calle_nro: string;
  piso: string;
  depto: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
}

export interface CatalogosInstitucion {
  iva: Array<{ valor: number; descripcion: string }>;
  provincias: string[];
}

export const obtenerCatalogosInstitucion = async (): Promise<CatalogosInstitucion> => {
  const res = await apiService.get<{ success: boolean; data?: CatalogosInstitucion; mensaje?: string }>(
    '/empresa/catalogos',
  );
  if (!res.data.success || !res.data.data) throw new Error(res.data.mensaje || 'Error al obtener los catálogos');
  return res.data.data;
};

export const actualizarDatosInstitucion = async (datos: DatosInstitucion): Promise<EmpresaInfo> => {
  const res = await apiService.put<{ success: boolean; data?: EmpresaInfo; mensaje?: string }>('/empresa', datos);
  if (!res.data.success || !res.data.data) throw new Error(res.data.mensaje || 'Error al guardar los datos');
  const local = obtenerInfoEmpresaLocal();
  if (!local || String(local.id) === String(res.data.data.id)) guardarInfoEmpresaLocal(res.data.data);
  return res.data.data;
};

/**
 * Guarda la información de la empresa en localStorage
 * @param empresa Información de la empresa a guardar
 */
export const guardarInfoEmpresaLocal = (empresa: EmpresaInfo): void => {
  try {
    localStorage.setItem('empresaInfo', JSON.stringify(empresa));
  } catch (error) {
    console.error('Error al guardar información de empresa en localStorage:', error);
  }
};
