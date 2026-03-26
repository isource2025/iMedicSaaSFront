'use client';

import { useEffect, useState, useCallback } from 'react';
import { NursingReportModalProps, ControlFrecuente } from '../../types/nursing/NursingComponents';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import ControlesFrecuentesChart, { CHART_PARAMS } from "./ControlesFrecuentesChart";
// import NuevaIndicacionModal, { IndicacionData } from './NuevaIndicacionModal';
import styles from './NursingReportModal.module.css';
import NuevaIndicacionModal from '../indicaciones/NuevaIndicacionModal';
import { NuevaIndicacionPayload } from '@/app/types/indicaciones';
import { indicacionesService } from '@/app/services/indicacionesService';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

const formatTime = (timeString: string) => {
  if (!timeString) return '-';
  return timeString.includes(':') ? timeString.substring(0, 5) : timeString;
};

export const NursingReportModal: React.FC<NursingReportModalProps> = ({ isOpen, onClose, numeroVisita }) => {
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlFrecuente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewIndicationForm, setShowNewIndicationForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tabla' | 'grafico'>('tabla');
  const [parametro, setParametro] = useState('pulso');
  const [saving, setSaving] = useState(false);
  const [idSector, setIdSector] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'0' | '7' | '30' | 'all'>('all');

  const fetchControlData = useCallback(async () => {
    if (!isOpen || !numeroVisita) return;
    try {
      setLoading(true);
      setError(null);
      
      // Obtener IdSector de los datos de la cama
      const bedsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds`);
      if (bedsResponse.ok) {
        const bedsData = await bedsResponse.json();
        if (bedsData.success) {
          const cama = bedsData.data.find((c: any) => String(c.NumeroVisita) === String(numeroVisita));
          if (cama && cama.IdSector) {
            setIdSector(String(cama.IdSector));
          }
        }
      }
      
      const daysParam = periodFilter === 'all' ? '' : `?days=${periodFilter}`;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds/controles-frecuentes/${numeroVisita}${daysParam}`);
      if (!response.ok) throw new Error('Error al obtener los controles frecuentes');
      const data = await response.json();
      if (data.success) {
        const sortedData = [...data.data].sort((a, b) =>
          new Date(b.FechaControl + 'T' + b.HoraControl).getTime() - new Date(a.FechaControl + 'T' + a.HoraControl).getTime()
        );
        setControls(sortedData);
      } else {
        throw new Error(data.message || 'Error al obtener los datos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error al cargar controles frecuentes:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, numeroVisita]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData, periodFilter]);

  const handleNewIndication = useCallback(() => setShowNewIndicationForm(true), []);
  const handleCancelNewIndication = useCallback(() => setShowNewIndicationForm(false), []);
  const handleSaveIndication = useCallback(async (indicacionData: NuevaIndicacionPayload) => {
    setSaving(true)
    try {
      console.log('Guardando indicación:', indicacionData);
      
      // ✅ CORREGIDO: Llamar al servicio del backend para guardar la indicación
      const resultado = await indicacionesService.postNuevaIndicacion(indicacionData);
      console.log('📥 Resultado del backend:', resultado);
      
      setShowNewIndicationForm(false);
      await fetchControlData();
      alert('Indicación guardada correctamente');
      
      return resultado;
    } catch (error) {
      console.error('Error al guardar la indicación:', error);
      alert('Error al guardar la indicación');
      throw error;
    } finally {
      setSaving(false)
    }
  }, [numeroVisita, fetchControlData]);

  const handleTabChange = useCallback((tab: 'tabla' | 'grafico') => setActiveTab(tab), []);
  const handleParametroChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setParametro(e.target.value), []);

  return (
    <>
      <ModalBasePaciente
        isOpen={isOpen}
        onClose={onClose}
        titulo="Reporte de Enfermería"
        numeroVisita={String(numeroVisita)}
        footerButtons={
          <button className={styles.newIndicationButton} onClick={handleNewIndication}>
            Nueva Indicación
          </button>
        }
      >
        <div className={styles.nursingReportContainer}>
          {loading ? (
            <div className={styles.loading}>Cargando datos de controles...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              <div className={styles.tabsContainer}>
                <div>
                  <button
                    className={`${styles.tabButton} ${activeTab === 'tabla' ? styles.activeTab : ''}`}
                    onClick={() => handleTabChange('tabla')}
                  >
                    Tabla
                  </button>
                  <button
                    className={`${styles.tabButton} ${activeTab === 'grafico' ? styles.activeTab : ''}`}
                    onClick={() => handleTabChange('grafico')}
                  >
                    Gráfico
                  </button>
                </div>
                <div className={styles.periodFilters}>
                  <span className={styles.filterLabel}>Período:</span>
                  <button
                    className={`${styles.periodTag} ${periodFilter === '0' ? styles.periodTagActive : ''}`}
                    onClick={() => setPeriodFilter('0')}
                  >
                    Hoy
                  </button>
                  <button
                    className={`${styles.periodTag} ${periodFilter === '7' ? styles.periodTagActive : ''}`}
                    onClick={() => setPeriodFilter('7')}
                  >
                    7 días
                  </button>
                  <button
                    className={`${styles.periodTag} ${periodFilter === '30' ? styles.periodTagActive : ''}`}
                    onClick={() => setPeriodFilter('30')}
                  >
                    1 mes
                  </button>
                  <button
                    className={`${styles.periodTag} ${periodFilter === 'all' ? styles.periodTagActive : ''}`}
                    onClick={() => setPeriodFilter('all')}
                  >
                    Todas
                  </button>
                </div>
              </div>

              {activeTab === 'tabla' ? (
                controls.length === 0 ? (
                  <div className={styles.noData}>No hay controles registrados para esta visita</div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.controlsTable}>
                      <colgroup>
                        <col className={styles.colFecha} />
                        <col className={styles.colHora} />
                        <col className={styles.colNumerico} span={9} />
                        <col className={styles.colProfesional} />
                        <col className={styles.colObservaciones} />
                      </colgroup>
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
                    <select className={styles.paramDropdown} value={parametro} onChange={handleParametroChange}>
                      {CHART_PARAMS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
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

      {/* <NuevaIndicacionModal
        isOpen={showNewIndicationForm}
        onClose={handleCancelNewIndication}
        numeroVisita={String(numeroVisita)}
        onSave={handleSaveIndication}
      /> */}

       <ModalBasePaciente
                numeroVisita={numeroVisita ? String(numeroVisita) : ""}
                onClose={handleCancelNewIndication}
                isOpen={showNewIndicationForm}
                titulo="Agregando nueva Indicación"
                footerButtons={
                    <>
                        <button
                            className={styles.btn + " " + styles.btnPrimary}
                            type="submit"
                            form="nueva-indicacion-form"
                            disabled={saving}
                        >
                            {saving ? "Guardando…" : "Guardar"}
                        </button>
                    </>
                } // usamos el footer interno del form
            >
                <NuevaIndicacionModal
                    onClose={handleCancelNewIndication}
                    onSave={handleSaveIndication}
                    defaultNumeroVisita={numeroVisita}
                    refetch={fetchControlData}
                    idSector={idSector}
                />
            </ModalBasePaciente>
    </>
  );
};

export default NursingReportModal;
