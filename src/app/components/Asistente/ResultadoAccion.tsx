"use client";

import { useState } from "react";
import type { AsistenteResultadoAccion } from "./asistenteService";
import styles from "./ResultadoAccion.module.css";

function etiquetaLink(link: string) {
  if (
    link.startsWith("/dashboard/beds/") ||
    link.startsWith("/dashboard/visita/")
  )
    return "Ver en la ficha del paciente";
  if (link.startsWith("/dashboard/personal")) return "Ir a Personal";
  if (link.startsWith("/dashboard/patients")) return "Ir a Pacientes";
  if (link.startsWith("/dashboard/configuracion/permisos"))
    return "Ir a la matriz de permisos";
  return "Abrir";
}

function Icono({ ok, eliminar }: { ok: boolean; eliminar: boolean }) {
  if (!ok) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          d="M12 8v5m0 3.5v.01"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (eliminar) {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
        <path
          d="M5 7h14M10 11v6m4-6v6M8 7l1-2.5h6L16 7m-9 0 .8 12.2A1.5 1.5 0 0 0 9.3 20.6h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="m6 12.5 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function ResultadoAccion({
  r,
  onLink,
}: {
  r: AsistenteResultadoAccion;
  onLink: (href: string) => void;
}) {
  const [verDetalle, setVerDetalle] = useState(false);
  const eliminar = r.metodo === "DELETE";
  const tono = !r.ok ? styles.error : eliminar ? styles.eliminado : styles.ok;

  return (
    <div className={`${styles.card} ${tono}`} role="status">
      <span className={styles.icono}>
        <Icono ok={r.ok} eliminar={eliminar} />
      </span>
      <div className={styles.cuerpo}>
        <p className={styles.titulo}>{r.titulo}</p>
        <p className={styles.resumen}>{r.resumen}</p>
        {!r.ok && r.motivo ? <p className={styles.motivo}>{r.motivo}</p> : null}
        {r.nota ? <p className={styles.nota}>{r.nota}</p> : null}
        <div className={styles.acciones}>
          {r.ok && r.link ? (
            <button
              type="button"
              className={styles.link}
              onClick={() => onLink(r.link as string)}
            >
              {etiquetaLink(r.link)} →
            </button>
          ) : null}
          {!r.ok && r.detalleTecnico && r.detalleTecnico !== r.motivo ? (
            <button
              type="button"
              className={styles.detalleBtn}
              onClick={() => setVerDetalle((v) => !v)}
            >
              {verDetalle ? "Ocultar detalle" : "Ver detalle para soporte"}
            </button>
          ) : null}
        </div>
        {verDetalle && r.detalleTecnico ? (
          <p className={styles.detalle}>{r.detalleTecnico}</p>
        ) : null}
      </div>
    </div>
  );
}
