/**
 * Últimos errores de la API que vio el usuario, para que el asistente pueda
 * diagnosticar «me da error» sin pedirle que lo copie. Solo en memoria.
 */

export type ErrorApiReciente = {
  metodo: string;
  path: string;
  status: number;
  mensaje: string;
  haceSeg: number;
};

type Registro = Omit<ErrorApiReciente, "haceSeg"> & { t: number };

const MAX = 5;
const VENTANA_MS = 15 * 60 * 1000;
const buffer: Registro[] = [];

/** Sin host ni query, con los ids como :id (no viaja un DNI o una visita en el path). */
function pathLimpio(url: string): string {
  let p = String(url || "");
  try {
    p = new URL(p, "http://x").pathname;
  } catch {
    p = p.split("?")[0];
  }
  return p.replace(/\/\d+(?=\/|$)/g, "/:id").slice(0, 120);
}

export function registrarErrorApi(e: {
  metodo?: string;
  url?: string;
  status?: number;
  mensaje?: string;
}) {
  const path = pathLimpio(e.url || "");
  if (!path || path.includes("/asistente")) return;
  buffer.push({
    metodo: String(e.metodo || "GET").toUpperCase().slice(0, 6),
    path,
    status: Number(e.status) || 0,
    mensaje: String(e.mensaje || "").replace(/\s+/g, " ").trim().slice(0, 200),
    t: Date.now(),
  });
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

export function erroresRecientes(): ErrorApiReciente[] {
  const ahora = Date.now();
  return buffer
    .filter((r) => ahora - r.t < VENTANA_MS)
    .reverse()
    .map(({ t, ...r }) => ({ ...r, haceSeg: Math.round((ahora - t) / 1000) }));
}
