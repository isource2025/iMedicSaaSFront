/**
 * Extracción única del error de una llamada a la API.
 *
 * El backend manda el motivo para el usuario en `mensaje` y el detalle técnico
 * en `error`. Axios, en cambio, solo sabe decir "Request failed with status code
 * 500", así que leer `error.message` directo hace desaparecer la causa real.
 */

type ErrorApi = {
  response?: {
    status?: number;
    data?: { mensaje?: string; message?: string; error?: string };
  };
  message?: string;
};

const texto = (v: unknown): string => String(v ?? '').trim();

/** Mensaje mostrable al usuario: primero el del backend, después el genérico. */
export function mensajeDeError(error: unknown, generico = 'Ocurrió un error inesperado'): string {
  const e = error as ErrorApi;
  const data = e?.response?.data;
  const delBackend = texto(data?.mensaje) || texto(data?.message);
  if (delBackend) return delBackend;

  // Un 5xx sin mensaje es una falla inesperada: no tiene sentido mostrar el
  // texto de axios ni el detalle de SQL.
  const status = Number(e?.response?.status);
  if (Number.isFinite(status) && status >= 500) return generico;

  return texto(e?.message) || generico;
}

/**
 * Igual que `mensajeDeError` pero para respuestas de `fetch`, donde el cuerpo
 * hay que leerlo a mano. Sin esto una respuesta con error queda como "HTTP 500".
 */
export async function motivoDeRespuesta(res: Response, generico?: string): Promise<string> {
  const fallback = generico || `HTTP ${res.status}`;
  try {
    const cuerpo = (await res.clone().json()) as { mensaje?: string; message?: string };
    return texto(cuerpo?.mensaje) || texto(cuerpo?.message) || fallback;
  } catch {
    return fallback;
  }
}

/** Detalle técnico para la consola del navegador, nunca para la pantalla. */
export function detalleDeError(error: unknown): string {
  const e = error as ErrorApi;
  const data = e?.response?.data;
  const partes = [
    e?.response?.status ? `HTTP ${e.response.status}` : '',
    texto(data?.error),
    texto(data?.mensaje) || texto(data?.message),
    texto(e?.message),
  ].filter(Boolean);
  return partes.filter((p, i) => partes.indexOf(p) === i).join(' — ');
}
