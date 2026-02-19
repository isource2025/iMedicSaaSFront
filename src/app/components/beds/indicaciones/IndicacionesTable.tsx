"use client";
import styles from "./IndicacionesTable.module.css";
import EmptyState from "../shared/EmptyState";
import { IoMedicalOutline, IoCloseCircleOutline, IoRepeatOutline, IoPencilOutline, IoTrashOutline } from "react-icons/io5";
import { indicacionesService } from "../../../services/indicacionesService";
import { useState } from "react";
import ConfirmationModal from "../shared/ConfirmationModal";
import AplicarIndicacion from "../../indicaciones/AplicarIndicacion";
import { formatSqlDate, formatHoraSimple } from "../../../utils/dateUtils";

export type IndicacionHijaRow = {
    nroIndicacion: number;
    nroAdicional: number;
    cantidad: number | null;
    tipoUnidad: string | null;
    medicamento: string | null;
    descripcion: string | null;
    observaciones: string | null;
    frecuencia: string | null;
    formaAdicional: string | null;
};

export type IndicacionRow = {
    id: string;
    cantidad?: string | number;
    descripcion?: string;
    profesional?: string;
    fullName?: string;
    frecuencia?: string;
    intervalo?: number;
    observaciones?: string;
    proximo?: string;
    anterior?: string;
    vigenteDesde?: string;
    horaCarga?: string;
    tipo?: string;
    promptCodigo?: string;
    nro?: string | number;
    idSector?: string;
    medicamento?: string;
    suspendida?: boolean;
    unicaVez?: boolean;
    ultimaAplicacion?: string;
    proximaAplicacion?: string;
    estado?: string;
    indicacionesHijas?: IndicacionHijaRow[];
};

type Props = {
    rows: IndicacionRow[];
    onSelectRow?: (id: number) => void;
    selectedId?: string | null;
    maxHeight?: number | string;
    refetch: () => Promise<void>;
    numeroVisita: string;
    modoReindicar?: boolean;
    selectedForReindicar?: Set<string>;
    onToggleReindicar?: (id: string) => void;
    onActivarModoReindicar?: () => void;
};

