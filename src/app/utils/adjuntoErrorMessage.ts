/** Mensajes cortos y claros para fallos de adjuntos (404 ruta / 5xx red). */

export type AdjuntoErrorFeedback = {
  title: string;
  message: string;
};

export type AdjuntoDisponibilidad = {
  idAdjunto: number;
  disponible: boolean;
  motivo?: 'faltante' | 'red' | string | null;
  mensaje?: string | null;
  nombreArchivo?: string | null;
};

/** Solo para HTTP 404: el archivo no está donde dice la ruta. */
export const MSG_FALTANTE =
  'No está en el servidor. Puede haber cambiado de nombre o ya no estar en esa ubicación.';

/** Solo para fallos de red / 5xx del servidor de archivos. */
export const MSG_RED =
  'Problema de red o el servidor de la clínica no responde. Reintentá en unos minutos.';

function looksLike404(text: string): boolean {
  return (
    /\b404\b/.test(text) ||
    /motivo:\s*faltante/i.test(text) ||
    /no encontrado|not found|no está en el servidor|cambiado de nombre|ya no estar en esa ubicación/i.test(
      text,
    )
  );
}

function looksLikeNetworkOr5xx(text: string): boolean {
  return (
    /\b(500|502|503|504|530)\b/.test(text) ||
    /motivo:\s*red/i.test(text) ||
    /timeout|econnrefused|network|túnel|tunnel|cloudflare|sin conexión|no responde|no se pudo contactar|problema de red|servidor de (archivos|la clínica)/i.test(
      text,
    )
  );
}

export function feedbackAdjuntoError(err: unknown): AdjuntoErrorFeedback {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();

  // Red / 5xx primero: no mezclar con el texto de “cambio de nombre”.
  if (looksLikeNetworkOr5xx(lower)) {
    return { title: 'Sin conexión a archivos', message: MSG_RED };
  }

  if (looksLike404(lower)) {
    return { title: 'Archivo no disponible', message: MSG_FALTANTE };
  }

  if (/vacío|empty/.test(lower)) {
    return {
      title: 'Archivo vacío',
      message: 'El servidor devolvió un archivo sin contenido.',
    };
  }

  return {
    title: 'No se pudo abrir',
    message: (raw || 'Error al acceder al adjunto.').slice(0, 180),
  };
}

/** Resume varios resultados de /disponible en un único aviso al abrir la lista. */
export function feedbackDisponibilidadLista(
  checks: AdjuntoDisponibilidad[],
): AdjuntoErrorFeedback | null {
  const fallidos = checks.filter((c) => !c.disponible);
  if (!fallidos.length) return null;

  const porRed = fallidos.filter((c) => c.motivo === 'red');
  if (porRed.length) {
    return { title: 'Sin conexión a archivos', message: MSG_RED };
  }

  const por404 = fallidos.filter((c) => c.motivo === 'faltante' || !c.motivo);
  if (!por404.length) return null;

  if (por404.length === 1) {
    const nombre = String(por404[0].nombreArchivo || '').trim();
    return {
      title: 'Archivo no disponible',
      message: nombre ? `${nombre}: ${MSG_FALTANTE}` : MSG_FALTANTE,
    };
  }

  return {
    title: 'Archivos no disponibles',
    message: `${por404.length} archivos no están en el servidor. Pueden haber cambiado de nombre o ya no estar en esa ubicación.`,
  };
}
