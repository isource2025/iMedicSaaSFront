'use client';

import { useState, useMemo, useEffect } from 'react';
import { Adjunto } from '@/app/types/adjuntos';
import { adjuntosService } from '@/app/services/adjuntosService';
import AdjuntoFileViewer, { AdjuntoViewerState } from './AdjuntoFileViewer';
import ConfirmationModal from '../shared/ConfirmationModal';
import { usePermiso } from '@/app/hooks/usePermiso';
import {
  useUsuarioActual,
  esAdminClinico,
  esRegistroPropio,
} from '@/app/hooks/useUsuarioActual';
import { isImage, isVideo } from '@/app/utils/adjuntoFileTypes';
import EmptyState from '../shared/EmptyState';
import styles from './FileList.module.css';

type VistaAdjuntos = 'filas' | 'cuadros';

interface FileListProps {
  adjuntos: Adjunto[];
  onDelete?: (idAdjunto: number) => void;
  onError?: (message: string) => void;
  readOnly?: boolean;
  onSubirNuevo?: () => void;
}

function FileIcon({ tipoArchivo, nombreArchivo }: { tipoArchivo: string; nombreArchivo: string }) {
  if (tipoArchivo.includes('pdf')) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
  }
  if (tipoArchivo.includes('image')) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    );
  }
  if (tipoArchivo.includes('dicom') || /\.dcm$/i.test(nombreArchivo)) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <path d="M7 17h10"/>
        <path d="M7 13h6"/>
        <path d="M7 9h8"/>
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  );
}

function AdjuntoThumb({ adjunto }: { adjunto: Adjunto }) {
  const [url, setUrl] = useState<string | null>(null);
  const previewable = isImage(adjunto.NombreArchivo, adjunto.TipoArchivo || '');

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    let created: string | null = null;
    void adjuntosService
      .cargarBlobAdjunto(adjunto.IdAdjunto)
      .then(({ blobUrl }) => {
        if (cancelled) {
          adjuntosService.revocarBlobUrl(blobUrl);
          return;
        }
        created = blobUrl;
        setUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      adjuntosService.revocarBlobUrl(created);
    };
  }, [adjunto.IdAdjunto, previewable]);

  if (url) {
    return <img src={url} alt="" className={styles.thumbImg} />;
  }

  return (
    <span className={styles.thumbFallback}>
      <FileIcon tipoArchivo={adjunto.TipoArchivo} nombreArchivo={adjunto.NombreArchivo} />
      {isVideo(adjunto.NombreArchivo, adjunto.TipoArchivo || '') ? (
        <span className={styles.thumbKind}>Video</span>
      ) : null}
    </span>
  );
}

