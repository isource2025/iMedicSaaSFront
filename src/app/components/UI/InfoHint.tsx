'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import styles from './InfoHint.module.css';

type Props = {
  /** Qué explica el ícono; se usa para el lector de pantalla. */
  label: string;
  /** Texto de ayuda en lenguaje cotidiano. */
  text: string;
};

/**
 * Ícono de información con una explicación breve. Se abre al pasar el mouse,
 * al enfocarlo con teclado o al tocarlo, y se cierra con Escape.
 *
 * Es un `span` con rol de botón (no un `button`) para poder ponerlo dentro de
 * un `<label>` sin que le robe el campo asociado.
 */
export default function InfoHint({ label, text }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alTocarFuera);
    return () => document.removeEventListener('mousedown', alTocarFuera);
  }, [abierto]);

  if (!text) return null;

  return (
    <span
      ref={raiz}
      className={styles.raiz}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <span
        role="button"
        tabIndex={0}
        className={styles.icono}
        aria-label={`Qué es ${label}`}
        aria-describedby={abierto ? id : undefined}
        aria-expanded={abierto}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAbierto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setAbierto(false);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setAbierto((v) => !v);
          }
        }}
      >
        <Info size={14} aria-hidden="true" />
      </span>
      {abierto ? (
        <span id={id} role="tooltip" className={styles.globo}>
          {text}
        </span>
      ) : null}
    </span>
  );
}
