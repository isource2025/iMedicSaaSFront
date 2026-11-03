/** Tipos del reporte de consumo IA (UI solo superadmin). */

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
  porUsuario?: Array<
    AgregadoIa & {
      actor: number | null;
      nombre: string;
      idEmpresa?: number | null;
      empresaNombre?: string | null;
    }
  >;
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
  respuesta?: string | null;
  ruta: string | null;
  herramientas: string[];
  modelo: string | null;
  llamadas: number;
  tokens: TokensIa | null;
  costoUsd: number | null;
  incluidoEnChat: boolean;
  idEmpresa?: number | null;
  empresaNombre?: string | null;
  agente?: string | null;
  modo?: string | null;
  idConversacion?: string | null;
  ip?: string | null;
  ms?: number | null;
  consumo?: unknown;
};

export type AgregadoEmpresaIa = AgregadoIa & {
  idEmpresa: number | null;
  nombre: string;
};

export type ReporteConsumoIaPlataforma = ReporteConsumoIa & {
  porEmpresa?: AgregadoEmpresaIa[];
  totales?: ReporteConsumoIa['totales'] & { empresas?: number };
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

