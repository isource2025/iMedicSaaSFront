"use client";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import styles from './LabParameterChart.module.css';

interface LabDataPoint {
  fechaHora: string;
  valor: number | null;
  valorReferencia?: string;
}

interface LabParameterChartProps {
  data: LabDataPoint[];
  parametro: string;
  unidad?: string;
}

const LabParameterChart = ({ data, parametro, unidad }: LabParameterChartProps) => {
  // Filtrar datos válidos
  const chartData = data.filter(item => item.valor !== null && item.valor !== undefined);

  if (chartData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos suficientes para graficar {parametro}</p>
      </div>
    );
  }

  // Calcular el dominio del eje Y dinámicamente
  const valores = chartData.map(d => d.valor).filter(v => v !== null) as number[];
  const minValor = Math.min(...valores);
  const maxValor = Math.max(...valores);
  
  // Agregar un margen del 15% arriba y abajo para mejor visualización
  const margen = (maxValor - minValor) * 0.15 || 1;
  const yMin = Math.floor(minValor - margen);
  const yMax = Math.ceil(maxValor + margen);

  return (
    <div className={styles.chartContainer}>
      <h4 className={styles.chartTitle}>
        Evolución de {parametro} {unidad && `(${unidad})`}
      </h4>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="fechaHora" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: '#666' }}
            />
            <YAxis 
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#666' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px'
              }}
              formatter={(value: any) => {
                if (typeof value === 'number') {
                  return value.toFixed(2);
                }
                return value;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="valor" 
              name={parametro}
              stroke="#00B5E2"
              strokeWidth={2.5}
              dot={{ fill: '#00B5E2', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LabParameterChart;
