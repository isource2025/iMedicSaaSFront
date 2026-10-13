import { apiService } from "./axios";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export type TokensIa = {
  entrada: number;
  cacheadas: number;
  salida: number;
  total: number;
};

export type AgregadoIa = {
  pedidos: number;
  llamadas: number;
  tokens: TokensIa;
  costoUsd: number;
  promedioUsd: number;
};

export type ReporteConsumoIa = {
  desde: string;
  hasta: string;
  dias: number;
  disponible: boolean;
  mensaje?: string;
  totales?: AgregadoIa & {
    p50Usd: number;
    p95Usd: number;
    maxUsd: number;
    llamadasPorPedido: number;
    pctCache: number;
    errores: number;
    costoArs: number | null;
  };
  proyeccionMensual?: {
    costoUsd: number;
    costoArs: number | null;
    base: string;
  };
  porUsuario?: Array<AgregadoIa & { actor: number | null; nombre: string }>;
  porDia?: Array<AgregadoIa & { dia: string }>;
  porModelo?: Array<AgregadoIa & { modelo: string }>;
  porHerramienta?: Array<{
    nombre: string;
    veces: number;
    pedidos: number;
    costoUsd: number;
    promedioUsd: number;
  }>;
  composicionEntrada?: Record<
    string,
    { tokens: number; pct: number; costoUsd: number }
  >;
  otrasFuncionesIa?: Array<AgregadoIa & { accion: string }>;
  notas?: {
    pedidosSinMedir: number;
    consumosInternosYaIncluidos: number;
    truncado: boolean;
  };
};

export type MensajeConsumoIa = {
  id: number;
  fecha: string;
  actor: number | null;
  nombre: string;
  tipo: string;
  error: string | null;
  pregunta: string | null;
  ruta: string | null;
  herramientas: string[];
  modelo: string | null;
  llamadas: number;
  tokens: TokensIa | null;
  costoUsd: number | null;
  incluidoEnChat: boolean;
};

export type PaginaMensajesIa = {
  desde: string;
  hasta: string;
  disponible: boolean;
  total: number;
  pagina: number;
  limite: number;
  filas: MensajeConsumoIa[];
};

export type FiltrosConsumoIa = {
  desde?: string;
  hasta?: string;
  actor?: number | null;
};

function params(f: FiltrosConsumoIa, extra?: Record<string, unknown>) {
  const p: Record<string, unknown> = { ...extra };
  if (f.desde) p.desde = f.desde;
  if (f.hasta) p.hasta = f.hasta;
  if (f.actor != null) p.actor = f.actor;
  return p;
}

export const consumoIaService = {
  async reporte(f: FiltrosConsumoIa): Promise<ReporteConsumoIa> {
    const res = await apiService.get<ApiOk<ReporteConsumoIa>>(
      "/asistente/consumo",
      { params: params(f) },
    );
    return res.data.data;
  },
  async mensajes(
    f: FiltrosConsumoIa,
    pagina = 1,
    limite = 50,
  ): Promise<PaginaMensajesIa> {
    const res = await apiService.get<ApiOk<PaginaMensajesIa>>(
      "/asistente/consumo/mensajes",
      {
        params: params(f, { pagina, limite }),
      },
    );
    return res.data.data;
  },
};
