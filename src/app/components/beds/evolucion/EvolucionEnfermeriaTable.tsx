"use client";
import styles from "./EvolucionEnfermeriaTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencilOutline, IoTrashOutline, IoEyeOutline } from "react-icons/io5";
import { evolucionesService } from "../../../services/evolucionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import { formatSqlDate } from "../../../utils/dateUtils";

export type EvolucionEnfermeriaRow = {
    NumeroVisita: number;
    FechaControl: string;
    HoraControl: string;
    Observaciones: string | null;
    Profesional?: number | null;
    ProfesionalApellido?: string | null;
    ProfesionalNombres?: string | null;
    OperadorApellido?: string | null;
    OperadorNombres?: string | null;
    FechaHoraCarga?: string | null;
};

type Props = {
    rows: EvolucionEnfermeriaRow[];
    refetch: () => Promise<void>;
};

export default function EvolucionEnfermeriaTable({
    rows,
    refetch,
}: Props) {
    const hasRows = rows && rows.length > 0;
    const [deletingEvolucion, setDeletingEvolucion] = useState<EvolucionEnfermeriaRow | null>(null);
    const [viewingEvolucion, setViewingEvolucion] = useState<EvolucionEnfermeriaRow | null>(null);

    const handleDelete = async (evolucion: EvolucionEnfermeriaRow) => {
        try {
            // Implementar eliminación cuando esté disponible
            await refetch();
        } catch (error) {
            console.error("Error deleting evolución:", error);
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingEvolucion) return;
        handleDelete(deletingEvolucion);
        setDeletingEvolucion(null);
    };

    const handleCloseModal = () => {
        setDeletingEvolucion(null);
    };

    const handleCloseView = () => {
        setViewingEvolucion(null);
    };

    const getNombreCompleto = (apellido?: string | null, nombres?: string | null) => {
        if (apellido && nombres) {
            return `${apellido}, ${nombres}`;
        }
        if (apellido) return apellido;
        if (nombres) return nombres;
        return "-";
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
                                ? rows.map((r, index) => (
                                    <tr
                                        key={`evolucion-${r.NumeroVisita}-${r.FechaControl}-${r.HoraControl}-${index}`}
                                        className={styles.row}
                                    >
                                        <td className={styles.cellFecha}>
                                            {r.FechaControl ? formatSqlDate(r.FechaControl, { showTime: false, showDate: true, showYear: true }) : "-"}
                                        </td>

                                        <td className={styles.cellHora}>
                                            {r.HoraControl || "-"}
                                        </td>

                                        <td className={styles.cellProfesional}>
                                            {getNombreCompleto(r.ProfesionalApellido, r.ProfesionalNombres)}
                                        </td>

                                        <td className={styles.cellEvolucion}>
                                            <div className={styles.evolucionPreview}>
                                                {r.Observaciones ? r.Observaciones.substring(0, 100) + (r.Observaciones.length > 100 ? "..." : "") : "-"}
                                            </div>
                                        </td>

                                        <td className={styles.cellAccion}>
                                            <div className={styles.actionBtns}>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Ver evolución completa"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingEvolucion(r);
                                                    }}
                                                >
                                                    <IoEyeOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Editar evolución"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Editar no implementado
                                                    }}
                                                    style={{ opacity: 0.3, cursor: 'not-allowed' }}
                                                >
                                                    <IoPencilOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Eliminar evolución"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingEvolucion(r);
                                                    }}
                                                >
                                                    <IoTrashOutline color="#5BC0DE" size="18px" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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

            {/* Modal de confirmación de eliminación */}
            <ConfirmationModal
                isOpen={deletingEvolucion !== null}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message="¿Está seguro que desea eliminar esta evolución de enfermería?"
                confirmText="Eliminar"
                cancelText="Cancelar"
            />

            {/* Modal de vista completa de evolución */}
            {viewingEvolucion && (
                <div className={styles.modalOverlay} onClick={handleCloseView}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Evolución de Enfermería</h3>
                            <button className={styles.btnClose} onClick={handleCloseView}>
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Fecha:</span>
                                    <span className={styles.detailValue}>
                                        {viewingEvolucion.FechaControl ? formatSqlDate(viewingEvolucion.FechaControl, { showTime: false, showDate: true, showYear: true }) : "-"}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Hora:</span>
                                    <span className={styles.detailValue}>{viewingEvolucion.HoraControl || "-"}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Profesional:</span>
                                    <span className={styles.detailValue}>{getNombreCompleto(viewingEvolucion.ProfesionalApellido, viewingEvolucion.ProfesionalNombres)}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Operador Carga:</span>
                                    <span className={styles.detailValue}>{getNombreCompleto(viewingEvolucion.OperadorApellido, viewingEvolucion.OperadorNombres)}</span>
                                </div>
                                <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                                    <span className={styles.detailLabel}>Observaciones:</span>
                                    <div className={styles.evolucionFull}>
                                        {viewingEvolucion.Observaciones || "-"}
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
