"use client";

import { TejidoCelularSubcutaneo, SistemaLinfatico, SistemaOsteoArticuloMuscular } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenFisicoTejidoSubcutaneoProps {
    tejidoCelular: TejidoCelularSubcutaneo;
    sistemaLinfatico: SistemaLinfatico;
    sistemaOsteo: SistemaOsteoArticuloMuscular;
    onChangeTejido: (data: TejidoCelularSubcutaneo) => void;
    onChangeLinfatico: (data: SistemaLinfatico) => void;
    onChangeOsteo: (data: SistemaOsteoArticuloMuscular) => void;
    readOnly?: boolean;
}

export default function ExamenFisicoTejidoSubcutaneo({
    tejidoCelular,
    sistemaLinfatico,
    sistemaOsteo,
    onChangeTejido,
    onChangeLinfatico,
    onChangeOsteo,
    readOnly = false
}: ExamenFisicoTejidoSubcutaneoProps) {
    return (
        <div className={styles.formSection}>
            {/* TEJIDO CELULAR SUBCUTANEO */}
            <div className={styles.subsectionHeader}>TEJIDO CELULAR SUBCUTANEO</div>
            
            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>DISTRIBUCION:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={tejidoCelular.distribucion}
                        onChange={(e) => onChangeTejido({ ...tejidoCelular, distribucion: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>CANTIDAD:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={tejidoCelular.cantidad}
                        onChange={(e) => onChangeTejido({ ...tejidoCelular, cantidad: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>NODULOS:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={tejidoCelular.nodulos}
                        onChange={(e) => onChangeTejido({ ...tejidoCelular, nodulos: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>ENFISEMA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={tejidoCelular.enfisema}
                        onChange={(e) => onChangeTejido({ ...tejidoCelular, enfisema: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>EDEMAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={tejidoCelular.edemas}
                    onChange={(e) => onChangeTejido({ ...tejidoCelular, edemas: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            {/* SISTEMA LINFATICO */}
            <div className={styles.subsectionHeader}>SISTEMA LINFATICO</div>
            
            <div className={styles.formRow}>
                <label className={styles.formLabel}>LINFANGITIS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaLinfatico.linfangitis}
                    onChange={(e) => onChangeLinfatico({ ...sistemaLinfatico, linfangitis: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ADENOMEGALIAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaLinfatico.adenomegalias}
                    onChange={(e) => onChangeLinfatico({ ...sistemaLinfatico, adenomegalias: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            {/* SISTEMA OSTEO - ARTICULO - MUSCULAR */}
            <div className={styles.subsectionHeader}>SISTEMA OSTEO - ARTICULO - MUSCULAR</div>
            
            <div className={styles.formRow}>
                <label className={styles.formLabel}>MUSCULO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaOsteo.musculo}
                    onChange={(e) => onChangeOsteo({ ...sistemaOsteo, musculo: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>HUESOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaOsteo.huesos}
                    onChange={(e) => onChangeOsteo({ ...sistemaOsteo, huesos: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>COLUMNA VERTEBRAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaOsteo.columnaVertebral}
                    onChange={(e) => onChangeOsteo({ ...sistemaOsteo, columnaVertebral: e.target.value })}
                    readOnly={readOnly}
                />
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>INDICE TOBILLO - BRAZO DERECHA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={sistemaOsteo.indiceTobilloBrazoDerecha}
                        onChange={(e) => onChangeOsteo({ ...sistemaOsteo, indiceTobilloBrazoDerecha: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>INDICE TOBILLO - BRAZO IZQUERA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={sistemaOsteo.indiceTobilloBrazoIzquierda}
                        onChange={(e) => onChangeOsteo({ ...sistemaOsteo, indiceTobilloBrazoIzquierda: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRowDouble}>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PERIMETRO (DISTAL A PROXIMAL) MD:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={sistemaOsteo.perimetroDistalProximalMD}
                        onChange={(e) => onChangeOsteo({ ...sistemaOsteo, perimetroDistalProximalMD: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
                <div className={styles.formField}>
                    <label className={styles.formLabel}>PERIMETRO (DISTAL A PROXIMAL) MI:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={sistemaOsteo.perimetroDistalProximalMI}
                        onChange={(e) => onChangeOsteo({ ...sistemaOsteo, perimetroDistalProximalMI: e.target.value })}
                        readOnly={readOnly}
                    />
                </div>
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>ARTICULACIONES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={sistemaOsteo.articulaciones}
                    onChange={(e) => onChangeOsteo({ ...sistemaOsteo, articulaciones: e.target.value })}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
