"use client";
import styles from "./EvolucionesTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencilOutline, IoTrashOutline, IoEyeOutline } from "react-icons/io5";
import { evolucionesService } from "../../../services/evolucionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import { formatSqlDate } from "../../../utils/dateUtils";

export type EvolucionRow = {
    id: number;
    idVisita: number;
    nroHC?: string;
    fechaEv: string;
    horaEv: string;
    idSector?: string;
    profesional?: number;
    evolucion: string;
    numeroDocumento?: string;
    profesionalNombre?: string;
    profesionalApellido?: string;
    profesionalNombreCompleto?: string;
    valorEspecialidad?: number;
    especialidadDescripcion?: string;
};

type Props = {
    rows: EvolucionRow[];
    onSelectRow?: (id: number) => void;
    selectedId?: number | null;
    refetch: () => Promise<void>;
};

export default function EvolucionesTable({
    rows,
    onSelectRow,
    selectedId,
    refetch,
}: Props) {
    const hasRows = rows && rows.length > 0;
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [viewingEvolucion, setViewingEvolucion] = useState<EvolucionRow | null>(null);

    const handleDelete = async (id: number) => {
        try {
            const res = await evolucionesService.deleteEvolucion(id);
            if (res) {
                await refetch();
            }
        } catch (error) {
            console.error("Error deleting evolución:", error);
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingId) return;
        handleDelete(deletingId);
        setDeletingId(null);
    };

    const handleCloseModal = () => {
        setDeletingId(null);
    };

    const handleCloseView = () => {
        setViewingEvolucion(null);
    };

    const getNombreCompleto = (row: EvolucionRow) => {
        let nombre = "";
        if (row.profesionalNombreCompleto) {
            nombre = row.profesionalNombreCompleto;
        } else if (row.profesionalApellido && row.profesionalNombre) {
            nombre = `${row.profesionalApellido}, ${row.profesionalNombre}`;
        } else {
            nombre = row.profesional ? `Profesional ${row.profesional}` : "-";
        }
        
        // Agregar especialidad si existe
        if (row.especialidadDescripcion) {
            return `${nombre} - ${row.especialidadDescripcion}`;
        }
        
        return nombre;
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
                                <th className={styles.colEvolucion}>Evolución</th>
                                <th className={styles.colProfesional}>Profesional</th>
                                <th className={styles.colSector}>Sector</th>
                                <th className={styles.colAccion}>Acciones</th>
                            </tr>
                        </thead>

                        <tbody className={styles.tbody}>
                            {hasRows
                                ? rows.map((r, index) => (
                                    <tr
                                        key={`evolucion-${r.id}-${index}`}
                                        className={[
                                            styles.row,
                                            selectedId === r.id
                                                ? styles.activeRow
                                                : "",
                                        ].join(" ")}
                                    >
                                        <td className={styles.cellFecha}>
                                            {r.fechaEv ? formatSqlDate(r.fechaEv, { showTime: false, showDate: true, showYear: true }) : "-"}
                                        </td>

                                        <td className={styles.cellHora}>
                                            {r.horaEv || "-"}
                                        </td>

                                        <td className={styles.cellEvolucion}>
                                            <div className={styles.evolucionPreview}>
                                                {r.evolucion ? r.evolucion.substring(0, 100) + (r.evolucion.length > 100 ? "..." : "") : "-"}
                                            </div>
                                        </td>

                                        <td className={styles.cellProfesional}>
                                            {r.profesionalNombreCompleto || 
                                             (r.profesionalApellido && r.profesionalNombre ? 
                                              `${r.profesionalApellido}, ${r.profesionalNombre}` : 
                                              (r.profesional ? `Profesional ${r.profesional}` : "-"))}
                                            {r.especialidadDescripcion && (
                                                <>
                                                    <br />
                                                    <strong>{r.especialidadDescripcion}</strong>
                                                </>
                                            )}
                                        </td>

                                        <td className={styles.cellSector}>
                                            {r.idSector || "-"}
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
                                                        onSelectRow && onSelectRow(r.id);
                                                    }}
                                                >
                                                    <IoPencilOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Eliminar evolución"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingId(r.id);
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
                isOpen={deletingId !== null}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message="¿Está seguro que desea eliminar esta evolución?"
                confirmText="Eliminar"
                cancelText="Cancelar"
            />

            {/* Modal de vista completa de evolución */}
            {viewingEvolucion && (
                <div className={styles.modalOverlay} onClick={handleCloseView}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Evolución Médica</h3>
                            <button className={styles.btnClose} onClick={handleCloseView}>
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Fecha:</span>
                                    <span className={styles.detailValue}>
                                        {viewingEvolucion.fechaEv ? formatSqlDate(viewingEvolucion.fechaEv, { showTime: false, showDate: true, showYear: true }) : "-"}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Hora:</span>
                                    <span className={styles.detailValue}>{viewingEvolucion.horaEv || "-"}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Profesional:</span>
                                    <span className={styles.detailValue}>{getNombreCompleto(viewingEvolucion)}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Sector:</span>
                                    <span className={styles.detailValue}>{viewingEvolucion.idSector || "-"}</span>
                                </div>
                                <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                                    <span className={styles.detailLabel}>Evolución:</span>
                                    <div className={styles.evolucionFull}>
                                        {viewingEvolucion.evolucion || "-"}
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
