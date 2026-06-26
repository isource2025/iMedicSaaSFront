'use client';

import { useEffect, useRef, useState } from 'react';
import { renderDicomToCanvas } from '@/app/utils/dicomRenderer';
import styles from './AdjuntoFileViewer.module.css';

interface DicomViewerProps {
  blobUrl: string;
}

export default function DicomViewer({ blobUrl }: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setStatus('loading');
      setErrorMsg('');

      try {
        const response = await fetch(blobUrl);
        if (!response.ok) throw new Error('No se pudo cargar el archivo DICOM.');

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        await renderDicomToCanvas(buffer, canvas);
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'No se pudo renderizar el archivo DICOM.');
          setStatus('error');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [blobUrl]);

  if (status === 'loading') {
    return <div className={styles.loading}>Cargando imagen DICOM…</div>;
  }

  if (status === 'error') {
    return (
      <div className={styles.fallback}>
        <p>{errorMsg}</p>
        <a className={styles.btnDownload} href={blobUrl} download>
          Descargar archivo DICOM
        </a>
      </div>
    );
  }

  return (
    <div className={styles.dicomWrap}>
      <canvas ref={canvasRef} className={styles.dicomCanvas} />
    </div>
  );
}
