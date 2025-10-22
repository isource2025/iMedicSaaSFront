"use client";

import { useMemo, useState } from "react";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import IndicacionesTable, { IndicacionRow } from "./IndicacionesTable";
import { useBedDetail } from "../contexts/BedDetailContext";
import styles from "./IndicacionesSection.module.css";
import IndicativoColors from "./IdicativosColors";
import NuevaIndicacionModal from "../../indicaciones/NuevaIndicacionModal";
import { NuevaIndicacionPayload } from "../../../types/indicaciones";
import ModalBasePaciente from "../../modals/ModalBasePaciente";
import { indicacionesService } from "../../../services/indicacionesService";
import { se } from "date-fns/locale";

type IndicacionDTO = {
    id: string;
    cantidad?: number | string;
    descripcion?: string;
    profesional?: string;
    frecuencia?: string;
    observaciones?: string;
    proximo?: string;
    anterior?: string;
    vigenteDesde?: string;
    nro?: number | string;
    idSector?: string;
    medicamento?: string;
};

export default function IndicacionesSection({
    bedId,
    patientId,
    numeroVisita,
    patientName,
    patientLocation,
}: {
    bedId?: string | number;
    patientId?: string | number;
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
}) {
    const { activeSection, selectedDate } = useBedDetail();

    const indicacionesPath = useMemo(
        () =>
            numeroVisita ? `/indicaciones/${numeroVisita}/byDate` : undefined,
        [numeroVisita]
    );

    const { data, isLoading, error, refetch } = useBedSectionFetch<
        IndicacionDTO[]
    >({
        bedId,
        patientId,
        enabled: !!indicacionesPath && activeSection === "indicaciones",
        endpointOverride: indicacionesPath
            ? { indicaciones: indicacionesPath }
            : undefined,
        cacheTimeMs: 15000,
    });

    const baseRows: IndicacionRow[] = useMemo(() => {
        // 🔓 soporta tanto array directo como wrapper {data:[]}
        const list: IndicacionDTO[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as any).data)
            ? (data as any).data
            : [];

        return list.map((x) => ({
            id: x.id,
            cantidad: x.cantidad,
            descripcion: x.descripcion,
            profesional: x.profesional,
            frecuencia: x.frecuencia,
            observaciones: x.observaciones,
            proximo: x.proximo,
            anterior: x.anterior,
            vigenteDesde: x.vigenteDesde,
            nro: x.nro,
            idSector: x.idSector,
            medicamento: x.medicamento,
        }));
    }, [data]);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [helpOpen, setHelpOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    if (activeSection !== "indicaciones") return null;

    // Filtrado simple por texto
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return baseRows;
        return baseRows.filter((r) => {
            const hay = (v?: string | number) =>
                v != null && String(v).toLowerCase().includes(q);
            return (
                hay(r.descripcion) ||
                hay(r.profesional) ||
                hay(r.frecuencia) ||
                hay(r.observaciones) ||
                hay(r.medicamento) ||
                hay(r.idSector) ||
                hay(r.nro)
            );
        });
    }, [baseRows, query]);

    const tableMaxHeight = "calc(100vh - 15rem)";

    const onAddIndicacion = () => {
        setModalOpen(true);
    };

    const handleSave = async (data: NuevaIndicacionPayload) => {
        setSaving(true);
        try {
            // Garantiza NumeroVisita desde props si viniera null
            const finalPayload: NuevaIndicacionPayload = {
                ...data,
                NumeroVisita: data.NumeroVisita ?? numeroVisita,
            };
            await indicacionesService.postNuevaIndicacion(finalPayload);

            await refetch();
        } catch (err) {
            if (err instanceof Error) {
                alert(
                    err.message ?? "Error inesperado al guardar la indicación"
                );
            }
        } finally {
            setSaving(false);
            setModalOpen(false);
        }
    };

    const handleUpdate = async (data: NuevaIndicacionPayload) => {
        setSaving(true);

        try {
            const id = Number(selectedId);
            if (isNaN(id) || id <= 0) {
                throw new Error("ID de indicación inválido para actualizar");
            }

            await indicacionesService.updateIndicacion(
                Number(selectedId),
                data
            );

            await refetch();
        } catch (err) {
            if (err instanceof Error) {
                alert(
                    err.message ??
                        "Error inesperado al actualizar la indicación"
                );
            }
        } finally {
            setSaving(false);
            setSelectedId(null);
        }
    };

    return (
        <div className={styles.root}>
            {/* Toolbar: búsqueda + acciones */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <span className={styles.searchIcon} aria-hidden>
                        🔎
                    </span>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="Buscar por descripción, profesional, medicamento, sector, nro…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className={styles.actions}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={onAddIndicacion}
                    >
                        <span className={styles.addIcon} aria-hidden>
                            ➕
                        </span>
                        Agregar indicación
                    </button>

                    <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => setHelpOpen(true)}
                        aria-label="Ayuda"
                        title="Ayuda"
                    >
                        <span className={styles.btnIcon} aria-hidden>
                            ❕
                        </span>
                    </button>
                </div>
            </div>

            {/* Contenedor flexible para la tabla */}
            <div className={styles.content}>
                <div className={styles.tableHolder}>
                    {isLoading && (
                        <div className={styles.loadingOverlay}>
                            Cargando indicaciones…
                        </div>
                    )}

                    {error ? (
                        <div className={styles.errorBox}>
                            <div>
                                Error cargando indicaciones: {error.message}
                            </div>
                        </div>
                    ) : (
                        <IndicacionesTable
                            rows={rows}
                            onSelectRow={(id) => setSelectedId(id)}
                            maxHeight={tableMaxHeight}
                            refetch={refetch}
                        />
                    )}
                </div>
            </div>

            {/* Modal de ayuda (placeholder) */}
            {helpOpen && <IndicativoColors setHelpOpen={setHelpOpen} />}

            {/* Modal de nueva indicación */}

            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => setModalOpen(false)}
                isOpen={modalOpen}
                titulo="Agregando nueva Indicación"
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-indicacion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : "Guardar"}
                        </button>
                    </>
                } // usamos el footer interno del form
            >
                <NuevaIndicacionModal
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                    defaultNumeroVisita={numeroVisita}
                />
            </ModalBasePaciente>

            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => setSelectedId(null)}
                isOpen={selectedId !== null}
                titulo="Actualizando una Indicación"
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-indicacion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : "Guardar"}
                        </button>
                    </>
                } // usamos el footer interno del form
            >
                <NuevaIndicacionModal
                    onClose={() => setSelectedId(null)}
                    onSave={handleUpdate}
                    defaultNumeroVisita={numeroVisita}
                    nroIndicacion={selectedId}
                />
            </ModalBasePaciente>
        </div>
    );
}
