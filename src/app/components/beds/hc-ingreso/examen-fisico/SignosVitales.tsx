"use client";

import { SignosVitales } from "@/app/types/examenFisico";
import styles from "./ExamenFisicoForm.module.css";
import { useState } from "react";
import ModalCargarControl from "./ModalCargarControl";

interface SignosVitalesProps {
    data: SignosVitales;
    onChange: (data: SignosVitales) => void;
    readOnly?: boolean;
    numeroVisita?: number;
    idHCIngreso?: number;
}

export default function SignosVitalesForm({ data, onChange, readOnly = false, numeroVisita, idHCIngreso }: SignosVitalesProps) {
    const [showControlesModal, setShowControlesModal] = useState(false);
    
    const handleChange = (field: keyof SignosVitales, value: string) => {
        onChange({ ...data, [field]: value });
    };
    
    const handleOpenControlesModal = () => {
        setShowControlesModal(true);
    };
    
    const handleCloseModal = () => {
        setShowControlesModal(false);
    };
    
    const handleControlGuardado = () => {
        setShowControlesModal(false);
        // Opcional: recargar datos o mostrar mensaje de éxito
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
