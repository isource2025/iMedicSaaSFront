'use client';

import { useBedsManagement } from '../../hooks/useBedsManagement';
import styles from './BedsList.module.css';
import { useAppContext } from '../../contexts/AppContext';

export const BedsList = () => {
  const { sectorSeleccionado } = useAppContext();
  const {
    beds,
    bedStates,
    sectors,
    loading,
    error,
    filter,
    setFilter,
    sectorFilter,
    setSectorFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds
  } = useBedsManagement();

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Buscar por número"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        
        {/* Dropdown para filtrar por estado */}
        <div className={styles.filterGroup}>
          <label htmlFor="estadoFilter">Estado:</label>
          <select 
            id="estadoFilter"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className={styles.selectFilter}
          >
            <option value="all">Todos los estados</option>
            {bedStates.map(state => (
              <option key={state.id} value={state.valor}>
                {state.descripcion}
              </option>
            ))}
          </select>
        </div>
        
        {/* Dropdown para filtrar por sector */}
        <div className={styles.filterGroup}>
          <label htmlFor="sectorFilter">Sector:</label>
          <select 
            id="sectorFilter"
            value={sectorFilter} 
            onChange={(e) => setSectorFilter(e.target.value)}
            className={styles.selectFilter}
          >
            <option value="all">Todos los sectores</option>
            {sectors.map(sector => (
              <option key={sector.id} value={sector.valor}>
                {sector.descripcion}
              </option>
            ))}
          </select>
        </div>
        
        <button onClick={refreshBeds} className={styles.refreshButton}>
          🔄 Refrescar
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <p>Cargando camas...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p className={styles.error}>{error}</p>
        </div>
      ) : beds.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No se encontraron camas con los filtros seleccionados</p>
        </div>
      ) : (
        <div className={styles.bedsGrid}>
          {beds.map(bed => (
            <div key={bed.id} className={`${styles.bedCard} ${styles[`estado-${bed.estado.replace(/\s+/g, '-').toLowerCase()}`]}`}>
              <div className={styles.cardHeader}>
                <h3>{bed.numeroCama}</h3>
                <span className={styles.sectorBadge}>{bed.sector}</span>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.statusBadge}>
                  {bed.estado}
                </div>
                
                <div className={styles.cardInfo}>
                  {bed.fechaIngreso && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Ingreso:</span>
                      <span>{formatDate(bed.fechaIngreso)}</span>
                    </div>
                  )}
                  
                  {bed.fechaEgreso && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Egreso:</span>
                      <span>{formatDate(bed.fechaEgreso)}</span>
                    </div>
                  )}
                  
                  {bed.numeroVisita && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Visita:</span>
                      <span>{bed.numeroVisita}</span>
                    </div>
                  )}
                </div>
                
                {bed.observaciones && (
                  <div className={styles.observaciones}>
                    <span className={styles.obsTitle}>Observaciones:</span>
                    <p>{bed.observaciones}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Función auxiliar para formatear fechas
const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '-';
  }
};
