'use client';

import { useState, useEffect, useRef, memo } from 'react';
import styles from './ModalBusquedaDiagnosticos.module.css';
import Loader from '../Loader/Loader';
import diagnosticosService from '../../services/diagnosticosService';
import { DiagnosticoCie10 } from '../../types/diagnosticos';

interface ModalBusquedaDiagnosticosProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDiagnostico: (diagnostico: DiagnosticoCie10) => void;
}

// Componente memoizado para la tabla de diagnósticos
const DiagnosticosTable = memo(({ 
  diagnosticos, 
  loading, 
  error, 
  busqueda, 
  onSelectDiagnostico 
}: { 
  diagnosticos: DiagnosticoCie10[]; 
  loading: boolean; 
  error: string | null; 
  busqueda: string;
  onSelectDiagnostico: (diagnostico: DiagnosticoCie10) => void;
}) => {
  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '200px' }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.diagnosticosTable}>
      <div className={styles.tableHeader}>
        <div className={styles.codeColumn}>Código</div>
        <div className={styles.descriptionColumn}>Descripción</div>
      </div>
      
      <div className={styles.tableBody}>
        {diagnosticos.length === 0 ? (
          <div className={styles.emptyState}>
            {busqueda.trim() 
              ? `No se encontraron diagnósticos con el término "${busqueda}"`
              : "No se encontraron diagnósticos. Intente con otra búsqueda."}
          </div>
        ) : (
          diagnosticos.map((diagnostico) => (
            <div 
              key={diagnostico.idDiagnostico} 
              className={styles.tableRow}
              onClick={() => onSelectDiagnostico(diagnostico)}
            >
              <div className={styles.codeColumn}>{diagnostico.CodigoOMS}</div>
              <div className={styles.descriptionColumn}>{diagnostico.descripcion}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

DiagnosticosTable.displayName = 'DiagnosticosTable';

const ModalBusquedaDiagnosticos: React.FC<ModalBusquedaDiagnosticosProps> = ({
  isOpen,
  onClose,
  onSelectDiagnostico,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoCie10[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const diagnosticosTableRef = useRef<HTMLDivElement>(null);

  // Cargar diagnósticos al abrir el modal o cambiar de página
  useEffect(() => {
    if (isOpen) {
      buscarDiagnosticos();
    }
  }, [isOpen, currentPage]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const buscarDiagnosticos = async () => {
    // Solo actualizar el estado de carga en la tabla de diagnósticos
    if (diagnosticosTableRef.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      let resultados: DiagnosticoCie10[] = [];
      
      if (busqueda.trim()) {
        // Buscar por término
        resultados = await diagnosticosService.buscarDiagnosticosCie10(busqueda);
      } else {
        // Obtener todos los diagnósticos
        resultados = await diagnosticosService.getDiagnosticosCie10();
      }
      
      // Calcular total de páginas
      setTotalPages(Math.ceil(resultados.length / itemsPerPage));
      
      // Obtener solo los elementos de la página actual
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedResults = resultados.slice(startIndex, startIndex + itemsPerPage);
      
      setDiagnosticos(paginatedResults);
    } catch (err) {
      console.error('Error al buscar diagnósticos:', err);
      setError('Error al cargar diagnósticos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBusqueda(value);
    
    // Cancelar búsqueda anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Si se borra todo el texto, cargar todos los diagnósticos
    setCurrentPage(1);
    timeoutRef.current = setTimeout(() => {
      buscarDiagnosticos();
    }, 300);
  };

  const handleBusquedaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Resetear a la primera página al realizar una nueva búsqueda
    buscarDiagnosticos();
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSelectDiagnostico = (diagnostico: DiagnosticoCie10) => {
    onSelectDiagnostico(diagnostico);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Búsqueda de Diagnósticos CIE-10</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          <form onSubmit={handleBusquedaSubmit} className={styles.searchForm}>
            <div className={styles.searchInputContainer}>
              <input
                type="text"
                value={busqueda}
                onChange={handleBusquedaChange}
                placeholder="Buscar por código o descripción"
                className={styles.searchInput}
                autoFocus
              />
              <button 
                type="submit" 
                className={styles.searchButton}
                style={{ backgroundColor: '#00B5E2' }} // Pantone 313U
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </button>
            </div>
            {busqueda.length === 0 && (
              <small className={styles.searchHint}>
                Ingrese al menos un carácter para filtrar diagnósticos
              </small>
            )}
          </form>
          
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {loading && !diagnosticos.length ? (
            <div style={{ position: 'relative', minHeight: '200px' }}>
              <Loader />
            </div>
          ) : (
            <>
              <div ref={diagnosticosTableRef}>
                <DiagnosticosTable 
                  diagnosticos={diagnosticos}
                  loading={loading}
                  error={error}
                  busqueda={busqueda}
                  onSelectDiagnostico={handleSelectDiagnostico}
                />
              </div>
              
              {totalPages > 1 && (
                <div className={styles.paginationContainer}>
                  <button 
                    className={styles.cancelButton} 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  
                  <span className={styles.pageInfo}>
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button 
                    className={styles.submitButton} 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ backgroundColor: '#00B5E2' }} // Pantone 313U
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalBusquedaDiagnosticos;
