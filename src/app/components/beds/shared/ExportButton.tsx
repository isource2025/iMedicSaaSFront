'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IoChevronDown, IoDocumentTextOutline } from 'react-icons/io5';
import { usePdfPreviewOptional } from './PdfPreviewContext';
import styles from './ExportButton.module.css';

export type ExportOption = 'pdf' | 'excel' | 'csv';

interface ExportButtonProps {
  data: any[];
  fileName?: string;
  onExport?: (option: ExportOption, data: any[]) => void | Promise<void>;
  disabled?: boolean;
  options?: ExportOption[];
}

export default function ExportButton({
  data,
  fileName = 'export',
  onExport,
  disabled = false,
  options = ['pdf']
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pdfPreview = usePdfPreviewOptional();
  const singleOption = options.length === 1 ? options[0] : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (option: ExportOption) => {
    setIsOpen(false);
    if (!onExport) return;
    if (option === 'pdf' && pdfPreview) {
      await pdfPreview.run(() => Promise.resolve(onExport(option, data)));
      return;
    }
    await onExport(option, data);
  };

  const getOptionLabel = (option: ExportOption): string => {
    switch (option) {
      case 'pdf':
        return 'Exportar a PDF';
      case 'excel':
        return 'Exportar a Excel';
      case 'csv':
        return 'Exportar a CSV';
      default:
        return 'Exportar';
    }
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={() => {
          if (singleOption) {
            void handleExport(singleOption);
            return;
          }
          setIsOpen(!isOpen);
        }}
        disabled={disabled || data.length === 0}
        type="button"
        title={fileName}
      >
        <IoDocumentTextOutline size={16} />
        <span>Exportar</span>
        {!singleOption ? (
          <IoChevronDown size={14} className={isOpen ? styles.iconRotated : ''} />
        ) : null}
      </button>

      {!singleOption && isOpen ? (
        <div className={styles.dropdown}>
          {options.map((option) => (
            <button
              key={option}
              className={styles.dropdownItem}
              onClick={() => void handleExport(option)}
              type="button"
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
