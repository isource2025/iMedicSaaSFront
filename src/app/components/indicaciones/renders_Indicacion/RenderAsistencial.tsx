import styles from "../AplicarIndicacion.module.css"
import { FormData } from "../AplicarIndicacion";

export default function RenderAsistencial({
    formData,
    handleChange
}: {
    formData: FormData;
    handleChange: (field: keyof FormData, value: any) => void;
}) {
    return (
        <>
            <div className={styles.editableSection}>
                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Fecha / Hora Cumplido *</label>
                    <div className={styles.dateTimeGroup}>
                        <input
                            type="date"
                            value={formData.fechaCumplido}
                            onChange={(e) => handleChange('fechaCumplido', e.target.value)}
                            className={styles.inputEditable}
                            autoFocus
                            tabIndex={1}
                        />
                        <input
                            type="time"
                            value={formData.horaCumplido}
                            onChange={(e) => handleChange('horaCumplido', e.target.value)}
                            className={styles.inputEditable}
                            tabIndex={2}
                        />
                        <span className={styles.clockIcon}>🕒</span>
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Descripción</label>
                    <input
                        type="text"
                        value={formData.descripcion || ''}
                        disabled
                        className={styles.inputDisabled}
                    />
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Observaciones</label>
                    <textarea
                        value={formData.observaciones}
                        onChange={(e) => handleChange('observaciones', e.target.value)}
                        className={styles.textareaEditable}
                        rows={3}
                        placeholder="Ingrese observaciones..."
                        tabIndex={3}
                    />
                </div>
            </div>

            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Frecuencia</label>
                <input
                    type="text"
                    value={formData.frecuencia}
                    disabled
                    className={styles.inputDisabled}
                />
            </div>

            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Fecha / Hora Próximo</label>
                <div className={styles.dateTimeGroup}>
                    <input
                        type="date"
                        value={formData.fechaProximo}
                        disabled
                        className={styles.inputDisabled}
                    />
                    <input
                        type="time"
                        value={formData.horaProximo}
                        disabled
                        className={styles.inputDisabled}
                    />
                </div>
            </div>
        </>
    );
}