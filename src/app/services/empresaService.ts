/**
 * Servicio para gestionar la información de la empresa
 */

import { apiService } from './axios';

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
        : obtenerInfoEmpresaLocal()?.id;
    const params = id ? { id: String(id) } : undefined;
    const response = await apiService.get<{
      success: boolean;
      data: EmpresaInfo;
      message?: string;
    }>('/empresa', params ? { params } : undefined);

    const data = response.data;

    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Error al obtener los datos de la empresa');
  } catch (error) {
    console.error('Error al cargar datos de la empresa:', error);
    
    // Devolver datos por defecto en caso de error
    return {
      id: '1',
      descripcion: 'iMedicWS'
    };
  }
};

/**
 * Obtiene la información de la empresa desde localStorage o usa valores por defecto
 * @returns Información de la empresa almacenada localmente
 */
export const obtenerInfoEmpresaLocal = (): EmpresaInfo => {
  try {
    const storedEmpresa = localStorage.getItem('empresaInfo');
    if (storedEmpresa) {
      return JSON.parse(storedEmpresa);
    }
  } catch (error) {
    console.error('Error al leer información de empresa del localStorage:', error);
  }
  
  // Valores por defecto si no hay datos en localStorage
  return {
    id: '1',
    descripcion: 'iMedicWS'
  };
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
