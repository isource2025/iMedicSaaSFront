import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // No mostrar paginación si solo hay una página
  if (totalPages <= 1) return null;

  // Generar un array con los números de página a mostrar
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    // Si hay menos de maxPagesToShow páginas, mostrarlas todas
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }
    
    // Siempre incluir la primera página
    pageNumbers.push(1);
    
    // Determinar el rango central
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, start + 2);
    
    // Ajustar si estamos cerca del final
    if (end === totalPages - 1) {
      start = Math.max(2, end - 2);
    }
    
    // Agregar elipsis después de la primera página si es necesario
    if (start > 2) {
      pageNumbers.push('...');
    }
    
    // Agregar páginas intermedias
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    
    // Agregar elipsis antes de la última página si es necesario
    if (end < totalPages - 1) {
      pageNumbers.push('...');
    }
    
    // Siempre incluir la última página
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <ul className={styles.pageList}>
        {/* Botón Anterior */}
        <li>
          <button
            className={styles.pageButton}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            &laquo;
          </button>
        </li>
        
        {/* Números de página */}
        {getPageNumbers().map((page, index) => (
          <li key={index}>
            {page === '...' ? (
              <span className={styles.ellipsis}>...</span>
            ) : (
              <button
                className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                aria-label={`Página ${page}`}
              >
                {page}
              </button>
            )}
          </li>
        ))}
        
        {/* Botón Siguiente */}
        <li>
          <button
            className={styles.pageButton}
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
}
