'use client';

import { useState, useEffect } from 'react';
import { DiagnosticoCie10 } from '../../types/diagnosticos';
import styles from './ModalDiagnosticosCie10.module.css';
import { IoClose, IoSearch, IoChevronBack, IoChevronForward } from 'react-icons/io5';

interface ModalDiagnosticosCie10Props {
  isOpen: boolean;
  onClose: () => void;
  diagnosticos: DiagnosticoCie10[];
  allDiagnosticos: DiagnosticoCie10[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onSearch: (term: string) => void;
  onSelect: (diagnostico: DiagnosticoCie10) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

/**
 * Modal para buscar y seleccionar diagnósticos CIE10
 */
const ModalDiagnosticosCie10: React.FC<ModalDiagnosticosCie10Props> = ({
  isOpen,
  onClose,
  diagnosticos,
  allDiagnosticos,
  loading,
  error,
  searchTerm,
  currentPage,
  totalPages,
  totalResults,
  onSearch,
  onSelect,
  nextPage,
  prevPage,
  goToPage
}) => {
  const [selectedDiagnostico, setSelectedDiagnostico] = useState<DiagnosticoCie10 | null>(null);

  // Resetear el diagnóstico seleccionado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedDiagnostico(null);
    }
  }, [isOpen]);

  // Si el modal no está abierto, no renderizamos nada
  if (!isOpen) return null;

  // Manejar la selección de un diagnóstico
  const handleRowClick = (diagnostico: DiagnosticoCie10) => {
    setSelectedDiagnostico(diagnostico);
  };

  // Manejar el envío del formulario de búsqueda
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  // Manejar el click en el botón de seleccionar
  const handleSelectClick = () => {
    if (selectedDiagnostico) {
      onSelect(selectedDiagnostico);
    }
  };

  // Función para generar un array con los números de página cercanos a la página actual
  const getPagesToShow = () => {
    const pagesToShow = [];
    const maxPagesToShow = 5;
    
    // Caso especial para pocas páginas: mostrar todas las páginas sin procesamiento adicional
    if (totalPages <= 2) {
      for (let i = 1; i <= totalPages; i++) {
        pagesToShow.push(i);
      }
      return pagesToShow;
    }
    
    // Siempre mostrar la primera página
    pagesToShow.push(1);
    
    // Calcular el rango de páginas a mostrar alrededor de la página actual
    let startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 3);
    
    // Ajustar el rango si estamos cerca del inicio o final
    if (endPage < startPage) {
      endPage = startPage;
    }
    
    // Generar puntos suspensivos o páginas según corresponda
    if (startPage > 2) {
      pagesToShow.push('...');
    }
    
    // Agregar las páginas intermedias
    for (let i = startPage; i <= endPage; i++) {
      pagesToShow.push(i);
    }
    
    // Agregar puntos suspensivos antes de la última página si hay más páginas
    if (endPage < totalPages - 1) {
      pagesToShow.push('...');
    }
    
    // Siempre mostrar la última página si hay más de una página
    if (totalPages > 1 && !pagesToShow.includes(totalPages)) {
      pagesToShow.push(totalPages);
    }
    
    return pagesToShow;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Diagnósticos CIE-10</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <IoClose />
          </button>
        </div>

        <form className={styles.searchContainer} onSubmit={handleSearchSubmit}>
          <label htmlFor="searchDiagnosticos" className={styles.searchLabel}>
            Buscar por código o descripción:
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="searchDiagnosticos"
              type="text"
              className={styles.searchInput}
              value={searchTerm}
              onChange={e => onSearch(e.target.value)}
              placeholder="Ej: J45, Asma, Diabetes..."
              autoFocus
            />
            <IoSearch 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                right: '12px', 
                transform: 'translateY(-50%)',
                color: '#9ca3af' 
              }} 
            />
          </div>
        </form>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <p>Cargando diagnósticos...</p>
            </div>
          ) : error ? (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          ) : diagnosticos.length === 0 ? (
            <div className={styles.noResults}>
              <p>No se encontraron diagnósticos. Intente con otra búsqueda.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <div className={styles.resultCount}>
                <p>Se encontraron <strong>{totalResults}</strong> diagnósticos - Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong></p>
              </div>
              <table className={styles.diagnosticosTable}>
                <thead>
                  <tr>
                    <th className={styles.codeColumn}>Código</th>
                    <th className={styles.descriptionColumn}>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticos.map(diagnostico => (
                    <tr
                      key={diagnostico.idDiagnostico}
                      onClick={() => handleRowClick(diagnostico)}
                      className={selectedDiagnostico?.idDiagnostico === diagnostico.idDiagnostico ? styles.selected : ''}
                    >
                      <td className={styles.codeColumn}>{diagnostico.CodigoOMS || 'Sin código'}</td>
                      <td className={styles.descriptionColumn}>{diagnostico.descripcion || 'Sin descripción'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button 
                    className={styles.paginationButton} 
                    onClick={prevPage} 
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                  >
                    <IoChevronBack />
                  </button>
                  
                  <div className={styles.paginationPages}>
                    {getPagesToShow().map((page, index) => (
                      typeof page === 'number' ? (
                        <button
                          key={index}
                          className={`${styles.pageNumber} ${page === currentPage ? styles.currentPage : ''}`}
                          onClick={() => goToPage(page)}
                          aria-label={`Ir a la página ${page}`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={index} className={styles.pageDots}>...</span>
                      )
                    ))}
                  </div>
                  
                  <button 
                    className={styles.paginationButton} 
                    onClick={nextPage} 
                    disabled={currentPage === totalPages}
                    aria-label="Página siguiente"
                  >
                    <IoChevronForward />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {selectedDiagnostico && (
            <div className={styles.selectedInfo}>
              <span>Seleccionado: </span>
              <strong className={styles.selectedCode}>{selectedDiagnostico.CodigoOMS}</strong>
              <span className={styles.selectedDescription}>{selectedDiagnostico.descripcion}</span>
            </div>
          )}
          <div className={styles.footerButtons}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className={styles.selectButton}
              onClick={handleSelectClick}
              disabled={!selectedDiagnostico}
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDiagnosticosCie10;
