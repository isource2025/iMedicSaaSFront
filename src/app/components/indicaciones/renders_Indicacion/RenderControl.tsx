'use client'
import { useAppContext } from "@/app/contexts/AppContext";
import { FormData } from "../AplicarIndicacion";
import styles from '../AplicarIndicacion.module.css';


export default function RenderControl({
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
                    <label className={styles.fieldLabel}>Fecha / Hora del Control *</label>
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
                <div className={styles.col5Rows}>
                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Pulso</label>
                        <div className={styles.minMaxGroup}>
                            <span className={styles.subLabel}>Max</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.pulsoMax || ''}
                                onChange={(e) => handleChange('pulsoMax', e.target.value)}
                                className={styles.inputEditable}
                            />
                            <span className={styles.subLabel}>Min</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.pulsoMin || ''}
                                onChange={(e) => handleChange('pulsoMin', e.target.value)}
                                className={styles.inputEditable}
                            />
                        </div>
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Presión Arterial</label>
                        <div className={styles.pressureGroup}>
                            <span className={styles.subLabel}>Max</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.presionArterialMax || ''}
                                onChange={(e) => handleChange('presionArterialMax', e.target.value)}
                                className={styles.inputEditable}
                            />
                            <span className={styles.subLabel}>Min</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.presionArterialMin || ''}
                                onChange={(e) => handleChange('presionArterialMin', e.target.value)}
                                className={styles.inputEditable}
                            />
                            <span className={styles.subLabel}>Media</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                value={formData.presionArterialMedia || ''}
                                onChange={(e) => handleChange('presionArterialMedia', e.target.value)}
                                className={styles.inputEditable}
                            />
                        </div>
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Fr. Resp.</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.frResp || ''}
                            onChange={(e) => handleChange('frResp', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Temperatura Axilar</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            step="0.1"
                            value={formData.temperaturaAxilar || ''}
                            onChange={(e) => handleChange('temperaturaAxilar', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Temperatura Rectal</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            step="0.1"
                            value={formData.temperaturaRectal || ''}
                            onChange={(e) => handleChange('temperaturaRectal', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Control de Glucemia</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.controlGlucemia || ''}
                            onChange={(e) => handleChange('controlGlucemia', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Saturometría</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.saturometria || ''}
                            onChange={(e) => handleChange('saturometria', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
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