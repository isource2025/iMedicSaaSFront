'use client';

import { useBedsManagement } from '../../hooks/useBedsManagement';
import styles from './BedsList.module.css';
import { useAppContext } from '../../contexts/AppContext';
import { 
  IoMedicalOutline, 
  IoSwapHorizontalOutline, 
  IoDocumentTextOutline,
  IoMale,
  IoFemale,
  IoPerson
} from 'react-icons/io5';
import { useState } from 'react';
import { NursingReportModal } from '../../components/NursingReportModal';

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
  
  // Estado para manejo de tooltip activo
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // Estado para el modal de reportes de enfermería
  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<{numeroVisita: number, nombrePaciente: string} | null>(null);

  // Funciones para manejar acciones de los iconos
  const handleNursingReport = (bed: any) => {
    setSelectedBed({
      numeroVisita: bed.numeroVisita,
      nombrePaciente: bed.nombrePaciente
    });
    setNursingModalOpen(true);
  };

  const handleRecentIndications = (bedId: string) => {
    console.log('Ver indicaciones recientes para cama:', bedId);
    // Aquí iría la implementación real para mostrar las indicaciones
  };

  const handleChangeBed = (bedId: string) => {
    console.log('Cambiar paciente de cama:', bedId);
    // Aquí iría la implementación real para cambiar de cama
  };

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
                <div className={styles.headerRight}>
                  {/* Mostrar número de visita solo si existe y no está vacío */}
                  {bed.mostrarNumeroVisita && bed.mostrarNumeroVisita !== '' && (
                    <span className={styles.visitNumber}>{bed.mostrarNumeroVisita}</span>
                  )}
                  
                  {/* Icono de sexo del paciente con tooltip nativo */}
                  {bed.nombrePaciente && (
                    <div 
                      className={styles.genderIcon}
                      title={bed.descripcionSexo || 'Sexo no especificado'}
                    >
                      {bed.sexoPaciente === 'F' ? (
                        <IoFemale 
                          className={styles.genderIconF} 
                          aria-label={bed.descripcionSexo || 'Paciente femenino'} 
                        />
                      ) : bed.sexoPaciente === 'M' ? (
                        <IoMale 
                          className={styles.genderIconM} 
                          aria-label={bed.descripcionSexo || 'Paciente masculino'}
                        />
                      ) : (
                        <IoPerson 
                          className={styles.genderIconO} 
                          aria-label={bed.descripcionSexo || 'Paciente de otro sexo'}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className={` ${styles.cardBody}`}>
                {bed.nombrePaciente && (
                  <>
                    {bed.documentoPaciente && (
                      <div className={styles.documentNumber}>
                        {bed.documentoPaciente}
                      </div>
                    )}
                    <div className={styles.patientName}>
                      {bed.nombrePaciente}
                    </div>
                    {bed.razonSocialCliente && (
                      <div className={styles.socialReason}>
                        {bed.razonSocialCliente}
                      </div>
                    )}
                  </>
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
                      {/* <div className={styles.diagnosticoLabel}>Diagnóstico:</div> */}
                      <div className={styles.diagnosticoDescripcion}>{bed.diagnosticoDescripcion}</div>
                    </div>
                  )}
                  
                  {/* Mostrar el servicio médico solo si existe y no es vacío */}
                  {bed.servicioMedicoDescripcion && 
                   bed.servicioMedicoDescripcion !== '' && (
                    <div className={styles.servicioMedico} style={{ fontSize: '0.6rem' }}>
                      <span style={{ fontWeight: 500 }}>Servicio: </span>
                      {bed.servicioMedicoDescripcion}
                    </div>
                  )}
                </div>
                
                {/* Agregar sección de iconos interactivos solo en las camas ocupadas */}
                {bed.valorEstadoOriginal === 'O' && (
                  <div className={styles.iconsContainer}>
                    <div className={styles.iconWrapper}>
                      <IoMedicalOutline 
                        className={styles.actionIcon} 
                        style={{ fontSize: 32 }} 
                        onClick={() => handleNursingReport(bed)} 
                        title="Reporte de enfermería"
                        aria-label="Reporte de enfermería"
                      />
                    </div>
                    
                    <div className={styles.iconWrapper}>
                      <IoDocumentTextOutline 
                        className={styles.actionIcon} 
                        style={{ fontSize: 32 }} 
                        onClick={() => handleRecentIndications(bed.id)} 
                        title="Indicaciones recientes"
                        aria-label="Indicaciones recientes"
                      />
                    </div>
                    
                    <div className={styles.iconWrapper}>
                      <IoSwapHorizontalOutline 
                        className={styles.actionIcon} 
                        style={{ fontSize: 32 }} 
                        onClick={() => handleChangeBed(bed.id)} 
                        title="Cambiar paciente de cama"
                        aria-label="Cambiar paciente de cama"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal de reportes de enfermería */}
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
