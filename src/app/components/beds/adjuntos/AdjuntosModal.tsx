'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { adjuntosService } from '@/app/services/adjuntosService';
import { authService } from '@/app/services/authService';
import { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import FileList from './FileList';
import DicomVideoImporter from './DicomVideoImporter';
import MessageModal, { type MessageModalTone } from '@/app/components/UI/MessageModal';
import {
  feedbackAdjuntoError,
  feedbackDisponibilidadLista,
} from '@/app/utils/adjuntoErrorMessage';
import styles from './AdjuntosModal.module.css';

const PacsEstudiosPanel = dynamic(() => import('@/app/components/pacs/PacsEstudiosPanel'), { ssr: false });

function etiquetaUsuarioActual(): string {
  const u = authService.getCurrentUser() as Record<string, unknown> | null;
  if (!u) return 'Sesión no identificada';
  const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  if (nom) return nom;
  return String(u.username || u.user || u.LoginUsuario || 'Usuario');
}

type Feedback = {
  title: string;
  message: string;
  tone: MessageModalTone;
};

interface AdjuntosModalProps {
  numeroVisita: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdjuntosModal({ numeroVisita, isOpen, onClose }: AdjuntosModalProps) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tiposImagen, setTiposImagen] = useState<TipoImagenHC[]>([]);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState('');
  const [modo, setModo] = useState<'archivos' | 'dicom' | 'visita' | 'pacs'>('visita');
  const [idsNoDisponibles, setIdsNoDisponibles] = useState<Set<number>>(new Set());
  const fileUploadRef = useRef<FileUploadRef>(null);
  const verifyGenRef = useRef(0);

  const showMessage = useCallback((title: string, message: string, tone: MessageModalTone = 'info') => {
    setFeedback({ title, message, tone });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setModo('visita');
      setSelectedFiles([]);
      setTipoImagenCodigo('');
      setIdsNoDisponibles(new Set());
      loadAdjuntos();
    } else {
      verifyGenRef.current += 1;
    }
  }, [isOpen, numeroVisita]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const tipos = await adjuntosService.getTiposImagenes();
        if (!cancelled) setTiposImagen(tipos);
      } catch (e) {
        console.error('Tipos imagen adjuntos:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const verificarArchivos = useCallback(
    async (lista: Adjunto[]) => {
      const gen = ++verifyGenRef.current;
      if (!lista.length) {
        setIdsNoDisponibles(new Set());
        return;
      }
      try {
        const checks = await adjuntosService.verificarDisponibles(lista.map((a) => a.IdAdjunto));
        if (gen !== verifyGenRef.current) return;
        const withNames = checks.map((c) => ({
          ...c,
          nombreArchivo:
            c.nombreArchivo ||
            lista.find((a) => a.IdAdjunto === c.idAdjunto)?.NombreArchivo ||
            null,
        }));
        setIdsNoDisponibles(
          new Set(withNames.filter((c) => !c.disponible).map((c) => c.idAdjunto)),
        );
        const aviso = feedbackDisponibilidadLista(withNames);
        if (aviso) showMessage(aviso.title, aviso.message, 'warning');
      } catch (err) {
        if (gen !== verifyGenRef.current) return;
        const fb = feedbackAdjuntoError(err);
        showMessage(fb.title, fb.message, 'error');
      }
    },
    [showMessage],
  );

  const loadAdjuntos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adjuntosService.getAdjuntosPorVisita(numeroVisita);
      setAdjuntos(response.data);
      setLoading(false);
      void verificarArchivos(response.data || []);
    } catch (err) {
      console.error('Error al cargar adjuntos:', err);
      const fb = feedbackAdjuntoError(err);
      setError(fb.message);
      showMessage(fb.title, fb.message, 'error');
      setLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showMessage('Falta archivo', 'Selecciona al menos un archivo', 'warning');
      return;
    }
    if (!tipoImagenCodigo.trim()) {
      showMessage('Falta tipo de estudio', 'Seleccione el tipo de estudio', 'warning');
      return;
    }

    const cantidadSubida = selectedFiles.length;

    try {
      setUploading(true);
      setError(null);

      if (selectedFiles.length === 1) {
        await adjuntosService.subirArchivo(numeroVisita, selectedFiles[0], tipoImagenCodigo, 'INTERNACION');
      } else {
        await adjuntosService.subirArchivos(numeroVisita, selectedFiles, tipoImagenCodigo, 'INTERNACION');
      }

      setSelectedFiles([]);
      setTipoImagenCodigo('');
      fileUploadRef.current?.clearFiles();
      setUploading(false);
      setModo('visita');
      showMessage(
        'Adjunto subido',
        `${cantidadSubida} archivo(s) subido(s) correctamente`,
        'success',
      );
      await loadAdjuntos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir archivos';
      setError(msg);
      showMessage('Error al subir', msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (idAdjunto: number) => {
    try {
      setLoading(true);
      setError(null);
      await adjuntosService.eliminarAdjunto(idAdjunto);
      await loadAdjuntos();
      showMessage('Adjunto eliminado', 'El archivo se eliminó correctamente', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar adjunto';
      setError(msg);
      showMessage('Error al eliminar', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={`${styles.title} modal-title`}>
            Archivos adjuntos
            <span className={styles.titleMeta}>Visita #{numeroVisita}</span>
          </h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.modeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'visita'}
              className={modo === 'visita' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('visita')}
            >
              Lista de archivos ({adjuntos.length})
            </button>
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
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'pacs'}
              className={modo === 'pacs' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('pacs')}
            >
              Estudios PACS
            </button>
          </div>

          {modo === 'pacs' ? <PacsEstudiosPanel numeroVisita={numeroVisita} /> : null}

          {modo === 'archivos' && (
            <div className={styles.uploadBlock}>
              <FileUpload
                ref={fileUploadRef}
                onFilesSelected={handleFilesSelected}
                onValidationError={(msg) => showMessage('Archivo no válido', msg, 'warning')}
                disabled={uploading}
                maxFiles={5}
              />
              {selectedFiles.length > 0 && (
                <div className={styles.uploadStep}>
                  <label className={styles.tipoStep} htmlFor="modal-adj-tipo-imagen">
                    <span>Tipo de estudio</span>
                    <span className={styles.tipoHint}>Obligatorio para guardar</span>
                    <select
                      id="modal-adj-tipo-imagen"
                      className={styles.tipoSelect}
                      value={tipoImagenCodigo}
                      onChange={(e) => setTipoImagenCodigo(e.target.value)}
                      disabled={uploading}
                    >
                      <option value="">Elegí el tipo…</option>
                      {tiposImagen.map((t) => (
                        <option key={t.TipoImagen} value={t.TipoImagen}>
                          {t.DescTipoImagen}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleUpload()}
                    disabled={uploading}
                    className={styles.uploadButton}
                  >
                    {uploading ? 'Subiendo…' : `Guardar ${selectedFiles.length} archivo(s)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {modo === 'dicom' && (
            <div className={styles.uploadBlock}>
              <DicomVideoImporter
                embedded
                numeroVisita={numeroVisita}
                tiposImagen={tiposImagen}
                onUploaded={async () => {
                  showMessage(
                    'Adjunto subido',
                    'Video generado y guardado como adjunto.',
                    'success',
                  );
                  setModo('visita');
                  await loadAdjuntos();
                }}
              />
            </div>
          )}

          {modo === 'visita' && (
            <div className={styles.listSection}>
              {loading ? (
                <div className={styles.loading}>Cargando archivos…</div>
              ) : (
                <FileList
                  adjuntos={adjuntos}
                  onDelete={handleDelete}
                  onErrorFeedback={(fb) => showMessage(fb.title, fb.message, 'error')}
                  idsNoDisponibles={idsNoDisponibles}
                  readOnly={false}
                  onSubirNuevo={() => setModo('archivos')}
                />
              )}
            </div>
          )}

        </div>
      </div>

      <MessageModal
        open={!!feedback}
        title={feedback?.title || ''}
        message={feedback?.message || ''}
        tone={feedback?.tone || 'info'}
        onClose={() => setFeedback(null)}
      />
    </div>,
    document.body,
  );
}
