'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './DonutChart.module.css';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  donutWidth?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export default function DonutChart({ data, size = 200, donutWidth = 30 }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });

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

    // Guardar información de segmentos para detección de hover
    const segments: Array<{
      startAngle: number;
      endAngle: number;
      item: { label: string; value: number; color: string };
    }> = [];

    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      // Guardar información del segmento
      segments.push({ startAngle, endAngle, item });

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Función para detectar en qué segmento está el mouse
    const detectSegment = (mouseX: number, mouseY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = mouseX - rect.left - centerX;
      const y = mouseY - rect.top - centerY;
      const distance = Math.sqrt(x * x + y * y);
      
      // Verificar si está dentro del donut
      if (distance < innerRadius || distance > radius) {
        return null;
      }
      
      // Calcular ángulo del mouse
      let angle = Math.atan2(y, x) + Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;
      
      // Encontrar el segmento correspondiente
      for (const segment of segments) {
        let startAngle = segment.startAngle + Math.PI / 2;
        let endAngle = segment.endAngle + Math.PI / 2;
        
        if (startAngle < 0) startAngle += 2 * Math.PI;
        if (endAngle < 0) endAngle += 2 * Math.PI;
        
        if (startAngle > endAngle) {
          // El segmento cruza el punto 0
          if (angle >= startAngle || angle <= endAngle) {
            return segment;
          }
        } else {
          if (angle >= startAngle && angle <= endAngle) {
            return segment;
          }
        }
      }
      
      return null;
    };

    // Event listeners para mouse
    const handleMouseMove = (e: MouseEvent) => {
      const segment = detectSegment(e.clientX, e.clientY);
      
      if (segment) {
        const percentage = ((segment.item.value / total) * 100).toFixed(1);
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          content: `${segment.item.label}: ${segment.item.value.toFixed(1)} (${percentage}%)`
        });
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    };

    const handleMouseLeave = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    ctx.fillStyle = '#333';
    ctx.font = `bold ${radius / 5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toFixed(1), centerX, centerY);

    // Cleanup
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };

  }, [data, size, donutWidth]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={styles.canvas}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div 
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            position: 'fixed',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
