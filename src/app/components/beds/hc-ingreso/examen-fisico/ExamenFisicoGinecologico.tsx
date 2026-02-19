"use client";

import { ExamenGinecologico } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoGinecologicoProps {
    data: ExamenGinecologico;
    onChange: (data: ExamenGinecologico) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoGinecologicoForm({ data, onChange, readOnly = false }: ExamenFisicoGinecologicoProps) {
    const handleChange = (field: keyof ExamenGinecologico, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>MONTEDEVENUS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.montedevenus}
                    onChange={(e) => handleChange("montedevenus", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LABIOS MAYORES MENORES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.labiosMayoresMenores}
                    onChange={(e) => handleChange("labiosMayoresMenores", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CLITORIS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.clitoris}
                    onChange={(e) => handleChange("clitoris", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>INTROITO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.introito}
                    onChange={(e) => handleChange("introito", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>VAGINA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.vagina}
                    onChange={(e) => handleChange("vagina", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FONDO SACO VAGINAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.fondoSacoVaginal}
                    onChange={(e) => handleChange("fondoSacoVaginal", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CERVIX:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.cervix}
                    onChange={(e) => handleChange("cervix", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>UTERO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.utero}
                    onChange={(e) => handleChange("utero", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ANEXOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.anexos}
                    onChange={(e) => handleChange("anexos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>EXAMEN AB VA RE:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.examenAbVaRe}
                    onChange={(e) => handleChange("examenAbVaRe", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ESPECULOSCOPIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.especuloscopia}
                    onChange={(e) => handleChange("especuloscopia", e.target.value)}
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
