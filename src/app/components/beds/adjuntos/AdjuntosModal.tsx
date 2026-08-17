'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { authService } from '@/app/services/authService';
import { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import FileList from './FileList';
import DicomVideoImporter from './DicomVideoImporter';
import MessageModal, { type MessageModalTone } from '@/app/components/UI/MessageModal';
import styles from './AdjuntosModal.module.css';

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
  const [dicomImporterOpen, setDicomImporterOpen] = useState(false);
  const [modo, setModo] = useState<'archivos' | 'dicom' | 'visita'>('archivos');
  const fileUploadRef = useRef<FileUploadRef>(null);

  const showMessage = useCallback((title: string, message: string, tone: MessageModalTone = 'info') => {
    setFeedback({ title, message, tone });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setModo('archivos');
      setSelectedFiles([]);
      setTipoImagenCodigo('');
      loadAdjuntos();
    }
  }, [isOpen, numeroVisita]);

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

  const loadAdjuntos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adjuntosService.getAdjuntosPorVisita(numeroVisita);
      setAdjuntos(response.data);
    } catch (err) {
      console.error('Error al cargar adjuntos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar adjuntos');
    } finally {
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
        await adjuntosService.subirArchivo(numeroVisita, selectedFiles[0], tipoImagenCodigo);
      } else {
        await adjuntosService.subirArchivos(numeroVisita, selectedFiles, tipoImagenCodigo);
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Archivos Adjuntos - Visita #{numeroVisita}</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <p className={styles.cargadoPor}>Cargás como {etiquetaUsuarioActual()}</p>

          <div className={styles.modeTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'archivos'}
              className={modo === 'archivos' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('archivos')}
            >
              Adjuntos
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
              aria-selected={modo === 'visita'}
              className={modo === 'visita' ? styles.modeTabActive : styles.modeTab}
              onClick={() => setModo('visita')}
            >
              En la visita ({adjuntos.length})
            </button>
          </div>

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
              <p className={styles.dicomLead}>
                Convertí una serie DICOM en un video y lo guardás como adjunto de esta visita.
              </p>
              <label className={styles.tipoStep} htmlFor="modal-dicom-tipo-imagen">
                <span>Tipo de estudio</span>
                <span className={styles.tipoHint}>Obligatorio para importar</span>
                <select
                  id="modal-dicom-tipo-imagen"
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
                className={styles.dicomImportButton}
                disabled={uploading}
                onClick={() => {
                  if (!tipoImagenCodigo.trim()) {
                    showMessage(
                      'Falta tipo de estudio',
                      'Elegí el tipo de estudio y después importá la serie.',
                      'warning',
                    );
                    return;
                  }
                  setDicomImporterOpen(true);
                }}
              >
                Elegir serie DICOM
              </button>
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
                  onError={(msg) => showMessage('Error', msg, 'error')}
                  readOnly={false}
                />
              )}
            </div>
          )}

          <DicomVideoImporter
            open={dicomImporterOpen}
            onClose={() => setDicomImporterOpen(false)}
            numeroVisita={numeroVisita}
            tipoImagenCodigo={tipoImagenCodigo}
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
      </div>

      <MessageModal
        open={!!feedback}
        title={feedback?.title || ''}
        message={feedback?.message || ''}
        tone={feedback?.tone || 'info'}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
