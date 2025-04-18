'use client';

import { useEffect, useState } from 'react';
import styles from './NursingReportModal.module.css';

// Definir la interfaz para los registros de control frecuente
interface ControlFrecuente {
  FechaControl: string;
  HoraControl: string;
  IdSector: string;
  Pulso: number;
  Maximo: number;
  Minimo: number;
  PAMedia: number;
  FrecuenciaRespiratoria: number;
  Axilar: number;
  Rectal: number;
  Saturometria: number;
  HGT: number;
  Observaciones: string;
  Profesional: string;
}

interface NursingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number;
  nombrePaciente: string;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  
  // Si ya tiene formato HH:MM:SS, extraemos solo HH:MM
  if (timeString.includes(':')) {
    return timeString.substring(0, 5);
  }
  
  return timeString;
};

export const NursingReportModal = ({ isOpen, onClose, numeroVisita, nombrePaciente }: NursingReportModalProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [controls, setControls] = useState<ControlFrecuente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewIndicationForm, setShowNewIndicationForm] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && numeroVisita) {
      fetchControlData();
    }
  }, [isOpen, numeroVisita]);

  const fetchControlData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds/controles-frecuentes/${numeroVisita}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener los controles frecuentes');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setControls(data.data);
      } else {
        throw new Error(data.message || 'Error al obtener los datos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error al cargar controles frecuentes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewIndication = () => {
    setShowNewIndicationForm(true);
  };
  
  const handleCancelNewIndication = () => {
    setShowNewIndicationForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Reporte de Enfermería</h2>
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{nombrePaciente}</span>
            <span className={styles.visitNumber}>Visita: {numeroVisita}</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.modalActions}>
            <button 
              className={styles.newIndicationButton} 
              onClick={handleNewIndication}
            >
              Nueva Indicación
            </button>
          </div>
          
          {showNewIndicationForm && (
            <div className={styles.newIndicationForm}>
              <h3>Nueva Indicación</h3>
              <div className={styles.formRow}>
                <button 
                  className={styles.cancelButton} 
                  onClick={handleCancelNewIndication}
                >
                  Cancelar
                </button>
                <button className={styles.saveButton}>
                  Guardar
                </button>
              </div>
              {/* Aquí se podría implementar el formulario completo para nueva indicación */}
            </div>
          )}
          
          {loading ? (
            <div className={styles.loading}>Cargando datos...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : controls.length === 0 ? (
            <div className={styles.noData}>No hay controles registrados para esta visita</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.controlsTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Pulso</th>
                    <th>Max</th>
                    <th>Min</th>
                    <th>PA Media</th>
                    <th>Frec. Resp.</th>
                    <th>Axilar</th>
                    <th>Rectal</th>
                    <th>Saturometría</th>
                    <th>HGT</th>
                    <th>Profesional</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((control, index) => (
                    <tr key={index}>
                      <td>{formatDate(control.FechaControl)}</td>
                      <td>{formatTime(control.HoraControl)}</td>
                      <td>{control.Pulso}</td>
                      <td>{control.Maximo}</td>
                      <td>{control.Minimo}</td>
                      <td>{control.PAMedia}</td>
                      <td>{control.FrecuenciaRespiratoria}</td>
                      <td>{control.Axilar.toFixed(2)}</td>
                      <td>{control.Rectal}</td>
                      <td>{control.Saturometria}</td>
                      <td>{control.HGT}</td>
                      <td>{control.Profesional}</td>
                      <td>{control.Observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
