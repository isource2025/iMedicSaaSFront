'use client';

import { useState, useEffect, useRef } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { authService } from '@/app/services/authService';
import { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import FileList from './FileList';
import styles from './AdjuntosModal.module.css';

function etiquetaUsuarioActual(): string {
  const u = authService.getCurrentUser() as Record<string, unknown> | null;
  if (!u) return 'Sesión no identificada';
  const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  if (nom) return nom;
  return String(u.username || u.user || u.LoginUsuario || 'Usuario');
}

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tiposImagen, setTiposImagen] = useState<TipoImagenHC[]>([]);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState<string>('');
  const fileUploadRef = useRef<FileUploadRef>(null);

  useEffect(() => {
    if (isOpen) {
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
      // Solo mostrar error si es un error real, no cuando simplemente no hay adjuntos
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
      alert('Selecciona al menos un archivo');
      return;
    }
    if (!tipoImagenCodigo.trim()) {
      alert('Seleccione el tipo de estudio');
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

      // Limpiar archivos seleccionados
      setSelectedFiles([]);
      fileUploadRef.current?.clearFiles();
      
      await loadAdjuntos();
      alert(`${cantidadSubida} archivo(s) subido(s) correctamente`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivos');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar adjunto');
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

          <div className={styles.uploadSection}>
            <h3 className={styles.sectionTitle}>Subir archivos</h3>
            <div className={styles.uploadMetaGrid}>
              <div className={styles.uploadMetaCard}>
                <span className={styles.uploadMetaLabel}>Cargado por</span>
                <span className={styles.uploadMetaValue}>{etiquetaUsuarioActual()}</span>
              </div>
              <div className={styles.uploadMetaCard}>
                <label className={styles.uploadMetaLabel} htmlFor="modal-adj-tipo-imagen">
                  Tipo de estudio
                </label>
                <select
                  id="modal-adj-tipo-imagen"
                  className={styles.tipoSelect}
                  value={tipoImagenCodigo}
                  onChange={(e) => setTipoImagenCodigo(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">Seleccione un tipo…</option>
                  {tiposImagen.map((t) => (
                    <option key={t.TipoImagen} value={t.TipoImagen}>
                      {t.DescTipoImagen}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <FileUpload
              ref={fileUploadRef}
              onFilesSelected={handleFilesSelected}
              disabled={uploading}
              maxFiles={5}
            />
            {selectedFiles.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading || !tipoImagenCodigo.trim()}
                className={styles.uploadButton}
              >
                {uploading ? 'Subiendo...' : `Subir ${selectedFiles.length} archivo(s)`}
              </button>
            )}
          </div>

          <div className={styles.listSection}>
            {loading ? (
              <div className={styles.loading}>Cargando archivos...</div>
            ) : (
              <FileList
                adjuntos={adjuntos}
                onDelete={handleDelete}
                readOnly={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
