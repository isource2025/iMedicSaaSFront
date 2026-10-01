'use client';

import { useEffect, useRef, useState } from 'react';
import { descargarLibroExcel, type LibroExcel } from '@/app/utils/export/libroExcel';
import styles from './ExportExcelButton.module.css';

interface ExportExcelButtonProps {
  /**
   * Arma el libro con lo que la vista tiene cargado para el período posicionado.
   * Devuelve null si todavía no hay datos.
   */
  construir: () => LibroExcel | null;
  /** Deshabilita mientras carga o si no hay datos para exportar. */
  disabled?: boolean;
  /** Texto de ayuda cuando está deshabilitado. */
  motivoDeshabilitado?: string;
}

export function ExportExcelButton({
  construir,
  disabled = false,
  motivoDeshabilitado = 'Esperá a que terminen de cargar los datos',
}: ExportExcelButtonProps) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const exportar = async () => {
    setError(null);
    setExportando(true);
    try {
      const libro = construir();
      if (!libro) throw new Error('No hay datos para exportar');
      await descargarLibroExcel(libro);
    } catch (e) {
      console.error('Error exportando a Excel:', e);
      setError('No se pudo generar el Excel');
      temporizador.current = setTimeout(() => setError(null), 5000);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={exportar}
        disabled={disabled || exportando}
        title={disabled ? motivoDeshabilitado : 'Descargar los datos del período en un archivo de Excel'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        {exportando ? 'Generando…' : 'Exportar a Excel'}
      </button>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default ExportExcelButton;
