"use client";

import React, { useState, useMemo } from "react";
import { useBedDetail } from "../contexts/BedDetailContext";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import InsumosTable, { InsumoRow } from "./InsumosTable";
import styles from "./InsumosSection.module.css";

interface InsumosSectionProps {
    numeroVisita: number | null;
    patientName?: string;
    patientLocation?: string;
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
}) => {
    const { activeSection, selectedDate } = useBedDetail();
    const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

    const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

    const insumosPath = useMemo(
        () => numeroVisita ? `/indicaciones/${numeroVisita}/insumos/byDate` : undefined,
        [numeroVisita]
    );

    const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
        enabled: !!insumosPath && activeSection === "insumos",
        endpointOverride: insumosPath
            ? { insumos: insumosPath }
            : undefined,
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
        return (
            <div className={styles.root}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Cargando insumos...</p>
                </div>
            </div>
        );
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
                        <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
                            onClick={() => {
                                // TODO: Implementar modal de agregar insumo
                                alert("Funcionalidad de agregar insumo en desarrollo");
                            }}
                        >
                            <span className={styles.addIcon} aria-hidden>
                                +
                            </span>
                            Insumo
                        </button>
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
            </div>

            {/* Contenedor flexible para la tabla */}
            <div className={styles.content}>
                <div className={styles.tableHolder}>
                    <InsumosTable
                        rows={insumosFiltered}
                        onSelectRow={handleSelectInsumo}
                        selectedId={selectedInsumoId}
                        refetch={refetch}
                    />
                </div>
            </div>
        </div>
    );
};

export default InsumosSection;
