'use client';

import { useState } from 'react';
import { useModalDiagnosticosCie10 } from '../../hooks/useModalDiagnosticosCie10';
import { DiagnosticoCie10 } from '../../types/diagnosticos';
import ModalDiagnosticosCie10 from '../modals/ModalDiagnosticosCie10';
import styles from './EjemploUsoDiagnosticosCie10.module.css';

/**
 * Componente de ejemplo que demuestra cómo utilizar el modal de diagnósticos CIE10
 */
const EjemploUsoDiagnosticosCie10 = () => {
  // Estado para almacenar el diagnóstico seleccionado
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<DiagnosticoCie10 | null>(null);
  
  // Utilizamos el hook personalizado
  const { 
    isOpen, 
    diagnosticos,
    allDiagnosticos,
    loading, 
    error, 
    searchTerm,
    currentPage,
    totalPages,
    totalResults,
    openModal, 
    closeModal, 
    handleSearch, 
    handleSelect,
    nextPage,
    prevPage,
    goToPage 
  } = useModalDiagnosticosCie10((diagnostico) => {
    // Esta función se ejecutará cuando se seleccione un diagnóstico
    setDiagnosticoSeleccionado(diagnostico);
    console.log('Diagnóstico seleccionado:', diagnostico);
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Ejemplo de uso del Modal Diagnósticos CIE10</h2>
      
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Diagnóstico actual</h3>
        
        {diagnosticoSeleccionado ? (
          <div className={styles.diagnosticoInfo}>
            <div className={styles.codigo}>{diagnosticoSeleccionado.CodigoOMS}</div>
            <div className={styles.descripcion}>{diagnosticoSeleccionado.descripcion}</div>
          </div>
        ) : (
          <div className={styles.noDiagnostico}>
            No hay diagnóstico seleccionado
          </div>
        )}
        
        <button 
          className={styles.button} 
          onClick={openModal}
        >
          {diagnosticoSeleccionado ? 'Cambiar diagnóstico' : 'Seleccionar diagnóstico'}
        </button>
      </div>
      
      {/* Renderizamos el modal con soporte para paginación */}
      <ModalDiagnosticosCie10
        isOpen={isOpen}
        onClose={closeModal}
        diagnosticos={diagnosticos}
        allDiagnosticos={allDiagnosticos}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalResults}
        onSearch={handleSearch}
        onSelect={handleSelect}
        nextPage={nextPage}
        prevPage={prevPage}
        goToPage={goToPage}
      />
    </div>
  );
};

export default EjemploUsoDiagnosticosCie10;
