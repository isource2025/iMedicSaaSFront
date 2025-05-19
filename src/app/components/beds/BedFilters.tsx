import React from 'react';
import styles from './BedFilters.module.css';
import { IoRefreshOutline, IoTimeOutline } from 'react-icons/io5';
import { SearchInput } from './SearchInput';
import useSearchManager from '../../hooks/useSearchManager';

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
  beds?: any[]; // Datos de camas para filtrado local
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
  lastUpdateTime,
  beds = []
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
        <label className={styles.filterLabel}>Sectores</label>
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
        <label className={styles.filterLabel}>Estados de camas</label>
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

      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder={placeHolder}
        tooltipContent={
          <>
            <p>Filtrar por:</p>
            <ul className={styles.tooltipList}>
              <li>Nombre del paciente</li>
              <li>Número de documento (DNI)</li>
              <li>Número de historia clínica</li>
              <li>Número de admisión</li>
            </ul>
          </>
        }
        isSearching={searchTerm.length > 0}
      />

      <div className={styles.refreshGroup}>
        <button 
          className={styles.refreshButton} 
          onClick={refreshBeds}
          title="Actualizar ahora"
        >
          <IoRefreshOutline />
        </button>
        
      </div>
    </div>
  );
};

export default BedFilters;
