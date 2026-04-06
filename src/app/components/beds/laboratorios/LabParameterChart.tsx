"use client";
import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import styles from "./LabParameterChart.module.css";

export interface LabDataPoint {
  fechaHora: string;
  valor: number | null;
  valorReferencia?: string;
}

interface LabParameterChartProps {
  data: LabDataPoint[];
  parametro: string;
  unidad?: string;
  compact?: boolean;
  hideHeader?: boolean;
}

const SPARKLINE_HEIGHT = 52;
const Y_GUTTER = 30;
const PAD_V = 5;
/** Origen X del área de datos (alinea path/círculos con la tabla; evita ~W/(2n) cuando el ancho medido no coincide con el reparto visual). */
const SPARKLINE_PAD_X = 10;

function formatYTick(v: number): string {
  if (Number.isInteger(v) && Math.abs(v) < 1e6) return String(v);
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

/** Sparkline en SVG: X por columna = PAD_X + i·(ancho/n) (mismo criterio que probaste en DevTools: ~10 en vez de ~W/(2n)). */
function LabRowSparkline({ data, unidad }: { data: LabDataPoint[]; unidad?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w != null) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const valores = data
    .map((d) => d.valor)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));

  const minValor = Math.min(...valores);
  const maxValor = Math.max(...valores);
  let yMin: number;
  let yMax: number;
  if (minValor === maxValor) {
    const pad = Math.abs(minValor) * 0.1 || 1;
    yMin = minValor - pad;
    yMax = maxValor + pad;
  } else {
    const margen = (maxValor - minValor) * 0.12 || 1;
    yMin = minValor - margen;
    yMax = maxValor + margen;
  }

  const n = Math.max(1, data.length);
  const plotH = SPARKLINE_HEIGHT - PAD_V * 2;
  const denom = Math.max(yMax - yMin, 1e-9);
  const yPixel = (v: number) => PAD_V + ((yMax - v) / denom) * plotH;

  const ticks = useMemo(() => {
    const k = 3;
    if (yMax <= yMin) return [yMin];
    return Array.from({ length: k }, (_, i) => yMin + ((yMax - yMin) * i) / (k - 1));
  }, [yMin, yMax]);

  /** Todos los puntos con valor, en orden de columna (índice). */
  const pointsWithValues = useMemo(() => {
    if (width <= 0) return [];
    const d0 = Math.max(yMax - yMin, 1e-9);
    const h = SPARKLINE_HEIGHT - PAD_V * 2;
    const yPx = (v: number) => PAD_V + ((yMax - v) / d0) * h;
    const colStep = width / n;
    const pts: { x: number; y: number; valor: number; i: number }[] = [];
    data.forEach((d, i) => {
      const v = d.valor;
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        const x = SPARKLINE_PAD_X + i * colStep;
        pts.push({ x, y: yPx(v), valor: v, i });
      }
    });
    return pts;
  }, [data, width, n, yMin, yMax]);

  /** Una sola polilínea entre todos los puntos (salta columnas sin dato). */
  const linePathD = useMemo(() => {
    if (pointsWithValues.length < 2) return null;
    return pointsWithValues.map((p, k) => `${k === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [pointsWithValues]);

  const tipText = (valor: number) => (unidad ? `${valor} ${unidad}` : String(valor));

  if (width <= 0) {
    return (
      <div
        ref={wrapRef}
        className={styles.sparkWrap}
        style={{ height: SPARKLINE_HEIGHT }}
        aria-hidden
      />
    );
  }

  return (
    <div ref={wrapRef} className={styles.sparkWrap} style={{ height: SPARKLINE_HEIGHT }}>
      <svg
        className={styles.sparkSvg}
        width={width}
        height={SPARKLINE_HEIGHT}
        role="img"
        aria-label="Evolución del parámetro por columna de fecha"
      >
        {ticks.map((t, ti) => {
          const y = yPixel(t);
          return (
            <line
              key={`g-${ti}`}
              x1={SPARKLINE_PAD_X}
              x2={width - Y_GUTTER}
              y1={y}
              y2={y}
              stroke="#e8ecef"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}
        <line
          x1={width - Y_GUTTER}
          y1={PAD_V}
          x2={width - Y_GUTTER}
          y2={SPARKLINE_HEIGHT - PAD_V}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {ticks.map((t, ti) => (
          <text
            key={`lbl-${ti}`}
            x={width - 5}
            y={yPixel(t)}
            dy="0.35em"
            textAnchor="end"
            fontSize={10}
            fill="#64748b"
          >
            {formatYTick(t)}
          </text>
        ))}
        {linePathD ? (
          <path
            d={linePathD}
            fill="none"
            stroke="#00B5E2"
            strokeWidth={2}
            /* butt: el trazo no se prolonga más allá del primer/último vértice (round dejaba media
               anchura hacia la izquierda del primer punto y desalineaba el bbox respecto a las líneas de
               cuadrícula que arrancan en x=0). El redondeo lo aportan los círculos. */
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
        ) : null}
        {pointsWithValues.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#00B5E2"
            stroke="#fff"
            strokeWidth={1}
          >
            <title>{tipText(p.valor)}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

const LabParameterChart = ({ data, parametro, unidad, compact, hideHeader }: LabParameterChartProps) => {
  const isRowSparkline = Boolean(compact && hideHeader);

  const valores = data
    .map((d) => d.valor)
    .filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));

  if (valores.length === 0) {
    return (
      <div
        className={
          isRowSparkline ? styles.emptyChartSparkline : compact ? styles.emptyChartInline : styles.emptyChart
        }
      >
        <p>Sin valores numéricos{isRowSparkline ? "" : ` para ${parametro}`}</p>
      </div>
    );
  }

  const minValor = Math.min(...valores);
  const maxValor = Math.max(...valores);

  let yMin: number;
  let yMax: number;
  if (minValor === maxValor) {
    const pad = Math.abs(minValor) * 0.1 || 1;
    yMin = minValor - pad;
    yMax = maxValor + pad;
  } else {
    const margen = (maxValor - minValor) * 0.12 || 1;
    yMin = minValor - margen;
    yMax = maxValor + margen;
  }

  if (isRowSparkline) {
    return (
      <div className={styles.chartContainerRow}>
        <LabRowSparkline data={data} unidad={unidad} />
      </div>
    );
  }

  const chartHeight = compact ? 260 : 350;
  const bottomMargin = compact ? 72 : 80;

  return (
    <div className={compact ? styles.chartContainerInline : styles.chartContainer}>
      {!hideHeader ? (
        <>
          <h4 className={compact ? styles.chartTitleInline : styles.chartTitle}>
            Evolución de {parametro}
            {unidad ? ` (${unidad})` : ""}
          </h4>
          <p className={compact ? styles.chartHintCompact : styles.chartHint}>
            {compact
              ? "Eje X = fechas de la tabla; sin resultado en una fecha no dibuja punto."
              : "Eje horizontal: mismas fechas que las columnas de la tabla (sin dato = punto omitido)."}
          </p>
        </>
      ) : null}
      <div className={compact ? styles.chartContentInline : styles.chartContent} style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 24, left: 4, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="fechaHora"
              angle={-40}
              textAnchor="end"
              height={bottomMargin}
              interval={0}
              tick={{ fontSize: compact ? 10 : 11, fill: "#666" }}
            />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11, fill: "#666" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
              }}
              formatter={(value: number | string) => {
                if (typeof value === "number") return value.toFixed(3).replace(/\.?0+$/, "");
                return value;
              }}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="valor"
              name={parametro}
              stroke="#00B5E2"
              strokeWidth={2.5}
              connectNulls={false}
              dot={{ fill: "#00B5E2", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LabParameterChart;
