'use client';

import { useEffect, useRef } from 'react';
import styles from './BarChart.module.css';

interface BarChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
  height?: number;
}

export default function BarChart({ 
  data, 
  title, 
  color = '#00B5E2', 
  height = 300 
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos disponibles', canvas.width / 2, canvas.height / 2);
      return;
    }

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / data.length;
    const maxValue = Math.max(...data.map(d => d.value));

    // Dibujar barras
    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding + index * barWidth + barWidth * 0.1;
      const y = padding + chartHeight - barHeight;
      const width = barWidth * 0.8;

      // Gradiente para las barras
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '80');

      // Dibujar barra
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, barHeight);

      // Borde de la barra
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, barHeight);

      // Valor encima de la barra
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        item.value.toString(),
        x + width / 2,
        y - 5
      );

      // Etiqueta debajo de la barra
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.save();
      ctx.translate(x + width / 2, padding + chartHeight + 15);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(item.label, 0, 0);
      ctx.restore();
    });

    // Líneas de cuadrícula horizontales
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();

      // Etiquetas del eje Y
      const value = Math.round((maxValue / gridLines) * (gridLines - i));
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding - 10, y + 3);
    }

  }, [data, color]);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{title}</h4>
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className={styles.canvas}
      />
    </div>
  );
}
