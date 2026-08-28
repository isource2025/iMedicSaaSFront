'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AmbulatorioAnalytics.module.css';

interface AnimatedCounterProps {
  value: number;
  /** Reinicia la animación cuando cambia (p. ej. filtros de fecha). */
  animationKey?: string;
  durationMs?: number;
  className?: string;
}

/** Cuenta desde 0 hasta `value` con ease-out y deslizamiento hacia arriba al montar. */
export function AnimatedCounter({
  value,
  animationKey = '',
  durationMs = 1400,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const [entered, setEntered] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setEntered(false);
    setDisplay(0);

    const enterTimer = window.setTimeout(() => setEntered(true), 40);

    let start: number | null = null;
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    const startTimer = window.setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick);
    }, 120);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(startTimer);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, animationKey, durationMs]);

  return (
    <span
      className={`${styles.totalizadorValue} ${entered ? styles.totalizadorVisible : ''} ${className ?? ''}`}
      aria-live="polite"
    >
      {display.toLocaleString('es-AR')}
    </span>
  );
}
