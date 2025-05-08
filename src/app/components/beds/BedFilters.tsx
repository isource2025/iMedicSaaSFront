import React from 'react';
import styles from './BedFilters.module.css';
import { IoRefreshOutline, IoSearch, IoTimeOutline } from 'react-icons/io5';

export interface BedFiltersProps {
  sectors: { id: string; valor: string; descripcion: string }[];
  bedStates: { id: string; valor: string; descripcion: string }[];
  filter: string;
  placeHolder: string;
  setFilter: (filter: string) => void;
  sectorFilter: string;
  setSectorFilter: (sector: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  refreshBeds: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  lastUpdateTime?: number;
}

export const BedFilters: React.FC<BedFiltersProps> = ({
  sectors,
  bedStates,
  placeHolder,
  filter,
  setFilter,
  sectorFilter,
  setSectorFilter,
  searchTerm,
  setSearchTerm,
  refreshBeds,
  autoRefresh,
  setAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  lastUpdateTime
}) => {
  // Formatear la última actualización
  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'No disponible';
    
    const now = Date.now();
    const diff = now - lastUpdateTime;
    
    if (diff < 60000) {
      return 'Hace menos de un minuto';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    console.log("Sectores:", sectors);
    
  };

  // Opciones de intervalo de actualización
  const intervalOptions = [
    { value: 10000, label: '10 segundos' },
    { value: 30000, label: '30 segundos' },
    { value: 60000, label: '1 minuto' },
    { value: 300000, label: '5 minutos' }
  ];

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Sector</label>
        <select
          className={styles.filterSelect}
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <option value="all">Todos los sectores</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={sector.valor}>
              {sector.descripcion}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Estado</label>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          {bedStates.map((state) => (
            <option key={state.id} value={state.valor}>
              {state.descripcion}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.searchGroup}>
        <div className={styles.searchInputContainer}>
          <IoSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={placeHolder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.refreshGroup}>
        <button 
          className={styles.refreshButton} 
          onClick={refreshBeds}
          title="Actualizar ahora"
        >
          <IoRefreshOutline />
        </button>
        
        {/* <div className={styles.autoRefreshContainer}>
          <label className={styles.switchLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className={styles.switchInput}
            />
            <span className={styles.switchSlider}></span>
            Auto
          </label>
          
          <select
            className={styles.intervalSelect}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
          >
            {intervalOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.lastUpdateInfo}>
          <IoTimeOutline className={styles.timeIcon} />
          <span className={styles.updateText}>{formatLastUpdate()}</span>
        </div> */}
      </div>
    </div>
  );
};

export default BedFilters;
