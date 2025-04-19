import styles from './BedFilters.module.css';

export interface BedFiltersProps {
  sectors: any[];
  bedStates: any[];
  filter: string;
  setFilter: (val: string) => void;
  sectorFilter: string;
  setSectorFilter: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  refreshBeds: () => void;
}

export const BedFilters: React.FC<BedFiltersProps> = ({
  sectors,
  bedStates,
  filter,
  setFilter,
  sectorFilter,
  setSectorFilter,
  searchTerm,
  setSearchTerm,
  refreshBeds
}) => {
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.mainFilters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre de paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className={styles.searchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
            />
          </svg>
        </div>
        <div className={styles.selectGroup}>
          <label htmlFor="sectorFilter">Sector</label>
          <select
            id="sectorFilter"
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
          >
            <option value="all">Todos los sectores</option>
            {sectors.map(sector => (
              <option key={sector.id} value={sector.valor}>{sector.descripcion}</option>
            ))}
          </select>
        </div>
        <div className={styles.selectGroup}>
          <label htmlFor="bedFilter">Estado</label>
          <select
            id="bedFilter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {bedStates.map(state => (
              <option key={state.id} value={state.valor}>{state.descripcion}</option>
            ))}
          </select>
        </div>
        <button className={styles.refreshButton} onClick={refreshBeds}>Actualizar</button>
      </div>
    </div>
  );
};

export default BedFilters;
