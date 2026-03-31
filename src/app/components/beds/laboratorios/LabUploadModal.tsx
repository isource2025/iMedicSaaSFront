'use client';

import { useState, useRef } from 'react';
import { laboratoriosService } from '@/app/services/laboratoriosService';
import { OCRResult } from '@/app/types/laboratorios';
import Loader from '../../Loader/Loader';
import LabFormModal from './LabFormModal';
import styles from './LabUploadModal.module.css';

interface LabUploadModalProps {
  numeroVisita: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LabUploadModal({ numeroVisita, onClose, onSuccess }: LabUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de archivo
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Tipo de archivo no válido. Solo se permiten PDF, JPG y PNG.');
        return;
      }

      // Validar tamaño (10MB máximo)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(droppedFile.type)) {
        setError('Tipo de archivo no válido. Solo se permiten PDF, JPG y PNG.');
        return;
      }

      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setFile(droppedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleProcessOCR = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      setError(null);

      const result = await laboratoriosService.uploadAndProcessOCR(numeroVisita, file);
      setOcrResult(result);
      setShowForm(true);
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setProcessing(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    onSuccess();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setOcrResult(null);
    setFile(null);
  };

  if (showForm && ocrResult) {
    return (
      <LabFormModal
        numeroVisita={numeroVisita}
        ocrResult={ocrResult}
        onClose={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Cargar Resultado de Laboratorio</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {!file ? (
            <div
              className={styles.dropzone}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div className={styles.dropzoneIcon}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.dropzoneText}>
                Arrastra un archivo aquí o haz clic para seleccionar
              </p>
              <p className={styles.dropzoneHint}>
                PDF, JPG o PNG (máximo 10MB)
              </p>
            </div>
          ) : (
            <div className={styles.filePreview}>
              <div className={styles.fileIcon}>
                {file.type === 'application/pdf' ? '📄' : '🖼️'}
              </div>
              <div className={styles.fileInfo}>
                <p className={styles.fileName}>{file.name}</p>
                <p className={styles.fileSize}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                className={styles.removeButton}
                onClick={() => setFile(null)}
                disabled={processing}
              >
                ✕
              </button>
            </div>
          )}

          {processing && (
            <div className={styles.processingContainer}>
              <Loader />
              <p className={styles.processingText}>
                Procesando archivo con OCR...
              </p>
              <p className={styles.processingHint}>
                Esto puede tomar unos segundos
              </p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={processing}
          >
            Cancelar
          </button>
          <button
            className={styles.processButton}
            onClick={handleProcessOCR}
            disabled={!file || processing}
          >
            {processing ? 'Procesando...' : 'Procesar con OCR'}
          </button>
        </div>
      </div>
    </div>
  );
}
