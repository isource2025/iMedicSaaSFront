"use client";

import { ExamenOftalmologico } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenOftalmologicoProps {
    data: ExamenOftalmologico;
    onChange: (data: ExamenOftalmologico) => void;
    readOnly?: boolean;
}

export default function ExamenOftalmologicoForm({ data, onChange, readOnly = false }: ExamenOftalmologicoProps) {
    const handleChange = (field: keyof ExamenOftalmologico, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>FONDO DE OJO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.fondoDeOjo}
                    onChange={(e) => handleChange("fondoDeOjo", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MEDIOS BIREFRINGENTES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.mediosBirefringentes}
                    onChange={(e) => handleChange("mediosBirefringentes", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CRUCES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.cruces}
                    onChange={(e) => handleChange("cruces", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>RELACION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.relacion}
                    onChange={(e) => handleChange("relacion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HEMORRAGIA/EXUDADOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.hemorragiaExudados}
                    onChange={(e) => handleChange("hemorragiaExudados", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
