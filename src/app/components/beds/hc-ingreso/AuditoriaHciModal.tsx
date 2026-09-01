"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/app/components/UI/Modal";
import styles from "./AuditoriaHciModal.module.css";
import {
    obtenerAuditoriaPorVisita,
    type AuditoriaHci,
    type MovimientoAuditoria,
} from "@/app/services/auditoriaHciService";
import { getNombreCampo, getNombreSeccion } from "./camposHci";

interface AuditoriaHciModalProps {
    isOpen: boolean;
    onClose: () => void;
    numeroVisita: number;
    /** HC abierta en la sección: se marca para ubicarla entre las de la visita. */
    idHCIngresoActual?: number | null;
}

const ETIQUETA_ACCION: Record<string, string> = {
    I: "Alta",
    U: "Modificación",
    D: "Borrado",
};

const formatearFecha = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatearValor = (valor: string | null): string => {
    if (valor === null || valor.trim() === "") return "(vacío)";
    return valor;
};

const claseAccion = (accion: string): string => {
    if (accion === "I") return styles.badgeAlta;
    if (accion === "D") return styles.badgeBorrado;
    return styles.badgeModificacion;
};

/** Un movimiento: quién guardó, desde dónde y qué campos tocó. */
function Movimiento({ mov, esActual }: { mov: MovimientoAuditoria; esActual: boolean }) {
    const [abierto, setAbierto] = useState(false);
    const cantidad = mov.campos.length;

    return (
        <li className={styles.movimiento}>
            <div className={styles.movimientoHeader}>
                <span className={`${styles.badge} ${claseAccion(mov.accion)}`}>
                    {ETIQUETA_ACCION[mov.accion] || mov.accion}
                </span>
                <span className={styles.fecha}>{formatearFecha(mov.fechaHora)}</span>
                <span className={styles.usuario}>
                    {mov.usuario || "usuario desconocido"}
                </span>
                <span className={styles.origen} title={[mov.aplicacion, mov.host].filter(Boolean).join(" · ")}>
                    {mov.origen === "WEB" ? "Web" : "Sistema de escritorio"}
                </span>
                <span className={styles.hcId}>
                    HC #{mov.idHCIngreso}
                    {esActual && <span className={styles.actual}>abierta</span>}
                </span>
            </div>

            {cantidad > 0 && (
                <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setAbierto((v) => !v)}
                    aria-expanded={abierto}
                >
                    {abierto ? "▲ Ocultar" : "▼ Ver"} {cantidad}{" "}
                    {cantidad === 1 ? "campo" : "campos"}
                </button>
            )}

            {abierto && (
                <table className={styles.tablaCampos}>
                    <thead>
                        <tr>
                            <th>Sección</th>
                            <th>Campo</th>
                            <th>Antes</th>
                            <th>Después</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mov.campos.map((c) => (
                            <tr key={c.columna}>
                                <td className={styles.celdaSeccion}>{getNombreSeccion(c.columna)}</td>
                                <td className={styles.celdaCampo} title={c.columna}>
                                    {getNombreCampo(c.columna)}
                                </td>
                                <td className={styles.celdaAnterior}>{formatearValor(c.valorAnterior)}</td>
                                <td className={styles.celdaNuevo}>{formatearValor(c.valorNuevo)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </li>
    );
}

/**
 * Historial de cambios de las HC de ingreso de una visita.
 *
 * Es solo lectura y solo para administradores: lo monta HCIngresoSection
 * detrás del permiso INTERNACION.AUDITORIA_HC.VER.
 */
export default function AuditoriaHciModal({
    isOpen,
    onClose,
    numeroVisita,
    idHCIngresoActual,
}: AuditoriaHciModalProps) {
    const [auditoria, setAuditoria] = useState<AuditoriaHci | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setAuditoria(await obtenerAuditoriaPorVisita(numeroVisita));
        } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
            setAuditoria(null);
        } finally {
            setCargando(false);
        }
    }, [numeroVisita]);

    useEffect(() => {
        if (isOpen) cargar();
    }, [isOpen, cargar]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Historial de cambios de la HC" size="xlarge">
            <div className={styles.root}>
                {cargando && <p className={styles.estado}>Cargando historial…</p>}

                {!cargando && error && (
                    <div className={styles.errorBox}>
                        <p>{error}</p>
                        <button type="button" className={styles.reintentar} onClick={cargar}>
                            Reintentar
                        </button>
                    </div>
                )}

                {!cargando && !error && auditoria && !auditoria.instalada && (
                    <p className={styles.estado}>
                        Esta base todavía no tiene instalada la auditoría de historias clínicas.
                    </p>
                )}

                {!cargando && !error && auditoria?.instalada && (
                    <>
                        <p className={styles.leyenda}>
                            Cambios registrados sobre las HC de ingreso de la visita {numeroVisita},
                            incluidas las que se borraron. La auditoría solo registra desde que se
                            instaló.
                        </p>

                        {auditoria.truncado && (
                            <p className={styles.aviso}>
                                Hay más movimientos de los que se muestran: se listan los más recientes.
                            </p>
                        )}

                        {auditoria.movimientos.length === 0 ? (
                            <p className={styles.estado}>
                                No hay cambios registrados para esta visita.
                            </p>
                        ) : (
                            <ul className={styles.lista}>
                                {auditoria.movimientos.map((mov) => (
                                    <Movimiento
                                        key={`${mov.lote}-${mov.idHCIngreso}`}
                                        mov={mov}
                                        esActual={mov.idHCIngreso === idHCIngresoActual}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
