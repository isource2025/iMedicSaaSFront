"use client";

import { SistemaNervioso } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoNerviosoProps {
    data: SistemaNervioso;
    onChange: (data: SistemaNervioso) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoNerviosoForm({ data, onChange, readOnly = false }: ExamenFisicoNerviosoProps) {
    const handleChange = (field: keyof SistemaNervioso, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>CONCIENCIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.conciencia}
                    onChange={(e) => handleChange("conciencia", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MARCHA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.marcha}
                    onChange={(e) => handleChange("marcha", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TONO MUSCULAR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tonoMuscular}
                    onChange={(e) => handleChange("tonoMuscular", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FUERZA MUSCULAR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.fuerzaMuscular}
                    onChange={(e) => handleChange("fuerzaMuscular", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SIGNOS PIRAMIDALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.signosPiramidales}
                    onChange={(e) => handleChange("signosPiramidales", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SENSIBILIDAD SUPERFICIAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.sensibilidadSuperficial}
                    onChange={(e) => handleChange("sensibilidadSuperficial", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SIGNOS MENINGEOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.signosMeningeos}
                    onChange={(e) => handleChange("signosMeningeos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PARES CRANEANOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.paresCraneanos}
                    onChange={(e) => handleChange("paresCraneanos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>TAXIA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.taxia}
                        onChange={(e) => handleChange("taxia", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PRAXIA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.praxia}
                        onChange={(e) => handleChange("praxia", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    );
}
