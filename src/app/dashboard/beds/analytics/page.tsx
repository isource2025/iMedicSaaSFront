'use client';

import React, { useState, Suspense, useMemo, useEffect, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useCamasIndicadores } from '@/app/hooks/useCamasIndicadores';

// Lazy loading de componentes pesados para mejorar el rendimiento inicial
const DonutChartLazy = lazy(() => import('@/app/components/Charts/DonutChart'));
const LineChartLazy = lazy(() => import('@/app/components/Charts/LineChart'));

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
import { MetricCard } from '@/app/components/MetricCard';
import { InsightCard } from '@/app/components/InsightCard';
import { MetricTooltipModal } from '@/app/components/modals/MetricTooltipModal';
import { MetricTooltip } from '@/app/components/MetricTooltip';
import { AnalyticsLoader } from '@/app/components/AnalyticsLoader';
import { analyzePeakOccupancy, analyzeSectorDemand, analyzeOperationalEfficiency, AnalysisResult } from '@/app/utils/analyticsEngine';
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
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  arrowBack: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'
};

export default function BedsAnalytics() {
  const router = useRouter();
  
  const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];
  const today = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(today.getDate() - 30);

  const [fechaInicio, setFechaInicio] = useState(toYYYYMMDD(defaultStart));
  const [fechaFin, setFechaFin] = useState(toYYYYMMDD(today));
  const [activeTab, setActiveTab] = useState<string>('mes');
  const [isEstadoActualModalOpen, setIsEstadoActualModalOpen] = useState(false);
  const [peakAnalysis, setPeakAnalysis] = useState<AnalysisResult | null>(null);
  const [efficiencyAnalysis, setEfficiencyAnalysis] = useState<AnalysisResult | null>(null);
  const [sectorAnalysis, setSectorAnalysis] = useState<AnalysisResult | null>(null);

  const { 
    indicadores, 
    resumen,
    indicadoresPorFecha,
    estadoActual,
    loading,
    error,
    loadingSteps,
    computedData,
    clearCache
  } = useCamasIndicadores(fechaInicio, fechaFin);

  const pantoneColors = ['#00B5E2', '#61D6EB', '#0083A9', '#41C8DC'];

  // Preparar datos para gráficos de torta (similar a patients analytics)
  const prepareChartData = (data: Record<string, number>, title: string) => {
    return Object.entries(data)
      .sort(([,a], [,b]) => b - a) // Ordenar de mayor a menor
      .map(([label, value], index) => ({
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

  // Datos para gráfico de línea - camas ocupadas día por día
  const lineChartData = indicadoresPorFecha.map(item => {
    const [year, month, day] = item.fecha.split('T')[0].split('-');
    return {
      label: `${day}/${month}`,
      value: item.ocupadas,
      date: item.fecha
    };
  });

  // Calcular el día de mayor ocupación una sola vez para reutilizarlo
  const diaMayorOcupacion = indicadoresPorFecha.length > 0
    ? indicadoresPorFecha.reduce((max: any, current: any) => current.ocupadas > max.ocupadas ? current : max)
    : null;

  // Nuevos cálculos para las cards actualizadas
  const ocupacionPromedioGlobal = useMemo(() => {
    if (!resumen) return 0;
    return resumen.porcentajeOcupacionPromedio;
  }, [resumen]);

  const variabilidadOcupacion = useMemo(() => {
    if (!resumen || !resumen.resumenPorSector || Object.keys(resumen.resumenPorSector).length === 0) {
      return { valor: 0, rango: '', tipo: 'baja' };
    }
    
    const ocupacionesSectores = Object.values(resumen.resumenPorSector);
    const min = Math.min(...ocupacionesSectores);
    const max = Math.max(...ocupacionesSectores);
    const rango = max - min;
    
    // Calcular desviación estándar
    const promedio = ocupacionesSectores.reduce((sum, val) => sum + val, 0) / ocupacionesSectores.length;
    const varianza = ocupacionesSectores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / ocupacionesSectores.length;
    const desviacionEstandar = Math.sqrt(varianza);
    
    let tipo = 'baja';
    if (desviacionEstandar > 20) tipo = 'alta';
    else if (desviacionEstandar > 10) tipo = 'media';
    
    return {
      valor: desviacionEstandar,
      rango: `${min.toFixed(2)}% - ${max.toFixed(2)}%`,
      tipo
    };
  }, [resumen]);

  const demandaVsCapacidad = useMemo(() => {
    if (!resumen || !estadoActual) {
      return {
        camasNecesariasPromedio: 0,
        camasInstaladas: 0,
        utilizacionGlobal: 0,
        proyeccionCrecimiento20: 0
      };
    }
    
    const camasNecesariasPromedio = resumen.ocupadasPromedio;
    const camasInstaladas = estadoActual.totalCamas;
    const utilizacionGlobal = camasInstaladas > 0 ? (camasNecesariasPromedio / camasInstaladas) * 100 : 0;
    const proyeccionCrecimiento20 = camasNecesariasPromedio * 1.2; // 20% de crecimiento
    
    return {
      camasNecesariasPromedio,
      camasInstaladas,
      utilizacionGlobal,
      proyeccionCrecimiento20
    };
  }, [resumen, estadoActual]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    const endDate = new Date();
    let startDate = new Date(endDate);
    
    switch (tab) {
      case 'día': 
        // Para "día" mostrar solo el día actual
        startDate = new Date(endDate);
        break;
      case 'semana': 
        // Para "semana" mostrar últimos 7 días
        startDate.setDate(endDate.getDate() - 6); 
        break;
      case 'mes': 
        // Para "mes" mostrar últimos 30 días
        startDate.setDate(endDate.getDate() - 29); 
        break;
      case 'año': 
        // Para "año" mostrar últimos 365 días
        startDate.setDate(endDate.getDate() - 364); 
        break;
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
          <div className={styles.headerLeft}>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/dashboard')}
              aria-label="Volver al dashboard"
            >
              <Icon path={ICONS.arrowBack} className={styles.backIcon} />
            </button>
            <div className={styles.headerInfo}>
              <h1 className={styles.title}>Análisis de Ocupación de Camas</h1>
              <p className={styles.subtitle}>Indicadores clave de ocupación y disponibilidad por período.</p>
            </div>
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
        <AnalyticsLoader
          message="Cargando Análisis de Camas"
          subMessage={
            loadingSteps?.indicadores ? 'Obteniendo datos de ocupación...' :
            loadingSteps?.resumen ? 'Procesando resumen hospitalario...' :
            loadingSteps?.porFecha ? 'Calculando tendencias por fecha...' :
            loadingSteps?.estadoActual ? 'Actualizando estado en tiempo real...' :
            'Inicializando análisis estadístico...'
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
            <button onClick={() => window.location.reload()} className={styles.retryButton}>Reintentar</button>
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
                  <p className={styles.estadoActualSubtitle}>Ocupación en tiempo real</p>
                </div>
              </div>
              <div className={styles.estadoActualMetrics}>
                <div className={styles.estadoActualMetric}>
                  <div className={styles.estadoActualMetricValueLarge}>
                    {estadoActual ? `${estadoActual.porcentajeOcupacion.toFixed(2)}%` : '0.00%'}
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
              value={`${resumen?.porcentajeOcupacionPromedio?.toFixed(2) || '0.00'}%`}
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
              title="Índice de Rotación"
              value={(() => {
                if (!indicadoresPorFecha.length || !estadoActual) return "0.0";
                // Calcular índice de rotación: Total movimientos / Camas disponibles promedio
                const totalMovimientos = indicadoresPorFecha.reduce((sum, item) => sum + item.ocupadas, 0);
                const camasDisponibles = estadoActual.totalCamas;
                const diasPeriodo = indicadoresPorFecha.length;
                const indiceRotacion = camasDisponibles > 0 ? (totalMovimientos / (camasDisponibles * diasPeriodo)).toFixed(1) : "0.0";
                return indiceRotacion;
              })()}
              detail="Movimientos por cama por día"
              icon={ICONS.trendingUp}
              iconColor="#D81B60"
              backgroundColor="#FCE4EC"
              tooltipData={{
                description: "Mide la intensidad de uso de las camas considerando todos los movimientos hospitalarios (ingresos, egresos, traslados). Un índice alto indica alta rotación de pacientes.",
                formula: "Índice = Total Movimientos / (Camas Totales × Días del Período)",
                example: "Si hay 1,500 movimientos en 30 días con 100 camas: 1,500 / (100 × 30) = 0.5 movimientos por cama por día",
                importance: "0.3-0.7 es normal. Menos de 0.3 indica baja utilización. Más de 0.7 indica alta rotación y eficiencia operativa."
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
                    <span className={styles.legendValue}>{typeof item.value === 'number' ? item.value.toFixed(2) : item.value}</span>
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
                title={`Evolución de Camas Ocupadas por Fecha`}
                color="#00B5E2"
                height={350}
                maxValue={estadoActual?.totalCamas || undefined}
              />
            </Suspense>
          </div>

          {/* Sección de Insights Hospitalarios */}
          <div className={styles.insightsSection}>
            <h3 className={styles.sectionTitle}>Análisis Hospitalario</h3>
            <div className={styles.insightsGrid}>
              <InsightCard
                icon={ICONS.percent}
                title="Ocupación Promedio Global"
                content={
                  <>
                    <p><strong>{ocupacionPromedioGlobal.toFixed(2)}%</strong></p>
                    <p>Ocupación hospitalaria promedio</p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      marginTop: '8px'
                    }}>
                      {ocupacionPromedioGlobal < 45 
                        ? 'Existe margen para absorber demanda extra' 
                        : ocupacionPromedioGlobal > 85
                        ? 'Hospital trabajando cerca de su capacidad máxima'
                        : 'Nivel de ocupación equilibrado'
                      }
                    </p>
                  </>
                }
                tooltipData={{
                  description: "Porcentaje de ocupación hospitalaria promedio en todo el período analizado. Muestra qué tan eficientemente se utiliza la capacidad instalada del hospital.",
                  formula: "Ocupación Global = (Camas Ocupadas Promedio / Total Camas Disponibles) × 100",
                  example: "Con 25 camas totales y promedio de 14.7 ocupadas: (14.7/25) × 100 = 58.8% de ocupación global",
                  importance: "Permite evaluar si el hospital trabaja con margen para absorber demanda extra o si está cerca de su capacidad máxima. Valores entre 70-85% son considerados óptimos."
                }}
                onAnalyze={() => {
                  const tendencia = indicadoresPorFecha.length > 1 
                    ? indicadoresPorFecha[indicadoresPorFecha.length - 1].porcentajeOcupacion > indicadoresPorFecha[0].porcentajeOcupacion
                      ? 'ascendente' : 'descendente'
                    : 'estable';
                  
                  const analysis = {
                    title: 'Análisis de Ocupación Global',
                    insights: [
                      `Tendencia ${tendencia}: La ocupación hospitalaria ${tendencia === 'ascendente' ? 'está subiendo' : tendencia === 'descendente' ? 'está bajando' : 'se mantiene estable'} mes a mes.`,
                      `Capacidad disponible: El hospital trabaja al ${ocupacionPromedioGlobal.toFixed(1)}% de su capacidad, ${ocupacionPromedioGlobal < 75 ? 'existe margen significativo' : 'capacidad limitada'} para absorber demanda extra.`,
                      ocupacionPromedioGlobal < 45 
                        ? 'Insight utilitario: El hospital tiene amplio margen para crecer y absorber mayor demanda sin comprometer la calidad de atención.'
                        : ocupacionPromedioGlobal > 85
                        ? 'Insight utilitario: El hospital está operando cerca de su límite, se recomienda evaluar expansión de capacidad.'
                        : 'Insight utilitario: El hospital mantiene un equilibrio saludable entre utilización y disponibilidad.'
                    ],
                    recommendations: [
                      tendencia === 'ascendente' ? 'Monitorear de cerca la evolución para anticipar necesidades de expansión' : 'Evaluar oportunidades de optimización en sectores subutilizados',
                      ocupacionPromedioGlobal < 60 ? 'Considerar estrategias para aumentar la utilización de camas disponibles' : 'Mantener el equilibrio actual entre demanda y capacidad'
                    ]
                  };
                  setPeakAnalysis(analysis);
                }}
                analysisData={peakAnalysis || undefined}
              />
              <InsightCard
                icon={ICONS.trendingUp}
                title="Variabilidad de Ocupación"
                content={
                  <>
                    <p><strong>Variabilidad {variabilidadOcupacion.tipo}</strong></p>
                    <p>Rango: {variabilidadOcupacion.rango}</p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: variabilidadOcupacion.tipo === 'alta' ? '#f57c00' : variabilidadOcupacion.tipo === 'media' ? '#ff9800' : '#388e3c',
                      marginTop: '8px'
                    }}>
                      {variabilidadOcupacion.tipo === 'alta' 
                        ? 'Ocupación desigual entre sectores' 
                        : variabilidadOcupacion.tipo === 'media'
                        ? 'Ocupación moderadamente equilibrada'
                        : 'Ocupación homogénea entre sectores'
                      }
                    </p>
                  </>
                }
                tooltipData={{
                  description: "Mide qué tan equilibrada está la ocupación entre diferentes sectores del hospital. Una alta variabilidad indica que algunos sectores están saturados mientras otros permanecen subutilizados.",
                  formula: "Variabilidad = Desviación Estándar de ocupación entre sectores. Rango = Máxima ocupación - Mínima ocupación",
                  example: "Si los sectores tienen ocupaciones entre 6% y 72%, la variabilidad es alta (rango de 66%), indicando desequilibrio operativo.",
                  importance: "Permite identificar oportunidades de redistribución de recursos y pacientes para optimizar la utilización global del hospital."
                }}
                onAnalyze={() => {
                  const sectoresData = resumen?.resumenPorSector || {};
                  const sectoresOrdenados = Object.entries(sectoresData)
                    .sort(([,a], [,b]) => (b as number) - (a as number));
                  
                  const analysis = {
                    title: 'Análisis de Variabilidad de Ocupación',
                    insights: [
                      `Equilibrio operativo: ${variabilidadOcupacion.tipo === 'alta' ? 'La ocupación hospitalaria NO está homogénea' : 'La ocupación está relativamente equilibrada'}.`,
                      variabilidadOcupacion.tipo === 'alta' 
                        ? `Desequilibrio significativo: mientras ${sectoresOrdenados[0]?.[0]} está al ${sectoresOrdenados[0]?.[1].toFixed(1)}%, otros sectores permanecen subutilizados.`
                        : `Distribución equilibrada: los sectores mantienen niveles similares de ocupación.`,
                      variabilidadOcupacion.tipo === 'alta'
                        ? 'Perspectiva útil: Esto habilita decisiones de gestión sobre redistribución de pacientes y recursos entre sectores.'
                        : 'Perspectiva útil: El hospital mantiene una operación balanceada entre sus diferentes servicios.'
                    ],
                    recommendations: [
                      variabilidadOcupacion.tipo === 'alta' ? 'Evaluar redistribución de pacientes desde sectores saturados hacia sectores con disponibilidad' : 'Mantener el equilibrio actual entre sectores',
                      'Implementar protocolos de derivación interna para optimizar la utilización de camas disponibles'
                    ]
                  };
                  setSectorAnalysis(analysis);
                }}
                analysisData={sectorAnalysis || undefined}
              />
              <InsightCard
                icon={ICONS.bed}
                title="Demanda Potencial vs Capacidad Instalada"
                content={
                  <>
                    <p><strong>Camas necesarias: {demandaVsCapacidad.camasNecesariasPromedio.toFixed(2)}</strong></p>
                    <p>Camas instaladas: {demandaVsCapacidad.camasInstaladas}</p>
                    <p><strong>Utilización: {demandaVsCapacidad.utilizacionGlobal.toFixed(2)}%</strong></p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: demandaVsCapacidad.utilizacionGlobal > 90 ? '#f57c00' : demandaVsCapacidad.utilizacionGlobal < 50 ? '#ff9800' : '#388e3c',
                      marginTop: '8px'
                    }}>
                      {demandaVsCapacidad.utilizacionGlobal > 90 
                        ? 'Capacidad ajustada - considerar expansión' 
                        : demandaVsCapacidad.utilizacionGlobal < 50
                        ? 'Capacidad sobredimensionada'
                        : 'Capacidad adecuada para la demanda'
                      }
                    </p>
                  </>
                }
                tooltipData={{
                  description: "Compara la demanda real de camas (promedio de camas efectivamente utilizadas) contra la capacidad total instalada del hospital.",
                  formula: "Utilización = (Camas Necesarias Promedio / Camas Instaladas) × 100. Proyección 20% = Camas Necesarias × 1.2",
                  example: "Con 14.7 camas necesarias promedio y 25 instaladas: Utilización = 58.8%. Si crece 20%: 17.6 camas sobre 25 (70% de capacidad).",
                  importance: "Ayuda a planificar si se necesita ampliar o reducir capacidad. Permite simular escenarios de crecimiento de demanda y evaluar la suficiencia de la infraestructura actual."
                }}
                onAnalyze={() => {
                  const margenDisponible = demandaVsCapacidad.camasInstaladas - demandaVsCapacidad.camasNecesariasPromedio;
                  const capacidadCon20Crecimiento = (demandaVsCapacidad.proyeccionCrecimiento20 / demandaVsCapacidad.camasInstaladas) * 100;
                  
                  const analysis = {
                    title: 'Análisis de Capacidad vs Demanda',
                    insights: [
                      `Capacidad actual: ${demandaVsCapacidad.utilizacionGlobal > 80 ? 'La capacidad instalada está ajustada' : 'Existe capacidad disponible'} para la demanda actual.`,
                      `Margen disponible: ${margenDisponible.toFixed(1)} camas libres en promedio (${(100 - demandaVsCapacidad.utilizacionGlobal).toFixed(1)}% de margen).`,
                      `Simulación de crecimiento: Si la demanda crece un 20%, se utilizarían ${demandaVsCapacidad.proyeccionCrecimiento20.toFixed(1)} camas sobre ${demandaVsCapacidad.camasInstaladas} (${capacidadCon20Crecimiento.toFixed(1)}% de capacidad).`,
                      capacidadCon20Crecimiento > 95
                        ? 'Perspectiva estratégica: Se necesitará ampliar capacidad si la demanda crece significativamente.'
                        : capacidadCon20Crecimiento < 70
                        ? 'Perspectiva estratégica: La capacidad actual puede absorber crecimiento sin necesidad de expansión inmediata.'
                        : 'Perspectiva estratégica: La capacidad está bien dimensionada para absorber crecimiento moderado.'
                    ],
                    recommendations: [
                      demandaVsCapacidad.utilizacionGlobal > 85 ? 'Evaluar necesidad de expansión de capacidad a mediano plazo' : 'Optimizar utilización de la capacidad existente',
                      capacidadCon20Crecimiento > 90 ? 'Planificar expansión para escenarios de alto crecimiento' : 'Monitorear tendencias de demanda para ajustes futuros'
                    ]
                  };
                  setEfficiencyAnalysis(analysis);
                }}
                analysisData={efficiencyAnalysis || undefined}
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
                  <MetricTooltip
                    label="Ocupación Actual"
                    value={estadoActual ? `${estadoActual.ocupadas} camas` : 'Sin datos'}
                    description="Número actual de camas ocupadas en tiempo real."
                    formula="Conteo directo de camas con estado 'ocupada'"
                    interpretation="Indica la demanda actual del hospital. Comparar con capacidad total para evaluar disponibilidad."
                  />
                  <MetricTooltip
                    label="Ocupación promedio"
                    value={resumen ? `${resumen.porcentajeOcupacionPromedio.toFixed(2)}%` : 'Sin datos'}
                    description="Porcentaje promedio de camas ocupadas durante el período analizado."
                    formula="Promedio de (Camas ocupadas / Total camas) × 100"
                    interpretation="Valores entre 70-85% son considerados óptimos para hospitales."
                  />
                  <MetricTooltip
                    label="Tasa de rotación diaria"
                    value={resumen && resumen.totalCamasPromedio > 0 ? `${(resumen.ocupadasPromedio / resumen.totalCamasPromedio).toFixed(2)}` : 'Sin datos'}
                    description="Índice que mide la utilización promedio de camas por día."
                    formula="Camas ocupadas promedio / Total camas promedio"
                    interpretation="Valores entre 0.70-0.85 son óptimos. Mayor a 0.90 indica saturación."
                  />
                </div>
              </div>
              <div className={styles.detailCard}>
                <h4>Indicadores de Gestión</h4>
                <div className={styles.statsList}>
                  {resumen && estadoActual && (
                    <>
                      <MetricTooltip
                        label="Capacidad disponible"
                        value={estadoActual ? `${estadoActual.totalCamas - estadoActual.ocupadas} camas` : 'Sin datos'}
                        description="Número de camas disponibles para nuevos ingresos en este momento."
                        formula="Total camas - Camas ocupadas"
                        interpretation="Indica la capacidad inmediata para recibir nuevos pacientes."
                      />
                      <MetricTooltip
                        label="Sectores activos"
                        value={resumen ? `${Object.keys(resumen.resumenPorSector).length} sectores` : 'Sin datos'}
                        description="Número de sectores hospitalarios con actividad durante el período."
                        formula="Conteo de sectores con camas ocupadas"
                        interpretation="Mayor número indica diversificación de servicios médicos activos."
                      />
                      <MetricTooltip
                        label="Pico de ocupación"
                        value={indicadoresPorFecha.length > 0 ? `${Math.max(...indicadoresPorFecha.map(d => d.porcentajeOcupacion)).toFixed(2)}%` : 'Sin datos'}
                        description="Máximo porcentaje de ocupación registrado durante el período analizado."
                        formula="Máximo valor de ocupación diaria"
                        interpretation="Indica la máxima demanda alcanzada. Valores >95% sugieren necesidad de expansión."
                      />
                      <MetricTooltip
                        label="Variabilidad ocupación"
                        value={indicadoresPorFecha.length > 0 ? `${(Math.max(...indicadoresPorFecha.map(d => d.porcentajeOcupacion)) - Math.min(...indicadoresPorFecha.map(d => d.porcentajeOcupacion))).toFixed(2)}%` : 'Sin datos'}
                        description="Diferencia entre el máximo y mínimo porcentaje de ocupación del período."
                        formula="Máximo % ocupación - Mínimo % ocupación"
                        interpretation="Menor variabilidad indica operación más estable. >30% sugiere fluctuaciones significativas."
                      />
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

      <MetricTooltipModal
        isOpen={isEstadoActualModalOpen}
        onClose={() => setIsEstadoActualModalOpen(false)}
        title="Estado Actual de Ocupación"
        description="Muestra las métricas de ocupación hospitalaria en tiempo real, proporcionando una visión instantánea del estado actual de todas las camas del sistema."
        formula="Datos actualizados desde la base de datos en tiempo real: Ocupadas + Disponibles = Total de Camas"
        example="Si hay 45 camas ocupadas de 60 totales: Ocupación = 75%, Disponibles = 15 camas"
        importance="Esta información es crítica para la toma de decisiones operativas inmediatas, gestión de ingresos de emergencia, y planificación de recursos en tiempo real. Permite al personal médico y administrativo conocer instantáneamente la capacidad disponible."
      />
    </div>
  );
}
