"use client";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

// Props: recibe un array de controles frecuentes y el parámetro a mostrar
interface ControlFrecuente {
  FechaControl: string;
  HoraControl: string;
  Pulso?: number;
  Maximo?: number;
  Minimo?: number;
  PAMedia?: number;
  FrecuenciaRespiratoria?: number;
  Axilar?: number;
  Saturometria?: number;
}
interface Props {
  data: ControlFrecuente[];
  parametro: string;
}

const COLORS = {
  pulso: "#00B5E2",         // Pantone 313U
  maximo: "#0083A9",       // Pantone 314C
  minimo: "#61D6EB",       // Pantone 311U
  pam: "#41C8DC",          // Pantone 311C
  frecResp: "#FFB347",     // Naranja suave
  axilar: "#FF6F61",       // Rojo suave
  saturometria: "#7ED957"  // Verde suave
};

const LABELS = {
  pulso: "Pulso",
  maximo: "Presión Máxima",
  minimo: "Presión Mínima",
  pam: "PAMedia",
  frecResp: "Frec. Resp.",
  axilar: "Temp. Axilar",
  saturometria: "Saturometría"
};

const PARAM_MAP: Record<string, keyof ControlFrecuente> = {
  pulso: "Pulso",
  maximo: "Maximo",
  minimo: "Minimo",
  pam: "PAMedia",
  frecResp: "FrecuenciaRespiratoria",
  axilar: "Axilar",
  saturometria: "Saturometria"
};

const ControlesFrecuentesChart: React.FC<Props> = ({ data, parametro }) => {
  // Preparamos los datos para el gráfico
  const chartData = data.map(ctrl => ({
    fechaHora: `${ctrl.FechaControl} ${ctrl.HoraControl}`,
    valor: ctrl[PARAM_MAP[parametro]] ?? null
  }));

  return (
    <div style={{ width: "100%", height: 320, background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px #e0e0e0", marginBottom: 24, padding: 16 }}>
      <h4 style={{ margin: "0 0 8px 0", color: COLORS[parametro], fontWeight: 600 }}>Evolución de {LABELS[parametro]}</h4>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fechaHora" angle={-35} textAnchor="end" minTickGap={14} height={60} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="valor" name={LABELS[parametro]} stroke={COLORS[parametro]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CHART_PARAMS = [
  { value: "pulso", label: "Pulso" },
  { value: "maximo", label: "Presión Máxima" },
  { value: "minimo", label: "Presión Mínima" },
  { value: "pam", label: "PAMedia" },
  { value: "frecResp", label: "Frec. Resp." },
  { value: "axilar", label: "Temp. Axilar" },
  { value: "saturometria", label: "Saturometría" }
];

export default ControlesFrecuentesChart;
