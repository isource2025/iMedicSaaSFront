"use client";

import { SignosVitales } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface SignosVitalesProps {
    data: SignosVitales;
    onChange: (data: SignosVitales) => void;
    readOnly?: boolean;
}

export default function SignosVitalesForm({ data, onChange, readOnly = false }: SignosVitalesProps) {
    const handleChange = (field: keyof SignosVitales, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pa}
                        onChange={(e) => handleChange("pa", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FC:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.fc}
                        onChange={(e) => handleChange("fc", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FR:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.fr}
                        onChange={(e) => handleChange("fr", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>TAX:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.tax}
                        onChange={(e) => handleChange("tax", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>GLUCEMIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.glucemia}
                    onChange={(e) => handleChange("glucemia", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>IMPRESION GENERAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.impresionGeneral}
                    onChange={(e) => handleChange("impresionGeneral", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FACIE:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.facie}
                        onChange={(e) => handleChange("facie", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DECUBITO:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.decubito}
                        onChange={(e) => handleChange("decubito", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>MARCHA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.marcha}
                        onChange={(e) => handleChange("marcha", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>TALLA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.talla}
                        onChange={(e) => handleChange("talla", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PESO ACTUAL:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pesoActual}
                        onChange={(e) => handleChange("pesoActual", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PESO HABITUAL:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pesoHabitual}
                        onChange={(e) => handleChange("pesoHabitual", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ESTADO NUTRICIONAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.estadoNutricional}
                    onChange={(e) => handleChange("estadoNutricional", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
