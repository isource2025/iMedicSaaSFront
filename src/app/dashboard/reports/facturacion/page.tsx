'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useOpcionesProduccion, useProduccionHospital } from '@/app/hooks/useProduccionHospital';
import { AnalyticsLoader } from '@/app/components/AnalyticsLoader';
import { ExportExcelButton } from '@/app/components/ExportExcelButton';
import { armarLibroProduccion } from '@/app/utils/export/produccionHospitalExcel';
import type {
  AnaliticaProduccion,
  FiltrosProduccion,
  ItemDimension,
  LiquidacionFiltro,
  MedidaProduccion,
} from '@/app/types/produccionHospital';
import { FILTROS_VACIOS } from '@/app/types/produccionHospital';
import { MultiSelect, type OpcionMulti } from './MultiSelect';
import { DonutRanking, RankingBarras, SerieChart, ValorizacionChart } from './ProduccionCharts';
import {
  MEDIDAS,
  RANGOS_RAPIDOS,
  analizarValorizacion,
  entero,
  etiquetaSerie,
  moneda,
  notasCalidad,
  porcentaje,
  rankear,
  valorDe,
} from './produccionFormat';
import styles from './ProduccionHospital.module.css';

type ListaFiltro =
  | 'coberturas'
  | 'profesionales'
  | 'especialidades'
  | 'servicios'
  | 'sectores'
  | 'clases'
  | 'funciones';

type ClaveDimension = 'cobertura' | 'profesional' | 'especialidad' | 'servicio' | 'sector' | 'clase' | 'funcion';

/** Cómo se conecta cada dimensión con su respuesta del backend y con el filtro que la restringe. */
const DIMENSIONES: {
  id: ClaveDimension;
  titulo: string;
  columna: string;
  datos: keyof AnaliticaProduccion;
  filtro: ListaFiltro;
}[] = [
  { id: 'cobertura', titulo: 'Cobertura', columna: 'Cobertura', datos: 'porCobertura', filtro: 'coberturas' },
  { id: 'sector', titulo: 'Sector', columna: 'Sector', datos: 'porSector', filtro: 'sectores' },
  { id: 'servicio', titulo: 'Servicio', columna: 'Servicio', datos: 'porServicio', filtro: 'servicios' },
  { id: 'especialidad', titulo: 'Especialidad', columna: 'Especialidad', datos: 'porEspecialidad', filtro: 'especialidades' },
  { id: 'profesional', titulo: 'Profesional', columna: 'Profesional', datos: 'porProfesional', filtro: 'profesionales' },
  { id: 'clase', titulo: 'Clase de paciente', columna: 'Clase', datos: 'porClase', filtro: 'clases' },
  { id: 'funcion', titulo: 'Función', columna: 'Función', datos: 'porFuncion', filtro: 'funciones' },
];

type OrdenTabla = MedidaProduccion | 'prestaciones' | 'pacientes';

const FILAS_TABLA_INICIAL = 25;

const ICONO_VOLVER = 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z';

function Variacion({ valor }: { valor: number | null | undefined }) {
  if (valor == null) return <span className={`${styles.delta} ${styles.deltaFlat}`}>Sin base de comparación</span>;
  if (valor === 0) return <span className={`${styles.delta} ${styles.deltaFlat}`}>Sin cambios vs período anterior</span>;
  const sube = valor > 0;
  return (
    <span className={`${styles.delta} ${sube ? styles.deltaUp : styles.deltaDown}`}>
      {sube ? '▲' : '▼'} {Math.abs(valor).toFixed(1).replace('.', ',')}% vs período anterior
    </span>
  );
}

