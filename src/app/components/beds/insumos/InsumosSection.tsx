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

    if (activeSection !== "insumos") {
        return null;
    }

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Insumos</h2>
                    {patientName && (
                        <div className={styles.patientInfo}>
                            <span className={styles.patientName}>{patientName}</span>
                            {patientLocation && (
                                <span className={styles.patientLocation}>{patientLocation}</span>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Cargando insumos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Insumos</h2>
                </div>
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
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h2 className={styles.title}>Insumos</h2>
                    <button
                        className={styles.addButton}
                        onClick={() => {
                            // TODO: Implementar modal de agregar insumo
                            alert("Funcionalidad de agregar insumo en desarrollo");
                        }}
                    >
                        + Agregar Insumo
                    </button>
                </div>
                {patientName && (
                    <div className={styles.patientInfo}>
                        <span className={styles.patientName}>{patientName}</span>
                        {patientLocation && (
                            <span className={styles.patientLocation}>{patientLocation}</span>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <InsumosTable
                    rows={insumos}
                    onSelectRow={handleSelectInsumo}
                    selectedId={selectedInsumoId}
                    refetch={refetch}
                />
            </div>
        </div>
    );
};

export default InsumosSection;
