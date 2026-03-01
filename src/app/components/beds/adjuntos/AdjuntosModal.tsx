'use client';

import { useState, useEffect } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { Adjunto } from '@/app/types/adjuntos';
import FileUpload from './FileUpload';
import FileList from './FileList';
import styles from './AdjuntosModal.module.css';

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

  useEffect(() => {
    if (isOpen) {
      loadAdjuntos();
    }
  }, [isOpen, numeroVisita]);

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

    try {
      setUploading(true);
      setError(null);

      if (selectedFiles.length === 1) {
        await adjuntosService.subirArchivo(numeroVisita, selectedFiles[0]);
      } else {
        await adjuntosService.subirArchivos(numeroVisita, selectedFiles);
      }

      setSelectedFiles([]);
      await loadAdjuntos();
      alert(`${selectedFiles.length} archivo(s) subido(s) correctamente`);
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
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={uploading}
              maxFiles={5}
            />
            {selectedFiles.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading}
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
