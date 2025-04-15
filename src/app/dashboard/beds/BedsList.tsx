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
          placeholder="Buscar por paciente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        
{/* aca  */}
{/* Dropdown para filtrar por sector */}
<div className={styles.filterGroup}>
          <label htmlFor="sectorFilter">Sector</label>
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

        {/* Dropdown para filtrar por estado */}
        <div className={styles.filterGroup}>
          <label htmlFor="estadoFilter">Estado</label>
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
        
        
        
        <button onClick={refreshBeds} className={styles.refreshButton}>
          Actualizar
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
                <div className={styles.headerLeft}>
                  <span className={styles.sectorBadge}>{bed.sector}</span>
                  <span className={styles.bedNumber}>{bed.numeroCama}</span>
                </div>
                {/* Mostrar número de visita solo si existe y no está vacío */}
                {bed.mostrarNumeroVisita && bed.mostrarNumeroVisita !== '' && (
                  <div className={styles.headerRight}>
                    <span className={styles.visitNumber}>{bed.mostrarNumeroVisita}</span>
                  </div>
                )}
              </div>
              
              <div className={` ${styles.cardBody}`}>
                {bed.nombrePaciente && (
                  <div className={styles.patientName}>
                    {bed.nombrePaciente}
                  </div>
                )}
                
                {/* Mostrar el estado solo si la cama NO está ocupada (no es O) como badge */}
                {bed.valorEstadoOriginal !== 'O' && (
                  <div className={styles.statusBadge}>
                    {bed.estado}
                  </div>
                )}
                
                {/* Mostrar la descripción del estado en el margen izquierdo inferior en mayúscula solo si la cama NO está ocupada */}
                {/* {bed.valorEstadoOriginal !== 'O' && (
                  <div className={styles.estadoDescripcion}>
                    {bed.estadoDescripcion.toUpperCase()}
                  </div>
                )} */}
                
                <div className={styles.cardInfo}>
                  {/* Mostrar la fecha de ingreso solo si existe y no es cero */}
                  {bed.fechaIngreso !== 0 
                    ? (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Fecha de ingreso</span>
                        <span>{formatDate(bed.fechaIngreso)}</span>
                      </div>
                    ) 
                    : null}

                  
                  {/* Mostrar el diagnóstico solo si existe y no es vacío, nulo o cero */}
                  {bed.diagnosticoDescripcion && 
                   bed.diagnosticoDescripcion !== '0' && 
                   bed.diagnosticoDescripcion !== '' && (
                    <div className={styles.diagnostico}>
                      <div className={styles.diagnosticoLabel}>Diagnóstico:</div>
                      <div className={styles.diagnosticoDescripcion}>{bed.diagnosticoDescripcion}</div>
                    </div>
                  )}
                </div>
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
