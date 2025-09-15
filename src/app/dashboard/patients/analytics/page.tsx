'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useIndicadores } from '../../../hooks/useIndicadores';
import { analyzeAdmissionPatterns, AnalysisResult } from '../../../utils/analyticsEngine';

// Lazy loading de componentes pesados para mejorar el rendimiento inicial
const DonutChartLazy = lazy(() => import('../../../components/Charts/DonutChart'));
const LineChartLazy = lazy(() => import('../../../components/Charts/LineChart'));

// Componente de loading para Suspense
const ChartSkeleton = () => (
  <div style={{ 
    width: '100%', 
    height: '200px', 
    backgroundColor: '#f0f0f0', 
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666'
  }}>
    Cargando gráfico...
  </div>
);
import { MetricCard } from '../../../components/MetricCard';
import { InsightCard } from '../../../components/InsightCard';
import { MetricTooltipModal } from '../../../components/modals/MetricTooltipModal';
import { AnalyticsLoader } from '../../../components/AnalyticsLoader';
import styles from './PatientsAnalytics.module.css';

// Componente para iconos (ejemplo simple)
const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  people: 'M9 13.75c-2.34 0-7 1.17-7 3.5V19h14v-1.75c0-2.33-4.66-3.5-7-3.5zM4.34 17c.84-.58 2.87-1.25 4.66-1.25s3.82.67 4.66 1.25H4.34zM9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm10.75 5.5c-1.83 0-5.5.92-5.5 2.75V19h11v-1.75c0-1.83-3.67-2.75-5.5-2.75zm-1.16 3.25H14.9c.81-.35 2.16-.9 3.34-.9s2.53.55 3.34.9h-1.16zM18.5 12c1.38 0 2.5-1.12 2.5-2.5S19.88 7 18.5 7s-2.5 1.12-2.5 2.5 1.12 2.5 2.5 2.5z',
  percent: 'M19 5l-7 14h2l7-14h-2zM7 7a2 2 0 110-4 2 2 0 010 4zm0 14a2 2 0 110-4 2 2 0 010 4z',
  trendingUp: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  checkCircle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  leaderboard: 'M7.5 21H2V9h5.5v12zm7.5-18h-5.5v18h5.5V3zm7.5 10h-5.5v8h5.5v-8z',
  category: 'M12 2l-5.5 9h11zM17.5 17.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm-11 0c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
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
  const [isEstadoActualModalOpen, setIsEstadoActualModalOpen] = useState(false);
  const [admissionAnalysis, setAdmissionAnalysis] = useState<AnalysisResult | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<AnalysisResult | null>(null);

  const { 
    indicadores, 
    resumen, 
    indicadoresPorFecha, 
    estadoActual, 
    loading, 
    loadingSteps,
    error, 
    computedData,
    refetch,
    clearCache
  } = useIndicadores('Ingresos', fechaInicio, fechaFin);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      refetch();
    }
  }, [fechaInicio, fechaFin]);

  // Colores Pantone del sistema
  const pantoneColors = ['#00B5E2', '#61D6EB', '#0083A9', '#41C8DC'];

  // Preparar datos para gráficos de torta
  const prepareChartData = (data: Record<string, number> | undefined, title: string) => {
    if (!data) return [];
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
        <AnalyticsLoader
          message="Cargando Análisis de Pacientes"
          subMessage={
            loadingSteps?.indicadores ? 'Obteniendo datos de ingresos...' :
            loadingSteps?.resumen ? 'Procesando resumen estadístico...' :
            loadingSteps?.porFecha ? 'Calculando tendencias temporales...' :
            loadingSteps?.estadoActual ? 'Actualizando métricas actuales...' :
            'Inicializando análisis de pacientes...'
          }
          showProgress={true}
          progress={
            loadingSteps ? 
              (Object.values(loadingSteps).filter(step => !step).length / 4) * 100 :
              0
          }
        />
      )}

      {error && (
        <div className={styles.error}>
          <p>Error al cargar los datos: {error}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
            <button onClick={refetch} className={styles.retryButton}>Reintentar</button>
            <button onClick={clearCache} className={styles.retryButton} style={{ background: '#f57c00' }}>
              Limpiar Cache
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Card de Estado Actual destacada en una sola fila */}
          <div className={styles.estadoActualCard}>
            <div className={styles.estadoActualContainer}>
              <div className={styles.estadoActualLeft}>
                <div className={styles.estadoActualIconContainer}>
                  <button 
                    className={styles.estadoActualInfoButton}
                    onClick={() => setIsEstadoActualModalOpen(true)}
                    aria-label="Información sobre Estado Actual"
                  >
                    <Icon path={ICONS.info} className={styles.estadoActualIcon} />
                  </button>
                </div>
                <div>
                  <h2 className={styles.estadoActualTitle}>Estado Actual</h2>
                  <p className={styles.estadoActualSubtitle}>Estadísticas en tiempo real</p>
                </div>
              </div>
              <div className={styles.estadoActualMetrics}>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValueLarge}>
                    {resumen ? resumen.totalGeneral.toLocaleString() : '0'}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Total</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {indicadoresPorFecha.length > 0 
                      ? Math.round((resumen?.totalGeneral || 0) / indicadoresPorFecha.length)
                      : 0
                    }
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Promedio</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {resumen && resumen.resumenPorClase ? Object.keys(resumen.resumenPorClase).length : 0}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Clases</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {indicadoresPorFecha.length}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Días</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.summaryCards}>
            <MetricCard
              title="Total General"
              value={resumen?.totalGeneral?.toLocaleString() || 0}
              detail="En el período seleccionado"
              icon={ICONS.people}
              iconColor="#0083A9"
              backgroundColor="#E0F7FA"
              tooltipData={{
                description: "Representa el total de pacientes ingresados durante el período seleccionado. Es la suma de todos los ingresos registrados en el sistema.",
                formula: "Suma de todos los ingresos por día en el período",
                example: "Si hay 50 ingresos el lunes, 30 el martes, etc., el total sería la suma de todos los días.",
                importance: "Esta métrica es fundamental para medir la demanda real de servicios hospitalarios y planificar la capacidad futura."
              }}
            />
            <MetricCard
              title="Promedio Diario"
              value={indicadoresPorFecha.length > 0 
                ? Math.round((resumen?.totalGeneral || 0) / indicadoresPorFecha.length)
                : 0
              }
              detail="Calculado sobre días con actividad"
              icon={ICONS.leaderboard}
              iconColor="#00B5E2"
              backgroundColor="#E8F5E9"
              tooltipData={{
                description: "Promedio de pacientes que ingresan por día durante el período analizado. Ayuda a identificar patrones de demanda.",
                formula: "Total General / Número de días con actividad",
                example: "Si hay 300 ingresos en 10 días: 300/10 = 30 ingresos promedio por día",
                importance: "Permite planificar recursos diarios y identificar días de mayor o menor demanda."
              }}
            />
            <MetricCard
              title="Clases Activas"
              value={resumen && resumen.resumenPorClase ? Object.keys(resumen.resumenPorClase).length : 0}
              detail="Tipos de paciente únicos"
              icon={ICONS.category}
              iconColor="#D81B60"
              backgroundColor="#FCE4EC"
              tooltipData={{
                description: "Número de diferentes tipos o clases de pacientes que han ingresado durante el período.",
                formula: "Conteo único de clases de paciente con ingresos > 0",
                example: "Ambulatorio, Internación, Urgencias = 3 clases activas",
                importance: "Indica la diversidad de servicios utilizados y ayuda en la planificación de recursos especializados."
              }}
            />
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
                  <Suspense fallback={<ChartSkeleton />}>
                    <DonutChartLazy 
                      data={clasePacienteData}
                      size={220}
                      donutWidth={40}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico de línea central */}
          <div className={styles.lineChartSection}>
            <Suspense fallback={<ChartSkeleton />}>
              <LineChartLazy 
                data={lineChartData}
                title={`Evolución de Ingresos por Fecha`}
                color="#00B5E2"
                height={350}
              />
            </Suspense>
          </div>

          {/* Sección de Insights Hospitalarios */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}>Análisis de Pacientes</h3>
            <div className={styles.insightsGrid}>
              <InsightCard
                icon={ICONS.trendingUp}
                title="Pico de Ingresos"
                content={
                  <p>
                    {diaMayorActividad
                      ? `El período con mayor actividad fue ${diaMayorActividad.fecha.split('T')[0].split('-').reverse().join('/')} con `
                      : 'No hay datos de actividad disponibles.'}
                    {diaMayorActividad && <strong>{`${diaMayorActividad.total} ingresos`}</strong>}
                    {diaMayorActividad && `, representando el día de mayor demanda en el período analizado.`}
                  </p>
                }
                tooltipData={{
                  description: "Identifica el día con la mayor cantidad de ingresos de pacientes registrada en el rango de fechas seleccionado.",
                  formula: "MAX(Total de ingresos) por cada día del período",
                  example: "Si el 15/03 hubo 45 ingresos y fue el día con más actividad del mes",
                  importance: "Ayuda a identificar patrones de demanda máxima, planificar recursos adicionales y detectar posibles cuellos de botella en admisiones."
                }}
                onAnalyze={() => {
                  const analysis = analyzeAdmissionPatterns(indicadores, resumen);
                  setAdmissionAnalysis(analysis);
                }}
                analysisData={admissionAnalysis || undefined}
              />
              <InsightCard
                icon={ICONS.checkCircle}
                title="Clase Dominante"
                content={
                  <p>
                    {resumen && resumen.resumenPorClase && Object.keys(resumen.resumenPorClase).length > 0 ? (
                      <>
                        La clase <strong>{Object.entries(resumen.resumenPorClase || {}).reduce((a, b) => a[1] > b[1] ? a : b)[0]}</strong> representa la mayor cantidad de ingresos con <strong>{Object.entries(resumen.resumenPorClase || {}).reduce((a, b) => a[1] > b[1] ? a : b)[1]}</strong> pacientes.
                      </>
                    ) : 'No hay datos de clases disponibles.'}
                  </p>
                }
                tooltipData={{
                  description: "Determina cuál tipo de paciente tiene la mayor frecuencia de ingresos durante el período analizado.",
                  formula: "Clase con MAX(Suma de ingresos) en el período",
                  example: "Ambulatorio: 150 ingresos, Internación: 200 ingresos → Internación es dominante",
                  importance: "Permite identificar servicios con alta demanda para redistribuir recursos y mejorar la gestión de ingresos por especialidad."
                }}
                onAnalyze={() => {
                  const analysis = analyzeAdmissionPatterns(indicadores, resumen);
                  setPatternAnalysis(analysis);
                }}
                analysisData={patternAnalysis || undefined}
              />
              <InsightCard
                icon={ICONS.info}
                title="Eficiencia Operativa"
                content={
                  <p>
                    {resumen ? (
                      <>
                        El promedio de <strong>{Math.round((resumen.totalGeneral || 0) / indicadoresPorFecha.length)}</strong> ingresos diarios indica una 
                        {Math.round((resumen.totalGeneral || 0) / indicadoresPorFecha.length) > 30 ? ' alta demanda' : Math.round((resumen.totalGeneral || 0) / indicadoresPorFecha.length) > 15 ? ' actividad normal' : ' baja actividad'} 
                        {Math.round((resumen.totalGeneral || 0) / indicadoresPorFecha.length) > 30 ? ' que requiere optimización de procesos.' : Math.round((resumen.totalGeneral || 0) / indicadoresPorFecha.length) > 15 ? ' en el sistema de admisiones.' : ' con capacidad disponible.'}
                      </>
                    ) : 'Calculando métricas de eficiencia...'}
                  </p>
                }
                tooltipData={{
                  description: "Evalúa la eficiencia del sistema de admisiones basado en el promedio diario de ingresos y la distribución temporal.",
                  formula: "Eficiencia = Promedio diario vs. capacidad instalada",
                  example: "15-30 ingresos/día = Normal | >30 = Alta demanda | <15 = Baja actividad",
                  importance: "Una distribución equilibrada optimiza el uso de recursos sin comprometer la calidad de atención."
                }}
                onAnalyze={() => {
                  const analysis = analyzeAdmissionPatterns(indicadores, resumen);
                  setPatternAnalysis(analysis);
                }}
                analysisData={patternAnalysis || undefined}
              />
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
                  {resumen && resumen.resumenPorClase && Object.entries(resumen.resumenPorClase).map(([clase, total], index) => {
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

      <MetricTooltipModal
        isOpen={isEstadoActualModalOpen}
        onClose={() => setIsEstadoActualModalOpen(false)}
        title="Estado Actual de Pacientes"
        description="Presenta las estadísticas de ingresos de pacientes en tiempo real, ofreciendo una visión instantánea de la actividad hospitalaria actual y tendencias de admisión."
        formula="Datos actualizados desde la base de datos: Total de Ingresos, Promedio Diario, Clases Activas, Días Analizados"
        example="Si hay 150 ingresos totales en 30 días con 3 clases activas: Promedio = 5 ingresos/día"
        importance="Esta información es fundamental para la gestión operativa diaria, planificación de recursos de admisión, y monitoreo de la demanda de servicios hospitalarios. Permite al personal administrativo y médico evaluar la carga de trabajo actual y anticipar necesidades."
      />
    </div>
  );
}
