'use client';

import { useEffect, useState } from 'react';
import styles from './AdmissionAdjuntosGrid.module.css';

function baseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return '';
}

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

function AdjuntoCard({ idAdjunto, nombreArchivo }: { idAdjunto: number; nombreArchivo: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    const run = async () => {
      try {
        const candidates = [
          `${baseUrl()}/adjuntos/${idAdjunto}/download`,
          `/adjuntos/${idAdjunto}/download`,
        ];

        let blob: Blob | null = null;
        for (const url of candidates) {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) continue;
          blob = await res.blob();
          break;
        }

        if (!blob) throw new Error('fetch');
        if (cancelled) return;

        const type = blob.type || '';
        setMime(type);
        if (isImageMime(type) || isImageByName(nombreArchivo)) {
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

  const openView = () => {
    window.open(`${baseUrl()}/adjuntos/${idAdjunto}/download`, '_blank', 'noopener,noreferrer');
  };

  const isPdf =
    mime === 'application/pdf' || (!mime && /\.pdf$/i.test(nombreArchivo));

  return (
    <button type="button" className={styles.card} onClick={openView} title={`Abrir: ${nombreArchivo}`}>
      <div className={styles.thumb} aria-hidden>
        {phase === 'loading' ? <span className={styles.skeleton} /> : null}
        {phase === 'error' ? <span className={styles.fileFallback}>Sin vista previa</span> : null}
        {phase === 'ready' && preview ? <img src={preview} alt="" className={styles.thumbImg} /> : null}
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
  return (
    <>
      <p className={styles.hint}>
        Vista previa cargada al abrir esta pestaña. Clic en la tarjeta para ver el archivo en el navegador.
      </p>
      <div className={styles.grid}>
        {items.flatMap((raw) => {
          const idRaw = raw.IdAdjunto ?? raw.idAdjunto;
          const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
          if (!Number.isFinite(id) || id <= 0) return [];
          const name = str(raw.NombreArchivo ?? raw.Descripcion) || `Adjunto ${id}`;
          return [<AdjuntoCard key={id} idAdjunto={id} nombreArchivo={name} />];
        })}
      </div>
    </>
  );
}
