'use client';

import { Fragment, Suspense, lazy, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useAmbulatorio } from '@/app/hooks/useAmbulatorio';
import { MetricCard } from '@/app/components/MetricCard';
import { AnalyticsLoader } from '@/app/components/AnalyticsLoader';
import {
  DIAS_SEMANA_CORTO,
  GRACIA_MIN_DEFAULT,
  OPCIONES_GRACIA_MIN,
} from '@/app/types/ambulatorio';
import type { CeldaHeatmap } from '@/app/types/ambulatorio';
import { AnimatedCounter } from './AnimatedCounter';
import { ChartWidget, ChartLegend } from './ChartWidget';
import { CompactBarChart } from './CompactBarChart';
import { AmbulatorioDimensionTable } from './AmbulatorioDimensionTable';
import styles from './AmbulatorioAnalytics.module.css';

const DonutChartLazy = lazy(() => import('@/app/components/Charts/DonutChart'));
const LineChartLazy = lazy(() => import('@/app/components/Charts/LineChart'));

const ChartSkeleton = () => (
  <div
    style={{
      width: '100%',
      height: '200px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666',
    }}
  >
    Cargando gráfico...
  </div>
);

const Icon = ({
  path,
  className,
  style,
}: {
  path: string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d={path}></path>
  </svg>
);

const ICONS = {
  arrowBack: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  calendar:
    'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  clock:
    'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z',
  userOff:
    'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  checkCircle:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
};

const PANTONE = ['#00B5E2', '#61D6EB', '#0083A9', '#41C8DC', '#B3ECF7'];

const RANGOS: Record<string, number> = { día: 1, semana: 7, mes: 30, año: 365 };

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** "12,4 min" / "—" cuando no hay muestras suficientes. */
function minutos(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1).replace('.', ',')} min`;
}

function pct(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/** Verde → rojo según la espera relativa al peor valor de la grilla. */
function colorEspera(valor: number | null, maximo: number): string {
  if (valor == null || maximo <= 0) return '#f5f5f5';
  const t = Math.min(1, Math.max(0, valor / maximo));
  const hue = 120 - t * 120;
  return `hsl(${hue}, 70%, ${88 - t * 26}%)`;
}

export default function AmbulatorioAnalytics() {
  const router = useRouter();
  const { loaded, puede, puedeSubmodulo } = usePermiso();
  const puedeVer =
    puede('TURNOS.TABLA.VER') ||
    puedeSubmodulo('TURNOS', 'TABLA') ||
    puede('TURNOS.AGENDA.VER');

  const hoy = new Date();
  const inicioPorDefecto = new Date();
  inicioPorDefecto.setDate(hoy.getDate() - 29);

  const [fechaInicio, setFechaInicio] = useState(toYYYYMMDD(inicioPorDefecto));
  const [fechaFin, setFechaFin] = useState(toYYYYMMDD(hoy));
  const [activeTab, setActiveTab] = useState('mes');
  const [graciaMin, setGraciaMin] = useState<number>(GRACIA_MIN_DEFAULT);

  const {
    resumen,
    serie,
    porOrigen,
    porEspecialidad,
    porSector,
    porProfesional,
    heatmap,
    loading,
    error,
    computedData,
    refetch,
    clearCache,
  } = useAmbulatorio({ fechaInicio, fechaFin, graciaMin });

  const handleTabClick = (tab: string) => {
    const dias = RANGOS[tab];
    if (!dias) return;
    setActiveTab(tab);
    const fin = new Date();
    const inicio = new Date(fin);
    inicio.setDate(fin.getDate() - (dias - 1));
    setFechaInicio(toYYYYMMDD(inicio));
    setFechaFin(toYYYYMMDD(fin));
  };

  const handleFechaChange = (valor: string, set: (v: string) => void) => {
    set(valor);
    setActiveTab('custom');
  };

  const datosEstado = useMemo(() => {
    if (!resumen) return [];
    return [
      { label: 'Atendidos', value: resumen.atendidos, color: '#2e7d32' },
      { label: 'Ausentes', value: resumen.ausentes, color: '#d32f2f' },
      { label: 'Cancelados', value: resumen.cancelados, color: '#f57c00' },
      { label: 'Pendientes', value: resumen.pendientes, color: '#00B5E2' },
      { label: 'En curso', value: resumen.enCurso, color: '#7e57c2' },
    ].filter((d) => d.value > 0);
  }, [resumen]);

  const datosOrigen = useMemo(() => {
    if (!porOrigen || porOrigen.total === 0) return [];
    return [
      { label: 'Turno reservado', value: porOrigen.agenda, color: PANTONE[0] },
      { label: 'A demanda', value: porOrigen.aDemanda, color: PANTONE[2] },
    ].filter((d) => d.value > 0);
  }, [porOrigen]);

  const serieVolumen = useMemo(
    () =>
      serie.map((p) => {
        const [, mes, dia] = p.fecha.split('-');
        // Preferir visitas reales; si no hay, sumar agenda + demanda no cancelada
        const total =
          p.ambulatoriasTotal > 0 ? p.ambulatoriasTotal : p.atendidos + (p.turnosDemanda || 0);
        return { label: `${dia}/${mes}`, value: total, date: p.fecha };
      }),
    [serie],
  );

  /**
   * Sin marcado de ingreso la espera queda vacía y la grilla se vería en blanco,
   * así que en ese caso se dibuja la permanencia, que sólo necesita la llegada y
   * el cierre de la atención.
   */
  const heatmapData = useMemo(() => {
    const horas = Array.from(new Set(heatmap.map((c) => c.hora))).sort((a, b) => a - b);
    const hayEspera = heatmap.some((c) => c.esperaProm != null);
    const metrica = hayEspera ? 'espera' : 'permanencia';
    const valorDe = (c: CeldaHeatmap | undefined) =>
      (hayEspera ? c?.esperaProm : c?.permanenciaProm) ?? null;

    const porClave = new Map<string, CeldaHeatmap>();
    let maximo = 0;
    for (const celda of heatmap) {
      porClave.set(`${celda.diaSemana}-${celda.hora}`, celda);
      const v = valorDe(celda);
      if (v != null && v > maximo) maximo = v;
    }
    return { horas, porClave, maximo, metrica, valorDe };
  }, [heatmap]);

  const cobertura = resumen?.calidadDatos.coberturaPct ?? 0;
  const tiemposConfiables = computedData?.tiemposConfiables ?? false;

  if (loaded && !puedeVer) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>No tiene permiso para ver la analítica ambulatoria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backButton}
              onClick={() => router.push('/dashboard')}
              aria-label="Volver al panel de control"
            >
              <Icon path={ICONS.arrowBack} className={styles.backIcon} />
            </button>
            <div className={styles.headerInfo}>
              <h1 className={styles.title}>Análisis de Actividad Ambulatoria</h1>
              <p className={styles.subtitle}>
                Cumplimiento de agenda, ausentismo y tiempos de espera de las consultas
                ambulatorias.
              </p>
            </div>
          </div>
          <div className={styles.controls}>
            <div className={styles.filterTabs}>
              {['Día', 'Semana', 'Mes', 'Año'].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tabButton} ${
                    activeTab === tab.toLowerCase() ? styles.activeTab : ''
                  }`}
                  onClick={() => handleTabClick(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className={styles.dateControls}>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaInicio">Desde:</label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => handleFechaChange(e.target.value, setFechaInicio)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.dateGroup}>
                <label htmlFor="fechaFin">Hasta:</label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => handleFechaChange(e.target.value, setFechaFin)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.dateGroup}>
                <label htmlFor="graciaMin">Tolerancia de ausencia:</label>
                <select
                  id="graciaMin"
                  value={graciaMin}
                  onChange={(e) => setGraciaMin(Number(e.target.value))}
                  className={styles.selectInput}
                >
                  {OPCIONES_GRACIA_MIN.map((min) => (
                    <option key={min} value={min}>
                      {min} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <AnalyticsLoader
          message="Cargando Análisis Ambulatorio"
          subMessage="Procesando turnos, tiempos de espera y visitas ambulatorias..."
        />
      )}

      {error && !loading && (
        <div className={styles.error}>
          <p>Error al cargar los datos: {error}</p>
          <div className={styles.errorActions}>
            <button onClick={refetch} className={styles.retryButton}>
              Reintentar
            </button>
            <button
              onClick={clearCache}
              className={`${styles.retryButton} ${styles.secondaryButton}`}
            >
              Limpiar Cache
            </button>
          </div>
        </div>
      )}

      {!loading && !error && resumen && (
        <>
          <div className={styles.estadoCard}>
            <div className={styles.estadoTop}>
              <div className={styles.estadoIntro}>
                <h2 className={styles.estadoTitle}>Consultas del período</h2>
                <p className={styles.estadoSubtitle}>
                  {fechaInicio} al {fechaFin} · atendidos = agenda cerrada + a demanda (mismo
                  criterio que Admin de turnos) · ausente tras {graciaMin} min sin cierre
                </p>
              </div>
              <div className={styles.estadoTotalizer}>
                <AnimatedCounter
                  value={resumen.atendidosTotal ?? resumen.atendidos + resumen.atendidosDemanda}
                  animationKey={`${fechaInicio}-${fechaFin}-${graciaMin}`}
                />
                <div className={styles.estadoTotalizerLabel}>Consultas atendidas</div>
              </div>
            </div>

            <div className={styles.estadoMetrics}>
              <div className={`${styles.estadoMetric} ${styles.estadoMetricPrimary}`}>
                <div className={styles.estadoMetricValuePrimary}>
                  {resumen.atendidos.toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>Atendidos agenda</div>
              </div>
              <div className={`${styles.estadoMetric} ${styles.estadoMetricPrimary}`}>
                <div className={styles.estadoMetricValuePrimary}>
                  {resumen.atendidosDemanda.toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>A demanda</div>
              </div>

              <div className={styles.estadoMetricsDivider} aria-hidden />

              <div className={styles.estadoMetric}>
                <div className={styles.estadoMetricValue}>
                  {resumen.programados.toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>Turnos de agenda</div>
              </div>
              <div className={styles.estadoMetric}>
                <div className={styles.estadoMetricValue}>
                  {resumen.ausentes.toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>Ausentes</div>
              </div>
              <div className={styles.estadoMetric}>
                <div className={styles.estadoMetricValue}>
                  {(resumen.enCurso || 0).toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>En curso</div>
              </div>
              <div className={styles.estadoMetric}>
                <div className={styles.estadoMetricValue}>
                  {resumen.cancelados.toLocaleString()}
                </div>
                <div className={styles.estadoMetricLabel}>Cancelados</div>
              </div>
              <div className={styles.estadoMetric}>
                <div className={styles.estadoMetricValue}>{pct(resumen.tasaAusentismo)}</div>
                <div className={styles.estadoMetricLabel}>Ausentismo</div>
              </div>
            </div>
          </div>

          <div
            className={`${styles.coverageBanner} ${
              cobertura >= 70
                ? styles.coverageOk
                : cobertura >= 30
                  ? styles.coverageWarn
                  : styles.coverageBad
            }`}
          >
            <Icon
              path={cobertura >= 70 ? ICONS.checkCircle : ICONS.warning}
              className={styles.coverageIcon}
            />
            <div>
              <p className={styles.coverageTitle}>
                Cobertura de marcado de ingreso: {pct(cobertura)} (
                {resumen.calidadDatos.conIngreso} de {resumen.calidadDatos.atendidos} turnos de
                agenda atendidos)
              </p>
              <p className={styles.coverageText}>
                {cobertura >= 70
                  ? 'Los tiempos de espera se calculan sobre una muestra representativa.'
                  : cobertura >= 30
                    ? 'Los tiempos surgen de una muestra parcial: interpretarlos como tendencia, no como valor exacto.'
                    : 'Casi ningún turno tiene marcado el ingreso al consultorio, así que la espera y la duración de consulta quedan sin datos. La permanencia sí es utilizable: se calcula entre la llegada y el cierre de la atención.'}
              </p>
            </div>
          </div>

          <div className={styles.widgetGrid}>
            <ChartWidget
              title="Origen de la Consulta"
              hint="Consultas atendidas según agenda o demanda (alineado al Admin de turnos)"
              span={7}
              isEmpty={datosOrigen.length === 0}
              emptyMessage="No hay visitas ambulatorias registradas en el período."
              tooltipData={{
                description:
                  'Misma base que el filtro Estado=Atendido del Administrador de turnos: visitas ambulatorias (imVisita) o turnos cerrados, separadas por origen (reservado vs a demanda/sobreturno).',
                formula:
                  'Atendidos agenda (TipoTurno=0) + Atendidos a demanda (TipoTurno=1) = total del donut',
                importance:
                  'El centro del gráfico debe coincidir con la cantidad de turnos “Atendido” del administrador para el mismo día.',
              }}
              legend={<ChartLegend items={datosOrigen} />}
            >
              <Suspense fallback={<ChartSkeleton />}>
                <DonutChartLazy data={datosOrigen} size={190} donutWidth={36} />
              </Suspense>
            </ChartWidget>

            <ChartWidget
              title="Desenlace de los Turnos"
              hint={`Sólo turnos de agenda (${resumen.programados.toLocaleString()} en el período)`}
              span={5}
              isEmpty={datosEstado.length === 0}
              emptyMessage="No hay turnos de agenda en el período seleccionado."
              tooltipData={{
                description:
                  'Cómo terminaron los turnos reservados con antelación. La atención a demanda queda fuera porque el paciente ya está presente al registrarse.',
                formula: 'Atendidos + Ausentes + Cancelados + Pendientes + En curso',
                importance:
                  'Permite ver si el problema operativo es inasistencia, cancelación o demoras en la atención.',
              }}
              legend={<ChartLegend items={datosEstado} />}
            >
              <CompactBarChart data={datosEstado} width={200} height={170} />
            </ChartWidget>

            <div className={styles.widgetMetric}>
              <MetricCard
                title="Espera Promedio"
                value={tiemposConfiables ? minutos(resumen.tiempos.espera.promedio) : 'Sin datos'}
                detail={
                  tiemposConfiables
                    ? `Mediana ${minutos(resumen.tiempos.espera.p50)} · P90 ${minutos(resumen.tiempos.espera.p90)}`
                    : 'Cobertura de marcado insuficiente'
                }
                icon={ICONS.clock}
                iconColor="#00B5E2"
                backgroundColor="#E8F5E9"
                tooltipData={{
                  description:
                    'Minutos entre el horario asignado del turno y el ingreso al consultorio. Sólo turnos reservados con antelación.',
                  formula: 'HoraIngreso - HoraAsignada',
                  importance:
                    'Refleja el cumplimiento operativo de la agenda.',
                }}
              />
            </div>
            <div className={styles.widgetMetric}>
              <MetricCard
                title="Permanencia Promedio"
                value={
                  resumen.tiempos.permanencia.muestras > 0
                    ? minutos(resumen.tiempos.permanencia.promedio)
                    : 'Sin datos'
                }
                detail={
                  resumen.tiempos.permanencia.muestras > 0
                    ? `Mediana ${minutos(resumen.tiempos.permanencia.p50)} · P90 ${minutos(resumen.tiempos.permanencia.p90)}`
                    : 'Requiere cierre de la atención'
                }
                icon={ICONS.clock}
                iconColor="#0083A9"
                backgroundColor="#E0F7FA"
                tooltipData={{
                  description:
                    'Tiempo total en la institución desde la llegada hasta el cierre de la atención.',
                  formula: 'HoraSalida - Horallegada',
                  importance:
                    'Métrica clave en guardia, donde no hay horario pactado contra el cual medir la espera.',
                }}
              />
            </div>
            <div className={styles.widgetMetric}>
              <MetricCard
                title="Llegada vs. Turno"
                value={
                  tiemposConfiables && resumen.tiempos.puntualidad.promedio != null
                    ? minutos(resumen.tiempos.puntualidad.promedio)
                    : 'Sin datos'
                }
                detail={
                  tiemposConfiables && resumen.tiempos.puntualidad.muestras > 0
                    ? `${resumen.tiempos.puntualidad.muestras} turnos con llegada marcada`
                    : 'Requiere marcado de llegada en recepción'
                }
                icon={ICONS.info}
                iconColor="#7e57c2"
                backgroundColor="#EDE7F6"
                tooltipData={{
                  description:
                    'Diferencia entre la llegada marcada y el horario del turno. Valores negativos = llegó antes.',
                  formula: 'Horallegada - HoraAsignada',
                  importance: 'Complementa la espera promedio.',
                }}
              />
            </div>
            <div className={styles.widgetMetric}>
              <MetricCard
                title="Tasa de Ausentismo"
                value={resumen.programados > 0 ? pct(resumen.tasaAusentismo) : 'No aplica'}
                detail={
                  resumen.programados > 0
                    ? `${resumen.ausentes} ausentes de ${resumen.programados - resumen.cancelados} esperados`
                    : 'Sin turnos de agenda en el período'
                }
                icon={ICONS.userOff}
                iconColor="#D81B60"
                backgroundColor="#FCE4EC"
                tooltipData={{
                  description:
                    'Porcentaje de turnos reservados en los que el paciente nunca se atendió.',
                  formula: 'Ausentes / (Turnos de agenda - Cancelados)',
                  importance:
                    'La demanda espontánea queda fuera del cálculo.',
                }}
              />
            </div>
            <div className={`${styles.widgetMetric} ${styles.widgetMetricWide}`}>
              <MetricCard
                title="Duración de Consulta"
                value={tiemposConfiables ? minutos(resumen.tiempos.consulta.promedio) : 'Sin datos'}
                detail={`${resumen.tiempos.consulta.muestras} consultas con cierre registrado`}
                icon={ICONS.checkCircle}
                iconColor="#388e3c"
                backgroundColor="#E8F5E9"
                tooltipData={{
                  description: 'Minutos entre el ingreso al consultorio y el cierre de la atención.',
                  formula: 'HoraSalida - HoraIngreso',
                  importance:
                    'Indica si la grilla de agenda está bien dimensionada.',
                }}
              />
            </div>
          </div>

          <div className={styles.chartPanel}>
            <h3 className={styles.chartPanelTitle}>Volumen Diario de Atención</h3>
            <p className={styles.chartPanelHint}>
              Actividad ambulatoria total por día, sumando los turnos de agenda y la atención a
              demanda
            </p>
            <Suspense fallback={<ChartSkeleton />}>
              <LineChartLazy data={serieVolumen} title="" color="#00B5E2" height={260} />
            </Suspense>
          </div>

          <div className={styles.chartPanel}>
            <h3 className={styles.chartPanelTitle}>
              {heatmapData.metrica === 'espera'
                ? 'Espera por Franja Horaria'
                : 'Permanencia por Franja Horaria'}
            </h3>
            <p className={styles.chartPanelHint}>
              {heatmapData.metrica === 'espera'
                ? 'Minutos de espera promedio (desde el horario del turno) según día de la semana y hora asignada'
                : 'Minutos promedio entre la llegada y el cierre de la atención, según día de la semana y hora. Se muestra la permanencia porque no hay marcado de ingreso al consultorio.'}
            </p>
            {heatmapData.horas.length === 0 ? (
              <p className={styles.emptyState}>Sin turnos para construir el mapa horario.</p>
            ) : (
              <div className={styles.heatmapPlot}>
                <div className={styles.heatmapScroll}>
                  <div
                    className={styles.heatmapGrid}
                    style={{
                      gridTemplateColumns: `44px repeat(${heatmapData.horas.length}, minmax(30px, 1fr))`,
                    }}
                  >
                    <div />
                    {heatmapData.horas.map((h) => (
                      <div key={`hora-${h}`} className={styles.heatmapAxisX}>
                        {String(h).padStart(2, '0')}
                      </div>
                    ))}
                    {DIAS_SEMANA_CORTO.map((dia, idx) => (
                      <Fragment key={dia}>
                        <div className={styles.heatmapAxisY}>{dia}</div>
                        {heatmapData.horas.map((h) => {
                          const celda = heatmapData.porClave.get(`${idx}-${h}`);
                          const espera = heatmapData.valorDe(celda);
                          return (
                            <div
                              key={`${dia}-${h}`}
                              className={`${styles.heatmapCell} ${
                                celda ? '' : styles.heatmapEmpty
                              }`}
                              style={
                                celda
                                  ? { backgroundColor: colorEspera(espera, heatmapData.maximo) }
                                  : undefined
                              }
                              title={
                                celda
                                  ? `${dia} ${String(h).padStart(2, '0')}h · ${celda.programados} turnos · ${heatmapData.metrica} ${minutos(espera)}`
                                  : `${dia} ${String(h).padStart(2, '0')}h · sin turnos`
                              }
                            >
                              {espera != null ? Math.round(espera) : ''}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div className={styles.heatmapLegend}>
                  <span>Menor {heatmapData.metrica}</span>
                  <div className={styles.heatmapScale}>
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                      <div
                        key={t}
                        className={styles.heatmapScaleStep}
                        style={{
                          backgroundColor: colorEspera(t * heatmapData.maximo, heatmapData.maximo),
                        }}
                      />
                    ))}
                  </div>
                  <span>
                    Mayor {heatmapData.metrica} ({minutos(heatmapData.maximo)})
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Especialidad</h3>
            <p className={styles.sectionHint}>
              Agenda cuenta los turnos reservados con antelación; A demanda, las atenciones sin
              cita previa. El ausentismo sólo aplica sobre la agenda.
            </p>
            <AmbulatorioDimensionTable filas={porEspecialidad} etiquetaCodigo="Especialidad" />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Sector</h3>
            <p className={styles.sectionHint}>
              Los sectores que atienden sin cita previa (emergencia, rayos, consultorio de
              atención inmediata) aparecen con la agenda en cero y todo su volumen en A demanda.
              La permanencia es la métrica de tiempo útil para ellos.
            </p>
            <AmbulatorioDimensionTable filas={porSector} etiquetaCodigo="Sector" />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Profesional</h3>
            <p className={styles.sectionHint}>
              La agenda se atribuye al profesional del turno y la demanda al que admitió la
              visita, así que un mismo equipo puede aparecer en dos filas.
            </p>
            <AmbulatorioDimensionTable
              filas={porProfesional}
              etiquetaCodigo="Profesional"
              columnaExtra={{
                titulo: 'Consulta prom.',
                valor: (f) => minutos(f.consultaProm),
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