export default function FileList({ adjuntos, onDelete, onError, readOnly = false, onSubirNuevo }: FileListProps) {
  const [accionId, setAccionId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [vista, setVista] = useState<VistaAdjuntos>('filas');
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
  const usuarioActual = useUsuarioActual();
  const { puede } = usePermiso();

  const puedeIntentarEliminar =
    !readOnly &&
    !!onDelete &&
    (puede('INTERNACION.ADJUNTOS.ELIMINAR') || puede('INTERNACION.ADJUNTOS.CREAR'));

  const puedeEliminarAdjunto = (adjunto: Adjunto): boolean => {
    if (!puedeIntentarEliminar) return false;
    if (esAdminClinico()) return true;
    return (
      esRegistroPropio(
        {
          IdOperador: adjunto.IdOperador ?? adjunto.CargadoPor,
          CargadoPor: adjunto.CargadoPor,
        },
        usuarioActual,
      ) === true
    );
  };

  const handleView = async (adjunto: Adjunto) => {
    if (accionId != null || viewerLoading) return;
    setAccionId(adjunto.IdAdjunto);
    setViewerLoading(true);
    try {
      const { blob, blobUrl } = await adjuntosService.cargarBlobAdjunto(adjunto.IdAdjunto);
      setViewer({
        blobUrl,
        fileName: adjunto.NombreArchivo,
        mimeType: blob.type || adjunto.TipoArchivo || '',
      });
    } catch (err) {
      console.error('Error al visualizar adjunto:', err);
      onError?.(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
    } finally {
      setViewerLoading(false);
      setAccionId(null);
    }
  };

  const closeViewer = () => {
    adjuntosService.revocarBlobUrl(viewer?.blobUrl);
    setViewer(null);
  };

  const handleDownload = async (adjunto: Adjunto) => {
    if (accionId != null) return;
    setAccionId(adjunto.IdAdjunto);
    try {
      await adjuntosService.descargarArchivo(adjunto.IdAdjunto, adjunto.NombreArchivo);
    } catch (err) {
      console.error('Error al descargar adjunto:', err);
      onError?.(err instanceof Error ? err.message : 'No se pudo descargar el archivo');
    } finally {
      setAccionId(null);
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteId != null && onDelete) {
      onDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  };

  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const adjuntosAgrupados = useMemo(() => {
    const grupos: { [key: string]: Adjunto[] } = {};
    adjuntos.forEach((adjunto) => {
      const tipo = adjunto.TipoImagenNombre || 'Sin categoría';
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push(adjunto);
    });
    return Object.entries(grupos)
      .map(([nombre, items]) => ({ nombre, adjuntos: items, cantidad: items.length }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [adjuntos]);

  const toggleGrupo = (nombre: string) => {
    setGruposExpandidos((prev) => ({
      ...prev,
      [nombre]: !prev[nombre],
    }));
  };

  const renderActions = (adjunto: Adjunto) => (
    <div className={styles.fileActions}>
      <button
        type="button"
        onClick={() => handleView(adjunto)}
        className={styles.viewButton}
        title="Visualizar"
        disabled={accionId === adjunto.IdAdjunto}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button
        type="button"
        onClick={() => handleDownload(adjunto)}
        className={styles.downloadButton}
        title="Descargar"
        disabled={accionId === adjunto.IdAdjunto}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      {puedeEliminarAdjunto(adjunto) && (
        <button
          type="button"
          onClick={() => setPendingDeleteId(adjunto.IdAdjunto)}
          className={styles.deleteButton}
          title="Eliminar"
          disabled={accionId === adjunto.IdAdjunto}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      )}
    </div>
  );

  const subirBtn = onSubirNuevo ? (
    <button type="button" className={styles.subirBtn} onClick={onSubirNuevo}>
      + Subir nuevo
    </button>
  ) : null;

  if (adjuntos.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.listHeader}>
          <h4 className={styles.title}>Archivos adjuntos (0)</h4>
          {subirBtn}
        </div>
        <EmptyState
          variant="adjuntos"
          text="Sin archivos adjuntos"
          description="Subí un archivo o importá una serie DICOM."
        />
      </div>
    );
  }

  return (
    <>
      <AdjuntoFileViewer viewer={viewer} loading={viewerLoading} onClose={closeViewer} />
      <div className={styles.container}>
        <div className={styles.listHeader}>
          <h4 className={styles.title}>Archivos adjuntos ({adjuntos.length})</h4>
          <div className={styles.headerActions}>
            <div className={styles.vistaToggle} role="group" aria-label="Formato de lista">
              <button
                type="button"
                className={vista === 'filas' ? styles.vistaBtnActive : styles.vistaBtn}
                onClick={() => setVista('filas')}
              >
                Filas
              </button>
              <button
                type="button"
                className={vista === 'cuadros' ? styles.vistaBtnActive : styles.vistaBtn}
                onClick={() => setVista('cuadros')}
              >
                Miniaturas
              </button>
            </div>
            {subirBtn}
          </div>
        </div>

        {adjuntosAgrupados.map((grupo) => {
          const abierto = !!gruposExpandidos[grupo.nombre];
          return (
            <div
              key={grupo.nombre}
              className={`${styles.grupoContainer} ${abierto ? styles.grupoAbierto : ''}`}
            >
              <div className={styles.grupoHeader} onClick={() => toggleGrupo(grupo.nombre)}>
                <div className={styles.grupoTitulo}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={abierto ? styles.iconoExpandido : styles.iconoColapsado}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span className={styles.nombreGrupo}>{grupo.nombre}</span>
                  <span className={styles.cantidadGrupo}>{grupo.cantidad}</span>
                </div>
              </div>

              {abierto && vista === 'filas' && (
                <ul className={styles.fileList}>
                  {grupo.adjuntos.map((adjunto) => (
                    <li key={adjunto.IdAdjunto} className={styles.fileItem}>
                      <div className={styles.fileIcon}>
                        <FileIcon tipoArchivo={adjunto.TipoArchivo} nombreArchivo={adjunto.NombreArchivo} />
                      </div>
                      <div className={styles.fileInfo}>
                        <div
                          className={styles.fileName}
                          onClick={() => handleView(adjunto)}
                          title="Click para visualizar"
                        >
                          {adjunto.NombreArchivo}
                        </div>
                        <div className={styles.fileMetadata}>
                          <span>{adjuntosService.formatearTamanio(adjunto.TamanioBytes)}</span>
                          <span className={styles.separator}>•</span>
                          <span>{formatearFecha(adjunto.FechaCarga)}</span>
                          <span className={styles.separator}>•</span>
                          <span>{adjunto.NombreUsuario}</span>
                        </div>
                      </div>
                      {renderActions(adjunto)}
                    </li>
                  ))}
                </ul>
              )}

              {abierto && vista === 'cuadros' && (
                <div className={styles.thumbGrid}>
                  {grupo.adjuntos.map((adjunto) => (
                    <article key={adjunto.IdAdjunto} className={styles.thumbCard}>
                      <button
                        type="button"
                        className={styles.thumbHit}
                        onClick={() => handleView(adjunto)}
                        title={adjunto.NombreArchivo}
                      >
                        <AdjuntoThumb adjunto={adjunto} />
                      </button>
                      <div className={styles.thumbName} title={adjunto.NombreArchivo}>
                        {adjunto.NombreArchivo}
                      </div>
                      {renderActions(adjunto)}
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmationModal
        isOpen={pendingDeleteId != null}
        title="Eliminar adjunto"
        message="¿Está seguro de eliminar este archivo?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
