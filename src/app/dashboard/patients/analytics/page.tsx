'use client';

import { useState, useEffect } from 'react';
import { useIndicadores } from '../../../hooks/useIndicadores';
import DonutChart from '../../../components/Charts/DonutChart';
import LineChart from '../../../components/Charts/LineChart';
import styles from './PatientsAnalytics.module.css';

// Componente para iconos (ejemplo simple)
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  trendingUp: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z',
  checkCircle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  people: 'M9 13.75c-2.34 0-7 1.17-7 3.5V19h14v-1.75c0-2.33-4.66-3.5-7-3.5zM4.34 17c.84-.58 2.87-1.25 4.66-1.25s3.82.67 4.66 1.25H4.34zM9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm10.75 5.5c-1.83 0-5.5.92-5.5 2.75V19h11v-1.75c0-1.83-3.67-2.75-5.5-2.75zm-1.16 3.25H14.9c.81-.35 2.16-.9 3.34-.9s2.53.55 3.34.9h-1.16zM18.5 12c1.38 0 2.5-1.12 2.5-2.5S19.88 7 18.5 7s-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5z',
  leaderboard: 'M7.5 21H2V9h5.5v12zm7.5-18h-5.5v18h5.5V3zm7.5 10h-5.5v8h5.5v-8z',
  category: 'M12 2l-5.5 9h11zM17.5 17.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm-11 0c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z',
};

