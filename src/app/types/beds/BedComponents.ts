import { Bed } from '../beds';

/**
 * Props para el componente BedCard
 */
export interface BedCardProps {
  bed: Bed;
  onNursingReport: (bed: Bed) => void;
  onRecentIndications: (bedId: string) => void;
  onChangeBed: (bedId: string) => void;
}

/**
 * Props para el componente BedFilters
 */
export interface BedFiltersProps {
  bedStates: BedState[];
  sectors: Sector[];
  currentFilter: string;
  currentSectorFilter: string;
  searchTerm: string;
  onFilterChange: (filter: string) => void;
  onSectorFilterChange: (sectorId: string) => void;
  onSearchChange: (searchTerm: string) => void;
}

/**
 * Props para el componente BedsList
 */
export interface BedsListProps {
  sectorId?: string;
}

/**
 * Representación de un estado de cama
 */
export interface BedState {
  valor: string;
  descripcion: string;
  className?: string;
}

/**
 * Representación de un sector hospitalario
 */
export interface Sector {
  valor: string;
  descripcion: string;
}
