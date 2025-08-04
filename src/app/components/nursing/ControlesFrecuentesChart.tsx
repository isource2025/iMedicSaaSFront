"use client";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import styles from './ControlesFrecuentesChart.module.css';
import { formatTime } from '../../utils/dateUtils';
import { ControlFrecuente, ControlesFrecuentesChartProps, ParametroControl } from '../../types/nursing/ChartComponents';

// Constantes para colores y etiquetas
const COLORS: Record<string, string> = {
  pulso: "#00B5E2",         // Pantone 313U
  maximo: "#0083A9",       // Pantone 314C
  minimo: "#61D6EB",       // Pantone 311U
  pam: "#41C8DC",          // Pantone 311C
  frecResp: "#FFB347",     // Naranja suave
  axilar: "#FF6F61",       // Rojo suave
  saturometria: "#7ED957"  // Verde suave
};

const LABELS: Record<string, string> = {
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

const ControlesFrecuentesChart = ({ data, parametro }: ControlesFrecuentesChartProps) => {
  // Parseamos la hora y formateamos los datos para el gráfico
  const chartData = data.map(ctrl => {
    // Formatear la fecha y hora para mejor visualización
    const fecha = new Date(ctrl.FechaControl).toLocaleDateString('es-AR');
    const hora = formatTime(ctrl.HoraControl);
    
    // Obtener el valor del parámetro seleccionado
    const valor = ctrl[PARAM_MAP[parametro]];
    
    // Solo incluir valores que no sean 0, nulos o undefined
    return {
      fechaHora: `${fecha} ${hora}`,
      valor: (valor !== 0 && valor !== null && valor !== undefined) ? valor : null
    };
  }).filter(item => item.valor !== null); // Filtrar puntos sin valor

  // Determinar la clase CSS para el título según el parámetro
  const titleClassName = styles[`chartTitle${parametro.charAt(0).toUpperCase() + parametro.slice(1)}`] || '';

  return (
    <div className={styles.chartContainer}>
      <h4 className={`${styles.chartTitle} ${titleClassName}`}>
        Evolución de {LABELS[parametro]}
      </h4>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fechaHora" angle={-45} textAnchor="end" minTickGap={20} height={100} />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="valor" 
              name={LABELS[parametro]} 
              stroke={COLORS[parametro]} 
              strokeWidth={2} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
