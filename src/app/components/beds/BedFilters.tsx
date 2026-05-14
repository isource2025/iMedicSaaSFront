import React from 'react';
import styles from './BedFilters.module.css';
import { IoRefreshOutline } from 'react-icons/io5';
import { SearchInput } from './SearchInput';
import type { BedTipoRecurso } from '@/app/types/beds';

export interface BedFiltersProps {
  sectors: { id: string; valor: string; descripcion: string }[];
  bedStates: { id: string; valor: string; descripcion: string }[];
  filter: string;
  placeHolder: string;
  setFilter: (filter: string) => void;
  sectorFilter: string;
  setSectorFilter: (sector: string) => void;
  serviciosMedicos?: string[];
  servicioFilter?: string;
  setServicioFilter?: (servicio: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  tipoRecursoFilter?: 'all' | BedTipoRecurso;
  setTipoRecursoFilter?: (v: 'all' | BedTipoRecurso) => void;
  refreshBeds: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  lastUpdateTime?: number;
  beds?: any[];
}

export const BedFilters: React.FC<BedFiltersProps> = ({
  sectors,
  bedStates,
  placeHolder,
  filter,
  setFilter,
  sectorFilter,
  setSectorFilter,
  serviciosMedicos = [],
  servicioFilter = 'all',
  setServicioFilter = () => {},
  searchTerm,
  setSearchTerm,
  tipoRecursoFilter = 'all',
  setTipoRecursoFilter,
  refreshBeds,
  lastUpdateTime,
  beds = []
}) => {
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
  };

  return (
    <div className={styles.filterModule}>
      <div className={styles.filtersContainer}>

        
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sectores</label>
          <select
            className={styles.filterSelect}
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.valor}>
                {sector.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Estados</label>
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {bedStates.map((state) => (
              <option key={state.id} value={state.valor}>
                {state.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Servicios</label>
          <select
            className={styles.filterSelect}
            value={servicioFilter}
            onChange={(e) => setServicioFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {serviciosMedicos.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>
        </div>

        {setTipoRecursoFilter && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Tipo de recurso</label>
            <select
              className={styles.filterSelect}
              value={tipoRecursoFilter}
              onChange={(e) =>
                setTipoRecursoFilter(e.target.value as 'all' | BedTipoRecurso)
              }
            >
              <option value="all">Todos</option>
              <option value="cama">Camas (internación)</option>
              <option value="consultorio">Consultorios</option>
              <option value="insumos">Insumos</option>
            </select>
          </div>
        )}

        

        {/* <div className={styles.refreshGroup}>
          <button
            className={styles.refreshButton}
            onClick={refreshBeds}
            title="Actualizar ahora"
          >
            <IoRefreshOutline />
          </button>
        </div> */}
      </div>
      <div className={styles.searchWrapper}>
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
        </div>
    </div>
  );
};

export default BedFilters;
