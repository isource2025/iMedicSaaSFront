"use client";

import { AparatoRespiratorio } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoRespiratorioProps {
    data: AparatoRespiratorio;
    onChange: (data: AparatoRespiratorio) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoRespiratorioForm({ data, onChange, readOnly = false }: ExamenFisicoRespiratorioProps) {
    const handleChange = (field: keyof AparatoRespiratorio, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>TORAX:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.torax}
                    onChange={(e) => handleChange("torax", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FORMA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.forma}
                    onChange={(e) => handleChange("forma", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ELASTICIDAD:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.elasticidad}
                    onChange={(e) => handleChange("elasticidad", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TIPO RESPIRATORIO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tipoRespiratorio}
                    onChange={(e) => handleChange("tipoRespiratorio", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>EXPANSION DE VERTICES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.expansionDeVertices}
                    onChange={(e) => handleChange("expansionDeVertices", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>VIBRACIONES VOCALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.vibracionesVocales}
                    onChange={(e) => handleChange("vibracionesVocales", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>EXPANSION DE BASES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.expansionDeBases}
                    onChange={(e) => handleChange("expansionDeBases", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PERCUSION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.percusion}
                    onChange={(e) => handleChange("percusion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>AUSCULTACION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.auscultacion}
                    onChange={(e) => handleChange("auscultacion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>OBSERVACIONES:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.observaciones}
                    onChange={(e) => handleChange("observaciones", e.target.value)}
                    readOnly={readOnly}
                    rows={4}
                />
            </div>
        </div>
    );
}
