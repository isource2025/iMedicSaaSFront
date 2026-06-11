'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdmissionAdjuntosGrid.module.css';
import { apiFetchBlob } from '@/app/utils/authFetch';
import { adjuntosService } from '@/app/services/adjuntosService';

function isImageByName(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name || '');
}

function str(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

function isImageMime(m: string): boolean {
  return m.startsWith('image/');
}

const PREVIEWS_PAGE_SIZE = 12;

function AdjuntoCard({ idAdjunto, nombreArchivo }: { idAdjunto: number; nombreArchivo: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    const run = async () => {
      try {
        const blob = await apiFetchBlob(`/adjuntos/${idAdjunto}/download`);
        if (cancelled) return;

        const type = blob.type || '';
        setMime(type);
        if (isImageMime(type) || isImageByName(nombreArchivo)) {
          blobUrl = URL.createObjectURL(blob);
          setPreview(blobUrl);
        } else if (type === 'application/pdf' || /\.pdf$/i.test(nombreArchivo)) {
          blobUrl = URL.createObjectURL(blob);
          setPreview(blobUrl);
        }
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('error');
      }
    };

    run();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [idAdjunto]);

  const openView = async () => {
    try {
      await adjuntosService.abrirArchivo(idAdjunto);
    } catch (err) {
      console.error('Error al abrir adjunto:', err);
      alert(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
    }
  };

  const isPdf =
    mime === 'application/pdf' || (!mime && /\.pdf$/i.test(nombreArchivo));

  return (
    <button type="button" className={styles.card} onClick={openView} title={`Abrir: ${nombreArchivo}`}>
      <div className={styles.thumb} aria-hidden>
        {phase === 'loading' ? (
          <span className={styles.loaderWrap}>
            <span className={styles.loaderSpinner} />
            <span className={styles.loaderText}>Cargando vista previa…</span>
          </span>
        ) : null}
        {phase === 'error' ? <span className={styles.fileFallback}>Sin vista previa</span> : null}
        {phase === 'ready' && preview && !isPdf ? <img src={preview} alt="" className={styles.thumbImg} /> : null}
        {phase === 'ready' && preview && isPdf ? (
          <span className={styles.pdfFrame}>
            <iframe
              src={`${preview}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none`}
              className={styles.pdfPreview}
              title={`Vista previa PDF ${nombreArchivo}`}
            />
          </span>
        ) : null}
        {phase === 'ready' && !preview && isPdf ? <span className={styles.pdfBadge}>PDF</span> : null}
        {phase === 'ready' && !preview && !isPdf ? (
          <span className={styles.fileFallback}>Archivo</span>
        ) : null}
      </div>
      <div className={styles.caption}>{nombreArchivo}</div>
    </button>
  );
}

export default function AdmissionAdjuntosGrid({ items }: { items: Record<string, unknown>[] }) {
  if (!items.length) return null;

  const parsedItems = useMemo(
    () =>
      items.flatMap((raw) => {
        const idRaw = raw.IdAdjunto ?? raw.idAdjunto;
        const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
        if (!Number.isFinite(id) || id <= 0) return [];
        const name = str(raw.NombreArchivo ?? raw.Descripcion) || `Adjunto ${id}`;
        return [{ id, name }];
      }),
    [items]
  );
  const [visibleCount, setVisibleCount] = useState(PREVIEWS_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PREVIEWS_PAGE_SIZE);
  }, [items]);

  const visibleItems = parsedItems.slice(0, visibleCount);
  const hasMore = visibleCount < parsedItems.length;

  return (
    <>
      <p className={styles.hint}>
        Vista previa cargada al abrir esta pestaña. Clic en la tarjeta para ver el archivo en el navegador.
      </p>
      <div className={styles.grid}>
        {visibleItems.map((it) => (
          <AdjuntoCard key={it.id} idAdjunto={it.id} nombreArchivo={it.name} />
        ))}
      </div>
      {hasMore ? (
        <div className={styles.moreRow}>
          <button
            type="button"
            className={styles.moreBtn}
            onClick={() => setVisibleCount((n) => n + PREVIEWS_PAGE_SIZE)}
          >
            Cargar más adjuntos ({parsedItems.length - visibleCount} restantes)
          </button>
        </div>
      ) : null}
    </>
  );
}
