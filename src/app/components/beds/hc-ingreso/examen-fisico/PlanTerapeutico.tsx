"use client";

import { PlanTerapeutico } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";

interface PlanTerapeuticoProps {
    data: PlanTerapeutico;
    onChange: (data: PlanTerapeutico) => void;
    readOnly?: boolean;
}

export default function PlanTerapeuticoForm({ data, onChange, readOnly = false }: PlanTerapeuticoProps) {
    const handleChange = (field: keyof PlanTerapeutico, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className={styles.formSection}>
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map((num) => (
                <div key={num} className={styles.formRow}>
                    <label className={styles.formLabel}>PT {num}:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data[`pt${num}` as keyof PlanTerapeutico]}
                        onChange={(e) => handleChange(`pt${num}` as keyof PlanTerapeutico, e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            ))}
        </div>
    );
}
