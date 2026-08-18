'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { adjuntosService } from '@/app/services/adjuntosService';
import { authService } from '@/app/services/authService';
import { Adjunto, TipoImagenHC } from '@/app/types/adjuntos';
import FileUpload, { FileUploadRef } from './FileUpload';
import FileList from './FileList';
import DicomVideoImporter from './DicomVideoImporter';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import MessageModal, { type MessageModalTone } from '@/app/components/UI/MessageModal';
import BedSectionLayout from '../shared/BedSectionLayout';
import styles from './AdjuntosSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EmptyState from '../shared/EmptyState';
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

type Feedback = {
  title: string;
  message: string;
  tone: MessageModalTone;
};

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tiposImagen, setTiposImagen] = useState<TipoImagenHC[]>([]);
  const [tipoImagenCodigo, setTipoImagenCodigo] = useState<string>('');
  const [modo, setModo] = useState<'archivos' | 'dicom' | 'visita'>('visita');
  const fileUploadRef = useRef<FileUploadRef>(null);

  const showMessage = useCallback((title: string, message: string, tone: MessageModalTone = 'info') => {
    setFeedback({ title, message, tone });
  }, []);

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
    if (!numeroVisita) {
      setLoading(false);
      return;
    }

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
      fileUploadRef.current?.clearFiles();
      setTipoImagenCodigo('');
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

  const handleExport = async (option: ExportOption) => {
    if (option === 'pdf') {
      const empresaInfo = await obtenerInfoEmpresa();
      const parts = adjuntos.map((a, idx) => ({
        title: `Adjunto ${idx + 1}`,
        fields: [
          { label: 'Nombre', value: a.NombreArchivo || '—' },
          { label: 'Tipo', value: a.TipoImagenNombre || a.TipoArchivo || a.TipoImagen || '—' },
          {
            label: 'Fecha',
            value: a.FechaCarga
              ? new Date(a.FechaCarga).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—',
          },
        ],
        profesional: {
          nombre: (a as any).NombreUsuario || (a as any).CargadoPorNombre || 'OPERADOR',
          matricula: a.IdOperador ?? a.CargadoPor ?? undefined,
        },
      }));

      await exportToPDF({
        title: 'Archivos Adjuntos',
        subtitle: `Visita: ${numeroVisita}`,
        parts,
        fileName: `adjuntos_${numeroVisita}.pdf`,
        orientation: 'portrait',
        empresaInfo,
        patientInfo: {
          numeroVisita: numeroVisita || undefined,
          nombre: patientName,
          numeroDocumento: documentoPaciente,
          ubicacion: patientLocation,
          fechaIngreso,
          horaIngreso,
        },
      });
    }
  };

  if (!numeroVisita) {
    return (
      <EmptyState
        variant="adjuntos"
        text="No hay visita seleccionada"
        description="Abrí una internación para ver los adjuntos."
      />
    );
  }

  if (loading) {
    return <BedSectionLoading />;
  }

  return (
    <BedSectionLayout
      title="Adjuntos"
      subtitle="Archivos de esta internación"
      exportSlot={
        <ExportButton
          data={adjuntos}
          fileName={`adjuntos_${numeroVisita}.pdf`}
          onExport={handleExport}
          options={['pdf']}
        />
      }
      extraToolbar={
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
            Lista de archivos ({adjuntos.length})
          </button>
        </div>
      }
    >
      <p className={styles.cargadoPor}>Cargás como {etiquetaUsuarioActual()}</p>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {adjuntos.length > 0 && countAdjuntosRecientes(adjuntos) > 0 && modo === 'visita' && (
        <p className={styles.adjuntosNotaRecientes} role="status">
          Hay archivos cargados en las últimas 72 horas.
        </p>
      )}

      {modo === 'archivos' && (
        <div className={styles.uploadSection}>
          <FileUpload
            ref={fileUploadRef}
            onFilesSelected={handleFilesSelected}
            onValidationError={(msg) => showMessage('Archivo no válido', msg, 'warning')}
            disabled={uploading}
            maxFiles={5}
          />
          {selectedFiles.length > 0 && (
            <div className={styles.uploadStep}>
              <label className={styles.tipoStep} htmlFor="adj-tipo-imagen">
                <span>Tipo de estudio</span>
                <span className={styles.tipoHint}>Obligatorio para guardar</span>
                <select
                  id="adj-tipo-imagen"
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
        <div className={styles.uploadSection}>
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
          <FileList
            adjuntos={adjuntos}
            onDelete={handleDelete}
            onError={(msg) => showMessage('Error', msg, 'error')}
            readOnly={false}
          />
        </div>
      )}

      <MessageModal
        open={!!feedback}
        title={feedback?.title || ''}
        message={feedback?.message || ''}
        tone={feedback?.tone || 'info'}
        onClose={() => setFeedback(null)}
      />
    </BedSectionLayout>
  );
}
