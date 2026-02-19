"use client";

import { ExamenCuello, SistemaVenoso } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoCuelloProps {
    cuello: ExamenCuello;
    sistemaVenoso: SistemaVenoso;
    onChangeCuello: (data: ExamenCuello) => void;
    onChangeVenoso: (data: SistemaVenoso) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoCuelloForm({
    cuello,
    sistemaVenoso,
    onChangeCuello,
    onChangeVenoso,
    readOnly = false
}: ExamenFisicoCuelloProps) {
    return (
        <div className={styles.formSection}>
            {/* CUELLO */}
            <div className={styles.subsectionHeader}>CUELLO</div>
            
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CONFORMACION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={cuello.conformacion}
                        onChange={(e) => onChangeCuello({ ...cuello, conformacion: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>LARINGE:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={cuello.laringe}
                        onChange={(e) => onChangeCuello({ ...cuello, laringe: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HUECO SUPRACLAVICULAR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={cuello.huecoSupraclavicular}
                    onChange={(e) => onChangeCuello({ ...cuello, huecoSupraclavicular: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HUECO INFRACLAVICULAR:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={cuello.huecoInfraclavicular}
                    onChange={(e) => onChangeCuello({ ...cuello, huecoInfraclavicular: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>YUGULARES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={cuello.yugulares}
                    onChange={(e) => onChangeCuello({ ...cuello, yugulares: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TIROIDES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={cuello.tiroides}
                    onChange={(e) => onChangeCuello({ ...cuello, tiroides: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            {/* SISTEMA VENOSO */}
            <div className={styles.subsectionHeader}>SISTEMA VENOSO</div>
            
            <div className={styles.formRow}>
                <label className={styles.formLabel}>VARICES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaVenoso.varices}
                    onChange={(e) => onChangeVenoso({ ...sistemaVenoso, varices: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>FLEBITIS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaVenoso.flebitis}
                    onChange={(e) => onChangeVenoso({ ...sistemaVenoso, flebitis: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>TROMBOSIS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaVenoso.trombosis}
                    onChange={(e) => onChangeVenoso({ ...sistemaVenoso, trombosis: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>CIRCULACION COLATERAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaVenoso.circulacionColateral}
                    onChange={(e) => onChangeVenoso({ ...sistemaVenoso, circulacionColateral: e.target.value })}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
