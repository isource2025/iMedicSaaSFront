'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { buildVideoFromDicomFiles, DicomVideoBuildResult } from '@/app/utils/dicomVideoBuilder';
import {
  inferFpsFromDicomFiles,
  isDicomFile,
  sortDicomFilesByNumericOrder,
} from '@/app/utils/dicomSort';
import styles from './DicomVideoImporter.module.css';

interface DicomVideoImporterProps {
  open: boolean;
  onClose: () => void;
  numeroVisita: number;
  tipoImagenCodigo: string;
  onUploaded: () => void;
}

export default function DicomVideoImporter({
  open,
  onClose,
  numeroVisita,
  tipoImagenCodigo,
  onUploaded,
}: DicomVideoImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fps, setFps] = useState(12);
  const [fpsTouched, setFpsTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DicomVideoBuildResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sortedFiles = useMemo(() => sortDicomFilesByNumericOrder(files), [files]);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
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
  }, [open]);

  useEffect(() => {
    if (!files.length || fpsTouched) return;
    setFps(inferFpsFromDicomFiles(files));
  }, [files, fpsTouched]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

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
      [...prev, ...list].forEach((file) => map.set(`${file.name}-${file.size}`, file));
      return Array.from(map.values());
    });
  };

  const handleGenerate = async () => {
    if (sortedFiles.length < 2) {
      setError('Arrastre al menos 2 archivos DICOM numerados.');
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
      const url = URL.createObjectURL(built.blob);
      setPreviewUrl(url);
      setResult(built);
      setProgress(100);
      setProgressMessage(`Video listo: ${built.frameCount} frames a ${built.fps} fps.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el video.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    if (!tipoImagenCodigo.trim()) {
      setError('Seleccione el tipo de estudio antes de guardar.');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const videoFile = new File([result.blob], result.fileName, { type: result.mimeType });
      await adjuntosService.subirArchivo(numeroVisita, videoFile, tipoImagenCodigo);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el video como adjunto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Importar serie DICOM → Video</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            Arrastre todos los archivos <strong>.dcm</strong> de la serie. Se ordenan por el número en el
            nombre y se genera un video para guardarlo como adjunto (no se suben los DICOM sueltos).
          </p>

          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropActive : ''}`}
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
            <div>Arrastre los DICOM aquí o haga clic para seleccionarlos</div>
          </div>

          {sortedFiles.length > 0 ? (
            <div className={styles.fileSummary}>
              <strong>{sortedFiles.length}</strong> archivo(s) — orden por número en nombre:
              <ol className={styles.fileList}>
                {sortedFiles.slice(0, 8).map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
                {sortedFiles.length > 8 ? <li>… y {sortedFiles.length - 8} más</li> : null}
              </ol>
            </div>
          ) : null}

          <div className={styles.metaRow}>
            <div className={styles.fileSummary}>
              El FPS se sugiere según el rango numérico de los archivos. Puede ajustarlo antes de generar.
            </div>
            <label className={styles.label}>
              FPS
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

          {busy ? (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressText}>{progressMessage || 'Procesando…'}</span>
            </div>
          ) : null}

          {previewUrl ? (
            <video src={previewUrl} className={styles.preview} controls playsInline />
          ) : null}

          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleGenerate}
              disabled={busy || sortedFiles.length < 2}
            >
              {busy && !result ? 'Generando video…' : 'Generar video'}
            </button>
            {result ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={busy || !tipoImagenCodigo.trim()}
              >
                {busy ? 'Guardando…' : 'Guardar como adjunto'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
