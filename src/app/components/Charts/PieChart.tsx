'use client';

import { useEffect, useRef } from 'react';
import styles from './PieChart.module.css';

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
  size?: number;
}

export default function PieChart({ data, title, size = 200 }: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Calcular total
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
      // Mostrar círculo vacío si no hay datos
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos', centerX, centerY);
      return;
    }

    let currentAngle = -Math.PI / 2; // Comenzar desde arriba

    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      // Dibujar slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Dibujar texto del total en el centro
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(total.toString(), centerX, centerY - 5);
    ctx.font = '12px Arial';
    ctx.fillText('Total', centerX, centerY + 15);

  }, [data]);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{title}</h4>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={styles.canvas}
      />
      <div className={styles.legend}>
        {data.map((item, index) => (
          <div key={index} className={styles.legendItem}>
            <div 
              className={styles.legendColor}
              style={{ backgroundColor: item.color }}
            />
            <span className={styles.legendLabel}>
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
