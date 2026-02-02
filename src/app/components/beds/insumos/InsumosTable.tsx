"use client";
import styles from "./InsumosTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencil, IoTrash } from "react-icons/io5";
import { indicacionesService } from "../../../services/indicacionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import { formatSqlDate } from "../../../utils/dateUtils";

export type InsumoRow = {
    id: string;
    cantidad?: string | number;
    descripcion?: string;
    profesional?: string;
    fullName?: string;
    observaciones?: string;
    vigenteDesde?: string;
    horaCarga?: string;
    tipo?: string;
    nro?: string | number;
    idSector?: string;
    medicamento?: string;
    tipoMedicamento?: string;
};

type Props = {
    rows: InsumoRow[];
    onSelectRow?: (id: number) => void;
    selectedId?: string | null;
    refetch: () => Promise<void>;
};

export default function InsumosTable({
    rows,
    onSelectRow,
    selectedId,
    refetch,
}: Props) {
    const hasRows = rows && rows.length > 0;
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: number) => {
        try {
            const res = await indicacionesService.deleteIndicacion(id);
            if (res) {
                await refetch();
            }
        } catch (error) {
            console.error("Error deleting insumo:", error);
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingId) return;
        handleDelete(Number(deletingId));
        setDeletingId(null);
    };

    const handleCloseModal = () => {
        setDeletingId(null);
    };

    const getTipoDescripcion = (tipoCode?: string) => {
        switch (tipoCode) {
            case 'C':
                return 'Control';
            case 'M':
                return 'Medicamento';
            case 'A':
                return 'Asistencial';
            case 'D':
                return 'Dieta';
            default:
                return tipoCode || "-";
        }
    };

    return (
        <>
            <div className={styles.tableWrap}>
                <div className={styles.scrollArea}>
                    <table className={styles.table} role="grid">
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.colEstado}>Estado</th>
                                <th className={styles.colType}>Tipo</th>
                                <th className={styles.colCant}>Cantidad</th>
                                <th className={styles.colInd}>
                                    Indicación
                                    <br />
                                    <span>Profesional que Indica</span>
                                </th>
                                <th className={styles.colFreq}>
                                    Frecuencia
                                    <br />
                                    <span>Observaciones</span>
                                </th>
                                <th className={styles.colProx}>
                                    Próximo
                                    <br />
                                    <span>Anterior · Vigente desde</span>
                                </th>
                                <th className={styles.colSector}>Sector</th>
                                <th className={styles.colNro}>Nro Indicación</th>
                                <th className={styles.colAccion}>Acciones</th>
                                <th className={styles.colMed}>Medicamento</th>
                            </tr>
                        </thead>

                        <tbody className={styles.tbody}>
                            {hasRows
                                ? rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className={[
                                            styles.row,
                                            selectedId === r.id
                                                ? styles.activeRow
                                                : "",
                                        ].join(" ")}
                                    >
                                        <td className={styles.cellEstado}>
                                            <div className={`${styles.estadoIndicador} ${styles.estadoVerde}`}>
                                                
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                {getTipoDescripcion(r.tipo).toUpperCase()}
                                            </div>
                                        </td>

                                        <td className={styles.cellTight}>
                                            <div className={styles.cantidad}>
                                                {r.cantidad ?? ""}
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.desc}>
                                                <div className={styles.primary}>
                                                    {r.descripcion ?? "-"}
                                                </div>
                                                <div className={styles.sub}>
                                                    {(r.profesional + " - " + r.fullName) || ""}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                -
                                            </div>
                                            <div className={styles.sub}>
                                                {r.observaciones ?? ""}
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                -
                                            </div>
                                            <div className={styles.sub}>
                                                
                                            </div>
                                            <div className={styles.sub}>
                                                {r.vigenteDesde ? formatSqlDate(r.vigenteDesde, { showTime: false, showDate: true, showYear: true }) + (r.horaCarga ? " - " + r.horaCarga : "") : ""}
                                            </div>
                                        </td>

                                        <td className={styles.cellMono}>
                                            {r.idSector ?? ""}
                                        </td>

                                        <td className={styles.cellNum}>
                                            {r.nro ?? ""}
                                        </td>

                                        <td className={styles.cellAccion}>
                                            <div className={styles.actionBtns}>
                                                <button
                                                    className={`${styles.btnAction} ${styles.btnEdit}`}
                                                    title="Editar insumo"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectRow && onSelectRow(Number(r.id));
                                                    }}
                                                >
                                                    <IoPencil color="#5BC0DE" size="14px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction} ${styles.btnDelete}`}
                                                    title="Eliminar insumo"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingId(r.id);
                                                    }}
                                                >
                                                    <IoTrash color="#5BC0DE" size="14px" />
                                                </button>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                {r.medicamento ?? "-"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                : null}
                        </tbody>
                    </table>

                    {!hasRows && (
                        <div className={styles.emptyOverlay}>
                            <EmptyState text="No hay insumos registrados para esta visita." />
                        </div>
                    )}
                </div>
            </div>

            {/* Vista móvil: tarjetas */}
            <div className={styles.mobileCards}>
                {rows.length === 0 && (
                    <div className={styles.emptySearch}>
                        No hay resultados que coincidan con tu búsqueda.
                    </div>
                )}
                {rows.map((r) => (
                    <div key={r.id} className={styles.cardMobile}>
                        <div className={styles.cardHeader}>
                            <strong>Insumo:</strong> {r.descripcion ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Cantidad:</span>{" "}
                            {r.cantidad ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Observaciones:</span>{" "}
                            {r.observaciones ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Profesional:</span>{" "}
                            {r.profesional ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>ID Sector:</span>{" "}
                            {r.idSector ?? "-"}
                        </div>

                        <div className={styles.cardActions}>
                            <button
                                className={`${styles.btnAction} ${styles.btnEdit}`}
                                title="Editar"
                                onClick={() => onSelectRow && onSelectRow(Number(r.id))}
                            >
                                <IoPencil />
                            </button>
                            <button
                                className={`${styles.btnAction} ${styles.btnDelete}`}
                                title="Eliminar"
                                onClick={() => setDeletingId(r.id)}
                            >
                                <IoTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de confirmación de eliminación */}
            <ConfirmationModal
                isOpen={deletingId !== null}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message="¿Está seguro que desea eliminar este insumo?"
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </>
    );
}
