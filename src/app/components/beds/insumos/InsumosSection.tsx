"use client";

import React, { useState, useMemo } from "react";
import { useBedDetail } from "../contexts/BedDetailContext";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import InsumosTable, { InsumoRow } from "./InsumosTable";
import styles from './InsumosSection.module.css';
import BedSectionHeader from '../shared/BedSectionHeader';
import BedSectionLoading from '../shared/BedSectionLoading';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import PeriodFilter, { Periodo } from '../shared/PeriodFilter';
import EmptyState from '../shared/EmptyState';
import { generarPDFInsumos } from '../../../utils/pdfExportLazy';
import { obtenerInfoEmpresa } from '../../../services/empresaService';

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
    const { activeSection, selectedDate } = useBedDetail();
    const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

    const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

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

    const handleExport = async (option: ExportOption) => {
        if (option === 'pdf') {
            await generarPDFInsumos({
                items: insumosFiltered,
                fileName: `insumos_${numeroVisita}.pdf`,
                empresaInfo: await obtenerInfoEmpresa(),
                patient: {
                    numeroVisita: numeroVisita || undefined,
                    nombre: patientName,
                    numeroDocumento: documentoPaciente,
                    ubicacion: patientLocation,
                    fechaIngreso: fechaIngreso,
                    horaIngreso: horaIngreso
                }
            });
        }
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
            <BedSectionHeader title="Insumos" date={selectedDate}>
                <ExportButton
                    data={insumosFiltered}
                    fileName={`insumos_${selectedDate?.toISOString().split('T')[0]}.pdf`}
                    onExport={handleExport}
                    options={['pdf']}
                />
            </BedSectionHeader>

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
        </div>
    );
};

export default InsumosSection;
