'use client';

import { useState, useEffect, useRef } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { authService } from '@/app/services/authService';
import { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import FileList from './FileList';
import DicomVideoImporter from './DicomVideoImporter';
import styles from './AdjuntosSection.module.css';
import Loader from '../../Loader/Loader';
import { useBedDetail } from '../contexts/BedDetailContext';

function etiquetaUsuarioActual(): string {
  const u = authService.getCurrentUser() as Record<string, unknown> | null;
  if (!u) return 'Sesión no identificada';
  const nom = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  if (nom) return nom;
  return String(u.username || u.user || u.LoginUsuario || 'Usuario');
}

const MS_72H = 72 * 60 * 60 * 1000;

function countAdjuntosRecientes(list: Adjunto[]): number {
  const now = Date.now();
  return list.filter((a) => {
    const t = new Date(a.FechaCarga).getTime();
    return !Number.isNaN(t) && now - t < MS_72H;
  }).length;
}

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
  const { setAdjuntosSidebarInfo } = useBedDetail();
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tiposImagen, setTiposImagen] = useState<TipoImagenHC[]>([]);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState<string>('');
  const [dicomImporterOpen, setDicomImporterOpen] = useState(false);
  const fileUploadRef = useRef<FileUploadRef>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (numeroVisita) {
      setAdjuntos([]);
      setAdjuntosSidebarInfo(0, 0);
      loadAdjuntos();
    }
  }, [numeroVisita]);

  useEffect(() => {
    setAdjuntosSidebarInfo(adjuntos.length, countAdjuntosRecientes(adjuntos));
  }, [adjuntos, setAdjuntosSidebarInfo]);

  const loadAdjuntos = async () => {
    if (!numeroVisita) return;

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
    if (!numeroVisita || selectedFiles.length === 0) {
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

      {adjuntos.length > 0 && countAdjuntosRecientes(adjuntos) > 0 && (
        <p className={styles.adjuntosNotaRecientes} role="status">
          Hay archivos cargados en las últimas 72 horas. El ítem &quot;Archivos Adjuntos&quot; del menú se resalta para facilitar su ubicación (no reemplaza notificaciones por base de datos).
        </p>
      )}

      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>Subir archivos</h3>

        <div className={styles.uploadMetaGrid}>
          <div className={styles.uploadMetaCard}>
            <span className={styles.uploadMetaLabel}>Cargado por</span>
            <span className={styles.uploadMetaValue}>{etiquetaUsuarioActual()}</span>
          </div>
          <div className={styles.uploadMetaCard}>
            <label className={styles.uploadMetaLabel} htmlFor="adj-tipo-imagen">
              Tipo de estudio
            </label>
            <select
              id="adj-tipo-imagen"
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

        <button
          type="button"
          className={styles.dicomImportButton}
          disabled={uploading}
          onClick={() => {
            if (!tipoImagenCodigo.trim()) {
              alert('Seleccione el tipo de estudio antes de importar la serie DICOM.');
              return;
            }
            setDicomImporterOpen(true);
          }}
        >
          Importar serie DICOM → Video
        </button>

        <DicomVideoImporter
          open={dicomImporterOpen}
          onClose={() => setDicomImporterOpen(false)}
          numeroVisita={numeroVisita}
          tipoImagenCodigo={tipoImagenCodigo}
          onUploaded={async () => {
            await loadAdjuntos();
            alert('Video generado y guardado como adjunto.');
          }}
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

      {/* List Section */}
      <div className={styles.listSection}>
        <h3 className={styles.sectionTitle}>Archivos de la visita</h3>
        {loading ? (
          <div style={{ position: 'relative', minHeight: '150px' }}>
            <Loader />
          </div>
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
