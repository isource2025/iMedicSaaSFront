'use client';

import { useEffect, useState } from 'react';
import { NursingReportModalProps, ControlFrecuente } from '../../types/nursing/NursingComponents';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import ControlesFrecuentesChart, { CHART_PARAMS } from "./ControlesFrecuentesChart";
import styles from './NursingReportModal.module.css';

/**
 * Formatea una fecha para mostrarla en formato local
 */
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

/**
 * Formatea un tiempo para mostrar solo horas y minutos (HH:MM)
 */
const formatTime = (timeString: string) => {
  if (!timeString) return '-';
  
  if (timeString.includes(':')) {
    return timeString.substring(0, 5);
  }
  
  return timeString;
};

/**
 * Modal para mostrar los reportes de enfermería de un paciente utilizando el ModalBasePaciente
 */
export const NursingReportModal: React.FC<NursingReportModalProps> = ({ 
  isOpen, 
  onClose, 
  numeroVisita, 
  nombrePaciente 
}) => {
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlFrecuente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewIndicationForm, setShowNewIndicationForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tabla' | 'grafico'>('tabla');
  const [parametro, setParametro] = useState<string>('pulso');
  const [reducido, setReducido] = useState(true); // Por defecto reducido

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

  return (
    <ModalBasePaciente
      isOpen={isOpen}
      onClose={onClose}
      titulo="Reporte de Enfermería"
      numeroVisita={String(numeroVisita)}
    >
      <div className={reducido ? styles.reducido + ' ' + styles.nursingReportContainer : styles.nursingReportContainer}>
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
          </div>
        )}
        
        {loading ? (
          <div className={styles.loading}>Cargando datos de controles...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            <div className={styles.tabsContainer}>
              <button
                className={`${styles.tabButton} ${activeTab === 'tabla' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('tabla')}
              >
                Tabla
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'grafico' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('grafico')}
              >
                Gráfico
              </button>
              <button
                style={{marginLeft:'auto', fontSize:'1.1em', background:'#e6f7fa', border:'none', borderRadius:4, cursor:'pointer', padding:'2px 10px'}}
                title={reducido ? 'Restaurar tamaño' : 'Reducir tamaño'}
                onClick={()=>setReducido(r=>!r)}
              >
                {reducido ? '⤢' : '⤡'}
              </button>
            </div>

            {activeTab === 'tabla' ? (
              controls.length === 0 ? (
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
                          <td>{control.Pulso || '-'}</td>
                          <td>{control.Maximo || '-'}</td>
                          <td>{control.Minimo || '-'}</td>
                          <td>{control.PAMedia || '-'}</td>
                          <td>{control.FrecuenciaRespiratoria || '-'}</td>
                          <td>{control.Axilar ? control.Axilar.toFixed(1) : '-'}</td>
                          <td>{control.Rectal || '-'}</td>
                          <td>{control.Saturometria || '-'}</td>
                          <td>{control.HGT || '-'}</td>
                          <td>{control.Profesional || '-'}</td>
                          <td>{control.Observaciones || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <>
                <div style={{ margin: '16px 0 8px 0' }}>
                  <label style={{ marginRight: 8, fontWeight: 500 }}>Parámetro: </label>
                  <select
                    className={styles.paramDropdown}
                    value={parametro}
                    onChange={e => setParametro(e.target.value)}
                  >
                    {CHART_PARAMS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {controls.length > 0 ? (
                  <ControlesFrecuentesChart data={controls} parametro={parametro} />
                ) : (
                  <div className={styles.noData}>No hay controles registrados para graficar</div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ModalBasePaciente>
  );
};

export default NursingReportModal;
