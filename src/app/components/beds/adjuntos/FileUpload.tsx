'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export interface FileUploadRef {
  clearFiles: () => void;
}

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFilesSelected, disabled = false, maxFiles = 5 }, ref) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/dicom',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const validateFiles = (files: FileList | null): File[] => {
    if (!files) return [];

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const isDicom = file.type === 'application/dicom' || /\.dcm$/i.test(file.name);
      if (!allowedTypes.includes(file.type) && !isDicom) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }
      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo demasiado grande (máx 10MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    return validFiles.slice(0, maxFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = validateFiles(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const files = validateFiles(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  useImperativeHandle(ref, () => ({
    clearFiles
  }));

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''} ${disabled ? styles.disabled : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.dcm,.doc,.docx"
          onChange={handleChange}
          disabled={disabled}
          className={styles.fileInput}
        />
        <div className={styles.dropZoneContent}>
          <span className={styles.uploadIcon}>📎</span>
          <p className={styles.dropZoneText}>
            Arrastra archivos aquí o haz click para seleccionar
          </p>
          <p className={styles.dropZoneHint}>
            PDF, JPG, PNG, GIF, DICOM (.dcm), DOC (máx {maxFiles} archivos, 10MB cada uno)
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className={styles.selectedFiles}>
          <h4 className={styles.selectedTitle}>Archivos seleccionados ({selectedFiles.length}):</h4>
          <ul className={styles.fileList}>
            {selectedFiles.map((file, index) => (
              <li key={index} className={styles.fileItem}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>
                  {(file.size / 1024).toFixed(2)} KB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className={styles.removeButton}
                  disabled={disabled}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
