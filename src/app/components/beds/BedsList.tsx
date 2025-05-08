"use client"
import { useBedsManagement } from '../../hooks/useBedsManagement';
import { useAppContext } from '../../contexts/AppContext';
import { useState, useRef, useEffect } from 'react';
import NursingReportModal from '../nursing/NursingReportModal';
import ModalEgresoPaciente from '../modals/ModalEgresoPaciente';
import ModalCambiarCama from '../modals/ModalCambiarCama';
import BedCard from './BedCard';
import BedFilters from './BedFilters';
import styles from "./Bedslist.module.css"
import { useRouter } from 'next/navigation';

const BedsList = () => {
  const router = useRouter();
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
    refreshBeds,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
  } = useBedsManagement();

  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [cambiarCamaModalOpen, setCambiarCamaModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<{numeroVisita: number, nombrePaciente: string, id: string, sector: string} | null>(null);
  const [selectedSector, setSelectedSector] = useState<{id: string, valor: string, descripcion: string} | null>(null); 
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // Actualizar el tiempo de última actualización cuando se refrescan las camas
  useEffect(() => {
    setLastUpdateTime(Date.now());
    
  }, [bedStates]);

  // Función para actualizar manualmente las camas
  const handleRefreshBeds = () => {
    refreshBeds();
    setLastUpdateTime(Date.now());
  };

  console.log('selectedBed:', selectedBed);
  const handleNursingReport = (bed: any) => {
    setSelectedBed({
      numeroVisita: bed.numeroVisita,
      nombrePaciente: bed.nombrePaciente,
      id: bed.numeroCama,
      sector: bed.sector
    });
    setNursingModalOpen(true);
    
  };

  const handleRecentIndications = (bedId: string) => {
    // Implementa la lógica de indicaciones recientes aquí
  };

  const handleChangeBed = (bedId: string, bedSector: string) => {
    // Encontrar la cama seleccionada
    const bed = beds.find(bed => bed.id === bedId && bed.sector === bedSector);
    
    // Encontrar la información completa del sector
    const sectorInfo = sectors.find(sector => sector.valor === bedSector);
    console.log('Sector encontrado:', sectorInfo);
    
    // Abrir el modal solo si la cama está ocupada y tiene un número de visita
    if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
      setSelectedBed({
        numeroVisita: bed.numeroVisita,
        nombrePaciente: bed.nombrePaciente,
        id: bed.numeroCama,
        sector: bed.sector
      });
      
      // Guardar la información completa del sector
      setSelectedSector(sectorInfo || null);
      
      setCambiarCamaModalOpen(true);
    } else {
      // Opcionalmente mostrar algún mensaje de error o aviso
      console.warn('No se puede cambiar de cama a un paciente que no está ingresado');
    }
  };

  const handleBedClick = (bedId: string) => {
    // Encontrar la cama seleccionada
    const selectedBed = beds.find(bed => bed.id === bedId);
    
    // Solo navegar si la cama está ocupada
    if (selectedBed && selectedBed.estado === 'ocupada') {
      router.push(`/dashboard/bed-detail?id=${bedId}`);
    }
  };

  const handleLabResults = (bedId: string) => {
    // Implementar la lógica para mostrar los resultados de laboratorio
    console.log('Mostrando resultados de laboratorio para la cama:', bedId);
    // Aquí se puede implementar la lógica para mostrar un modal o navegar a una página de resultados
  };

  const handleDischarge = (bedId: string) => {
    // Encontrar la cama seleccionada
    const bed = beds.find(bed => bed.id === bedId);
    
    // Abrir el modal solo si la cama está ocupada y tiene un número de visita
    if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
      setSelectedBed({
        numeroVisita: bed.numeroVisita,
        nombrePaciente: bed.nombrePaciente,
        id: bed.numeroCama,
        sector: bed.sector
      });
      setEgresoModalOpen(true);
    } else {
      // Opcionalmente mostrar algún mensaje de error o aviso
      console.warn('No se puede iniciar el egreso para esta cama');
    }
  };

  return (
    <div className={styles.container}>
      <BedFilters
        placeHolder='Buscar paciente...'
        sectors={sectors}
        bedStates={bedStates}
        filter={filter}
        setFilter={setFilter}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        refreshBeds={handleRefreshBeds}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        lastUpdateTime={lastUpdateTime}
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
              onChangeBed={() => handleChangeBed(bed.id, bed.sector)}
              onBedClick={() => handleBedClick(bed.id)}
              onLabResults={() => handleLabResults(bed.id)}
              onDischarge={() => handleDischarge(bed.id)}
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
      
      {egresoModalOpen && selectedBed && (
        <ModalEgresoPaciente
          isOpen={egresoModalOpen}
          onClose={() => setEgresoModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita}
          bedId={selectedBed.id}
        />
      )}
      
      {cambiarCamaModalOpen && selectedBed && (
        <ModalCambiarCama
          isOpen={cambiarCamaModalOpen}
          onClose={() => setCambiarCamaModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita}
          bedId={selectedBed.id}
          bedSector={selectedBed.sector}
          sectorInfo={selectedSector}
        />
      )}
    </div>
  );
};

export default BedsList;
