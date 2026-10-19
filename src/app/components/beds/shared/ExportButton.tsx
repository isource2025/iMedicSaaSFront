'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IoChevronDown, IoDocumentTextOutline } from 'react-icons/io5';
import styles from './ExportButton.module.css';

export type ExportOption = 'pdf' | 'excel' | 'csv';

interface ExportButtonProps {
  data: any[];
  fileName?: string;
  onExport?: (option: ExportOption, data: any[]) => void;
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

  const handleExport = (option: ExportOption) => {
    setIsOpen(false);
    if (onExport) {
      onExport(option, data);
    }
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
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || data.length === 0}
        type="button"
      >
        <IoDocumentTextOutline size={16} />
        <span>Exportar</span>
        <IoChevronDown size={14} className={isOpen ? styles.iconRotated : ''} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option) => (
            <button
              key={option}
              className={styles.dropdownItem}
              onClick={() => handleExport(option)}
              type="button"
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
