/** Mensajes cortos y claros para fallos de adjuntos (ruta rota / red). */

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

const MSG_FALTANTE =
  'No está en el servidor. Puede haber cambiado de nombre o ya no estar en esa ubicación.';
const MSG_RED =
  'Problema de red o el servidor de la clínica no responde. Reintentá en unos minutos.';

export function feedbackAdjuntoError(err: unknown): AdjuntoErrorFeedback {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();

  if (
    /no encontrado|not found|404|faltante|no está en el servidor|cambiado de nombre|ya no estar/.test(
      lower,
    )
  ) {
    return { title: 'Archivo no disponible', message: MSG_FALTANTE };
  }

  if (
    /timeout|red|túnel|tunnel|503|502|530|econnrefused|network|no responde|no se pudo contactar|cloudflare|sin conexión/.test(
      lower,
    )
  ) {
    return { title: 'Sin conexión a archivos', message: MSG_RED };
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

  if (fallidos.length === 1) {
    const nombre = String(fallidos[0].nombreArchivo || '').trim();
    return {
      title: 'Archivo no disponible',
      message: nombre ? `${nombre}: ${MSG_FALTANTE}` : MSG_FALTANTE,
    };
  }

  return {
    title: 'Archivos no disponibles',
    message: `${fallidos.length} archivos no están en el servidor. Pueden haber cambiado de nombre o ya no estar en esa ubicación.`,
  };
}
