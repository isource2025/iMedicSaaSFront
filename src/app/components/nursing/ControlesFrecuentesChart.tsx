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
    // HoraControl ya viene en formato HH:MM:SS del backend, solo extraer HH:MM
    const hora = ctrl.HoraControl ? ctrl.HoraControl.substring(0, 5) : '-';
    
    // Obtener el valor del parámetro seleccionado
    const valor = ctrl[PARAM_MAP[parametro]];
    
    // Solo incluir valores que no sean 0, nulos o undefined
    return {
      fechaHora: `${fecha} ${hora}`,
      valor: (valor !== 0 && valor !== null && valor !== undefined) ? valor : null
    };
  }).filter(item => item.valor !== null); // Filtrar puntos sin valor

  // Calcular el dominio del eje Y dinámicamente
  const valores = chartData.map(d => d.valor).filter(v => v !== null) as number[];
  const minValor = valores.length > 0 ? Math.min(...valores) : 0;
  const maxValor = valores.length > 0 ? Math.max(...valores) : 100;
  
  // Agregar un margen del 10% arriba y abajo para mejor visualización
  const margen = (maxValor - minValor) * 0.1;
  const yMin = Math.max(0, Math.floor(minValor - margen));
  const yMax = Math.ceil(maxValor + margen);

  // Determinar la clase CSS para el título según el parámetro
  const titleClassName = styles[`chartTitle${parametro.charAt(0).toUpperCase() + parametro.slice(1)}`] || '';

  return (
    <div className={styles.chartContainer}>
      <h4 className={`${styles.chartTitle} ${titleClassName}`}>
        Evolución de {LABELS[parametro]}
      </h4>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fechaHora" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
            />
            <YAxis domain={[yMin, yMax]} />
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
