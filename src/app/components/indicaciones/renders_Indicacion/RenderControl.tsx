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

    // ✅ Helper para manejar cambios en los campos de control
    const handleControlChange = (field: keyof FormData['control'], value: string) => {
        handleChange('control', {
            ...formData.control,
            [field]: value
        });
    };

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
                    <span className={styles.profesionalNombre}>{usuario?.nombre + " " + usuario?.apellido}</span>
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
                    </div>
                </div>
                <div className={styles.col5Rows}>
                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Pulso</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.control.pulso || ''}
                            onChange={(e) => handleControlChange('pulso', e.target.value)}
                            className={styles.inputEditable}
                            tabIndex={3}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Presión Arterial</label>
                        <div className={styles.pressureGroup}>
                            <span className={styles.subLabel}>Max</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.control.presionArterialMax || ''}
                                onChange={(e) => handleControlChange('presionArterialMax', e.target.value)}
                                className={styles.inputEditable}
                                tabIndex={4}
                            />
                            <span className={styles.subLabel}>Min</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.control.presionArterialMin || ''}
                                onChange={(e) => handleControlChange('presionArterialMin', e.target.value)}
                                className={styles.inputEditable}
                                tabIndex={5}
                            />
                            <span className={styles.subLabel}>Media</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                value={formData.control.presionArterialMedia || ''}
                                onChange={(e) => handleControlChange('presionArterialMedia', e.target.value)}
                                className={styles.inputEditable}
                                tabIndex={6}
                            />
                        </div>
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Fr. Resp.</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.control.frResp || ''}
                            onChange={(e) => handleControlChange('frResp', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                            tabIndex={7}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Temperatura Axilar</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            step="0.1"
                            value={formData.control.temperaturaAxilar || ''}
                            onChange={(e) => handleControlChange('temperaturaAxilar', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                            tabIndex={8}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Temperatura Rectal</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            step="0.1"
                            value={formData.control.temperaturaRectal || ''}
                            onChange={(e) => handleControlChange('temperaturaRectal', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                            tabIndex={9}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Control de Glucemia</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.control.glucemia || ''}
                            onChange={(e) => handleControlChange('glucemia', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                            tabIndex={10}
                        />
                    </div>

                    <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Saturometría</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.control.saturometria || ''}
                            onChange={(e) => handleControlChange('saturometria', e.target.value)}
                            className={styles.inputEditable}
                            style={{ width: '100px' }}
                            tabIndex={11}
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
                        tabIndex={12}
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