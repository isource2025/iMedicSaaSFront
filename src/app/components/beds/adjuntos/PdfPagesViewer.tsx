'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfFromUrl, renderPdfPageToCanvas } from '@/app/utils/pdfJs';
import styles from './PdfPagesViewer.module.css';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

interface PdfPagesViewerProps {
  blobUrl: string;
  fileName: string;
}

export default function PdfPagesViewer({ blobUrl, fileName }: PdfPagesViewerProps) {
  const [scale, setScale] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderGen = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setErrorMsg('');
    setPageCount(0);
    setScale(1);
    pdfRef.current?.destroy().catch(() => undefined);
    pdfRef.current = null;

    void loadPdfFromUrl(blobUrl)
      .then((pdf) => {
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        pdfRef.current = pdf;
        canvasRefs.current = Array.from({ length: pdf.numPages }, () => null);
        setPageCount(pdf.numPages);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error al abrir PDF:', err);
        setErrorMsg(err instanceof Error ? err.message : 'No se pudo abrir el PDF');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      renderGen.current += 1;
      const pdf = pdfRef.current;
      pdfRef.current = null;
      void pdf?.destroy();
    };
  }, [blobUrl]);

  const paintPages = useCallback(async (zoom: number) => {
    const pdf = pdfRef.current;
    if (!pdf || pageCount <= 0) return;
    const gen = ++renderGen.current;
    const baseScale = Math.min(
      (typeof window !== 'undefined' ? Math.max(window.innerWidth - 48, 280) : 720) / 720,
      1.15
    );
    const renderScale = baseScale * zoom;

    for (let i = 0; i < pageCount; i += 1) {
      if (gen !== renderGen.current) return;
      const canvas = canvasRefs.current[i];
      if (!canvas) continue;
      try {
        await renderPdfPageToCanvas(pdf, i + 1, canvas, renderScale);
      } catch (err) {
        if (gen !== renderGen.current) return;
        console.error(`Error al renderizar página ${i + 1}:`, err);
      }
    }
  }, [pageCount]);

  useLayoutEffect(() => {
    if (status !== 'ready' || pageCount <= 0) return;
    void paintPages(scale);
  }, [status, pageCount, scale, paintPages]);

  if (status === 'loading') {
    return <div className={styles.status}>Cargando PDF…</div>;
  }

  if (status === 'error') {
    return (
      <div className={`${styles.status} ${styles.error}`}>
        {errorMsg || 'No se pudo mostrar el PDF en este dispositivo.'}
        <br />
        Usá Descargar para abrirlo.
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="toolbar" aria-label="Zoom del PDF">
        <button
          type="button"
          className={styles.btn}
          onClick={() => setScale((s) => clampZoom(s - ZOOM_STEP))}
          disabled={scale <= MIN_ZOOM}
          title="Alejar"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          className={styles.level}
          onClick={() => setScale(1)}
          title="Restablecer zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => setScale((s) => clampZoom(s + ZOOM_STEP))}
          disabled={scale >= MAX_ZOOM}
          title="Acercar"
          aria-label="Acercar"
        >
          +
        </button>
        {pageCount > 0 ? (
          <span className={styles.pageInfo} aria-live="polite">
            {pageCount} pág.
          </span>
        ) : null}
      </div>
      <div className={styles.stage}>
        <div className={styles.pages} aria-label={fileName}>
          {Array.from({ length: pageCount }, (_, i) => (
            <canvas
              key={`${blobUrl}-p${i + 1}`}
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              className={styles.page}
              aria-label={`Página ${i + 1} de ${pageCount}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
