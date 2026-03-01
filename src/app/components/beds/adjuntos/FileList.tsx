'use client';

import { Adjunto } from '@/app/types/adjuntos';
import { adjuntosService } from '@/app/services/adjuntosService';
import styles from './FileList.module.css';

interface FileListProps {
  adjuntos: Adjunto[];
  onDelete?: (idAdjunto: number) => void;
  readOnly?: boolean;
}

export default function FileList({ adjuntos, onDelete, readOnly = false }: FileListProps) {
  const handleDownload = (adjunto: Adjunto) => {
    adjuntosService.descargarArchivo(adjunto.IdAdjunto, adjunto.NombreArchivo);
  };

  const handleDelete = async (idAdjunto: number) => {
    if (!confirm('¿Está seguro de eliminar este archivo?')) return;
    
    if (onDelete) {
      onDelete(idAdjunto);
    }
  };

  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (adjuntos.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay archivos adjuntos</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Archivos adjuntos ({adjuntos.length})</h4>
      <ul className={styles.fileList}>
        {adjuntos.map((adjunto) => (
          <li key={adjunto.IdAdjunto} className={styles.fileItem}>
            <div className={styles.fileIcon}>
              {adjuntosService.getIconoTipo(adjunto.TipoArchivo)}
            </div>
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>{adjunto.NombreArchivo}</div>
              <div className={styles.fileMetadata}>
                <span>{adjuntosService.formatearTamanio(adjunto.TamanioBytes)}</span>
                <span className={styles.separator}>•</span>
                <span>{formatearFecha(adjunto.FechaCarga)}</span>
                <span className={styles.separator}>•</span>
                <span>{adjunto.NombreUsuario}</span>
              </div>
            </div>
            <div className={styles.fileActions}>
              <button
                onClick={() => handleDownload(adjunto)}
                className={styles.downloadButton}
                title="Descargar"
              >
                ⬇️
              </button>
              {!readOnly && onDelete && (
                <button
                  onClick={() => handleDelete(adjunto.IdAdjunto)}
                  className={styles.deleteButton}
                  title="Eliminar"
                >
                  🗑️
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
