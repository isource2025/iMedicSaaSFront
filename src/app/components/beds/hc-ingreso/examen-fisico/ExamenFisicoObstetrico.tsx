"use client";

import { ExamenObstetrico } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoObstetricoProps {
    data: ExamenObstetrico;
    onChange: (data: ExamenObstetrico) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoObstetricoForm({ data, onChange, readOnly = false }: ExamenFisicoObstetricoProps) {
    const handleChange = (field: keyof ExamenObstetrico, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>AU:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.au}
                        onChange={(e) => handleChange("au", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LCF:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.lcf}
                        onChange={(e) => handleChange("lcf", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>MFA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.mfa}
                        onChange={(e) => handleChange("mfa", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DU:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.du}
                        onChange={(e) => handleChange("du", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TONO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tono}
                    onChange={(e) => handleChange("tono", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LEOPOLD:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.leopold}
                    onChange={(e) => handleChange("leopold", e.target.value)}
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

            <div className={styles.subsectionHeader}>BISHOP</div>
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>P:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.bishopP}
                        onChange={(e) => handleChange("bishopP", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>R:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.bishopR}
                        onChange={(e) => handleChange("bishopR", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>E:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.bishopE}
                        onChange={(e) => handleChange("bishopE", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>L:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.bishopL}
                        onChange={(e) => handleChange("bishopL", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>D:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.bishopD}
                    onChange={(e) => handleChange("bishopD", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MEMBRANAS OVULARES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.membranasOvulares}
                    onChange={(e) => handleChange("membranasOvulares", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MANIOBRA DE TAMER:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.maniobraDeTamer}
                    onChange={(e) => handleChange("maniobraDeTamer", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PLANO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.plano}
                    onChange={(e) => handleChange("plano", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PELVIMETRIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.pelvimetria}
                    onChange={(e) => handleChange("pelvimetria", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HIDRORREA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.hidrorrea}
                    onChange={(e) => handleChange("hidrorrea", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>GINECORRAGIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecorragia}
                    onChange={(e) => handleChange("ginecorragia", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LOQUIOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.loquios}
                    onChange={(e) => handleChange("loquios", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>RETRACCION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.retraccion}
                    onChange={(e) => handleChange("retraccion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MAMAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.mamas}
                    onChange={(e) => handleChange("mamas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>LACTANCIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.lactancia}
                    onChange={(e) => handleChange("lactancia", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PERINE:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.perine}
                    onChange={(e) => handleChange("perine", e.target.value)}
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
                <label className={styles.formLabel}>TBM:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.tbm}
                    onChange={(e) => handleChange("tbm", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>DIAGNOSTICO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.diagnostico}
                    onChange={(e) => handleChange("diagnostico", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
