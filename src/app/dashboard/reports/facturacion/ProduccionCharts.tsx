'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Granularidad, MedidaProduccion, PuntoSerieProduccion } from '@/app/types/produccionHospital';
import {
  COLOR_OTROS,
  PALETA,
  type AnalisisValorizacion,
  etiquetaSerie,
  formatearMedida,
  formatearMedidaCompacta,
  type ItemRanking,
} from './produccionFormat';
import styles from './ProduccionHospital.module.css';

const COLOR_FACTURADO = '#00B5E2';
const COLOR_LIQUIDADO = '#2e7d32';
const COLOR_CANTIDAD = '#7e57c2';

const recortar = (texto: string, max: number) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

function SinDatos({ alto = 220 }: { alto?: number }) {
  return (
    <div className={styles.chartEmpty} style={{ height: alto }}>
      Sin datos para los filtros elegidos
    </div>
  );
}

// ── Evolución en el tiempo ──────────────────────────────────────────────────

interface SerieChartProps {
  serie: PuntoSerieProduccion[];
  granularidad: Granularidad;
  medida: MedidaProduccion;
  liquidadoDisponible: boolean;
  /** Períodos en demora de valorización. Si viene, sus barras se dibujan rayadas y el tooltip lo explica. */
  analisis?: AnalisisValorizacion | null;
}

interface TooltipSerieProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; payload: { incompleto: boolean; pct: number | null } }[];
  habitual: number | null;
}

function TooltipSerie({ active, label, payload, habitual }: TooltipSerieProps) {
  if (!active || !payload?.length) return null;
  const { incompleto, pct } = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.name}>
          {p.name}: {formatearMedida(p.value, p.name === 'Prácticas' ? 'practicas' : 'facturado')}
        </div>
      ))}
      {incompleto && pct != null && (
        <div className={styles.tooltipAviso}>
          Incompleto: solo {pct.toFixed(0)}% valorizado
          {habitual != null ? ` (lo habitual es ~${habitual.toFixed(0)}%)` : ''}. Todavía puede crecer.
        </div>
      )}
    </div>
  );
}

/**
 * Facturado y liquidado lado a lado. Con la medida "cantidad" se dibujan las
 * prácticas, que es lo único que existe aunque todavía no haya nada valorizado.
 * Los períodos con valorización en demora se dibujan rayados: su importe es un piso, no un total.
 */
export function SerieChart({ serie, granularidad, medida, liquidadoDisponible, analisis }: SerieChartProps) {
  if (!serie.length) return <SinDatos alto={300} />;

  const porClave = new Map((analisis?.periodos ?? []).map((p) => [p.clave, p]));
  const datos = serie.map((p) => ({
    ...p,
    etiqueta: etiquetaSerie(p.clave, granularidad),
    incompleto: porClave.get(p.clave)?.incompleto ?? false,
    pct: porClave.get(p.clave)?.pct ?? null,
  }));
  const porCantidad = medida === 'practicas';
  const hayIncompletos = datos.some((d) => d.incompleto);

  // Barra de un período: rayada si está incompleto.
  const celdas = (color: string) =>
    datos.map((d) => (
      <Cell
        key={d.clave}
        fill={color}
        fillOpacity={d.incompleto ? 0.28 : 1}
        stroke={d.incompleto ? color : undefined}
        strokeDasharray={d.incompleto ? '4 3' : undefined}
      />
    ));

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#607d8b' }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 12, fill: '#607d8b' }}
            tickFormatter={(v: number) => formatearMedidaCompacta(v, porCantidad ? 'practicas' : 'facturado')}
            width={porCantidad ? 48 : 72}
          />
          <Tooltip content={<TooltipSerie habitual={analisis?.habitual ?? null} />} />
          <Legend />
          {porCantidad ? (
            <Bar dataKey="practicas" name="Prácticas" fill={COLOR_CANTIDAD} radius={[4, 4, 0, 0]}>
              {celdas(COLOR_CANTIDAD)}
            </Bar>
          ) : (
            <>
              <Bar dataKey="facturado" name="Facturado" fill={COLOR_FACTURADO} radius={[4, 4, 0, 0]}>
                {celdas(COLOR_FACTURADO)}
              </Bar>
              {liquidadoDisponible && (
                <Bar dataKey="liquidado" name="Liquidado" fill={COLOR_LIQUIDADO} radius={[4, 4, 0, 0]}>
                  {celdas(COLOR_LIQUIDADO)}
                </Bar>
              )}
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {hayIncompletos && (
        <p className={styles.leyendaIncompleto}>
          <span className={styles.muestraIncompleta} aria-hidden="true" /> Barra rayada: período con la valorización
          en demora. Su importe todavía puede crecer.
        </p>
      )}
    </>
  );
}

// ── Valorización por período ────────────────────────────────────────────────

const COLOR_VALORIZADA = '#2e7d32';
const COLOR_SIN_VALORIZAR = '#f57c00';

interface ValorizacionChartProps {
  serie: PuntoSerieProduccion[];
  granularidad: Granularidad;
}

interface TooltipValorizacionProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; payload: { pct: number | null } }[];
}

