"use client";

import { AntecedentesPersonales } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface AntecedentesPersonalesProps {
    data: AntecedentesPersonales;
    onChange: (data: AntecedentesPersonales) => void;
    readOnly?: boolean;
}

export default function AntecedentesPersonalesForm({ data, onChange, readOnly = false }: AntecedentesPersonalesProps) {
    const handleChange = (
        category: keyof AntecedentesPersonales,
        field: string,
        value: string
    ) => {
        onChange({
            ...data,
            [category]: {
                ...data[category],
                [field]: value,
            },
        });
    };

    return (
        <div className={styles.formSection}>
            {/* DEL MEDIO Y LABORALES */}
            <div className={styles.subsectionHeader}>DEL MEDIO Y LABORALES</div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>RESIDENCIA ACTUAL:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.delMedioYLaborales.residenciaActual}
                    onChange={(e) => handleChange("delMedioYLaborales", "residenciaActual", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>RESIDENCIAS ANTERIORES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.delMedioYLaborales.residenciasAnteriores}
                    onChange={(e) => handleChange("delMedioYLaborales", "residenciasAnteriores", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            {/* HABITOS */}
            <div className={styles.subsectionHeader}>HABITOS</div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ESTUDIOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.estudios}
                    onChange={(e) => handleChange("habitos", "estudios", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>OCUPACION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.ocupacion}
                    onChange={(e) => handleChange("habitos", "ocupacion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ALCOHOL Y TOXICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.alcoholYToxicos}
                    onChange={(e) => handleChange("habitos", "alcoholYToxicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ALIMENTACION (HABITOS ALIMENTICIOS Y VENENOS):</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.alimentacionHabitosAlimenticiosYVenenos}
                    onChange={(e) => handleChange("habitos", "alimentacionHabitosAlimenticiosYVenenos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>SEXUALIDAD:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.sexualidad}
                    onChange={(e) => handleChange("habitos", "sexualidad", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>DEPORTES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.deportes}
                    onChange={(e) => handleChange("habitos", "deportes", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>CATARSIS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.catarsis}
                    onChange={(e) => handleChange("habitos", "catarsis", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>TABACO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.tabaco}
                    onChange={(e) => handleChange("habitos", "tabaco", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>OTRAS ADICCIONES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.habitos.otrasAdicciones}
                    onChange={(e) => handleChange("habitos", "otrasAdicciones", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            {/* PATOLOGICOS */}
            <div className={styles.subsectionHeader}>PATOLOGICOS</div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>INFECTO-CONTAGIOSAS (VACUNAS):</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.infectoContagiosas}
                    onChange={(e) => handleChange("patologicos", "infectoContagiosas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>VACUNAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.vacunas}
                    onChange={(e) => handleChange("patologicos", "vacunas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>CARDIOVASCULARES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.cardiovasculares}
                    onChange={(e) => handleChange("patologicos", "cardiovasculares", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>GASTROINTESTINALES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.gastrointestinales}
                    onChange={(e) => handleChange("patologicos", "gastrointestinales", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>RESPIRATORIAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.respiratorias}
                    onChange={(e) => handleChange("patologicos", "respiratorias", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>URINARIAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.urinarias}
                    onChange={(e) => handleChange("patologicos", "urinarias", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>HEMATOLOGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.hematologicos}
                    onChange={(e) => handleChange("patologicos", "hematologicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ALERGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.alergicos}
                    onChange={(e) => handleChange("patologicos", "alergicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>QUIRURGICOS Y TRAUMATOLOGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.quirurgicosYTraumatologicos}
                    onChange={(e) => handleChange("patologicos", "quirurgicosYTraumatologicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>DERMATOLOGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.dermatologicos}
                    onChange={(e) => handleChange("patologicos", "dermatologicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>OFTALMOLOGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.patologicos.oftalmologicos}
                    onChange={(e) => handleChange("patologicos", "oftalmologicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            {/* GINECOLOGICOS */}
            <div className={styles.subsectionHeader}>GINECOLOGICOS</div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>QUIRURGICOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.quirurgicos}
                    onChange={(e) => handleChange("ginecologicos", "quirurgicos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>MENARCA:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.menarca}
                    onChange={(e) => handleChange("ginecologicos", "menarca", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>RITMO:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.ritmo}
                    onChange={(e) => handleChange("ginecologicos", "ritmo", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>FUM:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.fum}
                    onChange={(e) => handleChange("ginecologicos", "fum", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ABORTOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.abortos}
                    onChange={(e) => handleChange("ginecologicos", "abortos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>GESTAS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.gestas}
                    onChange={(e) => handleChange("ginecologicos", "gestas", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>PARTOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.ginecologicos.partos}
                    onChange={(e) => handleChange("ginecologicos", "partos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>

            {/* FAMILIARES */}
            <div className={styles.subsectionHeader}>FAMILIARES</div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ANTICONCEPCION:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.familiares.anticoncepcion}
                    onChange={(e) => handleChange("familiares", "anticoncepcion", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>ANTECEDENTES FAMILIARES:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.familiares.antecedetesFamiliares}
                    onChange={(e) => handleChange("familiares", "antecedetesFamiliares", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>HIJOS:</label>
                <input
                    type="text"
                    className={styles.formInput}
                    value={data.familiares.hijos}
                    onChange={(e) => handleChange("familiares", "hijos", e.target.value)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
}
