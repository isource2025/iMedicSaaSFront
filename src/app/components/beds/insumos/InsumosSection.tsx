"use client";

import React, { useState, useMemo } from "react";
import { useBedDetail } from "../contexts/BedDetailContext";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import InsumosTable, { InsumoRow } from "./InsumosTable";
import styles from './InsumosSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import PeriodFilter, { Periodo } from '../shared/PeriodFilter';
import EmptyState from '../shared/EmptyState';
import { generarPDFInsumos } from '../../../utils/pdfExportLazy';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { usePermiso } from '../../../hooks/usePermiso';
import { puedeCargarEnFechaSeleccionada } from '../../../utils/visitaEgreso';
import NuevaIndicacionModal from '../../indicaciones/NuevaIndicacionModal';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import { indicacionesService } from '../../../services/indicacionesService';
import type { NuevaIndicacionPayload } from '../../../types/indicaciones';

const TIPO_DESCARTABLES = 9;

interface InsumosSectionProps {
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
    documentoPaciente?: string;
    fechaIngreso?: string;
    horaIngreso?: string;
}

function toISODate(d: Date | null | undefined): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

const InsumosSection: React.FC<InsumosSectionProps> = ({
    numeroVisita,
    patientName,
    patientLocation,
    documentoPaciente,
    fechaIngreso,
    horaIngreso
}) => {
    const { activeSection, selectedDate, setSelectedDate, bed } = useBedDetail();
    const { puede } = usePermiso();
    const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

    const puedeCrear =
        (puede('INTERNACION.INSUMOS.CREAR') || puede('INTERNACION.INDICACIONES.CREAR')) &&
        puedeCargarEnFechaSeleccionada(selectedDate, {
            egresada: bed?.egresada,
            fechaEgresoSQL: bed?.fechaEgresoSQL,
            fechaIngresoSQL: bed?.fechaIngresoSQL ?? fechaIngreso,
        });

    /** Igual que en Indicaciones: se carga para hoy o mañana. */
    const fechaCargaPermitida = useMemo(() => {
        const hoy = new Date();
        const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
        const sel = toISODate(selectedDate);
        return sel === toISODate(manana) ? sel : toISODate(hoy);
    }, [selectedDate]);

    const insumosPath = useMemo(
        () => numeroVisita ? `/indicaciones/${numeroVisita}/insumos/byDate` : undefined,
        [numeroVisita]
    );

    const [periodo, setPeriodo] = useState<Periodo>('0');
    const paramsPeriodo = useMemo(() => (periodo === '0' ? undefined : { days: periodo }), [periodo]);

    const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
        enabled: !!insumosPath && activeSection === "insumos",
        endpointOverride: insumosPath
            ? { insumos: insumosPath }
            : undefined,
        params: paramsPeriodo,
        cacheTimeMs: 15000,
    });

    const insumos: InsumoRow[] = useMemo(() => {
        const list: InsumoRow[] = Array.isArray(data)
            ? data
            : data && Array.isArray((data as any).data)
            ? (data as any).data
            : [];
        
        return list;
    }, [data]);

    const handleSelectInsumo = (id: number) => {
        setSelectedInsumoId(String(id));
    };

    // Formatear fecha seleccionada para mostrar
    const formatSelectedDate = () => {
        if (!selectedDate) return null;
        const date = new Date(selectedDate);
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const diaSemana = dias[date.getDay()];
        const diaMes = date.getDate();
        const mes = meses[date.getMonth()];
        return { diaSemana, diaMes, mes };
    };

    const fechaFormateada = formatSelectedDate();

    const handleExport = async (option: ExportOption) => {
        if (option === 'pdf') {
            const empresaInfo = await obtenerInfoEmpresa();
            await generarPDFInsumos({
                items: insumosFiltered,
                fileName: `insumos_${selectedDate?.toISOString().split('T')[0]}.pdf`,
                empresaInfo,
                patient: {
                    numeroVisita: numeroVisita || undefined,
                    nombre: patientName,
                    numeroDocumento: documentoPaciente,
                    ubicacion: patientLocation,
                    fechaIngreso,
                    horaIngreso,
                },
            });
        }
    };

    const handleSave = async (payload: NuevaIndicacionPayload) => {
        setSaving(true);
        try {
            const fechaGuardada = payload.FechaCarga || fechaCargaPermitida;
            const resultado = await indicacionesService.postNuevaIndicacion({
                ...payload,
                NumeroVisita: payload.NumeroVisita ?? numeroVisita,
                TipoIndicacion: TIPO_DESCARTABLES,
                FechaCarga: fechaGuardada,
            });
            if (fechaGuardada && fechaGuardada !== fechaISO) {
                const [y, m, d] = fechaGuardada.split('-').map(Number);
                setSelectedDate(new Date(y, m - 1, d));
            }
            return resultado;
        } finally {
            setSaving(false);
        }
    };

    const refetchListado = async () => {
        await refetch();
    };

    const [query, setQuery] = useState("");

    // Filtrar insumos por búsqueda
    const insumosFiltered = useMemo(() => {
        if (!query.trim()) return insumos;
        const q = query.toLowerCase();
        return insumos.filter((r: any) => {
            const hay = (s: any) => String(s || "").toLowerCase().includes(q);
            return (
                hay(r.descripcion) ||
                hay(r.medicamento) ||
                hay(r.cantidad) ||
                hay(r.sector)
            );
        });
    }, [insumos, query]);

    if (activeSection !== "insumos") {
        return null;
    }

    if (isLoading) {
        return <BedSectionLoading />;
    }

    if (error) {
        return (
            <div className={styles.root}>
                <div className={styles.errorContainer}>
                    <p>Error al cargar los insumos</p>
                    <button onClick={() => refetch()} className={styles.retryButton}>
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            {/* Fecha seleccionada + botón agregar */}
            {fechaFormateada && (
                <div className={styles.dateHeader}>
                    <h2 className={styles.sectionTitle}>Insumos</h2>
                    <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
                    <span className={styles.dateText}>{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}</span>
                    <div className={styles.dateActions}>
                        {puedeCrear && (
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
                                onClick={() => setModalOpen(true)}
                            >
                                <span className={styles.addIcon} aria-hidden>
                                    +
                                </span>
                                Agregar insumo
                            </button>
                        )}
                        <ExportButton
                            data={insumosFiltered}
                            fileName={`insumos_${selectedDate?.toISOString().split('T')[0]}.pdf`}
                            onExport={handleExport}
                            options={['pdf']}
                        />
                    </div>
                </div>
            )}

            {/* Toolbar: búsqueda */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <span className={styles.searchIcon} aria-hidden>
                        🔎
                    </span>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="Buscar por descripción, medicamento, cantidad, sector…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <PeriodFilter value={periodo} onChange={setPeriodo} />
            </div>

            {/* Contenedor flexible para la tabla */}
            <div className={styles.content}>
                <div className={styles.tableHolder}>
                    {insumosFiltered.length === 0 ? (
                        <EmptyState
                            variant="insumos"
                            text="Sin insumos registrados"
                            description="No hay insumos/descartables indicados para esta fecha."
                        />
                    ) : (
                        <InsumosTable
                            rows={insumosFiltered}
                            onSelectRow={handleSelectInsumo}
                            selectedId={selectedInsumoId}
                            refetch={refetch}
                        />
                    )}
                </div>
            </div>

            <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={() => setModalOpen(false)}
                isOpen={modalOpen}
                titulo="Agregar insumo"
                footerButtons={
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        type="submit"
                        form="nueva-indicacion-form"
                        disabled={saving}
                    >
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                }
            >
                {modalOpen && (
                    <NuevaIndicacionModal
                        onClose={() => setModalOpen(false)}
                        onSave={handleSave}
                        defaultNumeroVisita={numeroVisita}
                        refetch={refetchListado}
                        fechaCarga={fechaCargaPermitida}
                        fechaIngresoSQL={bed?.fechaIngresoSQL ?? fechaIngreso}
                        fechaEgresoSQL={bed?.fechaEgresoSQL}
                        egresada={Boolean(bed?.egresada)}
                        tipoFijo={TIPO_DESCARTABLES}
                    />
                )}
            </ModalBasePaciente>
        </div>
    );
};

export default InsumosSection;
