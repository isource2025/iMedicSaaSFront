'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bedsService } from '../services/bedsService';
import { indicadoresService, ResumenPacientesHoy } from '../services/indicadoresService';
import { obtenerActividadReciente, ActividadReciente } from '../services/dashboardService';
import { obtenerResumenAmbulatorioHoy } from '../services/ambulatorioService';
import type { ResumenAmbulatorioHoy } from '../types/ambulatorio';
import { useCamasIndicadores } from '../hooks/useCamasIndicadores';
import { useIndicadores } from '../hooks/useIndicadores';
import { useBandejaPedidosCount } from '../hooks/useBandejaPedidosCount';
import styles from './DashboardPage.module.css';

const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  arrowRight: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z',
  bed: 'M4 7h16a2 2 0 012 2v8h-2v-3H4v3H2V9a2 2 0 012-2zm0 5h16V9H4v3z',
  percent: 'M19 5l-7 14h2l7-14h-2zM7 7a2 2 0 110-4 2 2 0 010 4zm0 14a2 2 0 110-4 2 2 0 010 4z',
  users: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  trendingUp: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z',
  calendar: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  userCheck: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zm6-7l-3 3-1.5-1.5',
  clock: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
};

function parseActivityDate(timeString: string): Date | null {
  try {
    if (timeString.includes('/') && timeString.includes(' ')) {
      const [fechaPart, horaPart] = timeString.split(' ');
      const [dia, mes, anio] = fechaPart.split('/');
      const [hora, minuto] = horaPart.split(':');
      const d = new Date(
        parseInt(anio, 10),
        parseInt(mes, 10) - 1,
        parseInt(dia, 10),
        parseInt(hora || '0', 10),
        parseInt(minuto || '0', 10),
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }
  } catch {
    return null;
  }
  return null;
}

function formatRelativeTime(timeString: string): string {
  const date = parseActivityDate(timeString);
  if (!date) return timeString;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return timeString;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return timeString;
}

function chipClassForMovimiento(
  tipo: ActividadReciente['movimientoTipo'],
): string {
  if (tipo === 'ingreso') return styles.chipIngreso;
  if (tipo === 'egreso') return styles.chipEgreso;
  if (tipo === 'movimiento') return styles.chipMovimiento;
  return styles.chipMovimiento;
}

function chipLabelForMovimiento(
  tipo: ActividadReciente['movimientoTipo'],
  action: string,
): string {
  if (tipo === 'ingreso') return 'Ingreso';
  if (tipo === 'egreso') return 'Alta';
  if (tipo === 'movimiento') return 'Movimiento';
  return action;
}

interface BedStats {
  totalCamas: number;
  camasDisponibles: number;
  camasOcupadas: number;
  camasNoDisponibles: number;
}

const initialPatientSummary: ResumenPacientesHoy = {
  totalHoy: 0,
  porcentajeCambio: 0,
};

export default function Dashboard() {
  const router = useRouter();
  const { count: pedidosPendientes } = useBandejaPedidosCount(true, { poll: false });
  const [bedStats, setBedStats] = useState<BedStats>({
    totalCamas: 0,
    camasDisponibles: 0,
    camasOcupadas: 0,
    camasNoDisponibles: 0
  });
  const [patientSummary, setPatientSummary] = useState<ResumenPacientesHoy>(initialPatientSummary);
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([]);
  const [ambulatorioHoy, setAmbulatorioHoy] = useState<ResumenAmbulatorioHoy | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingActividad, setLoadingActividad] = useState(true);
  const [loadingAmbulatorio, setLoadingAmbulatorio] = useState(true);
  const [errorAmbulatorio, setErrorAmbulatorio] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Configurar fechas para los últimos 30 días
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fechaInicio = thirtyDaysAgo.toISOString().split('T')[0];
  const fechaFin = today.toISOString().split('T')[0];

  // Hooks para obtener datos detallados de analytics
  const { 
    resumen: resumenCamas, 
    estadoActual: estadoActualCamas,
    loading: loadingCamas,
    computedData: computedCamas
  } = useCamasIndicadores(fechaInicio, fechaFin);

  const { 
    resumen: resumenPacientes, 
    estadoActual: estadoActualPacientes,
    loading: loadingPacientesAnalytics,
    computedData: computedPacientes
  } = useIndicadores('Ingresos', fechaInicio, fechaFin);

  useEffect(() => {
    const fetchBedStats = async () => {
      try {
        const stats = await bedsService.getTotalBeds();
        setBedStats(stats);
      } catch (error) {
        console.error('Error fetching bed statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPatientSummary = async () => {
      try {
        const summary = await indicadoresService.obtenerResumenPacientesHoy();
        setPatientSummary(summary);
      } catch (error) {
        console.error('Error fetching patient summary:', error);
      } finally {
        setLoadingPatients(false);
      }
    };

    const fetchActividadReciente = async () => {
      try {
        const actividades = await obtenerActividadReciente(10);
        setActividadReciente(actividades);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoadingActividad(false);
      }
    };

    const fetchAmbulatorioHoy = async () => {
      try {
        setErrorAmbulatorio(false);
        setAmbulatorioHoy(await obtenerResumenAmbulatorioHoy());
      } catch (error) {
        console.error('Error fetching ambulatory summary:', error);
        setErrorAmbulatorio(true);
      } finally {
        setLoadingAmbulatorio(false);
      }
    };

    fetchBedStats();
    fetchPatientSummary();
    fetchActividadReciente();
    fetchAmbulatorioHoy();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <div className={styles.titleContent}>
          <div className={styles.titleLeft}>
            <div className={styles.titleInfo}>
              <h2 className={styles.title}>Panel de Control</h2>
              <p className={styles.titleSubtitle}>Resumen ejecutivo del estado hospitalario</p>
            </div>
          </div>
          <div className={styles.titleRight}>
            <div 
              className={styles.tooltipContainer}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Icon 
                path={ICONS.info} 
                className={styles.tooltipIcon} 
                style={{ color: '#666', width: '20px', height: '20px' }} 
              />
              {showTooltip && (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipContent}>
                    <h4 className={styles.tooltipTitle}>Panel de Control</h4>
                    <p className={styles.tooltipText}>
                      Vista principal del sistema hospitalario que muestra métricas clave en tiempo real:
                    </p>
                    <ul className={styles.tooltipList}>
                      <li>• Análisis de ocupación de camas</li>
                      <li>• Estadísticas de pacientes</li>
                      <li>• Resumen hospitalario de 30 días</li>
                      <li>• Actividad reciente del sistema</li>
                    </ul>
                    <p className={styles.tooltipFooter}>
                      Haz clic en las cards para acceder a análisis detallados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.cardsGrid}>
        {/* Dashboard Cards */}
        <div 
          className={styles.cardBedsTotal}
          onClick={() => window.location.href = '/dashboard/beds/analytics'}
        >
          <div className={styles.cardHeader}>
            <Icon path={ICONS.bed} className={styles.cardIcon} style={{ color: '#00B5E2', width: '20px', height: '20px' }} />
            <h3 className={styles.cardLabel}>Análisis de Camas</h3>
            <button className={styles.arrowButton} aria-label="Ver análisis de camas">
              <Icon path={ICONS.arrowRight} className={styles.arrowIcon} />
            </button>
          </div>
          {loadingCamas ? (
            <div className={styles.cardCenterLoader}>
              <div className={styles.cardCenterSpinner}></div>
            </div>
          ) : (
            <div className={styles.cardStats}>
              <div className={styles.statRow}>
                <div className={styles.cardMainMetric}>
                  <p className={styles.cardValue}>
                    {estadoActualCamas ? estadoActualCamas.totalCamas : bedStats.totalCamas}
                  </p>
                  <span className={styles.cardMainLabel}>Total Camas</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: '#388e3c' }}>
                    {estadoActualCamas ? estadoActualCamas.disponibles : bedStats.camasDisponibles}
                  </p>
                  <span className={styles.cardSecondaryLabel}>Disponibles</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: '#00B5E2' }}>
                    {estadoActualCamas ? estadoActualCamas.ocupadas : bedStats.camasOcupadas}
                  </p>
                  <span className={styles.cardSecondaryLabel}>Ocupadas</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div 
          className={styles.cardPatients}
          onClick={() => window.location.href = '/dashboard/patients/analytics'}
        >
          <div className={styles.cardHeader}>
            <Icon path={ICONS.users} className={styles.cardIcon} style={{ color: '#00B5E2', width: '20px', height: '20px' }} />
            <h3 className={styles.cardLabel}>Análisis de Pacientes</h3>
            <button className={styles.arrowButton} aria-label="Ver análisis de pacientes">
              <Icon path={ICONS.arrowRight} className={styles.arrowIcon} />
            </button>
          </div>
          {loadingPacientesAnalytics ? (
            <div className={styles.cardCenterLoader}>
              <div className={styles.cardCenterSpinner}></div>
            </div>
          ) : (
            <div className={styles.cardStats}>
              <div className={styles.statRow}>
                <div className={styles.cardMainMetric}>
                  <p className={styles.cardValue}>
                    {patientSummary.totalHoy}
                  </p>
                  <span className={styles.cardMainLabel}>Ingresados Hoy</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: patientSummary.porcentajeCambio >= 0 ? '#388e3c' : '#d32f2f' }}>
                    {`${patientSummary.porcentajeCambio >= 0 ? '+' : ''}${patientSummary.porcentajeCambio}%`}
                  </p>
                  <span className={styles.cardSecondaryLabel}>vs Ayer</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div
          className={styles.cardAppointments}
          onClick={() => router.push('/dashboard/turnos/analytics')}
        >
          <div className={styles.cardHeader}>
            <Icon path={ICONS.calendar} className={styles.cardIcon} style={{ color: '#00B5E2', width: '20px', height: '20px' }} />
            <h3 className={styles.cardLabel}>Actividad Ambulatoria</h3>
            <button className={styles.arrowButton} aria-label="Ver análisis ambulatorio">
              <Icon path={ICONS.arrowRight} className={styles.arrowIcon} />
            </button>
          </div>
          {loadingAmbulatorio ? (
            <div className={styles.cardCenterLoader}>
              <div className={styles.cardCenterSpinner}></div>
            </div>
          ) : errorAmbulatorio || !ambulatorioHoy ? (
            <div className={styles.cardStats}>
              <span className={styles.stat}>Sin datos disponibles</span>
            </div>
          ) : (
            <div className={styles.cardStats}>
              <div className={styles.statRow}>
                <div className={styles.cardMainMetric}>
                  <p className={styles.cardValue}>{ambulatorioHoy.programados}</p>
                  <span className={styles.cardMainLabel}>Programadas</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: '#388e3c' }}>
                    {ambulatorioHoy.atendidos}
                  </p>
                  <span className={styles.cardSecondaryLabel}>Atendidas</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: '#f57c00' }}>
                    {ambulatorioHoy.pendientes}
                  </p>
                  <span className={styles.cardSecondaryLabel}>Pendientes</span>
                </div>
                <div className={styles.cardSecondaryMetric}>
                  <p className={styles.cardSecondaryValue} style={{ color: '#d32f2f' }}>
                    {ambulatorioHoy.ausentes}
                  </p>
                  <span className={styles.cardSecondaryLabel}>Ausentes</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.cardStaff}>
          <div className={styles.cardHeader}>
            <Icon path={ICONS.userCheck} className={styles.cardIcon} style={{ color: '#00B5E2', width: '20px', height: '20px' }} />
            <h3 className={styles.cardLabel}>Personal Activo</h3>
          </div>
          <div className={styles.cardMainMetric}>
            <p className={styles.cardValue}>18</p>
            <span className={styles.cardMainLabel}>En turno</span>
          </div>
          <div className={styles.cardStats}>
            <span className={styles.stat}>Próximamente</span>
          </div>
        </div>
      </div>
      
      {/* Activity Overview */}
      <div className={styles.activitySection}>
        <div className={styles.activityHeader}>
          <h3 className={styles.activityTitle}>Actividad Reciente</h3>
          <a className={styles.activityLink} href="/dashboard/beds">
            Ver ocupación
          </a>
        </div>
        <div className={styles.activityList}>
          {loadingActividad ? (
            <div className={styles.loadingActivity}>
              <div className={styles.loadingActivitySpinner}></div>
              <p>Cargando actividad reciente...</p>
            </div>
          ) : actividadReciente.length === 0 ? (
            <div className={styles.activityEmpty}>
              No hay movimientos recientes. Revisá la ocupación de camas para el estado actual.
            </div>
          ) : (
            actividadReciente.map((item, index) => {
              const ubicacion = [item.sector, item.cama ? `Cama ${item.cama}` : null]
                .filter(Boolean)
                .join(' · ');
              const relative = formatRelativeTime(item.time);
              const goToBed = () => {
                if (item.bedId) {
                  router.push(`/dashboard/beds/${encodeURIComponent(item.bedId)}`);
                } else {
                  router.push('/dashboard/beds');
                }
              };
              return (
                <div
                  key={`${item.bedId || item.details}-${item.time}-${index}`}
                  className={styles.activityItem}
                  onClick={goToBed}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToBed();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.activityIconContainer}>
                    <span>{item.icon}</span>
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityActionRow}>
                      <p className={styles.activityAction}>{item.action}</p>
                      {item.movimientoTipo && (
                        <span className={`${styles.activityChip} ${chipClassForMovimiento(item.movimientoTipo)}`}>
                          {chipLabelForMovimiento(item.movimientoTipo, item.action)}
                        </span>
                      )}
                    </div>
                    {item.paciente ? (
                      <p className={styles.activityPaciente}>{item.paciente}</p>
                    ) : (
                      <p className={styles.activityDetails}>{item.details}</p>
                    )}
                    {ubicacion ? (
                      <p className={styles.activityUbicacion}>{ubicacion}</p>
                    ) : null}
                  </div>
                  <div className={styles.activityTime} title={item.time}>
                    {relative}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.shortcutsRow}>
          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => router.push('/dashboard/bandeja-pedidos')}
          >
            <span className={styles.shortcutLabel}>Pedidos pendientes</span>
            <span className={styles.shortcutValue}>{pedidosPendientes}</span>
            <span className={styles.shortcutHint}>Ir a bandeja</span>
          </button>
          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => router.push('/dashboard/beds')}
          >
            <span className={styles.shortcutLabel}>Camas libres</span>
            <span className={styles.shortcutValue}>
              {estadoActualCamas ? estadoActualCamas.disponibles : bedStats.camasDisponibles}
            </span>
            <span className={styles.shortcutHint}>Ver ocupación</span>
          </button>
          <button
            type="button"
            className={styles.shortcutCard}
            onClick={() => router.push('/dashboard/turnos/agenda')}
          >
            <span className={styles.shortcutLabel}>Agenda del día</span>
            <span className={styles.shortcutValue}>
              {ambulatorioHoy ? ambulatorioHoy.programados : '—'}
            </span>
            <span className={styles.shortcutHint}>Abrir agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