function Kpi({
  etiqueta,
  valor,
  detalle,
  variacion,
  ayuda,
  chip,
  barra,
  explica,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  variacion?: number | null;
  ayuda?: string;
  /** Marca corta de dato parcial, a la derecha de la etiqueta. */
  chip?: string;
  /** Barra de avance (0–100) y si debe resaltarse como alerta. */
  barra?: { pct: number; aviso: boolean };
  /** Frase breve que dice cómo leer el número. */
  explica?: string;
}) {
  return (
    <div className={styles.kpiCard} title={ayuda}>
      <div className={styles.kpiHead}>
        <span className={styles.kpiLabel}>{etiqueta}</span>
        {chip && <span className={`${styles.chip} ${styles.chipAviso}`}>{chip}</span>}
      </div>
      <strong className={styles.kpiValue}>{valor}</strong>
      {detalle && <span className={styles.kpiSub}>{detalle}</span>}
      {barra && (
        <div
          className={`${styles.kpiBarra} ${barra.aviso ? styles.kpiBarraAviso : ''}`}
          role="img"
          aria-label={`${barra.pct.toFixed(1)}%`}
        >
          <span style={{ width: `${Math.max(0, Math.min(100, barra.pct))}%` }} />
        </div>
      )}
      {explica && <span className={styles.kpiExplica}>{explica}</span>}
      {variacion !== undefined && <Variacion valor={variacion} />}
    </div>
  );
}