export default function PatientsAnalytics() {
  // Helper para formatear fechas a YYYY-MM-DD
  const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

  // Rango por defecto: últimos 30 días hasta hoy
  const today = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(today.getDate() - 30);

  const [fechaInicio, setFechaInicio] = useState(toYYYYMMDD(defaultStart));
  const [fechaFin, setFechaFin] = useState(toYYYYMMDD(today));
  const [activeTab, setActiveTab] = useState<string>('mes');

  const { 
    indicadores, 
    resumen, 
    indicadoresPorFecha, 
    loading, 
    error, 
    refetch 
  } = useIndicadores('Ingresos', fechaInicio, fechaFin);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      refetch();
    }
  }, [fechaInicio, fechaFin]);

  // Colores Pantone del sistema
  const pantoneColors = ['#00B5E2', '#61D6EB', '#0083A9', '#41C8DC'];

  // Preparar datos para gráficos de torta
  const prepareChartData = (data: Record<string, number>, title: string) => {
    return Object.entries(data).map(([label, value], index) => ({
      label,
      value,
      color: pantoneColors[index % pantoneColors.length]
    }));
  };

  // Datos para gráficos de torta
  const clasePacienteData = resumen ? prepareChartData(resumen.resumenPorClase, 'Por Clase de Paciente') : [];
  
  
  // Datos para gráfico de línea
  const lineChartData = indicadoresPorFecha.map(item => {
    const [year, month, day] = item.fecha.split('T')[0].split('-');
    return {
      label: `${day}/${month}`,
      value: item.total,
      date: item.fecha
    };
  });

  // Calcular el día de mayor actividad una sola vez para reutilizarlo
  const diaMayorActividad = indicadoresPorFecha.length > 0
    ? indicadoresPorFecha.reduce((max, current) => current.total > max.total ? current : max)
    : null;


  const handleTabClick = (tab: string) => {
    setActiveTab(tab);

    const endDate = new Date(); // hoy
    let startDate = new Date(endDate);

    switch (tab) {
      case 'día':
        // Solo hoy
        break;
      case 'semana':
        // Últimos 7 días incluyendo hoy
        startDate.setDate(endDate.getDate() - 6);
        break;
      case 'mes':
        // Últimos 30 días incluyendo hoy
        startDate.setDate(endDate.getDate() - 29);
        break;
      case 'año':
        // Últimos 365 días incluyendo hoy
        startDate.setDate(endDate.getDate() - 364);
        break;
      default:
        return;
    }

    setFechaInicio(toYYYYMMDD(startDate));
    setFechaFin(toYYYYMMDD(endDate));
  };

  const handleCustomDateChange = (value: string, setDate: (date: string) => void) => {
    setDate(value);
    setActiveTab('custom');
  };

  return (
    <div className={styles.container}>
      {/* Header con controles de fecha */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
                    <div className={styles.headerInfo}>
            <h1 className={styles.title}>Análisis Estadístico de Pacientes</h1>
            <p className={styles.subtitle}>Un resumen interactivo de los indicadores clave de pacientes.</p>
          </div>
          <div className={styles.controls}>
            <div className={styles.filterTabs}>
              {['Día', 'Semana', 'Mes', 'Año'].map(tab => (
                <button 
                  key={tab}
                  className={`${styles.tabButton} ${activeTab === tab.toLowerCase() ? styles.activeTab : ''}`}
                  onClick={() => handleTabClick(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className={styles.dateControls}>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaInicio">Fecha Inicio:</label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => handleCustomDateChange(e.target.value, setFechaInicio)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaFin">Fecha Fin:</label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => handleCustomDateChange(e.target.value, setFechaFin)}
                  className={styles.dateInput}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando indicadores...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>Error al cargar los datos: {error}</p>
          <button onClick={refetch} className={styles.retryButton}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Resumen general */}
                    <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIconContainer} style={{ backgroundColor: '#E0F7FA' }}>
                <Icon path={ICONS.people} className={styles.summaryIcon} style={{ color: '#0083A9' }} />
              </div>
              <div className={styles.summaryText}>
                <h3>Total General</h3>
                <p className={styles.summaryValue}>{resumen?.totalGeneral || 0}</p>
                <span className={styles.summaryDetail}>En el período seleccionado</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIconContainer} style={{ backgroundColor: '#E8EAF6' }}>
                <Icon path={ICONS.leaderboard} className={styles.summaryIcon} style={{ color: '#3F51B5' }} />
              </div>
              <div className={styles.summaryText}>
                <h3>Promedio Diario</h3>
                <p className={styles.summaryValue}>
                  {indicadoresPorFecha.length > 0 
                    ? Math.round((resumen?.totalGeneral || 0) / indicadoresPorFecha.length)
                    : 0
                  }
                </p>
                <span className={styles.summaryDetail}>Calculado sobre días con actividad</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIconContainer} style={{ backgroundColor: '#FCE4EC' }}>
                <Icon path={ICONS.category} className={styles.summaryIcon} style={{ color: '#D81B60' }} />
              </div>
              <div className={styles.summaryText}>
                <h3>Clases Activas</h3>
                <p className={styles.summaryValue}>
                  {resumen ? Object.keys(resumen.resumenPorClase).length : 0}
                </p>
                <span className={styles.summaryDetail}>Tipos de paciente únicos</span>
              </div>
            </div>
          </div>

                    {/* Distribución por Clase con Donut Chart */}
          <div className={styles.donutChartSection}>
            <h3 className={styles.sectionTitle}>Distribución por Clase de Paciente</h3>
            <div className={styles.donutChartContent}>
              <div className={styles.donutLegend}>
                {clasePacienteData.map((item, index) => (
                  <div key={index} className={styles.legendItem}>
                    <div className={styles.legendInfo}>
                      <div 
                        className={styles.legendColor}
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={styles.legendLabel}>{item.label}</span>
                    </div>
                    <span className={styles.legendValue}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.donutChartContainer}>
                {clasePacienteData.length > 0 && (
                  <DonutChart 
                    data={clasePacienteData}
                    size={220}
                    donutWidth={40}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Gráfico de línea central */}
          <div className={styles.lineChartSection}>
            <LineChart 
              data={lineChartData}
              title={`Evolución de Ingresos por Fecha`}
              color="#00B5E2"
              height={350}
            />
          </div>

                    {/* Sección de Insights */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}>Insights Clave</h3>
            <div className={styles.insightsGrid}>
              <div className={styles.insightCard}>
                <Icon path={ICONS.trendingUp} className={styles.insightIcon} />
                <h4>Día de Mayor Actividad</h4>
                <p>
                  {diaMayorActividad
                    ? `El día con más ingresos fue el ${diaMayorActividad.fecha.split('T')[0].split('-').reverse().join('/')} con `
                    : 'No hay datos de actividad.'}
                  {diaMayorActividad && <strong>{`${diaMayorActividad.total} ingresos`}</strong>}
                  .
                </p>
              </div>
              <div className={styles.insightCard}>
                <Icon path={ICONS.checkCircle} className={styles.insightIcon} />
                <h4>Clase de Paciente Dominante</h4>
                <p>La clase de paciente más frecuente es <strong>{resumen && Object.keys(resumen.resumenPorClase).length > 0 ? Object.entries(resumen.resumenPorClase).reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'N/A'}</strong>.</p>
              </div>
              <div className={styles.insightCard}>
                <Icon path={ICONS.info} className={styles.insightIcon} />
                <h4>Promedio de Actividad</h4>
                <p>Se registra un promedio de <strong>{indicadoresPorFecha.length > 0 ? Math.round((resumen?.totalGeneral || 0) / indicadoresPorFecha.length) : 0}</strong> ingresos por día.</p>
              </div>
            </div>
          </div>

          {/* Sección de detalles */}
          <div className={styles.detailsSection}>
            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <h4>Estadísticas del Período</h4>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Período analizado:</span>
                    <span className={styles.statValue}>
                      {new Date(fechaInicio).toLocaleDateString('es-ES')} - {new Date(fechaFin).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Días analizados:</span>
                    <span className={styles.statValue}>{indicadoresPorFecha.length}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Día con más ingresos:</span>
                    <span className={styles.statValue}>
                      {diaMayorActividad
                        ? `${diaMayorActividad.fecha.split('T')[0].split('-').reverse().join('/')} (${diaMayorActividad.total} ingresos)`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.detailCard}>
                <h4>Distribución por Clase</h4>
                                <div className={styles.distributionList}>
                  {resumen && Object.entries(resumen.resumenPorClase).map(([clase, total], index) => {
                    const percentage = resumen.totalGeneral > 0 ? Math.round((total / resumen.totalGeneral) * 100) : 0;
                    return (
                      <div key={clase} className={styles.distributionItem}>
                        <div className={styles.distributionHeader}>
                          <div className={styles.distributionLabel}>
                            <div 
                              className={styles.distributionColor}
                              style={{ backgroundColor: pantoneColors[index % pantoneColors.length] }}
                            />
                            <span>{clase}</span>
                          </div>
                          <span className={styles.distributionValue}>{total} ({percentage}%)</span>
                        </div>
                        <div className={styles.progressBarContainer}>
                          <div 
                            className={styles.progressBar}
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: pantoneColors[index % pantoneColors.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
