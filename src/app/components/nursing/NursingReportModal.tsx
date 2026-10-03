'use client';

import { useEffect, useState, useCallback } from 'react';
import { NursingReportModalProps, ControlFrecuente } from '../../types/nursing/NursingComponents';
import ModalBasePaciente from '../modals/ModalBasePaciente';
import dynamic from 'next/dynamic';
import { CHART_PARAMS } from './chartParams';
import { apiFetch } from '@/app/utils/authFetch';
// import NuevaIndicacionModal, { IndicacionData } from './NuevaIndicacionModal';
import styles from './NursingReportModal.module.css';
import Loader from '../Loader/Loader';
import NuevaIndicacionModal from '../indicaciones/NuevaIndicacionModal';
import { NuevaIndicacionPayload } from '@/app/types/indicaciones';

// El gráfico (recharts, ~380 kB) solo se descarga al abrir la pestaña "Gráfico".
const ControlesFrecuentesChart = dynamic(() => import('./ControlesFrecuentesChart'), {
  ssr: false,
  loading: () => <div style={{ position: 'relative', minHeight: '220px' }}><Loader /></div>,
});
import { indicacionesService } from '@/app/services/indicacionesService';
import { formatIMC } from '@/app/utils/antropometria';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

const formatTime = (timeString: string) => {
  if (!timeString) return '-';
  return timeString.includes(':') ? timeString.substring(0, 5) : timeString;
};

/** Nunca se muestra el código/matrícula: solo el nombre resuelto. */
const nombreProfesional = (control: ControlFrecuente) => String(control.ProfesionalNombre ?? '').trim();

const vacio = (v: unknown) => v == null || String(v).trim() === '' || String(v).trim() === '-' || Number(v) === 0;

/** Valores con dato de un control, para la vista en tarjetas (mobile). */
function valoresControl(control: ControlFrecuente): { label: string; value: string }[] {
  const c = control as ControlFrecuente & { HGT?: string | number; Hgt?: string | number };
  const out: { label: string; value: string }[] = [];
  const add = (label: string, raw: unknown, fmt: (v: any) => string = (v) => String(v)) => {
    if (!vacio(raw)) out.push({ label, value: fmt(raw) });
  };
  add('Pulso', c.Pulso);
  if (!vacio(c.Maximo) || !vacio(c.Minimo)) {
    out.push({
      label: 'Presión',
      value: `${vacio(c.Maximo) ? '-' : c.Maximo}/${vacio(c.Minimo) ? '-' : c.Minimo}`,
    });
  }
  add('PA media', c.PAMedia);
  add('Frec. resp.', c.FrecuenciaRespiratoria);
  add('T° axilar', c.Axilar, (v) => Number(v).toFixed(1));
  add('T° rectal', c.Rectal);
  add('Saturación', c.Saturometria, (v) => `${v}%`);
  add('Glucemia', c.HGT ?? c.Hgt);
  add('Peso', c.Peso, (v) => `${v} kg`);
  add('Talla', c.Talla, (v) => `${v} cm`);
  const imc = formatIMC(c.Peso, c.Talla, c.IMC);
  if (!vacio(imc)) out.push({ label: 'IMC', value: imc });
  return out;
}

export const NursingReportModal: React.FC<NursingReportModalProps> = ({
  isOpen,
  onClose,
  numeroVisita,
  header,
  bedSector,
}) => {
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlFrecuente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewIndicationForm, setShowNewIndicationForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'tabla' | 'grafico'>('tabla');
  const [parametro, setParametro] = useState('pulso');
  const [saving, setSaving] = useState(false);
  const [idSector, setIdSector] = useState<string | null>(bedSector || null);
  const [periodFilter, setPeriodFilter] = useState<'0' | '7' | '30' | 'all'>('all');

  useEffect(() => {
    if (bedSector) setIdSector(bedSector);
  }, [bedSector]);

  const fetchControlData = useCallback(async () => {
    if (!isOpen || !numeroVisita) return;
    try {
      setLoading(true);
      setError(null);

      if (!bedSector) {
        const bedsResponse = await apiFetch('/beds');
        if (bedsResponse.ok) {
          const bedsData = await bedsResponse.json();
          if (bedsData.success) {
            const cama = bedsData.data.find(
              (c: { NumeroVisita?: number | string; IdSector?: string }) =>
                String(c.NumeroVisita) === String(numeroVisita),
            );
            if (cama?.IdSector) {
              setIdSector(String(cama.IdSector));
            }
          }
        }
      } else {
        setIdSector(bedSector);
      }

      const daysParam = periodFilter === 'all' ? '' : `?days=${periodFilter}`;
      const response = await apiFetch(`/beds/controles-frecuentes/${numeroVisita}${daysParam}`);
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
  }, [isOpen, numeroVisita, periodFilter, bedSector]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData]);

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
        header={header}
        footerButtons={
          <button className={styles.newIndicationButton} onClick={handleNewIndication}>
            Nueva Indicación
          </button>
        }
      >
        <div className={styles.nursingReportContainer}>
          {loading ? (
            <div style={{ position: 'relative', minHeight: '200px' }}>
              <Loader />
            </div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <>
              <div className={styles.tabsContainer}>
                <div className={styles.tabGroup}>
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
                  <>
                  <ul className={styles.cardList}>
                    {controls.map((control, index) => {
                      const valores = valoresControl(control);
                      return (
                        <li key={index} className={styles.card}>
                          <div className={styles.cardHead}>
                            <span className={styles.cardFecha}>
                              {formatDate(control.FechaControl)} · {formatTime(control.HoraControl)}
                            </span>
                            {nombreProfesional(control) ? (
                              <span className={styles.cardProfesional}>{nombreProfesional(control)}</span>
                            ) : null}
                          </div>
                          {valores.length > 0 ? (
                            <dl className={styles.cardGrid}>
                              {valores.map((v) => (
                                <div key={v.label} className={styles.cardItem}>
                                  <dt>{v.label}</dt>
                                  <dd>{v.value}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <p className={styles.cardEmpty}>Sin valores registrados</p>
                          )}
                          {control.Observaciones ? (
                            <p className={styles.cardObs}>{control.Observaciones}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <div className={styles.tableContainer}>
                    <table className={styles.controlsTable}>
                      <colgroup>
                        <col className={styles.colFecha} />
                        <col className={styles.colHora} />
                        <col className={styles.colNumerico} span={12} />
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
                          <th>Glucemia</th>
                          <th>Peso</th>
                          <th>Talla</th>
                          <th>IMC</th>
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
                            <td>
                              {(control as { HGT?: string | number; Hgt?: string | number }).HGT ||
                                (control as { Hgt?: string | number }).Hgt ||
                                '-'}
                            </td>
                            <td>{control.Peso ? `${control.Peso} kg` : '-'}</td>
                            <td>{control.Talla ? `${control.Talla} cm` : '-'}</td>
                            <td>{formatIMC(control.Peso, control.Talla, control.IMC)}</td>
                            <td>{nombreProfesional(control) || '-'}</td>
                            <td>{control.Observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )
              ) : (
                <>
                  <div className={styles.paramRow}>
                    <label className={styles.paramLabel}>Parámetro: </label>
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
