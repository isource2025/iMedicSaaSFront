import { apiService } from './axios';
import type {
  Acompanante,
  ClaveAcompanante,
  Novedad,
  NuevoAcompanante,
  PanelAcompanantes,
} from '../types/visitaAcompanantes';

const BASE = '/visita-acompanantes';

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const visitaAcompanantesService = {
  async getPanel(numeroVisita: number): Promise<PanelAcompanantes> {
    const { data } = await apiService.get<Envelope<PanelAcompanantes>>(`${BASE}/${numeroVisita}`);
    return data.data;
  },

  async agregarAcompanante(
    numeroVisita: number,
    acompanante: NuevoAcompanante,
  ): Promise<Acompanante[]> {
    const { data } = await apiService.post<Envelope<Acompanante[]>>(
      `${BASE}/${numeroVisita}/acompanantes`,
      acompanante,
    );
    return data.data ?? [];
  },

  async quitarAcompanante(numeroVisita: number, clave: ClaveAcompanante): Promise<Acompanante[]> {
    const { data } = await apiService.delete<Envelope<Acompanante[]>>(
      `${BASE}/${numeroVisita}/acompanantes`,
      { data: clave },
    );
    return data.data ?? [];
  },

  async guardarObservacion(numeroVisita: number, observaciones: string): Promise<string> {
    const { data } = await apiService.put<Envelope<{ observaciones: string }>>(
      `${BASE}/${numeroVisita}/observacion`,
      { observaciones },
    );
    return data.data?.observaciones ?? '';
  },

  async agregarNovedad(numeroVisita: number, novedad: string): Promise<Novedad[]> {
    const { data } = await apiService.post<Envelope<Novedad[]>>(
      `${BASE}/${numeroVisita}/novedades`,
      { novedad },
    );
    return data.data ?? [];
  },

  async quitarNovedad(
    numeroVisita: number,
    fechaCarga: number,
    horaCarga: number,
  ): Promise<Novedad[]> {
    const { data } = await apiService.delete<Envelope<Novedad[]>>(
      `${BASE}/${numeroVisita}/novedades`,
      { params: { fechaCarga, horaCarga } },
    );
    return data.data ?? [];
  },
};

export default visitaAcompanantesService;
