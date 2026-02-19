"use client";

import { RadiografiaTorax } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface RadiografiaToraxProps {
    data: RadiografiaTorax;
    onChange: (data: RadiografiaTorax) => void;
    readOnly?: boolean;
}

export default function RadiografiaToraxForm({ data, onChange, readOnly = false }: RadiografiaToraxProps) {
    const handleChange = (field: keyof RadiografiaTorax, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>TECNICA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tecnica}
                    onChange={(e) => handleChange("tecnica", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PARTES BLANDAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.partesBlandas}
                        onChange={(e) => handleChange("partesBlandas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PARTES OSEAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.partesOseas}
                        onChange={(e) => handleChange("partesOseas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>HEMIDIAFRAGMAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.hemidiafragmas}
                        onChange={(e) => handleChange("hemidiafragmas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ICT:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.ict}
                        onChange={(e) => handleChange("ict", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SENOS COSTOFRENICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.senosCostofrenicos}
                    onChange={(e) => handleChange("senosCostofrenicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MEDIASTINO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.mediastino}
                    onChange={(e) => handleChange("mediastino", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SILUETA CARDIOVASCULAR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.siluetaCardiovascular}
                    onChange={(e) => handleChange("siluetaCardiovascular", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HILIOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.hilios}
                    onChange={(e) => handleChange("hilios", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CAMPOS PULMONARES:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.camposPulmonares}
                        onChange={(e) => handleChange("camposPulmonares", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CONCLUSIONES:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.conclusiones}
                        onChange={(e) => handleChange("conclusiones", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LABORATORIO:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.laboratorio}
                    onChange={(e) => handleChange("laboratorio", e.target.value)}
                    readOnly={readOnly}
                    rows={6}
                />
            </div>
        </div>
    );
}
