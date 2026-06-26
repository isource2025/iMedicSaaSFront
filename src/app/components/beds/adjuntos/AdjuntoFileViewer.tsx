'use client';

import styles from './AdjuntoFileViewer.module.css';
import { isDicom, isImage, isPdf, isVideo } from '@/app/utils/adjuntoFileTypes';
import DicomViewer from './DicomViewer';

export interface AdjuntoViewerState {
  blobUrl: string;
  fileName: string;
  mimeType: string;
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
  const dicom = viewer ? isDicom(fileName, mimeType) : false;
  const video = viewer ? isVideo(fileName, mimeType) : false;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={`${styles.panel} ${dicom ? styles.panelDicom : ''}`} onClick={(e) => e.stopPropagation()}>
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
          {!loading && viewer && dicom ? <DicomViewer blobUrl={blobUrl} /> : null}
          {!loading && viewer && video ? (
            <video src={blobUrl} className={styles.frame} controls playsInline title={fileName} />
          ) : null}
          {!loading && viewer && !pdf && !image && !dicom && !video ? (
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
