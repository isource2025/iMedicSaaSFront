'use client';

import styles from './AdjuntoFileViewer.module.css';

export interface AdjuntoViewerState {
  blobUrl: string;
  fileName: string;
  mimeType: string;
}

function isPdf(fileName: string, mimeType: string): boolean {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);
}

function isImage(fileName: string, mimeType: string): boolean {
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(fileName);
}

interface AdjuntoFileViewerProps {
  viewer: AdjuntoViewerState | null;
  loading?: boolean;
  onClose: () => void;
}

export default function AdjuntoFileViewer({ viewer, loading = false, onClose }: AdjuntoFileViewerProps) {
  if (!viewer && !loading) return null;

  const fileName = viewer?.fileName || 'Archivo';
  const mimeType = viewer?.mimeType || '';
  const blobUrl = viewer?.blobUrl || '';
  const pdf = viewer ? isPdf(fileName, mimeType) : false;
  const image = viewer ? isImage(fileName, mimeType) : false;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{fileName}</span>
          <div className={styles.actions}>
            {viewer ? (
              <a className={styles.btnDownload} href={blobUrl} download={fileName}>
                Descargar
              </a>
            ) : null}
            <button type="button" className={styles.btnClose} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
        <div className={styles.body}>
          {loading ? <div className={styles.loading}>Cargando archivo…</div> : null}
          {!loading && viewer && pdf ? (
            <iframe src={blobUrl} className={styles.frame} title={fileName} />
          ) : null}
          {!loading && viewer && image ? (
            <img src={blobUrl} alt={fileName} className={styles.image} />
          ) : null}
          {!loading && viewer && !pdf && !image ? (
            <div className={styles.fallback}>
              <p>Vista previa no disponible para este formato.</p>
              <a className={styles.btnDownload} href={blobUrl} download={fileName}>
                Descargar archivo
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
