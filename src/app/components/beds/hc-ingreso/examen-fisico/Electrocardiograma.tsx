"use client";

import { Electrocardiograma } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ElectrocardiogramaProps {
    data: Electrocardiograma;
    onChange: (data: Electrocardiograma) => void;
    readOnly?: boolean;
}

export default function ElectrocardiogramaForm({ data, onChange, readOnly = false }: ElectrocardiogramaProps) {
    const handleChange = (field: keyof Electrocardiograma, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>RITMO:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.ritmo}
                        onChange={(e) => handleChange("ritmo", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FRECUENCIA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.frecuencia}
                        onChange={(e) => handleChange("frecuencia", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PR:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pr}
                        onChange={(e) => handleChange("pr", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>QT:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.qt}
                        onChange={(e) => handleChange("qt", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ONDAP: EJE:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.ondapEje}
                        onChange={(e) => handleChange("ondapEje", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DURACION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.duracion}
                        onChange={(e) => handleChange("duracion", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>AMPLITUD:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.amplitud}
                        onChange={(e) => handleChange("amplitud", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CONFORMACION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.conformacion}
                        onChange={(e) => handleChange("conformacion", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>QRS: EJE:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.qrsEje}
                        onChange={(e) => handleChange("qrsEje", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DURACION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.duracionQrs}
                        onChange={(e) => handleChange("duracionQrs", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ONDAT:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.ondat}
                        onChange={(e) => handleChange("ondat", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ST:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.st}
                        onChange={(e) => handleChange("st", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CONCLUSIONES:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.conclusiones}
                    onChange={(e) => handleChange("conclusiones", e.target.value)}
                    readOnly={readOnly}
                    rows={6}
                />
            </div>
        </div>
    );
}
