import { DadorOrganos } from '../types/dadorOrganos.types';
import { apiService } from './axios';

const BASE = '/dador-organos';

export const getDadoresOrganos = async (): Promise<DadorOrganos[]> => {
  try {
    const { data } = await apiService.get<DadorOrganos[]>(BASE);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error al obtener dadores de órganos:', error);
    return [];
  }
};

export const createDadorOrganos = async (
  dadorOrganos: DadorOrganos,
): Promise<DadorOrganos | null> => {
  const { data } = await apiService.post<{ data: DadorOrganos }>(BASE, dadorOrganos);
  return data.data ?? null;
};

export const updateDadorOrganos = async (
  valor: string,
  descripcion: string,
): Promise<DadorOrganos | null> => {
  const { data } = await apiService.put<{ data: DadorOrganos }>(`${BASE}/${encodeURIComponent(valor)}`, {
    Descripcion: descripcion,
  });
  return data.data ?? null;
};

export const deleteDadorOrganos = async (valor: string): Promise<void> => {
  await apiService.delete(`${BASE}/${encodeURIComponent(valor)}`);
};