function TooltipValorizacion({ active, label, payload }: TooltipValorizacionProps) {
  if (!active || !payload?.length) return null;
  const pct = payload[0].payload.pct;
  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.name}>
          {p.name}: {formatearMedida(p.value, 'practicas')}
        </div>
      ))}
      {pct != null && <div className={styles.tooltipDestacado}>{pct.toFixed(0)}% de lo facturable ya valorizado</div>}
    </div>
  );
}

/**
 * Cada período al 100 %, partido en lo valorizado, lo que falta valorizar y lo que nunca se valoriza.
 * Muestra de un vistazo dónde está la demora: el naranja crece en los períodos más recientes.
 */
export function ValorizacionChart({ serie, granularidad }: ValorizacionChartProps) {
  if (!serie.length) return <SinDatos alto={260} />;

  const datos = serie.map((p) => {
    const { valorizadas, sinValorizar, noFacturable } = p.valorizacion;
    const base = valorizadas + sinValorizar;
    return {
      etiqueta: etiquetaSerie(p.clave, granularidad),
      Valorizadas: valorizadas,
      'Sin valorizar': sinValorizar,
      'Coberturas no facturables': noFacturable,
      pct: base > 0 ? (valorizadas / base) * 100 : null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} stackOffset="expand" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" vertical={false} />
        <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#607d8b' }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 12, fill: '#607d8b' }}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          width={44}
        />
        <Tooltip content={<TooltipValorizacion />} />
        <Legend />
        <Bar dataKey="Valorizadas" stackId="v" fill={COLOR_VALORIZADA} />
        <Bar dataKey="Sin valorizar" stackId="v" fill={COLOR_SIN_VALORIZAR} />
        <Bar dataKey="Coberturas no facturables" stackId="v" fill={COLOR_OTROS} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Ranking horizontal ──────────────────────────────────────────────────────

interface RankingBarrasProps {
  items: ItemRanking[];
  medida: MedidaProduccion;
  /** Clic en una barra: agrega el valor como filtro. */
  onSeleccionar?: (item: ItemRanking) => void;
  color?: string;
  altoFila?: number;
}

export function RankingBarras({
  items,
  medida,
  onSeleccionar,
  color = COLOR_FACTURADO,
  altoFila = 30,
}: RankingBarrasProps) {
  if (!items.length) return <SinDatos />;

  const alto = Math.max(160, items.length * altoFila + 24);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#607d8b' }}
          tickFormatter={(v: number) => formatearMedidaCompacta(v, medida)}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 12, fill: '#37474f' }}
          tickFormatter={(v: string) => recortar(v, 26)}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,181,226,0.06)' }}
          formatter={(valor: number) => [formatearMedida(valor, medida), 'Total']}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          onClick={(d: ItemRanking) => d && onSeleccionar?.(d)}
          cursor={onSeleccionar ? 'pointer' : 'default'}
        >
          {items.map((it, i) => (
            <Cell key={`${it.id ?? 'otros'}-${i}`} fill={it.esOtros ? COLOR_OTROS : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Donut con leyenda ───────────────────────────────────────────────────────

interface DonutRankingProps {
  items: ItemRanking[];
  medida: MedidaProduccion;
  onSeleccionar?: (item: ItemRanking) => void;
}

export function DonutRanking({ items, medida, onSeleccionar }: DonutRankingProps) {
  if (!items.length) return <SinDatos />;

  const total = items.reduce((acc, it) => acc + it.value, 0);
  const color = (it: ItemRanking, i: number) => (it.esOtros ? COLOR_OTROS : PALETA[i % PALETA.length]);

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donutChart}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={1}
              onClick={(d: ItemRanking) => d && onSeleccionar?.(d)}
              cursor={onSeleccionar ? 'pointer' : 'default'}
            >
              {items.map((it, i) => (
                <Cell key={`${it.id ?? 'otros'}-${i}`} fill={color(it, i)} />
              ))}
            </Pie>
            <Tooltip formatter={(valor: number, nombre: string) => [formatearMedida(valor, medida), nombre]} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenter}>
          <strong>{formatearMedidaCompacta(total, medida)}</strong>
          <span>total</span>
        </div>
      </div>

      <ul className={styles.donutLegend}>
        {items.map((it, i) => (
          <li key={`${it.id ?? 'otros'}-${i}`}>
            <button
              type="button"
              className={styles.legendButton}
              onClick={() => onSeleccionar?.(it)}
              disabled={!onSeleccionar || it.esOtros || it.id == null}
              title={it.label}
            >
              <span className={styles.legendDot} style={{ background: color(it, i) }} />
              <span className={styles.legendLabel}>{recortar(it.label, 24)}</span>
              <span className={styles.legendPct}>{total > 0 ? `${((it.value / total) * 100).toFixed(1).replace('.', ',')}%` : '—'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