export default function IndicacionesTable({
    rows,
    onSelectRow,
    selectedId,
    refetch,
    numeroVisita,
    modoReindicar = false,
    selectedForReindicar = new Set(),
    onToggleReindicar,
    onActivarModoReindicar,
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

    // Calcular cantidad por 24hs usando la misma fórmula del formulario
    const calcularCantidadPor24hs = (row: IndicacionRow): string => {
        const cantidadIndicada = typeof row.cantidad === 'number' ? row.cantidad : parseFloat(String(row.cantidad || 0));
        const intervalo = row.intervalo;

        if (!intervalo || intervalo <= 0 || !cantidadIndicada) {
            return String(cantidadIndicada || '');
        }

        // DAY_TICKS = 24h * 3600s * 100 ticks/s = 8,640,000 ticks Clarion
        const DAY_TICKS = 24 * 3600 * 100;
        
        // dosisPorDia = 24h / intervalo (en ticks Clarion)
        const dosisPorDia = Math.max(1, Math.round(DAY_TICKS / intervalo));
        
        // Cantidad total = cantidadIndicada × dosisPorDia
        const cantidadTotal = cantidadIndicada * dosisPorDia;

        return `${cantidadIndicada} (${cantidadTotal}/24hs)`;
    };

    // ✅ Función para calcular el estado según el tiempo hasta la próxima aplicación
    const getEstadoIndicacion = (row: IndicacionRow): { color: 'verde' | 'celeste' | 'amarillo' | 'azul' | 'rojo' | 'suspendida' | 'unica'; label: string } => {
        // Estados especiales tienen prioridad
        if (row.suspendida) {
            return { color: 'suspendida', label: '✖' };
        }
        
        if (row.unicaVez) {
            return { color: 'unica', label: 'U' };
        }
        
        // Si no hay próxima aplicación, no se puede calcular el estado
        if (!row.proximaAplicacion) {
            console.warn('Indicación sin próxima aplicación:', row.id, row);
            return { color: 'rojo', label: '' };
        }
        
        try {
            const ahora = new Date();
            const proxima = new Date(row.proximaAplicacion);
            
            if (isNaN(proxima.getTime())) {
                console.error('Fecha de próxima aplicación inválida:', row.proximaAplicacion, 'para indicación:', row.id);
                return { color: 'rojo', label: '' };
            }
            
            const diffMs = proxima.getTime() - ahora.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            console.log(`🔍 Estado para indicación ${row.id}:`, {
                proximaAplicacion: row.proximaAplicacion,
                ahora: ahora.toISOString(),
                proxima: proxima.toISOString(),
                diffMinutes,
                descripcion: row.descripcion
            });
            
            if (diffMinutes < 0) {
                return { color: 'rojo', label: '' }; // VENCIDA
            } else if (diffMinutes < 10) {
                return { color: 'azul', label: '' }; // URGENTE
            } else if (diffMinutes < 30) {
                return { color: 'amarillo', label: '' }; // PRONTO
            } else if (diffMinutes < 60) {
                return { color: 'celeste', label: '' }; // CERCANO
            } else {
                return { color: 'verde', label: '' }; // A TIEMPO
            }
        } catch (error) {
            console.error('Error al calcular estado de indicación:', error, row);
            return { color: 'rojo', label: '' };
        }
    };

    return (
        <>
            <div className={styles.tableWrap}>
                <div className={styles.scrollArea}>
                    <table className={styles.table} role="grid">
                        <thead className={styles.thead}>
                            <tr>
                                {modoReindicar && (
                                    <th className={styles.colCheckbox}>
                                        <input
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    rows.forEach(r => onToggleReindicar?.(r.id));
                                                } else {
                                                    rows.forEach(r => {
                                                        if (selectedForReindicar.has(r.id)) {
                                                            onToggleReindicar?.(r.id);
                                                        }
                                                    });
                                                }
                                            }}
                                            checked={rows.length > 0 && rows.every(r => selectedForReindicar.has(r.id))}
                                        />
                                    </th>
                                )}
                                <th className={styles.colEstado}>Estado</th>
                                <th className={styles.colCant}>Cantidad</th>
                                <th className={styles.colInd}>
                                    Indicación
                                    <br />
                                    <span>Tipo · Descripción · Profesional</span>
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
                                        {modoReindicar && (
                                            <td className={styles.cellCheckbox}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForReindicar.has(r.id)}
                                                    onChange={() => onToggleReindicar?.(r.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                        )}
                                        <td className={styles.cellEstado}>
                                            <div className={`${styles.estadoIndicador} ${styles[`estado${getEstadoIndicacion(r).color.charAt(0).toUpperCase() + getEstadoIndicacion(r).color.slice(1)}`]}`}>
                                                {getEstadoIndicacion(r).label}
                                            </div>
                                        </td>

                                        <td className={styles.cellTight}>
                                            <div className={styles.cantidad}>
                                                {calcularCantidadPor24hs(r)}
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.desc}>
                                                <div className={styles.primary}>
                                                    {r.promptCodigo?.toUpperCase() || "-"}
                                                </div>
                                                <div className={styles.primary}>
                                                    {r.descripcion ?? "-"}
                                                </div>
                                                {r.indicacionesHijas && r.indicacionesHijas.length > 0 && (
                                                    <div className={styles.indicacionesHijas}>
                                                        {r.indicacionesHijas.map((hija, idx) => (
                                                            <div key={idx} className={styles.hijaItem}>
                                                                + {hija.formaAdicional ? `${hija.formaAdicional} - ` : ''}{hija.medicamento || hija.descripcion}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
                                                {r.unicaVez ? "-" : (r.proximaAplicacion ? formatSqlDate(r.proximaAplicacion, { showTime: true, showDate: true, showYear: false }) : "-")}
                                            </div>
                                            <div className={styles.sub}>
                                                {r.ultimaAplicacion ? formatSqlDate(r.ultimaAplicacion, { showTime: true, showDate: true, showYear: false }) : ""}
                                            </div>
                                            <div className={styles.sub}>
                                                {r.vigenteDesde ? formatSqlDate(r.vigenteDesde, { showTime: false, showDate: true, showYear: true }) + (r.horaCarga ? " - " + formatHoraSimple(r.horaCarga) : "") : ""}
                                            </div>
                                        </td>

                                        <td className={styles.cellMono}>
                                            {r.idSector ?? ""}
                                        </td>

                                        <td className={styles.cellNum}>
                                            <div className={styles.nroContainer}>
                                                <div className={styles.nroPrincipal}>{r.nro ?? ""}</div>
                                                {r.indicacionesHijas && r.indicacionesHijas.length > 0 && (
                                                    <div className={styles.nrosHijas}>
                                                        {r.indicacionesHijas.map((hija, idx) => (
                                                            <div key={idx} className={styles.nroHija}>
                                                                {hija.nroIndicacion}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className={styles.cellAccion}>
                                            <div className={styles.actionBtns}>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title={r.unicaVez && r.ultimaAplicacion ? "Esta indicación de única vez ya fue aplicada" : "Aplicar Indicacion"}
                                                    disabled={r.unicaVez && r.ultimaAplicacion ? true : false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAplicarIndicacion(r); // ✅ NUEVO
                                                    }}
                                                >
                                                    <IoMedicalOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Dejar sin Efecto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <IoCloseCircleOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Volver a Indicar"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onActivarModoReindicar?.();
                                                    }}
                                                >
                                                    <IoRepeatOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Editar indicación"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectRow && onSelectRow(Number(r.id));
                                                    }}
                                                >
                                                    <IoPencilOutline color="#5BC0DE" size="18px" />
                                                </button>
                                                <button
                                                    className={`${styles.btnAction}`}
                                                    title="Eliminar indicación"
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
                                <IoMedicalOutline />
                            </button>
                            <button
                                className={`${styles.btnAction} ${styles.btnEdit}`}
                                title="Editar"
                                onClick={() => onSelectRow && onSelectRow(Number(r.id))}
                            >
                                <IoPencilOutline />
                            </button>
                            <button
                                className={`${styles.btnAction} ${styles.btnDelete}`}
                                title="Eliminar"
                                onClick={() => setDeletingId(r.id)}
                            >
                                <IoTrashOutline />
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