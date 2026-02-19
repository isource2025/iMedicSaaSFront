"use client";

import { ExamenMamas } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoMamasProps {
    data: ExamenMamas;
    onChange: (data: ExamenMamas) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoMamasForm({ data, onChange, readOnly = false }: ExamenFisicoMamasProps) {
    const handleInspeccionChange = (field: keyof typeof data.inspeccion, value: string | boolean) => {
        onChange({
            ...data,
            inspeccion: { ...data.inspeccion, [field]: value }
        });
    };

    const handlePalpacionChange = (field: keyof typeof data.palpacion, value: string) => {
        onChange({
            ...data,
            palpacion: { ...data.palpacion, [field]: value }
        });
    };

    return (
        <div className={styles.formSection}>
            {/* INSPECCION */}
            <div className={styles.subsectionHeader}>Inspección</div>
            
            <div className={styles.formRow}>
                <label className={styles.formLabel}>TAMAÑO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion.tamano}
                    onChange={(e) => handleInspeccionChange("tamano", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SUPERFICIE:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion.superficie}
                    onChange={(e) => handleInspeccionChange("superficie", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>AREOLAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion.areolas}
                    onChange={(e) => handleInspeccionChange("areolas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>PEZONES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion.pezones}
                    onChange={(e) => handleInspeccionChange("pezones", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>MANIOBRA PECTORALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.inspeccion.maniobrapectorales}
                    onChange={(e) => handleInspeccionChange("maniobrapectorales", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={data.inspeccion.pielRetraccion}
                        onChange={(e) => handleInspeccionChange("pielRetraccion", e.target.checked)}
                        disabled={readOnly}
                    />
                    <span>PIEL RETRACCION</span>
                </label>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={data.inspeccion.elevacion}
                        onChange={(e) => handleInspeccionChange("elevacion", e.target.checked)}
                        disabled={readOnly}
                    />
                    <span>ELEVACION</span>
                </label>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={data.inspeccion.deNaranja}
                        onChange={(e) => handleInspeccionChange("deNaranja", e.target.checked)}
                        disabled={readOnly}
                    />
                    <span>DE NARANJA</span>
                </label>

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={data.inspeccion.ulceras}
                        onChange={(e) => handleInspeccionChange("ulceras", e.target.checked)}
                        disabled={readOnly}
                    />
                    <span>ULCERAS</span>
                </label>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>OBSERVACIONES:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.inspeccion.observaciones}
                    onChange={(e) => handleInspeccionChange("observaciones", e.target.value)}
                    readOnly={readOnly}
                    rows={3}
                />
            </div>

            {/* PALPACION */}
            <div className={styles.subsectionHeader}>Palpación</div>
            
            <div className={styles.formRow}>
                <label className={styles.formLabel}>LIMITES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.limites}
                    onChange={(e) => handlePalpacionChange("limites", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>DOLOROSA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.dolorosa}
                    onChange={(e) => handlePalpacionChange("dolorosa", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>SUPERFICIE:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.superficie}
                    onChange={(e) => handlePalpacionChange("superficie", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CONSISTENCIA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.consistencia}
                    onChange={(e) => handlePalpacionChange("consistencia", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TUMOR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.tumor}
                    onChange={(e) => handlePalpacionChange("tumor", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FLUACION PIEL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.fluacionPiel}
                    onChange={(e) => handlePalpacionChange("fluacionPiel", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>DERRAME POR PEZON:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.palpacion.derramePorPezon}
                    onChange={(e) => handlePalpacionChange("derramePorPezon", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
