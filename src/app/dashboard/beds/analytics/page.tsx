'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useCamasIndicadores } from '../../../hooks/useCamasIndicadores';

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
import styles from './BedsAnalytics.module.css';

const Icon = ({ path, className, style }: { path: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  bed: 'M4 7h16a2 2 0 012 2v8h-2v-3H4v3H2V9a2 2 0 012-2zm0 5h16V9H4v3z',
  percent: 'M19 5l-7 14h2l7-14h-2zM7 7a2 2 0 110-4 2 2 0 010 4zm0 14a2 2 0 110-4 2 2 0 010 4z',
  trendingUp: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
};

export default function BedsAnalytics() {
  const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];
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
    estadoActual, 
    loading, 
    loadingSteps,
    error, 
    computedData,
    refetch,
    clearCache
  } = useCamasIndicadores(fechaInicio, fechaFin);

  useEffect(() => {
    if (fechaInicio && fechaFin) refetch();
  }, [fechaInicio, fechaFin]);

  const pantoneColors = ['#00B5E2', '#61D6EB', '#0083A9', '#41C8DC'];

  // Preparar datos para gráficos de torta (similar a patients analytics)
  const prepareChartData = (data: Record<string, number>, title: string) => {
    return Object.entries(data).map(([label, value], index) => ({
      label,
      value,
      color: pantoneColors[index % pantoneColors.length]
    }));
  };

  // Datos para gráficos de torta
  const sectorData = resumen ? prepareChartData(resumen.resumenPorSector, 'Por Sector') : [];
  
  // Donut: Ocupadas vs Disponibles promedio
  const donutData = [
    { label: 'Ocupadas', value: resumen?.ocupadasPromedio || 0, color: pantoneColors[0] },
    { label: 'Disponibles', value: resumen?.disponiblesPromedio || 0, color: pantoneColors[2] }
  ];

  // Line: porcentaje ocupación por fecha - igual que patients analytics
  const lineChartData = indicadoresPorFecha.map((item: any) => {
    const [year, month, day] = item.fecha.split('T')[0].split('-');
    return {
      label: `${day}/${month}`,
      value: item.porcentajeOcupacion,
      date: item.fecha
    };
  });

  // Calcular el día de mayor ocupación (similar a patients analytics)
  const diaMayorOcupacion = indicadoresPorFecha.length > 0
    ? indicadoresPorFecha.reduce((max, current) => current.porcentajeOcupacion > max.porcentajeOcupacion ? current : max)
    : null;

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    const endDate = new Date();
    let startDate = new Date(endDate);
    switch (tab) {
      case 'día': break;
      case 'semana': startDate.setDate(endDate.getDate() - 6); break;
      case 'mes': startDate.setDate(endDate.getDate() - 29); break;
      case 'año': startDate.setDate(endDate.getDate() - 364); break;
      default: return;
    }
    setFechaInicio(toYYYYMMDD(startDate));
    setFechaFin(toYYYYMMDD(endDate));
  };

  const handleCustomDateChange = (value: string, setDate: (d: string) => void) => {
    setDate(value);
    setActiveTab('custom');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h1 className={styles.title}>Análisis de Ocupación de Camas</h1>
            <p className={styles.subtitle}>Indicadores clave de ocupación y disponibilidad por período.</p>
          </div>
          <div className={styles.controls}>
            <div className={styles.filterTabs}>
              {['Día', 'Semana', 'Mes', 'Año'].map(tab => (
                <button key={tab} className={`${styles.tabButton} ${activeTab === tab.toLowerCase() ? styles.activeTab : ''}`} onClick={() => handleTabClick(tab.toLowerCase())}>
                  {tab}
                </button>
              ))}
            </div>
            <div className={styles.dateControls}>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaInicio">Fecha Inicio:</label>
                <input id="fechaInicio" type="date" value={fechaInicio} onChange={(e) => handleCustomDateChange(e.target.value, setFechaInicio)} className={styles.dateInput} />
              </div>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaFin">Fecha Fin:</label>
                <input id="fechaFin" type="date" value={fechaFin} onChange={(e) => handleCustomDateChange(e.target.value, setFechaFin)} className={styles.dateInput} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>
            {loadingSteps?.indicadores && 'Cargando Análisis...'}
            {loadingSteps?.resumen && 'Procesando resumen...'}
            {loadingSteps?.porFecha && 'Procesando datos por fecha...'}
            {loadingSteps?.estadoActual && 'Obteniendo estado actual...'}
            {!Object.values(loadingSteps || {}).some(Boolean) && 'Cargando indicadores...'}
          </p>
          {computedData && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              {computedData.sectorsCount} sectores • {computedData.totalPeriods} períodos
            </div>
          )}
        </div>
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
                  <Icon path={ICONS.info} className={styles.estadoActualIcon} />
                </div>
                <div>
                  <h2 className={styles.estadoActualTitle}>Estado Actual</h2>
                  <p className={styles.estadoActualSubtitle}>Ocupación en tiempo real</p>
                </div>
              </div>
              <div className={styles.estadoActualMetrics}>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValueLarge}>
                    {estadoActual ? `${estadoActual.porcentajeOcupacion.toFixed(1)}%` : '0%'}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Ocupación</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {estadoActual ? estadoActual.ocupadas : 0}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Ocupadas</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {estadoActual ? estadoActual.disponibles : 0}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Disponibles</div>
                </div>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValue}>
                    {estadoActual ? estadoActual.totalCamas : 0}
                  </div>
                  <div className={styles.estadoActualMetricLabel}>Total</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.summaryCards}>
            <MetricCard
              title="Días-Cama Ocupados"
              value={resumen?.totalGeneral?.toLocaleString() || 0}
              detail="Total en el período analizado"
              icon={ICONS.bed}
              iconColor="#0083A9"
              backgroundColor="#E0F7FA"
              tooltipData={{
                description: "Representa el total de días que las camas estuvieron ocupadas durante el período seleccionado. Es la suma de todas las camas ocupadas por día en todos los sectores.",
                formula: "Suma de (Camas Ocupadas × Días) para todo el período",
                example: "Si un sector tiene 20 camas ocupadas durante 30 días, contribuye con 600 días-cama al total.",
                importance: "Esta métrica es fundamental para medir la demanda real de servicios hospitalarios y planificar la capacidad futura. Un valor alto indica alta demanda de servicios."
              }}
            />
            <MetricCard
              title="Tasa de Ocupación"
              value={`${resumen?.porcentajeOcupacionPromedio?.toFixed(1) || 0}%`}
              detail="Eficiencia hospitalaria global"
              icon={ICONS.percent}
              iconColor="#00B5E2"
              backgroundColor="#E8F5E9"
              tooltipData={{
                description: "Porcentaje promedio de camas ocupadas respecto al total de camas disponibles. Indica qué tan eficientemente se está utilizando la capacidad instalada.",
                formula: "(Camas Ocupadas Promedio / Total Camas Disponibles) × 100",
                example: "Si hay 75 camas disponibles y en promedio 60 están ocupadas: (60/75) × 100 = 80%",
                importance: "El rango óptimo está entre 75-85%. Menos del 75% indica subutilización, más del 85% puede indicar sobrecarga y riesgo de calidad en la atención."
              }}
            />
            <MetricCard
              title="Capacidad Instalada"
              value={resumen?.totalCamasPromedio || 0}
              detail="Camas disponibles en total"
              icon={ICONS.trendingUp}
              iconColor="#D81B60"
              backgroundColor="#FCE4EC"
              tooltipData={{
                description: "Número total de camas disponibles en el hospital, sumando todos los sectores y servicios médicos. Representa la capacidad máxima de atención.",
                formula: "Suma de todas las camas habilitadas en todos los sectores",
                example: "Medicina Interna (30) + Cirugía (25) + Pediatría (20) = 75 camas totales",
                importance: "Define el límite máximo de pacientes que pueden ser atendidos simultáneamente. Es clave para planificación estratégica y evaluación de necesidades de expansión."
              }}
            />
          </div>

          {/* Distribución por Sector con Donut Chart */}
          <div className={styles.donutChartSection}>
            <h3 className={styles.sectionTitle}>Distribución por Sector</h3>
            <div className={styles.donutChartContent}>
              <div className={styles.donutLegend}>
                {sectorData.map((item, index) => (
                  <div key={index} className={styles.legendItem}>
                    <div className={styles.legendInfo}>
                      <div className={styles.legendColor} style={{ backgroundColor: item.color }} />
                      <span className={styles.legendLabel}>{item.label}</span>
                    </div>
                    <span className={styles.legendValue}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.donutChartContainer}>
                {sectorData.length > 0 && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <DonutChartLazy 
                      data={sectorData}
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
                title={`Evolución de Ocupación por Fecha`}
                color="#00B5E2"
                height={350}
              />
            </Suspense>
          </div>

          {/* Sección de Insights Hospitalarios */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}>Análisis Hospitalario</h3>
            <div className={styles.insightsGrid}>
              <InsightCard
                icon={ICONS.trendingUp}
                title="Pico de Ocupación"
                content={
                  <p>
                    {diaMayorOcupacion
                      ? `El período con mayor ocupación fue ${diaMayorOcupacion.fecha.split('T')[0].split('-').reverse().join('/')} con `
                      : 'No hay datos de ocupación disponibles.'}
                    {diaMayorOcupacion && <strong>{`${diaMayorOcupacion.porcentajeOcupacion.toFixed(1)}% de ocupación`}</strong>}
                    {diaMayorOcupacion && `, representando ${diaMayorOcupacion.ocupadas} camas ocupadas de ${diaMayorOcupacion.totalCamas} disponibles.`}
                  </p>
                }
                tooltipData={{
                  description: "Identifica el día o período con la mayor tasa de ocupación hospitalaria registrada en el rango de fechas seleccionado.",
                  formula: "MAX(Camas Ocupadas / Total Camas) × 100 por cada día del período",
                  example: "Si el 15/03 hubo 68 camas ocupadas de 75 totales: (68/75) × 100 = 90.7%",
                  importance: "Ayuda a identificar patrones de demanda máxima, planificar recursos adicionales y detectar posibles cuellos de botella en la atención hospitalaria."
                }}
              />
              <InsightCard
                icon={ICONS.info}
                title="Sector de Mayor Demanda"
                content={
                  <p>
                    {resumen && Object.keys(resumen.resumenPorSector).length > 0 ? (
                      <>
                        El sector <strong>{Object.entries(resumen.resumenPorSector).reduce((a, b) => a[1] > b[1] ? a : b)[0]}</strong> registra la mayor tasa de ocupación con <strong>{Object.entries(resumen.resumenPorSector).reduce((a, b) => a[1] > b[1] ? a : b)[1]}%</strong> promedio.
                      </>
                    ) : 'No hay datos de sectores disponibles.'}
                  </p>
                }
                tooltipData={{
                  description: "Determina cuál sector o servicio médico tiene la mayor demanda promedio de camas durante el período analizado.",
                  formula: "Promedio de ocupación por sector = Σ(Días-cama ocupados) / Σ(Días-cama disponibles) × 100",
                  example: "Medicina Interna: 850 días-cama ocupados / 930 disponibles = 91.4% promedio",
                  importance: "Permite identificar servicios con alta demanda para redistribuir recursos, planificar expansiones o mejorar la gestión de ingresos por especialidad."
                }}
              />
              <InsightCard
                icon={ICONS.percent}
                title="Eficiencia Operativa"
                content={
                  <p>
                    {resumen ? (
                      <>
                        La tasa de ocupación del <strong>{resumen.porcentajeOcupacionPromedio.toFixed(1)}%</strong> indica una 
                        {resumen.porcentajeOcupacionPromedio > 85 ? ' alta demanda' : resumen.porcentajeOcupacionPromedio > 70 ? ' ocupación óptima' : ' capacidad disponible'} 
                        {resumen.porcentajeOcupacionPromedio > 85 ? ' que podría requerir expansión.' : resumen.porcentajeOcupacionPromedio > 70 ? ' para atención hospitalaria.' : ' para nuevos ingresos.'}
                      </>
                    ) : 'Calculando métricas de eficiencia...'}
                  </p>
                }
                tooltipData={{
                  description: "Evalúa qué tan eficientemente se utiliza la capacidad hospitalaria instalada comparando la ocupación real con los estándares óptimos.",
                  formula: "Eficiencia = (Ocupación Promedio / Capacidad Total) × 100. Rango óptimo: 75-85%",
                  example: "75% = Óptima | 60% = Subutilización | 90% = Sobreocupación",
                  importance: "Una eficiencia óptima (75-85%) maximiza el uso de recursos sin comprometer la calidad. Fuera de este rango indica necesidad de ajustes operativos."
                }}
              />
            </div>
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <h4>Métricas Hospitalarias</h4>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Período analizado:</span>
                    <span className={styles.statValue}>{new Date(fechaInicio).toLocaleDateString('es-ES')} - {new Date(fechaFin).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Sectores monitoreados:</span>
                    <span className={styles.statValue}>{resumen ? Object.keys(resumen.resumenPorSector).length : 0}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Rotación promedio:</span>
                    <span className={styles.statValue}>
                      {resumen && resumen.totalCamasPromedio > 0 
                        ? `${((resumen.totalGeneral / indicadoresPorFecha.length) / resumen.totalCamasPromedio * 100).toFixed(1)}% diaria`
                        : 'Calculando...'
                      }
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Días-cama disponibles:</span>
                    <span className={styles.statValue}>
                      {resumen ? (resumen.totalCamasPromedio * indicadoresPorFecha.length - resumen.totalGeneral).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.detailCard}>
                <h4>Indicadores de Gestión</h4>
                <div className={styles.statsList}>
                  {resumen && estadoActual && (
                    <>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Tendencia actual:</span>
                        <span className={styles.statValue} style={{ 
                          color: estadoActual.porcentajeOcupacion > resumen.porcentajeOcupacionPromedio ? '#d32f2f' : '#388e3c' 
                        }}>
                          {estadoActual.porcentajeOcupacion > resumen.porcentajeOcupacionPromedio ? '↗ Sobre el promedio' : '↘ Bajo el promedio'}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Variación:</span>
                        <span className={styles.statValue}>
                          {estadoActual.porcentajeOcupacion > resumen.porcentajeOcupacionPromedio ? '+' : ''}
                          {(estadoActual.porcentajeOcupacion - resumen.porcentajeOcupacionPromedio).toFixed(1)} puntos porcentuales
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Alerta de capacidad:</span>
                        <span className={styles.statValue} style={{ 
                          color: estadoActual.porcentajeOcupacion > 90 ? '#d32f2f' : estadoActual.porcentajeOcupacion > 80 ? '#f57c00' : '#388e3c' 
                        }}>
                          {estadoActual.porcentajeOcupacion > 90 ? 'Crítica' : estadoActual.porcentajeOcupacion > 80 ? 'Moderada' : 'Normal'}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Eficiencia vs óptimo (80%):</span>
                        <span className={styles.statValue} style={{ 
                          color: Math.abs(resumen.porcentajeOcupacionPromedio - 80) < 10 ? '#388e3c' : '#f57c00'
                        }}>
                          {Math.abs(resumen.porcentajeOcupacionPromedio - 80) < 10 ? 'Óptima' : resumen.porcentajeOcupacionPromedio > 80 ? 'Sobreocupación' : 'Subutilización'}
                        </span>
                      </div>
                    </>
                  )}
                  {(!resumen || !estadoActual) && (
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Estado:</span>
                      <span className={styles.statValue}>Cargando análisis...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
