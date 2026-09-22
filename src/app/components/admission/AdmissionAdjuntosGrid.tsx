'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdmissionAdjuntosGrid.module.css';
import { apiFetchBlob } from '@/app/utils/authFetch';
import { adjuntosService } from '@/app/services/adjuntosService';
import AdjuntoFileViewer, { AdjuntoViewerState } from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
import ConfirmationModal from '@/app/components/beds/shared/ConfirmationModal';
import { isDicom, isImage } from '@/app/utils/adjuntoFileTypes';
import { renderDicomPreviewDataUrl } from '@/app/utils/dicomRenderer';
import { usePermiso } from '@/app/hooks/usePermiso';
import {
  useUsuarioActual,
  esAdminClinico,
  esRegistroPropio,
} from '@/app/hooks/useUsuarioActual';

function isImageByName(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name || '');
}

function str(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

function isImageMime(m: string): boolean {
  return isImage('', m);
}

function formatearFecha(fecha: string | Date | null | undefined): string {
  if (fecha == null || fecha === '') return '';
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseIdOperador(raw: Record<string, unknown>): number | null {
  const v = raw.IdOperador ?? raw.idOperador ?? raw.CargadoPor ?? raw.cargadoPor;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const PREVIEWS_PAGE_SIZE = 12;

function AdjuntoCard({
  idAdjunto,
  nombreArchivo,
  fechaCarga,
  canDelete,
  deleting,
  onOpen,
  onDeleteRequest,
}: {
  idAdjunto: number;
  nombreArchivo: string;
  fechaCarga?: string;
  canDelete: boolean;
  deleting: boolean;
  onOpen: (idAdjunto: number, nombreArchivo: string) => void;
  onDeleteRequest: (idAdjunto: number) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    const run = async () => {
      try {
        const blob = await apiFetchBlob(`/adjuntos/${idAdjunto}/download`);
        if (cancelled) return;

        const type = blob.type || '';
        setMime(type);
        if (isImageMime(type) || isImageByName(nombreArchivo)) {
          blobUrl = URL.createObjectURL(blob);
          setPreview(blobUrl);
        } else if (type === 'application/pdf' || /\.pdf$/i.test(nombreArchivo)) {
          try {
            const { renderPdfFirstPageDataUrl } = await import('@/app/utils/pdfJs');
            const dataUrl = await renderPdfFirstPageDataUrl(blob, 360);
            if (!cancelled && dataUrl) setPreview(dataUrl);
          } catch {
            // Sin miniatura
          }
        } else if (isDicom(nombreArchivo, type)) {
          try {
            const dataUrl = await renderDicomPreviewDataUrl(await blob.arrayBuffer());
            if (!cancelled) setPreview(dataUrl);
          } catch {
            // Sin miniatura
          }
        }
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('error');
      }
    };

    run();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [idAdjunto, nombreArchivo]);

  const isPdf =
    mime === 'application/pdf' || (!mime && /\.pdf$/i.test(nombreArchivo));
  const isDicomFile = isDicom(nombreArchivo, mime || '');
  const fecha = formatearFecha(fechaCarga);

  return (
    <div className={styles.cardWrap}>
      <button
        type="button"
        className={styles.card}
        onClick={() => onOpen(idAdjunto, nombreArchivo)}
        title={fecha ? `Abrir: ${nombreArchivo} (${fecha})` : `Abrir: ${nombreArchivo}`}
        disabled={deleting}
      >
        <div className={styles.thumb} aria-hidden>
          {phase === 'loading' ? (
            <span className={styles.loaderWrap}>
              <span className={styles.loaderSpinner} />
              <span className={styles.loaderText}>Cargando vista previa…</span>
            </span>
          ) : null}
          {phase === 'error' ? <span className={styles.fileFallback}>Sin vista previa</span> : null}
          {phase === 'ready' && preview ? <img src={preview} alt="" className={styles.thumbImg} /> : null}
          {phase === 'ready' && !preview && isPdf ? <span className={styles.pdfBadge}>PDF</span> : null}
          {phase === 'ready' && !preview && isDicomFile ? <span className={styles.pdfBadge}>DICOM</span> : null}
          {phase === 'ready' && !preview && !isPdf && !isDicomFile ? (
            <span className={styles.fileFallback}>Archivo</span>
          ) : null}
        </div>
        <div className={styles.caption}>
          <span className={styles.captionName}>{nombreArchivo}</span>
          {fecha ? (
            <span className={styles.captionFecha} title={fecha}>
              {fecha}
            </span>
          ) : null}
        </div>
      </button>
      {canDelete ? (
        <button
          type="button"
          className={styles.deleteBtn}
          title="Eliminar adjunto"
          disabled={deleting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteRequest(idAdjunto);
          }}
        >
          Eliminar
        </button>
      ) : null}
    </div>
  );
}

export default function AdmissionAdjuntosGrid({
  items,
  numeroVisita,
  allowUpload = false,
  onUploaded,
}: {
  items: Record<string, unknown>[];
  numeroVisita?: number | null;
  allowUpload?: boolean;
  onUploaded?: () => void;
}) {
  const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [tipos, setTipos] = useState<{ TipoImagen: string; DescTipoImagen: string }[]>([]);
  const [tipoImagen, setTipoImagen] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { puede } = usePermiso();
  const usuarioActual = useUsuarioActual();

  const puedeIntentarEliminar =
    puede('INTERNACION.ADJUNTOS.ELIMINAR') || puede('INTERNACION.ADJUNTOS.CREAR');

  useEffect(() => {
    if (!allowUpload) return;
    let cancelled = false;
    adjuntosService
      .getTiposImagenes()
      .then((list) => {
        if (cancelled) return;
        setTipos(list);
        if (list[0]?.TipoImagen) setTipoImagen(list[0].TipoImagen);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [allowUpload]);

  const parsedItems = useMemo(
    () =>
      items.flatMap((raw) => {
        const idRaw = raw.IdAdjunto ?? raw.idAdjunto;
        const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
        if (!Number.isFinite(id) || id <= 0) return [];
        const name = str(raw.NombreArchivo ?? raw.Descripcion) || `Adjunto ${id}`;
        const fechaCarga = str(raw.FechaCarga ?? raw.Fecha ?? raw.fechaCarga);
        const idOperador = parseIdOperador(raw);
        return [{ id, name, fechaCarga, idOperador }];
      }),
    [items]
  );
  const [visibleCount, setVisibleCount] = useState(PREVIEWS_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PREVIEWS_PAGE_SIZE);
  }, [items]);

  const visibleItems = parsedItems.slice(0, visibleCount);
  const hasMore = visibleCount < parsedItems.length;

  const puedeEliminarItem = (idOperador: number | null): boolean => {
    if (!puedeIntentarEliminar) return false;
    if (esAdminClinico()) return true;
    return (
      esRegistroPropio(
        { IdOperador: idOperador, CargadoPor: idOperador },
        usuarioActual,
      ) === true
    );
  };

  const openAdjunto = async (idAdjunto: number, nombreArchivo: string) => {
    if (viewerLoading) return;
    setViewerLoading(true);
    try {
      const { blob, blobUrl } = await adjuntosService.cargarBlobAdjunto(idAdjunto);
      setViewer({
        blobUrl,
        fileName: nombreArchivo,
        mimeType: blob.type || '',
      });
    } catch (err) {
      console.error('Error al abrir adjunto:', err);
      alert(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    adjuntosService.revocarBlobUrl(viewer?.blobUrl);
    setViewer(null);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!allowUpload || !numeroVisita || !files?.length) return;
    if (!tipoImagen.trim()) {
      setUploadError('Seleccioná un tipo de imagen');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await adjuntosService.subirArchivos(numeroVisita, Array.from(files), tipoImagen.trim());
      onUploaded?.();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'No se pudo subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    setDeleteError(null);
    try {
      await adjuntosService.eliminarAdjunto(id);
      onUploaded?.();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar el adjunto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AdjuntoFileViewer viewer={viewer} loading={viewerLoading} onClose={closeViewer} />
      <ConfirmationModal
        isOpen={pendingDeleteId != null}
        title="Eliminar adjunto"
        message="¿Está seguro de eliminar este archivo?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
      {allowUpload && numeroVisita ? (
        <div className={styles.uploadBox}>
          <p className={styles.uploadTitle}>Agregar adjunto a esta visita</p>
          {tipos.length > 0 ? (
            <select
              className={styles.uploadSelect}
              value={tipoImagen}
              onChange={(e) => setTipoImagen(e.target.value)}
              disabled={uploading}
            >
              {tipos.map((t) => (
                <option key={t.TipoImagen} value={t.TipoImagen}>
                  {t.DescTipoImagen || t.TipoImagen}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="file"
            multiple
            disabled={uploading}
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
          {uploading ? <p className={styles.hint}>Subiendo…</p> : null}
          {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
        </div>
      ) : null}
      {deleteError ? <p className={styles.uploadError}>{deleteError}</p> : null}
      {!parsedItems.length ? (
        <p className={styles.hint}>No hay adjuntos cargados aún.</p>
      ) : (
        <>
          <p className={styles.hint}>
            Vista previa cargada al abrir esta pestaña. Clic en la tarjeta para ver el archivo.
          </p>
          <div className={styles.grid}>
            {visibleItems.map((it) => (
              <AdjuntoCard
                key={it.id}
                idAdjunto={it.id}
                nombreArchivo={it.name}
                fechaCarga={it.fechaCarga}
                canDelete={puedeEliminarItem(it.idOperador)}
                deleting={deletingId === it.id}
                onOpen={openAdjunto}
                onDeleteRequest={setPendingDeleteId}
              />
            ))}
          </div>
          {hasMore ? (
            <div className={styles.moreRow}>
              <button
                type="button"
                className={styles.moreBtn}
                onClick={() => setVisibleCount((n) => n + PREVIEWS_PAGE_SIZE)}
              >
                Cargar más adjuntos ({parsedItems.length - visibleCount} restantes)
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
