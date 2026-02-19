"use client";

import { useState } from "react";
import { ExamenFisicoCompleto } from "@/app/types/examenFisico";
import ExamenFisicoPielForm from "./ExamenFisicoPiel";
import ExamenFisicoTejidoSubcutaneo from "./ExamenFisicoTejidoSubcutaneo";
import ExamenFisicoCabezaForm from "./ExamenFisicoCabeza";
import ExamenFisicoCuelloForm from "./ExamenFisicoCuello";
import ExamenFisicoMamasForm from "./ExamenFisicoMamas";
import styles from "./ExamenFisicoContainer.module.css";

interface ExamenFisicoContainerProps {
    data: ExamenFisicoCompleto;
    onChange: (data: ExamenFisicoCompleto) => void;
    readOnly?: boolean;
}

type TabKey = "piel" | "tejidoSubcutaneo" | "cabeza" | "cuello" | "mamas";

const TABS: { key: TabKey; label: string }[] = [
    { key: "piel", label: "Piel" },
    { key: "tejidoSubcutaneo", label: "Tejido Subcutáneo" },
    { key: "cabeza", label: "Cabeza" },
    { key: "cuello", label: "Cuello" },
    { key: "mamas", label: "Mamas" },
];

export default function ExamenFisicoContainer({ data, onChange, readOnly = false }: ExamenFisicoContainerProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("piel");

    return (
        <div className={styles.container}>
            {/* Tabs de navegación */}
            <div className={styles.tabsContainer}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                        type="button"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenido del tab activo */}
            <div className={styles.tabContent}>
                {activeTab === "piel" && (
                    <ExamenFisicoPielForm
                        data={data.piel}
                        onChange={(piel) => onChange({ ...data, piel })}
                        readOnly={readOnly}
                    />
                )}

                {activeTab === "tejidoSubcutaneo" && (
                    <ExamenFisicoTejidoSubcutaneo
                        tejidoCelular={data.tejidoCelularSubcutaneo}
                        sistemaLinfatico={data.sistemaLinfatico}
                        sistemaOsteo={data.sistemaOsteoArticuloMuscular}
                        onChangeTejido={(tejidoCelularSubcutaneo) => onChange({ ...data, tejidoCelularSubcutaneo })}
                        onChangeLinfatico={(sistemaLinfatico) => onChange({ ...data, sistemaLinfatico })}
                        onChangeOsteo={(sistemaOsteoArticuloMuscular) => onChange({ ...data, sistemaOsteoArticuloMuscular })}
                        readOnly={readOnly}
                    />
                )}

                {activeTab === "cabeza" && (
                    <ExamenFisicoCabezaForm
                        data={data.cabeza}
                        onChange={(cabeza) => onChange({ ...data, cabeza })}
                        readOnly={readOnly}
                    />
                )}

                {activeTab === "cuello" && (
                    <ExamenFisicoCuelloForm
                        cuello={data.cuello}
                        sistemaVenoso={data.sistemaVenoso}
                        onChangeCuello={(cuello) => onChange({ ...data, cuello })}
                        onChangeVenoso={(sistemaVenoso) => onChange({ ...data, sistemaVenoso })}
                        readOnly={readOnly}
                    />
                )}

                {activeTab === "mamas" && (
                    <ExamenFisicoMamasForm
                        data={data.mamas}
                        onChange={(mamas) => onChange({ ...data, mamas })}
                        readOnly={readOnly}
                    />
                )}
            </div>
        </div>
    );
}
