"use client";

import { AparatoCardiovascular } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoCardiovascularProps {
    data: AparatoCardiovascular;
    onChange: (data: AparatoCardiovascular) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoCardiovascularForm({ data, onChange, readOnly = false }: ExamenFisicoCardiovascularProps) {
    const handleChange = (field: keyof AparatoCardiovascular, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FRECUENCIA CARDIACA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.frecuenciaCardiaca}
                        onChange={(e) => handleChange("frecuenciaCardiaca", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CENTRAL:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.central}
                        onChange={(e) => handleChange("central", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PERIFERICA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.periferica}
                        onChange={(e) => handleChange("periferica", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PULSORADIAL (CARACTERISTICAS):</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pulsoradialCaracteristicas}
                        onChange={(e) => handleChange("pulsoradialCaracteristicas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>RELLENO CAPILAR:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.rellenoCapilar}
                        onChange={(e) => handleChange("rellenoCapilar", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LATIDO APEXIANO:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.latidoApexiano}
                        onChange={(e) => handleChange("latidoApexiano", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LATIDOS PALPABLES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.latidosPalpables}
                    onChange={(e) => handleChange("latidosPalpables", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>R 1:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.r1}
                        onChange={(e) => handleChange("r1", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>R 2:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.r2}
                        onChange={(e) => handleChange("r2", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>RUDOS AGREGADOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.rudosAgregados}
                    onChange={(e) => handleChange("rudosAgregados", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FROTES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.frotes}
                    onChange={(e) => handleChange("frotes", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SOPLOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.soplos}
                    onChange={(e) => handleChange("soplos", e.target.value)}
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
