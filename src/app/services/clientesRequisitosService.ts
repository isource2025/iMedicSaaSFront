import { apiService } from './axios';

const BASE = '/clientes-requisitos';

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Una cobertura de imClientes con cuántos requisitos tiene configurados. */
export interface CoberturaConRequisitos {
  Valor: number;
  Descripcion: string;
  Requisitos: number;
}

/** Un requisito del catálogo, marcado según lo pida o no la cobertura elegida. */
export interface RequisitoDeCobertura {
  Valor: number;
  Descripcion: string;
  Aplicable: string;
  Pedido: boolean;
  /** Lo pide toda admisión (Cliente 0): no hace falta configurarlo por cobertura. */
  EsDeBase: boolean;
}

export const clientesRequisitosService = {
  async getCoberturas(): Promise<CoberturaConRequisitos[]> {
    const { data } = await apiService.get<Envelope<CoberturaConRequisitos[]>>(
      `${BASE}/coberturas`,
    );
    return data.data ?? [];
  },

  async getRequisitos(cliente: number): Promise<RequisitoDeCobertura[]> {
    const { data } = await apiService.get<Envelope<RequisitoDeCobertura[]>>(
      `${BASE}/${Number(cliente)}`,
    );
    return data.data ?? [];
  },

  /** Reemplaza el set completo de requisitos de la cobertura. */
  async guardar(cliente: number, requisitos: number[]): Promise<RequisitoDeCobertura[]> {
    const { data } = await apiService.put<Envelope<RequisitoDeCobertura[]>>(
      `${BASE}/${Number(cliente)}`,
      { requisitos },
    );
    return data.data ?? [];
  },
};

export default clientesRequisitosService;
