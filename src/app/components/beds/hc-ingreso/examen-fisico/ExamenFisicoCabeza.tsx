"use client";

import { ExamenCabeza } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoCabezaProps {
    data: ExamenCabeza;
    onChange: (data: ExamenCabeza) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoCabezaForm({ data, onChange, readOnly = false }: ExamenFisicoCabezaProps) {
    const handleChange = (field: keyof ExamenCabeza, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FORMA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.forma}
                        onChange={(e) => handleChange("forma", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>TAMAÑO:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.tamano}
                        onChange={(e) => handleChange("tamano", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>OJOS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.ojos}
                        onChange={(e) => handleChange("ojos", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PUPILAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.pupilas}
                        onChange={(e) => handleChange("pupilas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CONJUNTIVAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.conjuntivas}
                        onChange={(e) => handleChange("conjuntivas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CORNEAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.corneas}
                        onChange={(e) => handleChange("corneas", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ESCLEROTICAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.escleroticas}
                    onChange={(e) => handleChange("escleroticas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PARPADOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.parpados}
                    onChange={(e) => handleChange("parpados", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FOSAS NASALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.fosasNasales}
                    onChange={(e) => handleChange("fosasNasales", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>BOCA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.boca}
                    onChange={(e) => handleChange("boca", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LABIOS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.labios}
                        onChange={(e) => handleChange("labios", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ENCIAS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.encias}
                        onChange={(e) => handleChange("encias", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>FAUCES:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.fauces}
                        onChange={(e) => handleChange("fauces", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LENGUA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.lengua}
                        onChange={(e) => handleChange("lengua", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DIENTES:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.dientes}
                        onChange={(e) => handleChange("dientes", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>GLANDULAS SALIVALES:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.glandulasSalivales}
                        onChange={(e) => handleChange("glandulasSalivales", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PABELLONES AURICULARES Y CAE:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.pabellonesAuricularesCAE}
                    onChange={(e) => handleChange("pabellonesAuricularesCAE", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
