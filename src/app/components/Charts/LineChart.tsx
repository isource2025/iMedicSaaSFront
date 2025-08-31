'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import styles from './LineChart.module.css';

interface LineChartProps {
  data: { label: string; value: number; date?: string }[];
  title: string;
  color?: string;
  height?: number;
}

type TimeFilter = 'día' | 'semana' | 'mes' | 'año' | 'todo';

interface ChartState {
  zoomLevel: number;
  offsetX: number;
  isDragging: boolean;
  lastMouseX: number;
}

export default function LineChart({ 
  data, 
  title, 
  color = '#007bff', 
  height = 350 
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePoint, setActivePoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('todo');
  const [chartState, setChartState] = useState<ChartState>({
    zoomLevel: 1,
    offsetX: 0,
    isDragging: false,
    lastMouseX: 0
  });

  // Utilidad: oscurecer un color HEX
  const darkenColor = (hex: string, amount = 25) => {
    // Acepta formatos del tipo #RRGGBB
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) return hex;
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(match[1], 16) - amount);
    const g = clamp(parseInt(match[2], 16) - amount);
    const b = clamp(parseInt(match[3], 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Análisis automático de datos para determinar el período
  const dataAnalysis = useMemo(() => {
    if (data.length === 0) return { period: 'sin datos', totalDays: 0, availableFilters: ['todo'] };
    
    const dates = data.map(item => new Date(item.date || item.label));
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    let period = 'personalizado';
    const availableFilters: TimeFilter[] = ['todo'];
    
    if (totalDays <= 1) {
      period = 'día';
      availableFilters.push('día');
    } else if (totalDays <= 7) {
      period = 'semana';
      availableFilters.push('día', 'semana');
    } else if (totalDays <= 31) {
      period = 'mes';
      availableFilters.push('día', 'semana', 'mes');
    } else if (totalDays <= 365) {
      period = 'año';
      availableFilters.push('día', 'semana', 'mes', 'año');
    } else {
      period = 'múltiples años';
      availableFilters.push('día', 'semana', 'mes', 'año');
    }
    
    return { period, totalDays, firstDate, lastDate, availableFilters };
  }, [data]);

  // Filtrado de datos según el filtro de tiempo seleccionado
  const filteredData = useMemo(() => {
    if (timeFilter === 'todo' || data.length === 0) return data;
    
    // Usar la fecha más reciente de los datos como referencia, no la fecha actual
    const dates = data.map(item => new Date(item.date || item.label));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const cutoffDate = new Date(latestDate);
    
    switch (timeFilter) {
      case 'día':
        // Solo el último día
        cutoffDate.setDate(latestDate.getDate() - 1);
        break;
      case 'semana':
        cutoffDate.setDate(latestDate.getDate() - 7);
        break;
      case 'mes':
        cutoffDate.setMonth(latestDate.getMonth() - 1);
        break;
      case 'año':
        cutoffDate.setFullYear(latestDate.getFullYear() - 1);
        break;
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.date || item.label);
      return itemDate >= cutoffDate;
    });
  }, [data, timeFilter]);

  // Datos con zoom y offset aplicados
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    const totalPoints = filteredData.length;
    const visiblePoints = Math.max(5, Math.floor(totalPoints / chartState.zoomLevel));
    const startIndex = Math.max(0, Math.min(
      totalPoints - visiblePoints,
      Math.floor(chartState.offsetX * (totalPoints - visiblePoints))
    ));
    
    return filteredData.slice(startIndex, startIndex + visiblePoints);
  }, [filteredData, chartState.zoomLevel, chartState.offsetX]);

  // Funciones de control
  const handleZoomIn = () => {
    setChartState(prev => ({
      ...prev,
      zoomLevel: Math.min(prev.zoomLevel * 1.5, 10)
    }));
  };

  const handleZoomOut = () => {
    setChartState(prev => ({
      ...prev,
      zoomLevel: Math.max(prev.zoomLevel / 1.5, 1),
      offsetX: prev.zoomLevel <= 1.5 ? 0 : prev.offsetX
    }));
  };

  const handleResetZoom = () => {
    setChartState(prev => ({
      ...prev,
      zoomLevel: 1,
      offsetX: 0
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = displayData.length > 0 ? Math.max(...displayData.map(d => d.value)) * 1.2 : 1;
    const points = displayData.map((item, index) => ({
      x: padding + (chartWidth / (displayData.length - 1 || 1)) * index,
      y: padding + chartHeight - (item.value / maxValue) * chartHeight,
      label: item.label,
      value: item.value
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (displayData.length === 0) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos disponibles', canvas.width / 2, canvas.height / 2);
        return;
      }

      // Grid lines
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        const value = Math.round((maxValue / gridLines) * (gridLines - i));
        ctx.fillStyle = '#6c757d';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toString(), padding - 15, y + 4);
      }

      // Area fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, color + '30');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding + chartHeight);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();

      // X-axis labels (Ocultas para mostrar solo en tooltip)
      /* data.forEach((item, index) => {
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, points[index].x, padding + chartHeight + 25);
      }); */

      // Tooltip / indicador activo
      if (activePoint) {
        const pointerColor = darkenColor(color, 40);
        ctx.strokeStyle = pointerColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(activePoint.x, padding);
        ctx.lineTo(activePoint.x, padding + chartHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(activePoint.x, activePoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = pointerColor;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        const tooltipWidth = 100;
        const tooltipHeight = 50;
        let tooltipX = activePoint.x - tooltipWidth / 2;
        let tooltipY = activePoint.y - tooltipHeight - 15;
        if (tooltipX < 0) tooltipX = 5;
        if (tooltipX + tooltipWidth > canvas.width) tooltipX = canvas.width - tooltipWidth - 5;
        if (tooltipY < 0) tooltipY = activePoint.y + 15;

        // Tooltip background
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.fill();
        ctx.shadowColor = 'transparent'; // Reset shadow

        // Tooltip border
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // Tooltip text
        ctx.fillStyle = '#212529';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(activePoint.label, tooltipX + tooltipWidth / 2, tooltipY + 20);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#495057';
        ctx.fillText(activePoint.value.toString(), tooltipX + tooltipWidth / 2, tooltipY + 38);
      }
    };

    draw();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      if (chartState.isDragging) {
        const deltaX = x - chartState.lastMouseX;
        const sensitivity = 0.005;
        setChartState(prev => ({
          ...prev,
          offsetX: Math.max(0, Math.min(1, prev.offsetX - deltaX * sensitivity)),
          lastMouseX: x
        }));
        return;
      }
      
      let closestPoint = null;
      let minDistance = Infinity;

      points.forEach(point => {
        const distance = Math.abs(point.x - x);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      if (closestPoint && minDistance < 20) {
        setActivePoint(closestPoint);
      } else {
        setActivePoint(null);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setChartState(prev => ({
        ...prev,
        isDragging: true,
        lastMouseX: x
      }));
    };

    const handleMouseUp = () => {
      setChartState(prev => ({
        ...prev,
        isDragging: false
      }));
    };

    const handleMouseLeave = () => {
      setActivePoint(null);
      setChartState(prev => ({
        ...prev,
        isDragging: false
      }));
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      setChartState(prev => ({
        ...prev,
        zoomLevel: Math.max(1, Math.min(10, prev.zoomLevel * zoomFactor))
      }));
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('wheel', handleWheel);
    };

  }, [displayData, color, height, activePoint, chartState]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        <div className={styles.analysisInfo}>
          <span className={styles.periodInfo}>
            Período: {dataAnalysis.period} ({dataAnalysis.totalDays} días)
          </span>
          <span className={styles.dataCount}>
            Mostrando: {displayData.length} de {filteredData.length} puntos
          </span>
        </div>
      </div>
      
      {/* Controles de filtrado de tiempo */}
      <div className={styles.timeFilters}>
        {dataAnalysis.availableFilters.map(filter => (
          <button
            key={filter}
            className={`${styles.filterButton} ${timeFilter === filter ? styles.activeFilter : ''}`}
            onClick={() => setTimeFilter(filter as TimeFilter)}
          >
            {filter === 'todo' ? 'Todo' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Controles de zoom y navegación */}
      <div className={styles.chartControls}>
        <div className={styles.zoomControls}>
          <button onClick={handleZoomOut} className={styles.controlButton} disabled={chartState.zoomLevel <= 1}>
            -
          </button>
          <span className={styles.zoomLevel}>
            {Math.round(chartState.zoomLevel * 100)}%
          </span>
          <button onClick={handleZoomIn} className={styles.controlButton} disabled={chartState.zoomLevel >= 10}>
            +
          </button>
          <button onClick={handleResetZoom} className={styles.resetButton}>
            Reset
          </button>
        </div>
        
        {chartState.zoomLevel > 1 && (
          <div className={styles.navigationInfo}>
            <span>Arrastra para navegar • Scroll para zoom</span>
          </div>
        )}
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={1000}
          height={height}
          className={styles.canvas}
        />
      </div>
      
      {/* Línea descriptiva */}
      <div className={styles.chartDescription}>
        {displayData.length > 0 ? (
          <span>
            Análisis de {displayData.length} punto{displayData.length !== 1 ? 's' : ''} de datos 
            {timeFilter !== 'todo' && ` (filtro: ${timeFilter})`}
            {chartState.zoomLevel > 1 && ` • Zoom: ${Math.round(chartState.zoomLevel * 100)}%`}
            • Rango: {displayData[0]?.label} - {displayData[displayData.length - 1]?.label}
          </span>
        ) : (
          <span>No hay datos disponibles para el período seleccionado</span>
        )}
      </div>
    </div>
  );
}
