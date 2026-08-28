'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AmbulatorioAnalytics.module.css';

export interface CompactBarDatum {
  label: string;
  value: number;
  color: string;
}

interface CompactBarChartProps {
  data: CompactBarDatum[];
  width?: number;
  height?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

/** Barras verticales compactas para widgets; el porcentaje sólo aparece en hover. */
export function CompactBarChart({ data, width = 220, height = 160 }: CompactBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0 || data.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sin datos', width / 2, height / 2);
      return;
    }

    const padding = { top: 12, right: 8, bottom: 36, left: 8 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const barGap = 10;
    const barW = Math.max(12, (chartW - barGap * (data.length - 1)) / data.length);
    const maxVal = Math.max(...data.map((d) => d.value), 1);

    const bars: Array<{ x: number; y: number; w: number; h: number; item: CompactBarDatum }> = [];

    data.forEach((item, i) => {
      const barH = (item.value / maxVal) * chartH;
      const x = padding.left + i * (barW + barGap);
      const y = padding.top + chartH - barH;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
      gradient.addColorStop(0, item.color);
      gradient.addColorStop(1, `${item.color}99`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barW, barH, 4);
      } else {
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toLocaleString('es-AR'), x + barW / 2, y - 4);

      const label = item.label.length > 9 ? `${item.label.slice(0, 8)}…` : item.label;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(label, x + barW / 2, padding.top + chartH + 14);

      bars.push({ x, y, w: barW, h: barH, item });
    });

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = bars.find(
        (b) => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h,
      );
      if (hit) {
        const pct = ((hit.item.value / total) * 100).toFixed(1);
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          content: `${hit.item.label}: ${hit.item.value.toLocaleString('es-AR')} (${pct}%)`,
        });
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    const onLeave = () => setTooltip((prev) => ({ ...prev, visible: false }));

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [data, width, height]);

  return (
    <div className={styles.compactChartWrap}>
      <canvas ref={canvasRef} className={styles.compactChartCanvas} />
      {tooltip.visible && (
        <div
          className={styles.compactChartTooltip}
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
