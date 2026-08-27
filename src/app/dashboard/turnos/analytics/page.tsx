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
import type { CeldaHeatmap, DimensionAmbulatorio } from '@/app/types/ambulatorio';
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

function claseAusentismo(valor: number): string {
  if (valor >= 20) return styles.badgeAlto;
  if (valor >= 10) return styles.badgeMedio;
  return styles.badgeBajo;
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
      { label: 'Con turno (agenda)', value: porOrigen.agenda, color: PANTONE[0] },
      { label: 'Espontáneas (sin turno)', value: porOrigen.espontaneo, color: PANTONE[2] },
    ].filter((d) => d.value > 0);
  }, [porOrigen]);

  const serieVolumen = useMemo(
    () =>
      serie.map((p) => {
        const [, mes, dia] = p.fecha.split('-');
        return { label: `${dia}/${mes}`, value: p.programados, date: p.fecha };
      }),
    [serie],
  );

  const serieEspera = useMemo(
    () =>
      serie
        .filter((p) => p.esperaProm != null)
        .map((p) => {
          const [, mes, dia] = p.fecha.split('-');
          return { label: `${dia}/${mes}`, value: p.esperaProm as number, date: p.fecha };
        }),
    [serie],
  );

  const heatmapData = useMemo(() => {
    const horas = Array.from(new Set(heatmap.map((c) => c.hora))).sort((a, b) => a - b);
    const porClave = new Map<string, CeldaHeatmap>();
    let maximo = 0;
    for (const celda of heatmap) {
      porClave.set(`${celda.diaSemana}-${celda.hora}`, celda);
      if (celda.esperaProm != null && celda.esperaProm > maximo) maximo = celda.esperaProm;
    }
    return { horas, porClave, maximo };
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

  const renderTabla = (
    filas: DimensionAmbulatorio[],
    etiquetaCodigo: string,
    columnaExtra?: { titulo: string; valor: (f: DimensionAmbulatorio) => string },
  ) => {
    if (filas.length === 0) {
      return <p className={styles.emptyState}>Sin datos en el período seleccionado.</p>;
    }
    return (
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{etiquetaCodigo}</th>
              <th className={styles.numeric}>Programados</th>
              <th className={styles.numeric}>Atendidos</th>
              <th className={styles.numeric}>Ausentes</th>
              <th className={styles.numeric}>Ausentismo</th>
              <th className={styles.numeric}>Espera prom.</th>
              {columnaExtra && <th className={styles.numeric}>{columnaExtra.titulo}</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={`${f.codigo}-${f.descripcion ?? ''}`}>
                <td>
                  {f.descripcion || <span className={styles.muted}>Sin identificar</span>}
                  {f.codigo && f.descripcion ? (
                    <span className={styles.muted}> · {f.codigo}</span>
                  ) : null}
                </td>
                <td className={styles.numeric}>{f.programados}</td>
                <td className={styles.numeric}>{f.atendidos}</td>
                <td className={styles.numeric}>{f.ausentes}</td>
                <td className={`${styles.numeric} ${claseAusentismo(f.tasaAusentismo)}`}>
                  {pct(f.tasaAusentismo)}
                </td>
                <td className={styles.numeric}>{minutos(f.esperaProm)}</td>
                {columnaExtra && <td className={styles.numeric}>{columnaExtra.valor(f)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
            <div className={styles.estadoContainer}>
              <div>
                <h2 className={styles.estadoTitle}>Cumplimiento de Agenda</h2>
                <p className={styles.estadoSubtitle}>
                  {fechaInicio} al {fechaFin} · un turno cuenta como ausente {graciaMin} min
                  después de su horario
                </p>
              </div>
              <div className={styles.estadoMetrics}>
                <div className={styles.estadoMetric}>
                  <div className={styles.estadoMetricValueLarge}>
                    {resumen.programados.toLocaleString()}
                  </div>
                  <div className={styles.estadoMetricLabel}>Programados</div>
                </div>
                <div className={styles.estadoMetric}>
                  <div className={styles.estadoMetricValue}>
                    {resumen.atendidos.toLocaleString()}
                  </div>
                  <div className={styles.estadoMetricLabel}>Atendidos</div>
                </div>
                <div className={styles.estadoMetric}>
                  <div className={styles.estadoMetricValue}>
                    {resumen.ausentes.toLocaleString()}
                  </div>
                  <div className={styles.estadoMetricLabel}>Ausentes</div>
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
                Cobertura de marcado: {pct(cobertura)} ({resumen.calidadDatos.conAmbos} de{' '}
                {resumen.calidadDatos.atendidos} turnos atendidos)
              </p>
              <p className={styles.coverageText}>
                {cobertura >= 70
                  ? 'Los tiempos de espera se calculan sobre una muestra representativa.'
                  : cobertura >= 30
                    ? 'Los tiempos surgen de una muestra parcial: interpretarlos como tendencia, no como valor exacto.'
                    : 'Hay muy pocos turnos con llegada e ingreso marcados. Los tiempos de esta pantalla no son representativos hasta que el marcado en la agenda sea sistemático.'}
              </p>
            </div>
          </div>

          <div className={styles.summaryCards}>
            <MetricCard
              title="Consultas Ambulatorias"
              value={(porOrigen?.total ?? 0).toLocaleString()}
              detail={`${porOrigen?.agenda ?? 0} con turno · ${porOrigen?.espontaneo ?? 0} espontáneas`}
              icon={ICONS.calendar}
              iconColor="#0083A9"
              backgroundColor="#E0F7FA"
              tooltipData={{
                description:
                  'Visitas ambulatorias reales del período (imVisita con clase de paciente A), separadas según hayan nacido de un turno de agenda o de demanda espontánea.',
                formula: 'Visitas con turno asociado + visitas sin turno asociado',
                example:
                  'Si hubo 400 visitas y 320 tenían turno, 80 fueron espontáneas (20% de demanda no programada).',
                importance:
                  'Distinguir el origen muestra cuánta de la actividad real está bajo control de la agenda y cuánta llega sin programar.',
              }}
            />
            <MetricCard
              title="Espera en Sala"
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
                  'Minutos entre la llegada del paciente a recepción y su ingreso al consultorio. Es el tiempo que el paciente percibe como espera.',
                formula: 'HoraIngreso - Horallegada, promediado sobre los turnos con ambas marcas',
                example:
                  'Llega 09:55 e ingresa 10:20 → 25 minutos de espera. El P90 dice que el 10% peor esperó más que ese valor.',
                importance:
                  'Es el indicador de calidad percibida más directo. La mediana y el P90 importan más que el promedio, porque las esperas largas se concentran en pocos casos.',
              }}
            />
            <MetricCard
              title="Tasa de Ausentismo"
              value={pct(resumen.tasaAusentismo)}
              detail={`${resumen.ausentes} ausentes de ${resumen.programados - resumen.cancelados} esperados`}
              icon={ICONS.userOff}
              iconColor="#D81B60"
              backgroundColor="#FCE4EC"
              tooltipData={{
                description:
                  'Porcentaje de turnos en los que el paciente nunca se presentó. La agenda no tiene un estado "ausente": se infiere cuando pasó la tolerancia configurada sin que se marcara la llegada.',
                formula: 'Ausentes / (Programados - Cancelados)',
                example:
                  'Con 200 turnos, 20 cancelados y 27 ausentes: 27 / 180 = 15% de ausentismo.',
                importance:
                  'Los cancelados se excluyen del denominador porque avisaron y el slot pudo reasignarse. El ausentismo puro es el que se pierde.',
              }}
            />
            <MetricCard
              title="Duración de Consulta"
              value={tiemposConfiables ? minutos(resumen.tiempos.consulta.promedio) : 'Sin datos'}
              detail={`${resumen.tiempos.consulta.muestras} consultas con cierre registrado`}
              icon={ICONS.checkCircle}
              iconColor="#388e3c"
              backgroundColor="#E8F5E9"
              tooltipData={{
                description:
                  'Minutos entre el ingreso al consultorio y el cierre de la atención.',
                formula: 'HoraSalida - HoraIngreso',
                example: 'Ingresa 10:20 y cierra 10:38 → 18 minutos de consulta.',
                importance:
                  'Contrastada con el intervalo configurado en la agenda, indica si la grilla está bien dimensionada o si genera retrasos en cadena.',
              }}
            />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Origen de la Consulta</h3>
            <p className={styles.sectionHint}>
              Visitas ambulatorias según provengan de la agenda o de demanda espontánea
            </p>
            {datosOrigen.length === 0 ? (
              <p className={styles.emptyState}>
                No hay visitas ambulatorias registradas en el período.
              </p>
            ) : (
              <div className={styles.donutContent}>
                <div className={styles.donutLegend}>
                  {datosOrigen.map((item) => (
                    <div key={item.label} className={styles.legendItem}>
                      <div className={styles.legendInfo}>
                        <div
                          className={styles.legendColor}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={styles.legendLabel}>{item.label}</span>
                      </div>
                      <span className={styles.legendValue}>{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className={styles.legendItem}>
                    <div className={styles.legendInfo}>
                      <span className={styles.legendLabel}>Demanda no programada</span>
                    </div>
                    <span className={styles.legendValue}>{pct(porOrigen?.espontaneoPct)}</span>
                  </div>
                </div>
                <div className={styles.donutContainer}>
                  <Suspense fallback={<ChartSkeleton />}>
                    <DonutChartLazy data={datosOrigen} size={220} donutWidth={40} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Desenlace de los Turnos</h3>
            <p className={styles.sectionHint}>
              Cómo terminaron los {resumen.programados.toLocaleString()} turnos del período
            </p>
            {datosEstado.length === 0 ? (
              <p className={styles.emptyState}>No hay turnos en el período seleccionado.</p>
            ) : (
              <div className={styles.donutContent}>
                <div className={styles.donutLegend}>
                  {datosEstado.map((item) => (
                    <div key={item.label} className={styles.legendItem}>
                      <div className={styles.legendInfo}>
                        <div
                          className={styles.legendColor}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={styles.legendLabel}>{item.label}</span>
                      </div>
                      <span className={styles.legendValue}>{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className={styles.legendItem}>
                    <div className={styles.legendInfo}>
                      <span className={styles.legendLabel}>Sobreturnos</span>
                    </div>
                    <span className={styles.legendValue}>{resumen.sobreturnos}</span>
                  </div>
                </div>
                <div className={styles.donutContainer}>
                  <Suspense fallback={<ChartSkeleton />}>
                    <DonutChartLazy data={datosEstado} size={220} donutWidth={40} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Volumen Diario de Turnos</h3>
            <Suspense fallback={<ChartSkeleton />}>
              <LineChartLazy data={serieVolumen} title="Turnos programados por día" color="#00B5E2" />
            </Suspense>
          </div>

          {tiemposConfiables && serieEspera.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Evolución de la Espera en Sala</h3>
              <Suspense fallback={<ChartSkeleton />}>
                <LineChartLazy
                  data={serieEspera}
                  title="Minutos de espera promedio por día"
                  color="#D81B60"
                />
              </Suspense>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Espera por Franja Horaria</h3>
            <p className={styles.sectionHint}>
              Minutos de espera promedio según día de la semana y hora del turno
            </p>
            {heatmapData.horas.length === 0 ? (
              <p className={styles.emptyState}>Sin turnos para construir el mapa horario.</p>
            ) : (
              <>
                <div className={styles.heatmapScroll}>
                  <div
                    className={styles.heatmapGrid}
                    style={{
                      gridTemplateColumns: `56px repeat(${heatmapData.horas.length}, minmax(38px, 1fr))`,
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
                          const espera = celda?.esperaProm ?? null;
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
                                  ? `${dia} ${String(h).padStart(2, '0')}h · ${celda.programados} turnos · espera ${minutos(espera)}`
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
                  <span>Menor espera</span>
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
                  <span>Mayor espera ({minutos(heatmapData.maximo)})</span>
                </div>
              </>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Especialidad</h3>
            {renderTabla(porEspecialidad, 'Especialidad')}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Sector</h3>
            {renderTabla(porSector, 'Sector')}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Por Profesional</h3>
            {renderTabla(porProfesional, 'Profesional', {
              titulo: 'Consulta prom.',
              valor: (f) => minutos(f.consultaProm),
            })}
          </div>
        </>
      )}
    </div>
  );
}
