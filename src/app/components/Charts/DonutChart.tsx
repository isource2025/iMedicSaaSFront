'use client';

import { useEffect, useRef } from 'react';
import styles from './DonutChart.module.css';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  donutWidth?: number;
}

export default function DonutChart({ data, size = 200, donutWidth = 30 }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius - donutWidth;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
      ctx.closePath();
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();
      
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sin datos', centerX, centerY);
      return;
    }

    let currentAngle = -Math.PI / 2;

    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      currentAngle += sliceAngle;
    });

    ctx.fillStyle = '#333';
    ctx.font = `bold ${radius / 5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY);

  }, [data, size, donutWidth]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={styles.canvas}
      />
    </div>
  );
}
