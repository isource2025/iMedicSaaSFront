import { FormData } from '../AplicarIndicacion';
import styles from '../AplicarIndicacion.module.css';

export default function RenderDieta({ 
    formData, 
    handleChange 
}: { 
    formData: FormData;
    handleChange: (field: keyof FormData, value: any) => void;
}) {
    return (
        <>
            {/* Sección con recuadro rojo - campos editables */}
            <div className={styles.editableSection}>
                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Fecha / Hora Cumplido *</label>
                    <div className={styles.dateTimeGroup}>
                        <input
                            type="date"
                            value={formData.fechaCumplido}
                            onChange={(e) => handleChange('fechaCumplido', e.target.value)}
                            className={styles.inputEditable}
                        />
                        <input
                            type="time"
                            value={formData.horaCumplido}
                            onChange={(e) => handleChange('horaCumplido', e.target.value)}
                            className={styles.inputEditable}
                        />
                        <span className={styles.clockIcon}>🕒</span>
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Profesional</label>
                    <div className={styles.fieldValue}>
                        <input
                            type="text"
                            value={formData.profesionalAsiste || ''}
                            disabled
                            className={styles.inputDisabled}
                            style={{ width: '80px' }}
                        />
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Dieta</label>
                    <div className={styles.fieldValue}>
                        <input
                            type="text"
                            value={formData.descripcion || ''}
                            disabled
                            className={styles.inputDisabled}
                        />
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Observaciones</label>
                    <div className={styles.fieldValue}>
                        <textarea
                            value={formData.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            className={styles.textareaEditable}
                            rows={3}
                            placeholder="Ingrese observaciones..."
                        />
                    </div>
                </div>
            </div>

            {/* Campos fuera del recuadro */}
            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Frecuencia</label>
                <div className={styles.fieldValue}>
                    <input
                        type="text"
                        value={formData.frecuencia || ''}
                        disabled
                        className={styles.inputDisabled}
                    />
                </div>
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