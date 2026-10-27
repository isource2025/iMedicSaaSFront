import { apiFetch, apiPath, withAuthHeaders } from "@/app/utils/authFetch";
import type { PantallaSnapshot } from "./pantalla";

export type AsistenteNavegacion = {
  path: string;
  href: string;
  query?: Record<string, string> | null;
  motivo?: string | null;
  /** Opción de la pantalla a señalar al llegar («Cambiar Cama»). */
  resaltar?: string | null;
};

export type AsistentePendiente = {
  id: string;
  herramienta: string;
  resumen: string;
  detalle?: string | null;
  link?: string | null;
  metodo?: string | null;
  generativo?: boolean;
  expira?: number;
};

export type AsistenteInsercion = {
  id: string;
  campoId: string;
  etiqueta: string;
  texto: string;
  modo: "reemplazar" | "agregar";
  motivo?: string | null;
};

export type AsistenteConsulta = {
  sql: string;
  motivo?: string | null;
  total?: number;
};

export type AsistenteRespuesta = {
  success: boolean;
  texto: string;
  /** Aviso corto cuando la respuesta se basó en datos resumidos o recortados. */
  disclaimer?: string;
  herramientas?: string[];
  navegaciones?: AsistenteNavegacion[];
  pendientes?: AsistentePendiente[];
  consultas?: AsistenteConsulta[];
  inserciones?: AsistenteInsercion[];
  idConversacion?: string;
  /** Internado del que se viene hablando: se reenvía si el backend perdió la sesión. */
  foco?: AsistenteFoco | null;
  modo?: "ia" | "local";
  mensaje?: string;
};

export type AsistenteFoco = { numeroVisita: number; paciente: string | null };

export type AsistenteMensajeUi = {
  id: string;
  role: "user" | "assistant";
  content: string;
  disclaimer?: string;
  navegaciones?: AsistenteNavegacion[];
  pendientes?: AsistentePendiente[];
  consultas?: AsistenteConsulta[];
  inserciones?: AsistenteInsercion[];
  herramientas?: string[];
  modo?: "ia" | "local";
  tono?: "ok" | "error";
  resultado?: AsistenteResultadoAccion;
};

/** Resultado de confirmar una acción, para mostrarlo como card y no como texto. */
export type AsistenteResultadoAccion = {
  ok: boolean;
  metodo?: string | null;
  titulo: string;
  resumen: string;
  motivo?: string | null;
  detalleTecnico?: string | null;
  link?: string | null;
  nota?: string | null;
};

export type AsistentePayload = {
  mensaje: string;
  rutaActual: string;
  idConversacion?: string | null;
  contexto?: Record<string, string | null>;
  pantalla?: PantallaSnapshot | null;
  /** Solo lo usa el backend si ya no tiene la conversación (p. ej. tras reiniciarse). */
  historial?: { role: "user" | "assistant"; content: string }[];
  foco?: AsistenteFoco | null;
};

export async function aplicarInsercion(
  idInsercion: string,
  idConversacion?: string | null,
) {
  const res = await apiFetch("/asistente/aplicar", {
    method: "POST",
    body: JSON.stringify({ idInsercion, idConversacion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || "No se pudo aplicar el texto");
  return data as {
    success: boolean;
    campoId: string;
    modo: "reemplazar" | "agregar";
    texto: string;
    marca: string;
    marcaEnTexto: boolean;
  };
}

export async function enviarMensaje(
  payload: AsistentePayload,
): Promise<AsistenteRespuesta> {
  const res = await apiFetch("/asistente/mensaje", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as AsistenteRespuesta;
  if (!res.ok) {
    throw new Error(data.mensaje || "No se pudo hablar con el asistente");
  }
  return data;
}

export async function confirmarPendiente(
  idPendiente: string,
  idConversacion?: string | null,
) {
  const res = await apiFetch("/asistente/confirmar", {
    method: "POST",
    body: JSON.stringify({ idPendiente, idConversacion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.mensaje || "No se pudo confirmar la acción");
  }
  return data as {
    success: boolean;
    mensaje: string;
    titulo?: string;
    resumen?: string;
    motivo?: string | null;
    detalleTecnico?: string | null;
    resultado?: unknown;
    herramienta?: string;
    link?: string | null;
  };
}

export async function cancelarPendiente(
  idPendiente: string,
  idConversacion?: string | null,
) {
  const res = await apiFetch("/asistente/cancelar", {
    method: "POST",
    body: JSON.stringify({ idPendiente, idConversacion }),
  });
  return res.json().catch(() => ({ success: false }));
}

export async function nuevaSesion(rutaActual?: string) {
  const res = await apiFetch("/asistente/sesion", {
    method: "POST",
    body: JSON.stringify({ rutaActual }),
  });
  const data = await res.json().catch(() => ({}));
  return data as { success: boolean; idConversacion?: string };
}

export type EventoEstado = {
  tipo?: string;
  fase?: string;
  nombre?: string;
  estado?: string;
  n?: number;
};

type StreamHandlers = {
  onEstado?: (evt: EventoEstado) => void;
  onDone?: (result: AsistenteRespuesta) => void;
  onError?: (mensaje: string) => void;
};

export async function enviarMensajeStream(
  payload: AsistentePayload,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<AsistenteRespuesta | null> {
  const res = await fetch(apiPath("/asistente/mensaje/stream"), {
    ...withAuthHeaders({
      method: "POST",
      body: JSON.stringify(payload),
    }),
    credentials: "include",
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.mensaje || "No se pudo abrir el stream del asistente");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: AsistenteRespuesta | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const partes = buffer.split("\n\n");
    buffer = partes.pop() || "";
    for (const bloque of partes) {
      const eventLine = bloque.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = bloque.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const event = eventLine ? eventLine.slice(6).trim() : "message";
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (event === "done") {
        last = data as AsistenteRespuesta;
        handlers.onDone?.(last);
      } else if (event === "error") {
        handlers.onError?.(String(data.mensaje || "Error en el asistente"));
      } else {
        handlers.onEstado?.(data as EventoEstado);
      }
    }
  }
  return last;
}
