"use client";

import { ExamenFisicoPiel } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoPielProps {
    data: ExamenFisicoPiel;
    onChange: (data: ExamenFisicoPiel) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoPielForm({ data, onChange, readOnly = false }: ExamenFisicoPielProps) {
    const handleChange = (field: keyof ExamenFisicoPiel, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>COLORACION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.coloracion}
                    onChange={(e) => handleChange("coloracion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HUMEDAD:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.humedad}
                    onChange={(e) => handleChange("humedad", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TEMPERATURA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.temperatura}
                    onChange={(e) => handleChange("temperatura", e.target.value)}
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
                <label className={styles.formLabel}>UÑAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.unas}
                    onChange={(e) => handleChange("unas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>DISTRIBUCION PILOSA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.distribucionPilosa}
                    onChange={(e) => handleChange("distribucionPilosa", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CICATRICES:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.cicatrices}
                    onChange={(e) => handleChange("cicatrices", e.target.value)}
                    readOnly={readOnly}
                    rows={4}
                />
            </div>
        </div>
    );
}
