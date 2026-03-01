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
  const getFileIcon = (tipoArchivo: string) => {
    if (tipoArchivo.includes('pdf')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
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
    if (tipoArchivo.includes('word')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
    );
  };

  const handleView = (adjunto: Adjunto) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${API_URL}/adjuntos/${adjunto.IdAdjunto}/download`;
    
    // Abrir en nueva ventana para visualizar
    window.open(url, '_blank');
  };

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
              {getFileIcon(adjunto.TipoArchivo)}
            </div>
            <div className={styles.fileInfo}>
              <div 
                className={styles.fileName}
                onClick={() => handleView(adjunto)}
                style={{ cursor: 'pointer' }}
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
            <div className={styles.fileActions}>
              <button
                onClick={() => handleDownload(adjunto)}
                className={styles.downloadButton}
                title="Descargar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              {!readOnly && onDelete && (
                <button
                  onClick={() => handleDelete(adjunto.IdAdjunto)}
                  className={styles.deleteButton}
                  title="Eliminar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
