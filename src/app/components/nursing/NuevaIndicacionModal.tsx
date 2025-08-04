'use client';

import { useState } from 'react';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import styles from './NuevaIndicacionModal.module.css';

interface NuevaIndicacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: string;
  onSave: (indicacionData: IndicacionData) => void;
}

export interface IndicacionData {
  fecha: string;
  hora: string;
  indicacion: string;
  profesional: string;
  observaciones: string;
}

const NuevaIndicacionModal: React.FC<NuevaIndicacionModalProps> = ({
  isOpen,
  onClose,
  numeroVisita,
  onSave
}) => {
  const [indicacionData, setIndicacionData] = useState<IndicacionData>({
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().slice(0, 5),
    indicacion: '',
    profesional: '',
    observaciones: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIndicacionData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(indicacionData);
  };

  return (
    <ModalBasePaciente
      isOpen={isOpen}
      onClose={onClose}
      titulo="Nueva Indicación"
      numeroVisita={numeroVisita}
      footerButtons={
        <button 
          className={styles.saveButton}
          onClick={handleSubmit}
          type="button"
        >
          Guardar Indicación
        </button>
      }
    >
      <div className={styles.nuevaIndicacionContainer}>
        <form className={styles.formContainer} onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="fecha">Fecha</label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={indicacionData.fecha}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="hora">Hora</label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={indicacionData.hora}
                onChange={handleChange}
                className={styles.formControl}
                required
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="indicacion">Indicación</label>
            <input
              type="text"
              id="indicacion"
              name="indicacion"
              value={indicacionData.indicacion}
              onChange={handleChange}
              className={styles.formControl}
              placeholder="Descripción de la indicación"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="profesional">Profesional</label>
            <input
              type="text"
              id="profesional"
              name="profesional"
              value={indicacionData.profesional}
              onChange={handleChange}
              className={styles.formControl}
              placeholder="Nombre del profesional"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={indicacionData.observaciones}
              onChange={handleChange}
              className={styles.textArea}
              placeholder="Observaciones adicionales"
              rows={4}
            />
          </div>
        </form>
      </div>
    </ModalBasePaciente>
  );
};

export default NuevaIndicacionModal;