export default function ProduccionHospitalPage() {
  const router = useRouter();
  const { loaded, puede } = usePermiso();
  const puedeVer = puede('REPORTES.FACTURACION.VER');

  // Por defecto 12 meses: la valorización se carga con demora, así que un mes solo se ve vacío.
  const inicial = RANGOS_RAPIDOS.find((r) => r.id === '12-meses')!.rango();
  const [rangoActivo, setRangoActivo] = useState<string>('12-meses');
  const [fechaInicio, setFechaInicio] = useState(inicial.desde);
  const [fechaFin, setFechaFin] = useState(inicial.hasta);

  // Por defecto sólo lo valorizado; destildar pide todo y recarga la vista con un loader propio.
  const [soloValorizadas, setSoloValorizadas] = useState(true);
  const [liquidacion, setLiquidacion] = useState<LiquidacionFiltro>('todas');
  const [listas, setListas] = useState<Record<ListaFiltro, string[]>>({
    coberturas: [],
    profesionales: [],
    especialidades: [],
    servicios: [],
    sectores: [],
    clases: [],
    funciones: [],
  });
  const [medida, setMedida] = useState<MedidaProduccion>('facturado');
  const [dimTabla, setDimTabla] = useState<ClaveDimension>('cobertura');
  const [ordenTabla, setOrdenTabla] = useState<OrdenTabla | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const filtros: FiltrosProduccion = useMemo(
    () => ({
      fechaInicio,
      fechaFin,
      soloValorizadas,
      liquidacion,
      ...FILTROS_VACIOS,
      ...listas,
    }),
    [fechaInicio, fechaFin, soloValorizadas, liquidacion, listas],
  );

  const habilitado = loaded && puedeVer;
  const { data, cargandoInicial, actualizando, pendiente, error, refetch, limpiarCache } = useProduccionHospital(
    filtros,
    { habilitado },
  );
  const { opciones, cargando: cargandoOpciones } = useOpcionesProduccion(fechaInicio, fechaFin, { habilitado });

  const cantidadFiltros = Object.values(listas).reduce((acc, l) => acc + l.length, 0) + (liquidacion !== 'todas' ? 1 : 0);

  const liquidadoDisponible = data?.liquidadoDisponible ?? true;
  const medidaEfectiva: MedidaProduccion = !liquidadoDisponible && medida === 'liquidado' ? 'facturado' : medida;

  // ── Acciones ──────────────────────────────────────────────────────────────

  const aplicarRango = (id: string) => {
    const r = RANGOS_RAPIDOS.find((x) => x.id === id);
    if (!r) return;
    const { desde, hasta } = r.rango();
    setRangoActivo(id);
    setFechaInicio(desde);
    setFechaFin(hasta);
  };

  const cambiarFecha = (valor: string, set: (v: string) => void) => {
    set(valor);
    setRangoActivo('custom');
  };

  const setLista = (clave: ListaFiltro, ids: string[]) => setListas((prev) => ({ ...prev, [clave]: ids }));

  /** Clic en una barra, porción o fila: restringe la vista a ese valor. */
  const agregarFiltro = (filtro: ListaFiltro, item: { id: string | null; esOtros?: boolean }) => {
    if (item.id == null || item.esOtros) return;
    const id = item.id;
    setListas((prev) => (prev[filtro].includes(id) ? prev : { ...prev, [filtro]: [...prev[filtro], id] }));
  };

  const limpiarFiltros = () => {
    setListas({
      coberturas: [],
      profesionales: [],
      especialidades: [],
      servicios: [],
      sectores: [],
      clases: [],
      funciones: [],
    });
    setLiquidacion('todas');
  };

  // ── Exportación ───────────────────────────────────────────────────────────

  /**
   * Exporta lo que está en pantalla. Los filtros salen de `data.filtros` (lo que el backend
   * aplicó de verdad) y no del estado de los controles, que puede ir un paso adelante.
   */
  const construirExcel = () => {
    if (!data) return null;
    const f = data.filtros;
    const nombres = (clave: ListaFiltro): string | null => {
      const ids = (f[clave] ?? []).map(String);
      if (!ids.length) return null;
      const porId = new Map(opcionesMulti[clave].map((o) => [o.id, o.label]));
      return ids.map((id) => porId.get(id) ?? id).join(', ');
    };
    const filtrosLegibles = (
      [
        ['Cobertura', 'coberturas'],
        ['Sector', 'sectores'],
        ['Servicio', 'servicios'],
        ['Especialidad', 'especialidades'],
        ['Profesional', 'profesionales'],
        ['Clase de paciente', 'clases'],
        ['Función', 'funciones'],
      ] as [string, ListaFiltro][]
    ).flatMap(([etiqueta, clave]): [string, string][] => {
      const v = nombres(clave);
      return v ? [[etiqueta, v]] : [];
    });
    if (f.liquidacion && f.liquidacion !== 'todas') {
      filtrosLegibles.push(['Liquidación', f.liquidacion === 'liquidadas' ? 'Liquidadas' : 'Pendientes de liquidar']);
    }
    return armarLibroProduccion(data, filtrosLegibles, f.soloValorizadas);
  };

  // ── Opciones de los selectores ────────────────────────────────────────────

  const opcionesMulti = useMemo(() => {
    const con = (lista: { id: string; label: string; practicas?: number }[] | undefined): OpcionMulti[] =>
      (lista ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        detalle: o.practicas != null ? entero(o.practicas) : undefined,
      }));
    return {
      coberturas: con(opciones?.coberturas),
      profesionales: con(opciones?.profesionales),
      especialidades: con(opciones?.especialidades),
      servicios: con(opciones?.servicios),
      sectores: (opciones?.sectores ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        detalle: s.ambInt === 'I' ? 'Internación' : s.ambInt === 'A' ? 'Ambulatorio' : undefined,
      })),
      clases: con(opciones?.clases),
      funciones: con(opciones?.funciones),
    };
  }, [opciones]);

  // ── Rankings para los gráficos ────────────────────────────────────────────

  const rankings = useMemo(() => {
    if (!data) return null;
    const m = medidaEfectiva;
    return {
      cobertura: rankear(data.porCobertura, m, 8),
      clase: rankear(data.porClase, m, 6),
      funcion: rankear(data.porFuncion, m, 6),
      sector: rankear(data.porSector, m, 10, false),
      servicio: rankear(data.porServicio, m, 10, false),
      especialidad: rankear(data.porEspecialidad, m, 10, false),
      profesional: rankear(data.porProfesional, m, 10, false),
      practicas: rankear(data.topPracticas, m, 10, false),
    };
  }, [data, medidaEfectiva]);

  // ── Tabla de detalle ──────────────────────────────────────────────────────

  const dimActiva = DIMENSIONES.find((d) => d.id === dimTabla)!;

  const filasTabla = useMemo(() => {
    if (!data) return [];
    const filas = [...(data[dimActiva.datos] as ItemDimension[])];
    const clave: OrdenTabla = ordenTabla ?? medidaEfectiva;
    filas.sort((a, b) => Number(b[clave]) - Number(a[clave]));
    return filas;
  }, [data, dimActiva, ordenTabla, medidaEfectiva]);

  const totalMedida = data ? valorDe(data.resumen, medidaEfectiva) : 0;

  // Qué períodos todavía están en demora de valorización (se calcula sobre la propia serie).
  const analisis = useMemo(() => (data ? analizarValorizacion(data.serie) : null), [data]);
  // Las barras de importe y las de "solo valorizadas" quedan cortas si falta valorizar;
  // la cantidad con todos los estados no depende de la valorización.
  const marcarIncompletos = soloValorizadas || medidaEfectiva !== 'practicas';
  const etiquetaPeriodo = (clave: string) => etiquetaSerie(clave, data?.granularidad ?? 'mes');

  // ── Render ────────────────────────────────────────────────────────────────

  if (loaded && !puedeVer) {
    return (
      <div className={styles.container}>
        <div className={styles.noPermiso}>
          <p>No tiene permiso para ver la producción del hospital.</p>
        </div>
      </div>
    );
  }

  const resumen = data?.resumen;

  return (
    <div className={styles.container}>
      {/* Encabezado y período */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backButton}
              onClick={() => router.push('/dashboard')}
              aria-label="Volver al panel de control"
            >
              <svg className={styles.backIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d={ICONO_VOLVER} />
              </svg>
            </button>
            <div>
              <h1 className={styles.title}>Producción del Hospital</h1>
              <p className={styles.subtitle}>
                Prácticas realizadas, facturado y liquidado por cobertura, sector, servicio y profesional.
              </p>
            </div>
          </div>

          <div className={styles.controls}>
            <ExportExcelButton
              construir={construirExcel}
              disabled={!data || cargandoInicial || actualizando || pendiente}
            />
            <div className={styles.rangeTabs}>
              {RANGOS_RAPIDOS.map((r) => (
                <button
                  key={r.id}
                  className={`${styles.tabButton} ${rangoActivo === r.id ? styles.activeTab : ''}`}
                  onClick={() => aplicarRango(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className={styles.dateControls}>
              <div className={styles.dateGroup}>
                <label htmlFor="prodDesde">Desde:</label>
                <input
                  id="prodDesde"
                  type="date"
                  className={styles.dateInput}
                  value={fechaInicio}
                  max={fechaFin}
                  onChange={(e) => cambiarFecha(e.target.value, setFechaInicio)}
                />
              </div>
              <div className={styles.dateGroup}>
                <label htmlFor="prodHasta">Hasta:</label>
                <input
                  id="prodHasta"
                  type="date"
                  className={styles.dateInput}
                  value={fechaFin}
                  min={fechaInicio}
                  onChange={(e) => cambiarFecha(e.target.value, setFechaFin)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersTop}>
          <label className={styles.toggleBox}>
            <input
              type="checkbox"
              checked={soloValorizadas}
              onChange={(e) => setSoloValorizadas(e.target.checked)}
            />
            <span className={styles.toggleText}>
              <strong>Solo valorizadas</strong>
              <small>
                {soloValorizadas
                  ? 'Destildá para incluir también lo pendiente de valorizar y las coberturas no facturables.'
                  : 'Mostrando toda la actividad del período, valorizada o no.'}
              </small>
            </span>
          </label>

          <div className={styles.selectGroup}>
            <span className={styles.filterLabel}>Liquidación</span>
            <select
              className={styles.selectInput}
              value={liquidacion}
              onChange={(e) => setLiquidacion(e.target.value as LiquidacionFiltro)}
              disabled={!liquidadoDisponible}
              title={
                liquidadoDisponible
                  ? 'Liquidadas y pendientes se aplican sólo a lo valorizado'
                  : 'Esta base todavía no registra importes liquidados'
              }
            >
              <option value="todas">Todas</option>
              <option value="liquidadas">Liquidadas</option>
              <option value="pendientes">Pendientes de liquidar</option>
            </select>
          </div>

          <div className={styles.selectGroup}>
            <span className={styles.filterLabel}>Ver gráficos por</span>
            <div className={styles.measureSwitch} role="group" aria-label="Medida de los gráficos">
              {MEDIDAS.filter((m) => liquidadoDisponible || m.id !== 'liquidado').map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.measureButton} ${medidaEfectiva === m.id ? styles.measureActive : ''}`}
                  onClick={() => setMedida(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.filtersGrid}>
          <MultiSelect
            label="Cobertura"
            opciones={opcionesMulti.coberturas}
            seleccion={listas.coberturas}
            onChange={(ids) => setLista('coberturas', ids)}
            cargando={cargandoOpciones}
            buscar="Buscar obra social…"
          />
          <MultiSelect
            label="Sector"
            opciones={opcionesMulti.sectores}
            seleccion={listas.sectores}
            onChange={(ids) => setLista('sectores', ids)}
            cargando={cargandoOpciones}
            buscar="Buscar sector…"
          />
          <MultiSelect
            label="Servicio"
            opciones={opcionesMulti.servicios}
            seleccion={listas.servicios}
            onChange={(ids) => setLista('servicios', ids)}
            cargando={cargandoOpciones}
            buscar="Buscar servicio…"
          />
          <MultiSelect
            label="Especialidad"
            opciones={opcionesMulti.especialidades}
            seleccion={listas.especialidades}
            onChange={(ids) => setLista('especialidades', ids)}
            cargando={cargandoOpciones}
            buscar="Buscar especialidad…"
          />
          <MultiSelect
            label="Profesional"
            opciones={opcionesMulti.profesionales}
            seleccion={listas.profesionales}
            onChange={(ids) => setLista('profesionales', ids)}
            cargando={cargandoOpciones}
            buscar="Buscar profesional…"
          />
          <MultiSelect
            label="Clase de paciente"
            opciones={opcionesMulti.clases}
            seleccion={listas.clases}
            onChange={(ids) => setLista('clases', ids)}
            cargando={cargandoOpciones}
          />
          <MultiSelect
            label="Función"
            opciones={opcionesMulti.funciones}
            seleccion={listas.funciones}
            onChange={(ids) => setLista('funciones', ids)}
            cargando={cargandoOpciones}
          />
          <div className={styles.clearBox}>
            <button
              type="button"
              className={styles.clearButton}
              onClick={limpiarFiltros}
              disabled={cantidadFiltros === 0}
            >
              Limpiar filtros{cantidadFiltros ? ` (${cantidadFiltros})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Primera carga: loader de pantalla completa, como el resto de los análisis */}
      {cargandoInicial && (
        <AnalyticsLoader
          message="Cargando Producción del Hospital"
          subMessage="Procesando prácticas, honorarios y liquidaciones del período..."
        />
      )}

      {error && !cargandoInicial && (
        <div className={styles.error}>
          <p>Error al cargar los datos: {error}</p>
          <div className={styles.errorActions}>
            <button onClick={refetch} className={styles.retryButton}>
              Reintentar
            </button>
            <button onClick={limpiarCache} className={`${styles.retryButton} ${styles.secondaryButton}`}>
              Limpiar Cache
            </button>
          </div>
        </div>
      )}

      {data && resumen && rankings && (
        <div className={styles.viewWrap} aria-busy={actualizando}>
          {/* Recargas posteriores: los datos se quedan en pantalla y el loader va sobre la vista */}
          {actualizando && (
            <div className={styles.overlay} role="status" aria-live="polite">
              <div className={styles.overlayBox}>
                <div className={styles.spinner} />
                <strong>{soloValorizadas ? 'Actualizando la vista…' : 'Cargando toda la actividad del período…'}</strong>
                <span>Puede demorar unos segundos</span>
              </div>
            </div>
          )}

          <div className={actualizando ? styles.viewBusy : undefined}>
            {data.periodo.finAjustado && (
              <div className={`${styles.banner} ${styles.bannerWarn}`}>
                La fecha final estaba en el futuro y se ajustó a hoy ({data.periodo.fin}).
              </div>
            )}

            {marcarIncompletos && analisis && analisis.incompletos.length > 0 && (
              <div className={`${styles.banner} ${styles.bannerDemora}`} role="note">
                <span className={styles.bannerIcono} aria-hidden="true">
                  ⚠
                </span>
                <div>
                  <strong>
                    {analisis.incompletos.length === 1 ? 'Un período' : `${analisis.incompletos.length} períodos`} con
                    la valorización en demora
                  </strong>
                  {analisis.incompletos.map((p) => `${etiquetaPeriodo(p.clave)}: ${p.pct?.toFixed(0)}%`).join(' · ')}
                  {analisis.habitual != null
                    ? ` valorizado, contra ~${analisis.habitual.toFixed(0)}% habitual.`
                    : ' valorizado.'}{' '}
                  Sus importes todavía van a crecer: no los compares con períodos cerrados. Aparecen rayados en
                  el gráfico.
                </div>
              </div>
            )}

            {soloValorizadas ? (
              <div className={`${styles.banner} ${styles.bannerInfo}`}>
                <strong>Mostrando solo prestaciones valorizadas.</strong> Destildá “Solo valorizadas” para ver
                también lo pendiente de valorizar y las coberturas no facturables.
              </div>
            ) : (
              <div className={styles.estadoStrip}>
                <div className={`${styles.estadoPill} ${styles.estadoOk}`}>
                  <span>Valorizadas</span>
                  <strong>{entero(resumen.porEstado.valorizada.practicas)} prácticas</strong>
                  <small>{moneda(resumen.porEstado.valorizada.importe)}</small>
                </div>
                <div className={`${styles.estadoPill} ${styles.estadoPend}`}>
                  <span>Sin valorizar</span>
                  <strong>{entero(resumen.porEstado.sinValorizar.practicas)} prácticas</strong>
                  <small>Pendientes de facturar</small>
                </div>
                <div className={`${styles.estadoPill} ${styles.estadoNo}`}>
                  <span>Coberturas no facturables</span>
                  <strong>{entero(resumen.porEstado.noFacturable.practicas)} prácticas</strong>
                  <small>No generan importe</small>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className={styles.kpiGrid}>
              <Kpi
                etiqueta="Facturado"
                valor={moneda(resumen.facturado)}
                detalle={`${entero(resumen.porEstado.valorizada.practicas)} prácticas valorizadas`}
                variacion={data.comparacion.variacion.facturado}
                ayuda="Honorarios valorizados de las prácticas del período"
                chip={analisis && analisis.incompletos.length > 0 ? 'Parcial' : undefined}
                explica={
                  analisis && analisis.incompletos.length > 0
                    ? `Incluye ${analisis.incompletos.length === 1 ? 'un período' : `${analisis.incompletos.length} períodos`} con valorización en demora: el total va a subir.`
                    : undefined
                }
              />
              {(() => {
                const pctLiquidado = resumen.facturado > 0 ? (resumen.liquidado / resumen.facturado) * 100 : 0;
                const parcial = liquidadoDisponible && pctLiquidado < 30;
                return (
                  <Kpi
                    etiqueta="Liquidado"
                    valor={liquidadoDisponible ? moneda(resumen.liquidado) : '—'}
                    detalle={
                      !liquidadoDisponible
                        ? 'Esta base todavía no registra liquidaciones'
                        : `${porcentaje(pctLiquidado)} de lo facturado tiene liquidación cargada`
                    }
                    barra={liquidadoDisponible ? { pct: pctLiquidado, aviso: parcial } : undefined}
                    chip={parcial ? 'Dato parcial' : undefined}
                    explica={
                      parcial
                        ? 'Son las liquidaciones importadas hasta ahora, no lo cobrado. Falta cargar el resto.'
                        : undefined
                    }
                    variacion={liquidadoDisponible ? data.comparacion.variacion.liquidado : undefined}
                    ayuda="Importe de honorarios que figura liquidado en las liquidaciones importadas"
                  />
                );
              })()}
              <Kpi
                etiqueta="Prácticas"
                valor={entero(resumen.practicas)}
                detalle={`${entero(resumen.prestaciones)} prestaciones · ${entero(resumen.visitas)} visitas`}
                variacion={data.comparacion.variacion.practicas}
                ayuda="Prácticas distintas: una práctica con ayudante o anestesista cuenta una sola vez"
              />
              <Kpi
                etiqueta="Pacientes"
                valor={entero(resumen.pacientes)}
                variacion={data.comparacion.variacion.pacientes}
              />
              <Kpi
                etiqueta="Ticket promedio"
                valor={moneda(resumen.ticketPromedio)}
                detalle="Facturado por práctica"
              />
              <Kpi
                etiqueta="Profesionales"
                valor={entero(resumen.profesionales)}
                detalle="Con producción en el período"
              />
            </div>

            {/* Evolución */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>
                    Evolución {data.granularidad === 'dia' ? 'diaria' : data.granularidad === 'semana' ? 'semanal' : 'mensual'}
                  </h2>
                  <p className={styles.cardSubtitle}>
                    {medidaEfectiva === 'practicas'
                      ? 'Cantidad de prácticas por período'
                      : 'Facturado y liquidado por período'}
                  </p>
                </div>
              </div>
              <SerieChart
                serie={data.serie}
                granularidad={data.granularidad}
                medida={medidaEfectiva}
                liquidadoDisponible={liquidadoDisponible}
                analisis={marcarIncompletos ? analisis : null}
              />
            </div>

            {/* Dónde está la demora: cada período al 100 %, partido por estado de valorización */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>¿Qué parte ya está valorizada?</h2>
                  <p className={styles.cardSubtitle}>
                    Verde: ya tiene importe. Naranja: se realizó pero todavía no se valorizó (en los períodos
                    recientes crece). Gris: coberturas que no generan importe.
                  </p>
                </div>
              </div>
              <ValorizacionChart serie={data.serie} granularidad={data.granularidad} />
            </div>

            {/* Gráficos por dimensión */}
            <div className={styles.chartsGrid}>
              <ChartCard
                titulo="Por cobertura"
                subtitulo="Obra social a la que se facturó; si aún no se facturó, la de la visita"
              >
                <DonutRanking
                  items={rankings.cobertura}
                  medida={medidaEfectiva}
                  onSeleccionar={(it) => agregarFiltro('coberturas', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por clase de paciente" subtitulo="Ambulatorio, internado, hospital de día…">
                <DonutRanking
                  items={rankings.clase}
                  medida={medidaEfectiva}
                  onSeleccionar={(it) => agregarFiltro('clases', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por sector" subtitulo="Dónde se realizó la práctica">
                <RankingBarras
                  items={rankings.sector}
                  medida={medidaEfectiva}
                  onSeleccionar={(it) => agregarFiltro('sectores', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por servicio" subtitulo="Servicio del sector donde se realizó">
                <RankingBarras
                  items={rankings.servicio}
                  medida={medidaEfectiva}
                  color="#0083A9"
                  onSeleccionar={(it) => agregarFiltro('servicios', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por especialidad" subtitulo="Especialidad del profesional">
                <RankingBarras
                  items={rankings.especialidad}
                  medida={medidaEfectiva}
                  color="#7e57c2"
                  onSeleccionar={(it) => agregarFiltro('especialidades', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por profesional" subtitulo="Top 10 del período">
                <RankingBarras
                  items={rankings.profesional}
                  medida={medidaEfectiva}
                  color="#2e7d32"
                  onSeleccionar={(it) => agregarFiltro('profesionales', it)}
                />
              </ChartCard>

              <ChartCard titulo="Por función" subtitulo="Especialista, anestesista, ayudantes…">
                <DonutRanking
                  items={rankings.funcion}
                  medida={medidaEfectiva}
                  onSeleccionar={(it) => agregarFiltro('funciones', it)}
                />
              </ChartCard>

              <ChartCard titulo="Prácticas principales" subtitulo="Las 10 con mayor valor en la medida elegida">
                <RankingBarras items={rankings.practicas} medida={medidaEfectiva} color="#f57c00" altoFila={34} />
              </ChartCard>
            </div>

            {/* Tabla de detalle */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Detalle por {dimActiva.titulo.toLowerCase()}</h2>
                  <p className={styles.cardSubtitle}>
                    {filasTabla.length} {filasTabla.length === 1 ? 'fila' : 'filas'} · clic en una fila para filtrar
                  </p>
                </div>
                <div className={styles.dimTabs} role="tablist">
                  {DIMENSIONES.map((d) => (
                    <button
                      key={d.id}
                      role="tab"
                      aria-selected={dimTabla === d.id}
                      className={`${styles.dimTab} ${dimTabla === d.id ? styles.dimTabActive : ''}`}
                      onClick={() => {
                        setDimTabla(d.id);
                        setVerTodas(false);
                      }}
                    >
                      {d.titulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{dimActiva.columna}</th>
                      <EncabezadoOrden etiqueta="Prácticas" clave="practicas" actual={ordenTabla ?? medidaEfectiva} onOrden={setOrdenTabla} />
                      <EncabezadoOrden etiqueta="Prestaciones" clave="prestaciones" actual={ordenTabla ?? medidaEfectiva} onOrden={setOrdenTabla} />
                      <EncabezadoOrden etiqueta="Pacientes" clave="pacientes" actual={ordenTabla ?? medidaEfectiva} onOrden={setOrdenTabla} />
                      <EncabezadoOrden etiqueta="Facturado" clave="facturado" actual={ordenTabla ?? medidaEfectiva} onOrden={setOrdenTabla} />
                      {liquidadoDisponible && (
                        <EncabezadoOrden etiqueta="Liquidado" clave="liquidado" actual={ordenTabla ?? medidaEfectiva} onOrden={setOrdenTabla} />
                      )}
                      <th className={styles.thPct}>% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(verTodas ? filasTabla : filasTabla.slice(0, FILAS_TABLA_INICIAL)).map((f, i) => {
                      const pct = totalMedida > 0 ? (valorDe(f, medidaEfectiva) / totalMedida) * 100 : 0;
                      const filtrable = f.id != null;
                      return (
                        <tr
                          key={`${f.id ?? 'sin'}-${i}`}
                          className={filtrable ? styles.rowClickable : undefined}
                          onClick={() => filtrable && agregarFiltro(dimActiva.filtro, f)}
                          title={filtrable ? 'Filtrar por este valor' : 'Sin dato: no se puede filtrar'}
                        >
                          <td className={styles.tdLabel}>{f.label}</td>
                          <td className={styles.tdNum}>{entero(f.practicas)}</td>
                          <td className={styles.tdNum}>{entero(f.prestaciones)}</td>
                          <td className={styles.tdNum}>{entero(f.pacientes)}</td>
                          <td className={styles.tdNum}>{moneda(f.facturado)}</td>
                          {liquidadoDisponible && <td className={styles.tdNum}>{moneda(f.liquidado)}</td>}
                          <td className={styles.tdPct}>
                            <div className={styles.pctBar}>
                              <span style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <em>{porcentaje(pct)}</em>
                          </td>
                        </tr>
                      );
                    })}
                    {filasTabla.length === 0 && (
                      <tr>
                        <td colSpan={liquidadoDisponible ? 7 : 6} className={styles.tdEmpty}>
                          Sin datos para los filtros elegidos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filasTabla.length > FILAS_TABLA_INICIAL && (
                <button type="button" className={styles.moreButton} onClick={() => setVerTodas((v) => !v)}>
                  {verTodas ? 'Ver menos' : `Ver las ${filasTabla.length} filas`}
                </button>
              )}
            </div>

            {/* Notas de calidad de datos */}
            <NotasCalidad data={data} soloValorizadas={soloValorizadas} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>{titulo}</h2>
          {subtitulo && <p className={styles.cardSubtitle}>{subtitulo}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EncabezadoOrden({
  etiqueta,
  clave,
  actual,
  onOrden,
}: {
  etiqueta: string;
  clave: OrdenTabla;
  actual: OrdenTabla;
  onOrden: (o: OrdenTabla) => void;
}) {
  const activo = actual === clave;
  return (
    <th className={styles.thNum} aria-sort={activo ? 'descending' : 'none'}>
      <button
        type="button"
        className={`${styles.thButton} ${activo ? styles.thButtonActive : ''}`}
        onClick={() => onOrden(clave)}
      >
        {etiqueta} {activo ? '▼' : ''}
      </button>
    </th>
  );
}

/** Limitaciones del dato, en letra chica al pie: informan sin competir con los números. */
function NotasCalidad({ data, soloValorizadas }: { data: AnaliticaProduccion; soloValorizadas: boolean }) {
  const notas = notasCalidad(data, soloValorizadas);
  if (!notas.length) return null;
  return (
    <footer className={styles.notas}>
      {notas.map((n, i) => (
        <p key={n}>
          <sup>{i + 1}</sup> {n}
        </p>
      ))}
    </footer>
  );
}
