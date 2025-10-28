"use client";
import styles from "./IndicacionesTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencil, IoTrash } from "react-icons/io5";
import { indicacionesService } from "../../../services/indicacionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";

export type IndicacionRow = {
    id: string;
    cantidad?: string | number;
    descripcion?: string;
    profesional?: string;
    fullName?: string
    frecuencia?: string;
    observaciones?: string;
    proximo?: string;
    anterior?: string;
    vigenteDesde?: string;
    nro?: string | number;
    idSector?: string;
    medicamento?: string;
};

type Props = {
    rows: IndicacionRow[];
    onSelectRow?: (id: number) => void;
    selectedId?: string | null;
    /** Alto máximo disponible del contenedor (opcional). Por defecto llena el parent. */
    maxHeight?: number | string;
    refetch: () => Promise<void>;
};

export default function IndicacionesTable({
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
            console.error("Error deleting indicacion:", error);
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingId) return; // No debería pasar, pero es buena práctica

        handleDelete(Number(deletingId));
        setDeletingId(null); // Cierra el modal
    };

    const handleCloseModal = () => {
        setDeletingId(null);
    };

    return (
        <>
            <div className={styles.tableWrap}>
                <div className={styles.scrollArea}>
                    <table className={styles.table} role="grid">
                        <thead className={styles.thead}>
                            <tr>
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
                                    Próximo · Anterior
                                    <br />
                                    <span>Vigente desde</span>
                                </th>

                                <th className={styles.colSector}>Id Sector</th>

                                <th className={styles.colAccion}>Acciones</th>

                                <th className={styles.colNro}>
                                    Nro Indicación
                                </th>

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
                                        <td className={styles.cellTight}>
                                            <div className={styles.cantidad}>
                                                {r.cantidad ?? ""}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.desc}>
                                                <div
                                                    className={styles.primary}
                                                >
                                                    {r.descripcion ?? "-"}
                                                </div>
                                                <div className={styles.sub}>
                                                    {(r.profesional + " - " + r.fullName) || ""}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                {r.frecuencia ?? "-"}
                                            </div>
                                            <div className={styles.sub}>
                                                {r.observaciones ?? ""}
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.primary}>
                                                {[r.proximo, r.anterior]
                                                    .filter(Boolean)
                                                    .join(" · ") || "-"}
                                            </div>
                                            <div className={styles.sub}>
                                                {r.vigenteDesde ?? ""}
                                            </div>
                                        </td>


                                        <td className={styles.cellMono}>
                                            {r.idSector ?? ""}
                                        </td>



                                        <td className={styles.cellAccion}>
                                            <div
                                                className={styles.actionBtns}
                                            >
                                                <button
                                                    className={`${styles.btnAction} ${styles.btnEdit}`}
                                                    title="Editar indicación"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // evita seleccionar la fila al hacer click
                                                        onSelectRow &&
                                                            onSelectRow(
                                                                Number(r.id)
                                                            );
                                                    }}
                                                >
                                                    <IoPencil />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction} ${styles.btnDelete}`}
                                                    title="Eliminar indicación"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Ya no llama a confirm(), solo abre el modal
                                                        setDeletingId(r.id);
                                                    }}
                                                >
                                                    <IoTrash />
                                                </button>
                                            </div>
                                        </td>

                                        <td className={styles.cellNum}>
                                            {r.nro ?? ""}
                                        </td>

                                        <td>{r.medicamento ?? ""}</td>
                                    </tr>
                                ))
                                : null}
                        </tbody>
                    </table>

                    {!hasRows && (
                        <div className={styles.emptyOverlay}>
                            <EmptyState text="No hay indicaciones registradas para esta visita." />
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
                            <strong>Indicado:</strong> {r.descripcion ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Cantidad:</span>{" "}
                            {r.cantidad ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Frecuencia:</span>{" "}
                            {r.frecuencia ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Observaciones:</span>{" "}
                            {r.observaciones ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>
                                Próximo / Anterior:
                            </span>{" "}
                            {[r.proximo, r.anterior]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Profesional:</span>{" "}
                            {r.profesional ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>ID Sector:</span>{" "}
                            {r.idSector ?? "-"}
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.label}>Medicamento:</span>{" "}
                            {r.medicamento ?? "-"}
                        </div>

                        <div className={styles.cardActions}>
                            <button
                                className={`${styles.btnAction} ${styles.btnEdit}`}
                                title="Editar"
                                onClick={() =>
                                    onSelectRow && onSelectRow(Number(r.id))
                                }
                            >
                                <IoPencil />
                            </button>
                            <button
                                className={`${styles.btnAction} ${styles.btnDelete}`}
                                title="Eliminar"
                                onClick={() => {
                                    // Ya no llama a confirm(), solo abre el modal
                                    setDeletingId(r.id);
                                }}
                            >
                                <IoTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmationModal
                isOpen={deletingId !== null}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message="¿Está seguro que desea eliminar esta indicación?"
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </>
    );
}
