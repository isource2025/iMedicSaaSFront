"use client";

import { Abdomen } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoAbdomenProps {
    data: Abdomen;
    onChange: (data: Abdomen) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoAbdomenForm({ data, onChange, readOnly = false }: ExamenFisicoAbdomenProps) {
    const handleChange = (field: keyof Abdomen, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>INSPECCION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion}
                    onChange={(e) => handleChange("inspeccion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PALPACION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion}
                    onChange={(e) => handleChange("palpacion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SUPERFICIAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.superficial}
                    onChange={(e) => handleChange("superficial", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PROFUNDA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.profunda}
                    onChange={(e) => handleChange("profunda", e.target.value)}
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
                <label className={styles.formLabel}>HIGADO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.higado}
                    onChange={(e) => handleChange("higado", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LIMITE SUP:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.limiteSup}
                        onChange={(e) => handleChange("limiteSup", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LIMITE INF:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.limiteInf}
                        onChange={(e) => handleChange("limiteInf", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ALTURA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.altura}
                    onChange={(e) => handleChange("altura", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CARACTERISTICAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.caracteristicas}
                    onChange={(e) => handleChange("caracteristicas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>AUSCULTACION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.auscultacion}
                        onChange={(e) => handleChange("auscultacion", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>RHA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.rha}
                        onChange={(e) => handleChange("rha", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
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
                <label className={styles.formLabel}>CELDA ESPLENICA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.celdaEsplenica}
                    onChange={(e) => handleChange("celdaEsplenica", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>BAZO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.bazo}
                    onChange={(e) => handleChange("bazo", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PERIMETRO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.perimetro}
                    onChange={(e) => handleChange("perimetro", e.target.value)}
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
