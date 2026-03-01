'use client';

import { useState, useEffect } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { Adjunto } from '@/app/types/adjuntos';
import FileUpload from './FileUpload';
import FileList from './FileList';
import styles from './AdjuntosSection.module.css';

interface AdjuntosSectionProps {
  numeroVisita: number | null;
  patientName?: string;
  patientLocation?: string;
  documentoPaciente?: string;
  fechaIngreso?: string;
  horaIngreso?: string;
}

export default function AdjuntosSection({
  numeroVisita,
  patientName,
  patientLocation,
  documentoPaciente,
  fechaIngreso,
  horaIngreso,
}: AdjuntosSectionProps) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (numeroVisita) {
      loadAdjuntos();
    }
  }, [numeroVisita]);

  const loadAdjuntos = async () => {
    if (!numeroVisita) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adjuntosService.getAdjuntosPorVisita(numeroVisita);
      setAdjuntos(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar adjuntos');
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!numeroVisita || selectedFiles.length === 0) {
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

  if (!numeroVisita) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No hay visita seleccionada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Archivos Adjuntos</h2>
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{patientName || 'PACIENTE'}</span>
            {documentoPaciente && (
              <>
                <span className={styles.separator}>•</span>
                <span>DNI: {documentoPaciente}</span>
              </>
            )}
            {patientLocation && (
              <>
                <span className={styles.separator}>•</span>
                <span>{patientLocation}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Upload Section */}
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

      {/* List Section */}
      <div className={styles.listSection}>
        <h3 className={styles.sectionTitle}>Archivos de la visita</h3>
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
  );
}
