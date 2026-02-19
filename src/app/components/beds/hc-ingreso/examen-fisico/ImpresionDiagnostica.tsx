"use client";

import { ImpresionDiagnostica } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface ImpresionDiagnosticaProps {
    data: ImpresionDiagnostica;
    onChange: (data: ImpresionDiagnostica) => void;
    readOnly?: boolean;
}

export default function ImpresionDiagnosticaForm({ data, onChange, readOnly = false }: ImpresionDiagnosticaProps) {
    const handleChange = (field: keyof ImpresionDiagnostica, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            <div className={styles.formRow}>
                <label className={styles.formLabel}>IMPRESION DIAGNOSTICA:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.impresionDiagnostica}
                    onChange={(e) => handleChange("impresionDiagnostica", e.target.value)}
                    readOnly={readOnly}
                    rows={10}
                />
            </div>

            <div className={styles.formRow}>
                <label className={styles.formLabel}>COMENTARIO DE INGRESO:</label>
                <textarea
                    className={styles.formTextarea}
                    value={data.comentarioDeIngreso}
                    onChange={(e) => handleChange("comentarioDeIngreso", e.target.value)}
                    readOnly={readOnly}
                    rows={6}
                />
            </div>
        </div>
    );
}
