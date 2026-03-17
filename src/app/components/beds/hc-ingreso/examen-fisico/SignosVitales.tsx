"use client";

import { SignosVitales } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";
import { useState } from "react";
import ModalCargarControl, { ControlDatosCargados } from "./ModalCargarControl";

interface SignosVitalesProps {
    data: SignosVitales;
    onChange: (data: SignosVitales) => void;
    readOnly?: boolean;
    numeroVisita?: number;
    idHCIngreso?: number;
}

export default function SignosVitalesForm({ data, onChange, readOnly = false, numeroVisita, idHCIngreso }: SignosVitalesProps) {
    const [showControlesModal, setShowControlesModal] = useState(false);
    const [controlCargado, setControlCargado] = useState<ControlDatosCargados | null>(null);
    
    const handleChange = (field: keyof SignosVitales, value: string) => {
        onChange({ ...data, [field]: value });
    };
    
    const handleOpenControlesModal = () => {
        setShowControlesModal(true);
    };
    
    const handleCloseModal = () => {
        setShowControlesModal(false);
    };
    
    const handleControlGuardado = (datos?: ControlDatosCargados) => {
        setShowControlesModal(false);
        if (datos) {
            setControlCargado(datos);
            // Actualizar campos de signos vitales en el formulario padre
            onChange({
                ...data,
                pa: datos.pa || data.pa,
                fc: datos.fc || data.fc,
                fr: datos.fr || data.fr,
                tax: datos.tax || data.tax,
                glucemia: datos.glucemia || data.glucemia,
            });
        }
    };

    return (
        <div className={styles.formSection}>
            {/* Banner para cargar control */}
            <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #00B5E2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#0083A9', fontSize: '14px', fontWeight: '600' }}>DATOS MEDIBLES (Controles de Enfermería)</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Los datos medibles se guardan automáticamente en Controles Frecuentes</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenControlesModal}
                        disabled={readOnly || !numeroVisita}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#00B5E2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (readOnly || !numeroVisita) ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            opacity: (readOnly || !numeroVisita) ? 0.6 : 1
                        }}
                    >
                        + Cargar Control
                    </button>
                </div>
                {/* Resumen de datos medibles cargados */}
                {(controlCargado || data.pa || data.fc || data.fr || data.tax || data.glucemia) && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {(controlCargado?.pa || data.pa) && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>P A:</strong> {controlCargado?.pa || data.pa} mmHg
                            </div>
                        )}
                        {(controlCargado?.fc || data.fc) && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>F C:</strong> {controlCargado?.fc || data.fc} lpm
                            </div>
                        )}
                        {(controlCargado?.fr || data.fr) && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>F R:</strong> {controlCargado?.fr || data.fr} rpm
                            </div>
                        )}
                        {(controlCargado?.tax || data.tax) && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>T A X:</strong> {controlCargado?.tax || data.tax}°C
                            </div>
                        )}
                        {(controlCargado?.glucemia || data.glucemia) && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>Glucemia:</strong> {controlCargado?.glucemia || data.glucemia} mg/dL
                            </div>
                        )}
                        {controlCargado?.saturacion && (
                            <div style={{ padding: '6px 10px', backgroundColor: '#e0f7fa', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>Saturación:</strong> {controlCargado.saturacion}%
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* SECCIÓN 2: ANTROPOMETRÍA */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#0083A9', fontSize: '13px', fontWeight: '600', borderBottom: '2px solid #00B5E2', paddingBottom: '8px' }}>ANTROPOMETRÍA</h4>

                <div className={styles.formRowDouble}>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>TALLA (cm):</label>
                        <input
                            type="number"
                            step="0.1"
                            className={styles.formInput}
                            value={data.talla}
                            onChange={(e) => handleChange("talla", e.target.value)}
                            readOnly={readOnly}
                            placeholder="cm"
                            min="0"
                            max="250"
                        />
                    </div>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>PESO ACTUAL (kg):</label>
                        <input
                            type="number"
                            step="0.1"
                            className={styles.formInput}
                            value={data.pesoActual}
                            onChange={(e) => handleChange("pesoActual", e.target.value)}
                            readOnly={readOnly}
                            placeholder="kg"
                            min="0"
                            max="300"
                        />
                    </div>
                </div>

                <div className={styles.formRowDouble}>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>PESO HABITUAL (kg):</label>
                        <input
                            type="number"
                            step="0.1"
                            className={styles.formInput}
                            value={data.pesoHabitual}
                            onChange={(e) => handleChange("pesoHabitual", e.target.value)}
                            readOnly={readOnly}
                            placeholder="kg"
                            min="0"
                            max="300"
                        />
                    </div>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>ESTADO NUTRICIONAL:</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={data.estadoNutricional}
                            onChange={(e) => handleChange("estadoNutricional", e.target.value)}
                            readOnly={readOnly}
                            placeholder="Ej: Normonutrido"
                        />
                    </div>
                </div>

                <div className={styles.formRow}>
                    <label className={styles.formLabel}>IMPRESIÓN GENERAL:</label>
                    <textarea
                        className={styles.formInput}
                        value={data.impresionGeneral}
                        onChange={(e) => handleChange("impresionGeneral", e.target.value)}
                        readOnly={readOnly}
                        rows={2}
                        placeholder="Descripción general del estado del paciente"
                    />
                </div>
                
                <div className={styles.formRowDouble}>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>FACIE:</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={data.facie}
                            onChange={(e) => handleChange("facie", e.target.value)}
                            readOnly={readOnly}
                        />
                    </div>
                    <div className={styles.formField}>
                        <label className={styles.formLabel}>DECÚBITO:</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={data.decubito}
                            onChange={(e) => handleChange("decubito", e.target.value)}
                            readOnly={readOnly}
                        />
                    </div>
                </div>
                
                <div className={styles.formRow}>
                    <label className={styles.formLabel}>MARCHA:</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={data.marcha}
                        onChange={(e) => handleChange("marcha", e.target.value)}
                        readOnly={readOnly}
                    />
                </div>
            </div>
            
            {/* Modal para cargar control */}
            {showControlesModal && numeroVisita && (
                <ModalCargarControl
                    isOpen={showControlesModal}
                    onClose={handleCloseModal}
                    numeroVisita={numeroVisita}
                    idHCIngreso={idHCIngreso}
                    onSuccess={handleControlGuardado}
                />
            )}
        </div>
    );
}
