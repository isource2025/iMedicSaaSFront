"use client";

import { AparatoUrogenital } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoUrogenitalProps {
    data: AparatoUrogenital;
    onChange: (data: AparatoUrogenital) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoUrogenitalForm({ data, onChange, readOnly = false }: ExamenFisicoUrogenitalProps) {
    const handleChange = (field: keyof AparatoUrogenital, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>GENITALES EXTERNOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.genitalesExternos}
                    onChange={(e) => handleChange("genitalesExternos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TACTO VAGINAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tactoVaginal}
                    onChange={(e) => handleChange("tactoVaginal", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TACTO RECTAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tactoRectal}
                    onChange={(e) => handleChange("tactoRectal", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PUÑO PERCUSION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.punoPercusion}
                    onChange={(e) => handleChange("punoPercusion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PUNTOS URETRALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.puntosUretrales}
                    onChange={(e) => handleChange("puntosUretrales", e.target.value)}
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
