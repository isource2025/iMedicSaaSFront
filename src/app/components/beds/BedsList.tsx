"use client"
import { useBedsManagement } from '../../hooks/useBedsManagement';
import { useAppContext } from '../../contexts/AppContext';
import { useState } from 'react';
import { NursingReportModal } from '../nursing/NursingReportModal';
import BedCard from './BedCard';
import BedFilters from './BedFilters';
import styles from "./Bedslist.module.css"

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

  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<{numeroVisita: number, nombrePaciente: string} | null>(null);

  const handleNursingReport = (bed: any) => {
    setSelectedBed({
      numeroVisita: bed.numeroVisita,
      nombrePaciente: bed.nombrePaciente
    });
    setNursingModalOpen(true);
  };

  const handleRecentIndications = (bedId: string) => {
    // Implementa la lógica de indicaciones recientes aquí
  };

  const handleChangeBed = (bedId: string) => {
    // Implementa la lógica de cambio de cama aquí
  };

  return (
    <div className={styles.container}>
      <BedFilters
        sectors={sectors}
        bedStates={bedStates}
        filter={filter}
        setFilter={setFilter}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        refreshBeds={refreshBeds}
      />
      {loading ? (
        <div className={styles.loadingState}>Cargando camas...</div>
      ) : error ? (
        <div className={styles.errorState}>{error}</div>
      ) : beds.length === 0 ? (
        <div className={styles.emptyState}>No se encontraron camas con los filtros seleccionados</div>
      ) : (
        <div className={styles.bedsGrid}>
          {beds.map(bed => (
            <BedCard
              key={bed.id}
              bed={bed}
              onNursingReport={handleNursingReport}
              onRecentIndications={() => handleRecentIndications(bed.id)}
              onChangeBed={() => handleChangeBed(bed.id)}
            />
          ))}
        </div>
      )}
      {nursingModalOpen && selectedBed && (
        <NursingReportModal
          isOpen={nursingModalOpen}
          onClose={() => setNursingModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita}
          nombrePaciente={selectedBed.nombrePaciente}
        />
      )}
    </div>
  );
};
