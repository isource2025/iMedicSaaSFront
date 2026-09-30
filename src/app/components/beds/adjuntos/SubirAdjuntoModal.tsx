'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { adjuntosService } from '@/app/services/adjuntosService';
import type { TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import DicomVideoImporter from './DicomVideoImporter';
import styles from './AdjuntosModal.module.css';

export interface SubirAdjuntoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe los archivos y el tipo elegido; si lanza error, el modal queda abierto y lo muestra. */
  onConfirm: (files: File[], tipoImagen: string) => Promise<void> | void;
  /** Texto gris junto al título, p. ej. "Visita #123". */
  titleMeta?: string;
  tiposImagen?: TipoImagenHC[];
  tipoInicial?: string;
  maxFiles?: number;
  confirmLabel?: (cantidad: number) => string;
}

export default function SubirAdjuntoModal({
  isOpen,
  onClose,
  onConfirm,
  titleMeta,
  tiposImagen,
  tipoInicial = '',
  maxFiles = 5,
  confirmLabel = (n) => `Guardar ${n} archivo(s)`,
}: SubirAdjuntoModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tipos, setTipos] = useState<TipoImagenHC[]>(tiposImagen ?? []);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState(tipoInicial);
  const [modo, setModo] = useState<'archivos' | 'dicom'>('archivos');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileUploadRef = useRef<FileUploadRef>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFiles([]);
    setTipoImagenCodigo(tipoInicial);
    setModo('archivos');
    setError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (tiposImagen) setTipos(tiposImagen);
  }, [tiposImagen]);

  useEffect(() => {
    if (!isOpen || tiposImagen) return;
    let cancelled = false;
    adjuntosService
      .getTiposImagenes()
      .then((list) => {
        if (!cancelled) setTipos(list);
      })
      .catch((e) => console.error('Tipos imagen adjuntos:', e));
    return () => {
      cancelled = true;
    };
  }, [isOpen, tiposImagen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const cerrar = () => {
    if (saving) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      setError('Seleccioná al menos un archivo');
      return;
    }
    if (!tipoImagenCodigo.trim()) {
      setError('Seleccioná el tipo de estudio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(selectedFiles, tipoImagenCodigo.trim());
      fileUploadRef.current?.clearFiles();
      setSaving(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo');
      setSaving(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} onClick={cerrar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={`${styles.title} modal-title`}>
            Subir adjunto
            {titleMeta ? <span className={styles.titleMeta}>{titleMeta}</span> : null}
          </h2>
          <button type="button" onClick={cerrar} className={styles.closeButton} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'archivos'}
              className={modo === 'archivos' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('archivos')}
            >
              Subir adjunto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'dicom'}
              className={modo === 'dicom' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('dicom')}
            >
              Serie DICOM
            </button>
          </div>

          {modo === 'archivos' && (
            <div className={styles.uploadBlock}>
              <FileUpload
                ref={fileUploadRef}
                onFilesSelected={(files) => {
                  setSelectedFiles(files);
                  setError(null);
                }}
                onValidationError={(msg) => setError(msg)}
                disabled={saving}
                maxFiles={maxFiles}
              />
              {selectedFiles.length > 0 && (
                <div className={styles.uploadStep}>
                  <label className={styles.tipoStep} htmlFor="subir-adj-tipo-imagen">
                    <span>Tipo de estudio</span>
                    <span className={styles.tipoHint}>Obligatorio para guardar</span>
                    <select
                      id="subir-adj-tipo-imagen"
                      className={styles.tipoSelect}
                      value={tipoImagenCodigo}
                      onChange={(e) => setTipoImagenCodigo(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Elegí el tipo…</option>
                      {tipos.map((t) => (
                        <option key={t.TipoImagen} value={t.TipoImagen}>
                          {t.DescTipoImagen || t.TipoImagen}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={saving}
                    className={styles.uploadButton}
                  >
                    {saving ? 'Subiendo…' : confirmLabel(selectedFiles.length)}
                  </button>
                </div>
              )}
            </div>
          )}

          {modo === 'dicom' && (
            <div className={styles.uploadBlock}>
              <DicomVideoImporter
                embedded
                tiposImagen={tipos}
                onSave={(video, tipo) => onConfirm([video], tipo)}
                onUploaded={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
