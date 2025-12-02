'use client'
import { useAppContext } from "@/app/contexts/AppContext";
import { FormData } from "../AplicarIndicacion";
import styles from "../AplicarIndicacion.module.css";

export default function RenderMedicacion({
    formData,
    handleChange
}: {
    formData: FormData;
    handleChange: (field: keyof FormData, value: any) => void;
}) {
    const { usuario } = useAppContext()
    return (
        <>
            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Profesional que Indica</label>
                <div className={styles.fieldValue}>
                    <input
                        type="text"
                        value={usuario?.codigoOperador || usuario?.valorPersonal || usuario?.idValorpersonal || ''}
                        disabled
                        className={styles.inputDisabled}
                    />
                    <span className={styles.profesionalNombre}>{usuario?.nombre + " " + usuario?.apellido}</span>
                </div>
            </div>

            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Fecha/Hora Revisión</label>
                <input
                    type="text"
                    value=""
                    disabled
                    className={styles.inputDisabled}
                />
            </div>

            <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Personal que Controla</label>
                <div className={styles.fieldValue}>
                    <input
                        type="text"
                        value={formData.profesionalAsiste}
                        disabled
                        className={styles.inputDisabled}
                    />
                    <span className={styles.profesionalNombre}>{formData.profesionalNombre}</span>
                </div>
            </div>

            {/* Sección con recuadro rojo - campos editables */}
            <div className={styles.editableSection}>
                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Fecha / Hora Control *</label>
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
                    <label className={styles.fieldLabel}>Sector</label>
                    <select
                        value={formData.sector || ''}
                        disabled
                        className={styles.inputDisabled}
                    >
                        <option value="">Seleccione...</option>
                        <option value="S1">SECTOR 1</option>
                        <option value="S2">SECTOR 2</option>
                    </select>
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Medicación</label>
                    <input
                        type="text"
                        value={formData.medicamento || ''}
                        disabled
                        className={styles.inputDisabled}
                    />
                </div>

                <div className={styles.fieldRow}>
                    <label className={styles.fieldLabel}>Cantidad Indicada</label>
                    <div className={styles.quantityGroup}>
                        <input
                            type="number"
                            value={formData.cantidadIndicada || ''}
                            disabled
                            className={styles.inputDisabled}
                            style={{ width: '80px' }}
                        />
                        <select disabled className={styles.inputDisabled} style={{ width: '100px' }}>
                            <option>ml</option>
                        </select>
                        <input
                            type="number"
                            value="1.00"
                            disabled
                            className={styles.inputDisabled}
                            style={{ width: '80px' }}
                        />
                    </div>
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

            {/* Campos fuera del recuadro */}
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
