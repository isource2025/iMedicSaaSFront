"use client";

import { PlanDiagnostico } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface PlanDiagnosticoProps {
    data: PlanDiagnostico;
    onChange: (data: PlanDiagnostico) => void;
    readOnly?: boolean;
}

export default function PlanDiagnosticoForm({ data, onChange, readOnly = false }: PlanDiagnosticoProps) {
    const handleChange = (field: keyof PlanDiagnostico, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            {(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const).map((letter) => (
                <div key={letter} className={styles.formRow}>
                    <label className={styles.formLabel}>{letter.toUpperCase()}:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data[letter]}
                        onChange={(e) => handleChange(letter, e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            ))}
        </div>
    );
}
