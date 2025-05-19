import React, { ReactNode } from 'react';
import styles from './SearchInput.module.css';
import { IoSearch, IoInformationCircleOutline, IoClose } from 'react-icons/io5';
import { IoIosArrowDown } from 'react-icons/io';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

export interface SearchInputProps {
  /** Término de búsqueda */
  searchTerm: string;
  
  /** Función para actualizar el término de búsqueda */
  setSearchTerm: (term: string) => void;
  
  /** Placeholder para el input de búsqueda */
  placeholder?: string;
  
  /** Indica si está cargando resultados */
  loading?: boolean;
  
  /** Mensaje de error si existe */
  error?: string | null;
  
  /** Texto para el tooltip de ayuda */
  tooltipContent?: ReactNode;
  
  /** Clase CSS adicional para el contenedor */
  className?: string;
  
  /** Indica si está realizando una búsqueda activa */
  isSearching?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  searchTerm,
  setSearchTerm,
  placeholder = 'Buscar paciente...',
  loading = false,
  error = null,
  tooltipContent,
  className = '',
  isSearching = false
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  // Limpiar el término de búsqueda
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  // Contenido predeterminado del tooltip si no se proporciona uno personalizado
  const defaultTooltipContent = (
    <>
      Buscar por:
      <ul className={styles.tooltipList}>
        <li>Nombre y apellido</li>
        <li>Número de documento (DNI)</li>
        <li>Número de historia clínica</li>
        <li>Número de admisión</li>
      </ul>
    </>
  );

  return (
    <div 
      className={`${styles.searchGroup} ${className}`}
    >
      <div className={styles.searchInputContainer}>
        <IoSearch className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar paciente por nombre, DNI, historia clínica o admisión"
        />
        
        {searchTerm && (
          <button 
            className={styles.clearButton} 
            onClick={handleClearSearch}
            aria-label="Limpiar búsqueda"
          >
            <IoClose />
          </button>
        )}
        
        {loading && (
          <div className={styles.loadingIndicator}>
            <AiOutlineLoading3Quarters className={styles.spinningIcon} />
          </div>
        )}
        
        <div 
          className={styles.infoIconContainer}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <IoInformationCircleOutline className={styles.infoIcon} />
          {showTooltip && (
            <div className={styles.tooltip}>
              {tooltipContent || defaultTooltipContent}
            </div>
          )}
        </div>
      </div>
      

    </div>
  );
};

export default SearchInput;
