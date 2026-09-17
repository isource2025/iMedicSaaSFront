'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function ZoomablePreview({
  blobUrl,
  fileName,
  kind,
}: {
  blobUrl: string;
  fileName: string;
  kind: 'image' | 'pdf';
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [blobUrl]);

  const zoomAt = useCallback((next: number, clientX?: number, clientY?: number) => {
    const stage = stageRef.current;
    const clamped = clampZoom(next);
    if (clamped === 1 || !stage) {
      setScale(clamped);
      if (clamped === 1) setOffset({ x: 0, y: 0 });
      return;
    }
    const rect = stage.getBoundingClientRect();
    const cx = clientX == null ? rect.width / 2 : clientX - rect.left;
    const cy = clientY == null ? rect.height / 2 : clientY - rect.top;
    setScale((prev) => {
      const ratio = clamped / prev;
      setOffset((o) => ({
        x: cx - (cx - o.x) * ratio,
        y: cy - (cy - o.y) * ratio,
      }));
      return clamped;
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((prev) => {
        const clamped = clampZoom(prev + delta);
        if (clamped === 1) {
          setOffset({ x: 0, y: 0 });
          return 1;
        }
        const rect = stage.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const ratio = clamped / prev;
        setOffset((o) => ({
          x: cx - (cx - o.x) * ratio,
          y: cy - (cy - o.y) * ratio,
        }));
        return clamped;
      });
    };
    stage.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onNativeWheel);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setGrabbing(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.current.originX + (e.clientX - drag.current.startX),
      y: drag.current.originY + (e.clientY - drag.current.startY),
    });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    drag.current = null;
    setGrabbing(false);
  };

  const onDoubleClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    zoomAt(2, e.clientX, e.clientY);
  };

  return (
    <div className={styles.zoomWrap}>
      <div className={styles.zoomBar} role="toolbar" aria-label="Zoom">
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => zoomAt(scale - ZOOM_STEP)}
          disabled={scale <= MIN_ZOOM}
          title="Alejar"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomLevel}
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          title="Restablecer zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          onClick={() => zoomAt(scale + ZOOM_STEP)}
          disabled={scale >= MAX_ZOOM}
          title="Acercar"
          aria-label="Acercar"
        >
          +
        </button>
      </div>
      <div
        ref={stageRef}
        className={`${styles.zoomStage} ${grabbing ? styles.zoomStageGrabbing : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
      >
        {kind === 'image' ? (
          <img
            src={blobUrl}
            alt={fileName}
            className={styles.zoomImage}
            draggable={false}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          />
        ) : (
          <iframe
            src={blobUrl}
            title={fileName}
            className={styles.zoomFrame}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          />
        )}
      </div>
    </div>
  );
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
              <a
                className={styles.btnDownload}
                href={blobUrl}
                download={fileName}
                aria-label="Descargar"
                title="Descargar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className={styles.btnLabel}>Descargar</span>
              </a>
            ) : null}
            <button
              type="button"
              className={styles.btnClose}
              onClick={onClose}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span className={styles.btnLabel}>Cerrar</span>
            </button>
          </div>
        </div>
        <div className={styles.body}>
          {loading ? <div className={styles.loading}>Cargando archivo…</div> : null}
          {!loading && viewer && pdf ? (
            <ZoomablePreview blobUrl={blobUrl} fileName={fileName} kind="pdf" />
          ) : null}
          {!loading && viewer && image ? (
            <ZoomablePreview blobUrl={blobUrl} fileName={fileName} kind="image" />
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
