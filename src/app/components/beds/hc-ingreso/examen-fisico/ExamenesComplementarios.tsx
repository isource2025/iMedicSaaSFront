"use client";

import { ExamenesComplementarios } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ExamenesComplementariosProps {
    data: ExamenesComplementarios;
    onChange: (data: ExamenesComplementarios) => void;
    readOnly?: boolean;
}

export default function ExamenesComplementariosForm({ data, onChange, readOnly = false }: ExamenesComplementariosProps) {
    const handleChange = (field: keyof ExamenesComplementarios, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>
                    Detalle aquí lo exámenes complementarios que se haya realizado el paciente:
                </label>
                <textarea
                    className={styles.formTextarea}
                    value={data.detalle}
                    onChange={(e) => handleChange("detalle", e.target.value)}
                    readOnly={readOnly}
                    rows={15}
                />
            </div>
        </div>
    );
}
