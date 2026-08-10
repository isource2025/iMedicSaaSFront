'use client';
import styles from "./EvolucionEnfermeriaTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencilOutline, IoTrashOutline, IoEyeOutline } from "react-icons/io5";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import { formatSqlDate } from "../../../utils/dateUtils";
import { useUsuarioActual, esRegistroPropio } from "../../../hooks/useUsuarioActual";
import { eliminarEvolucion } from "../../../services/evolucionEnfermeriaService";
import type { EvolucionEnfermeria } from "../../../types/evolucionEnfermeria";

export type EvolucionEnfermeriaRow = EvolucionEnfermeria;

type Props = {
    rows: EvolucionEnfermeriaRow[];
    refetch: () => Promise<void>;
    onEdit?: (row: EvolucionEnfermeriaRow) => void;
};

function nombreProfesional(r: EvolucionEnfermeriaRow): string {
    const apellido = String(r.ProfesionalApellido || "").trim();
    const nombres = String(r.ProfesionalNombres || "").trim();
    if (apellido && nombres) return `${apellido}, ${nombres}`;
    if (apellido) return apellido;
    if (nombres) return nombres;
    return "—";
}

function puedeGestionar(
    r: EvolucionEnfermeriaRow,
    usuario: ReturnType<typeof useUsuarioActual>,
): boolean {
    if (esRegistroPropio(r as unknown as Record<string, unknown>, usuario) === true) {
        return true;
    }
    if (!usuario) return false;
    const prof = Number(r.Profesional);
    const op = Number(r.OperadorCarga);
    if (usuario.codOperador != null && op === usuario.codOperador) return true;
    if (usuario.valorPersonal != null && (prof === usuario.valorPersonal || op === usuario.valorPersonal)) {
        return true;
    }
    if (usuario.matricula != null && (prof === usuario.matricula || op === usuario.matricula)) {
        return true;
    }
    return false;
}

export default function EvolucionEnfermeriaTable({ rows, refetch, onEdit }: Props) {
    const hasRows = rows && rows.length > 0;
    const [deletingEvolucion, setDeletingEvolucion] = useState<EvolucionEnfermeriaRow | null>(null);
    const [viewingEvolucion, setViewingEvolucion] = useState<EvolucionEnfermeriaRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const usuarioActual = useUsuarioActual();

    const handleConfirmDelete = async () => {
        if (!deletingEvolucion) return;
        const fechaClarion = Number(deletingEvolucion.FechaControlClarion);
        const horaClarion = Number(deletingEvolucion.HoraControlClarion);
        if (!Number.isFinite(fechaClarion) || !Number.isFinite(horaClarion)) {
            setError("No se pudo identificar la evolución a eliminar");
            return;
        }
        try {
            setDeleting(true);
            setError("");
            await eliminarEvolucion(deletingEvolucion.NumeroVisita, fechaClarion, horaClarion);
            setDeletingEvolucion(null);
            await refetch();
        } catch (e: unknown) {
            const err = e as { message?: string };
            setError(err?.message || "Error al eliminar la evolución");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className={styles.tableWrap}>
                <div className={styles.scrollArea}>
                    <table className={styles.table} role="grid">
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.colFecha}>Fecha</th>
                                <th className={styles.colHora}>Hora</th>
                                <th className={styles.colProfesional}>Profesional</th>
                                <th className={styles.colEvolucion}>Observaciones</th>
                                <th className={styles.colAccion}>Acciones</th>
                            </tr>
                        </thead>

                        <tbody className={styles.tbody}>
                            {hasRows
                                ? rows.map((r, index) => {
                                      const propio = puedeGestionar(r, usuarioActual);
                                      return (
                                          <tr
                                              key={`evolucion-${r.NumeroVisita}-${r.FechaControlClarion}-${r.HoraControlClarion}-${index}`}
                                              className={styles.row}
                                          >
                                              <td className={styles.cellFecha}>
                                                  {r.FechaControl
                                                      ? formatSqlDate(r.FechaControl, {
                                                            showTime: false,
                                                            showDate: true,
                                                            showYear: true,
                                                        })
                                                      : "—"}
                                              </td>

                                              <td className={styles.cellHora}>{r.HoraControl || "—"}</td>

                                              <td className={styles.cellProfesional}>
                                                  {nombreProfesional(r)}
                                              </td>

                                              <td className={styles.cellEvolucion}>
                                                  <div className={styles.evolucionPreview}>
                                                      {r.Observaciones
                                                          ? r.Observaciones.substring(0, 100) +
                                                            (r.Observaciones.length > 100 ? "..." : "")
                                                          : "—"}
                                                  </div>
                                              </td>

                                              <td className={styles.cellAccion}>
                                                  <div className={styles.actionBtns}>
                                                      <button
                                                          className={styles.btnAction}
                                                          title="Ver evolución completa"
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              setViewingEvolucion(r);
                                                          }}
                                                      >
                                                          <IoEyeOutline color="#5BC0DE" size="18px" />
                                                      </button>
                                                      {propio && (
                                                          <>
                                                              <button
                                                                  className={styles.btnAction}
                                                                  title="Editar evolución"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      onEdit?.(r);
                                                                  }}
                                                              >
                                                                  <IoPencilOutline color="#5BC0DE" size="18px" />
                                                              </button>
                                                              <button
                                                                  className={styles.btnAction}
                                                                  title="Eliminar evolución"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setError("");
                                                                      setDeletingEvolucion(r);
                                                                  }}
                                                              >
                                                                  <IoTrashOutline color="#5BC0DE" size="18px" />
                                                              </button>
                                                          </>
                                                      )}
                                                  </div>
                                              </td>
                                          </tr>
                                      );
                                  })
                                : null}
                        </tbody>
                    </table>

                    {!hasRows && (
                        <div className={styles.emptyOverlay}>
                            <EmptyState text="No hay evoluciones registradas para esta visita." />
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={deletingEvolucion !== null}
                onClose={() => {
                    if (!deleting) setDeletingEvolucion(null);
                }}
                onConfirm={() => void handleConfirmDelete()}
                title="Confirmar Eliminación"
                message={
                    error
                        ? error
                        : "¿Está seguro que desea eliminar esta evolución de enfermería?"
                }
                confirmText={deleting ? "Eliminando…" : "Eliminar"}
                cancelText="Cancelar"
            />

            {viewingEvolucion && (
                <div className={styles.modalOverlay} onClick={() => setViewingEvolucion(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Evolución de Enfermería</h3>
                            <button className={styles.btnClose} onClick={() => setViewingEvolucion(null)}>
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Fecha:</span>
                                    <span className={styles.detailValue}>
                                        {viewingEvolucion.FechaControl
                                            ? formatSqlDate(viewingEvolucion.FechaControl, {
                                                  showTime: false,
                                                  showDate: true,
                                                  showYear: true,
                                              })
                                            : "—"}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Hora:</span>
                                    <span className={styles.detailValue}>
                                        {viewingEvolucion.HoraControl || "—"}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Profesional:</span>
                                    <span className={styles.detailValue}>
                                        {nombreProfesional(viewingEvolucion)}
                                    </span>
                                </div>
                                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                                    <span className={styles.detailLabel}>Observaciones:</span>
                                    <div className={styles.evolucionFull}>
                                        {viewingEvolucion.Observaciones || "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
