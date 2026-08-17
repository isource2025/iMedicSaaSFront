'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import { buildVideoFromDicomFiles, DicomVideoBuildResult } from '@/app/utils/dicomVideoBuilder';
import {
  inferFpsFromDicomFiles,
  isDicomFile,
  sortDicomFilesByNumericOrder,
} from '@/app/utils/dicomSort';
import styles from './DicomVideoImporter.module.css';

interface DicomVideoImporterProps {
  numeroVisita: number;
  tiposImagen: TipoImagenHC[];
  onUploaded: () => void;
  /** Si es true, se muestra en la pestaña (sin segundo modal). */
  embedded?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export default function DicomVideoImporter({
  numeroVisita,
  tiposImagen,
  onUploaded,
  embedded = false,
  open = true,
  onClose,
}: DicomVideoImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState('');
  const [fps, setFps] = useState(12);
  const [fpsTouched, setFpsTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DicomVideoBuildResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sortedFiles = useMemo(() => sortDicomFilesByNumericOrder(files), [files]);
  const hasFiles = sortedFiles.length > 0;

  const reset = () => {
    setFiles([]);
    setTipoImagenCodigo('');
    setFps(12);
    setFpsTouched(false);
    setBusy(false);
    setProgress(0);
    setProgressMessage('');
    setError(null);
    setResult(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  useEffect(() => {
    if (embedded) return;
    if (!open) return;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, embedded]);

  useEffect(() => {
    if (!files.length || fpsTouched) return;
    setFps(inferFpsFromDicomFiles(files));
  }, [files, fpsTouched]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!embedded && !open) return null;

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter(isDicomFile);
    if (!list.length) {
      setError('Solo se aceptan archivos DICOM (.dcm).');
      return;
    }
    setError(null);
    setResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFiles((prev) => {
      const map = new Map<string, File>();
      prev.concat(list).forEach((file) => map.set(`${file.name}-${file.size}`, file));
      return Array.from(map.values());
    });
  };

  const removeFile = (name: string, size: number) => {
    setFiles((prev) => prev.filter((f) => !(f.name === name && f.size === size)));
    setResult(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (sortedFiles.length < 2) {
      setError('Necesitás al menos 2 archivos DICOM de la serie.');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      setProgress(0);
      setProgressMessage('Iniciando…');
      const built = await buildVideoFromDicomFiles(sortedFiles, fps, (p) => {
        const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
        setProgress(pct);
        setProgressMessage(p.message);
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(built.blob));
      setResult(built);
      setProgress(100);
      setProgressMessage(`${built.frameCount} frames · ${built.fps} fps`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el video.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    if (!tipoImagenCodigo.trim()) {
      setError('Elegí el tipo de estudio para guardar.');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const videoFile = new File([result.blob], result.fileName, { type: result.mimeType });
      await adjuntosService.subirArchivo(numeroVisita, videoFile, tipoImagenCodigo);
      reset();
      onUploaded();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el video como adjunto.');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className={styles.body}>
      <p className={styles.hint}>
        Arrastrá los <strong>.dcm</strong> de la serie. Se ordenan por el número del nombre y se
        genera un video (no se suben los DICOM sueltos).
      </p>

      <div className={hasFiles ? styles.pendingRow : undefined}>
        <div
          className={`${styles.dropZone} ${hasFiles ? styles.dropZoneCompact : ''} ${
            dragActive ? styles.dropActive : ''
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (!busy) addFiles(e.dataTransfer.files);
          }}
          onClick={() => !busy && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".dcm,.dicom,application/dicom"
            className={styles.fileInput}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <span className={styles.dropIcon}>🩻</span>
          <div className={styles.dropText}>
            {hasFiles ? 'Agregar más .dcm' : 'Arrastrá los DICOM o hacé click'}
          </div>
          {!hasFiles ? <div className={styles.dropMeta}>Mínimo 2 archivos de la misma serie</div> : null}
        </div>

        {hasFiles ? (
          <div className={styles.fileSummary}>
            <div className={styles.fileSummaryHead}>
              <span>
                Serie · <strong>{sortedFiles.length}</strong> archivo{sortedFiles.length === 1 ? '' : 's'}
              </span>
              <button type="button" className={styles.clearBtn} disabled={busy} onClick={reset}>
                Vaciar
              </button>
            </div>
            <ul className={styles.fileList}>
              {sortedFiles.slice(0, 10).map((file) => (
                <li key={`${file.name}-${file.size}`} className={styles.fileRow}>
                  <span className={styles.fileName}>{file.name}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.name, file.size);
                    }}
                    aria-label={`Quitar ${file.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
              {sortedFiles.length > 10 ? (
                <li className={styles.fileMore}>… y {sortedFiles.length - 10} más</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {hasFiles ? (
        <div className={styles.steps}>
          <label className={styles.label}>
            <span>Tipo de estudio</span>
            <span className={styles.tipoHint}>Obligatorio para guardar</span>
            <select
              className={styles.select}
              value={tipoImagenCodigo}
              disabled={busy}
              onChange={(e) => setTipoImagenCodigo(e.target.value)}
            >
              <option value="">Elegí el tipo…</option>
              {tiposImagen.map((t) => (
                <option key={t.TipoImagen} value={t.TipoImagen}>
                  {t.DescTipoImagen}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            <span>FPS</span>
            <span className={styles.tipoHint}>Se sugiere según los números del nombre</span>
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              className={styles.fpsInput}
              value={fps}
              disabled={busy}
              onChange={(e) => {
                setFpsTouched(true);
                setFps(Number(e.target.value) || 12);
              }}
            />
          </label>
        </div>
      ) : null}

      {busy ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>{progressMessage || 'Procesando…'}</span>
        </div>
      ) : null}

      {previewUrl ? <video src={previewUrl} className={styles.preview} controls playsInline /> : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {hasFiles ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleGenerate}
            disabled={busy || sortedFiles.length < 2}
          >
            {busy && !result ? 'Generando…' : result ? 'Regenerar video' : 'Generar video'}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => void handleSave()}
            disabled={busy || !result}
          >
            {busy && result ? 'Guardando…' : 'Guardar video'}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={styles.embedded}>{body}</div>;
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Serie DICOM → video</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
