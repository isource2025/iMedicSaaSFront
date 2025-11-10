"use client";
import styles from "./IndicacionesTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoPencil, IoTrash, IoDocumentText, IoCloseCircle } from "react-icons/io5";
import { indicacionesService } from "../../../services/indicacionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import { BiSolidInjection } from "react-icons/bi";
import AplicarIndicacion from "../../indicaciones/AplicarIndicacion";

export type IndicacionRow = {
    id: string;
    cantidad?: string | number;
    descripcion?: string;
    profesional?: string;
    fullName?: string;
    frecuencia?: string;
    observaciones?: string;
    proximo?: string;
    anterior?: string;
    vigenteDesde?: string;
    horaCarga?: string;
    tipo?: string;
    nro?: string | number;
    idSector?: string;
    medicamento?: string;
};

type Props = {
    rows: IndicacionRow[];
    onSelectRow?: (id: number) => void;
    selectedId?: string | null;
    maxHeight?: number | string;
    refetch: () => Promise<void>;
    numeroVisita: string; // ✅ NUEVO: recibir numeroVisita
};

export default function IndicacionesTable({
    rows,
    onSelectRow,
    selectedId,
    refetch,
    numeroVisita, // ✅ NUEVO
}: Props) {
    const hasRows = rows && rows.length > 0;
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ✅ Estado para el modal de aplicar indicación
    const [modalAplicar, setModalAplicar] = useState<{
        isOpen: boolean;
        nroIndicacion: number | null;
        tipo: 'C' | 'M' | 'A' | 'D' | null;
    }>({
        isOpen: false,
        nroIndicacion: null,
        tipo: null,
    });

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
        if (!deletingId) return;
        handleDelete(Number(deletingId));
        setDeletingId(null);
    };

    const handleCloseModal = () => {
        setDeletingId(null);
    };

    // ✅ Handler para abrir el modal de aplicar indicación
    const handleAplicarIndicacion = (row: IndicacionRow) => {
        if (!row.tipo || !row.nro) {
            alert('No se puede aplicar esta indicación: faltan datos');
            return;
        }
        
        setModalAplicar({
            isOpen: true,
            nroIndicacion: Number(row.nro),
            tipo: row.tipo as 'C' | 'M' | 'A' | 'D',
        });
    };

    // ✅ Handler para cerrar el modal de aplicar
    const handleCloseAplicar = () => {
        setModalAplicar({
            isOpen: false,
            nroIndicacion: null,
            tipo: null,
        });
    };

    // ✅ Handler para éxito al aplicar
    const handleSuccessAplicar = async () => {
        await refetch();
        handleCloseAplicar();
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
                                <th className={styles.colCant}>Cantidad</th>
                                <th className={styles.colType}>Tipo</th>
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
                                <th className={styles.colNro}>Nro Indicación</th>
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

                                        <td className={styles.desc}>
                                            <div className={styles.primary}>
                                                {getTipoDescripcion(r.tipo).toUpperCase()}
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
                                                {(r.vigenteDesde + " - " + r.horaCarga) || ""}
                                            </div>
                                        </td>

                                        <td className={styles.cellMono}>
                                            {r.idSector ?? ""}
                                        </td>

                                        <td className={styles.cellAccion}>
                                            <div className={styles.actionBtns}>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Aplicar Indicacion"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAplicarIndicacion(r); // ✅ NUEVO
                                                    }}
                                                >
                                                    <BiSolidInjection color="#5BC0DE" size="14px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Dejar sin Efecto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <IoCloseCircle color="#5BC0DE" size="14px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Volver a Indicar"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <IoDocumentText color="#5BC0DE" size="14px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Editar indicación"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectRow && onSelectRow(Number(r.id));
                                                    }}
                                                >
                                                    <IoPencil color="#5BC0DE" size="14px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Eliminar indicación"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingId(r.id);
                                                    }}
                                                >
                                                    <IoTrash color="#5BC0DE" size="14px" />
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
                            <span className={styles.label}>Próximo / Anterior:</span>{" "}
                            {[r.proximo, r.anterior].filter(Boolean).join(" · ") || "-"}
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
                                title="Aplicar"
                                onClick={() => handleAplicarIndicacion(r)}
                            >
                                <BiSolidInjection />
                            </button>
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
                message="¿Está seguro que desea eliminar esta indicación?"
                confirmText="Eliminar"
                cancelText="Cancelar"
            />

            {/* ✅ Modal de aplicar indicación */}
            {modalAplicar.isOpen && modalAplicar.nroIndicacion && modalAplicar.tipo && (
                <AplicarIndicacion
                    isOpen={modalAplicar.isOpen}
                    onClose={handleCloseAplicar}
                    numeroVisita={numeroVisita}
                    nroIndicacion={modalAplicar.nroIndicacion}
                    tipoIndicacion={modalAplicar.tipo}
                    onSuccess={handleSuccessAplicar}
                />
            )}
        </>
    );
}