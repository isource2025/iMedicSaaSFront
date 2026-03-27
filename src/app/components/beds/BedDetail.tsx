"use client"
import { useState } from 'react';
import { Bed, BedState } from '../../types/beds';
import NursingReportModal from '../nursing/NursingReportModal';
import ModalEgresoPaciente from '../modals/ModalEgresoPaciente';
import ModalCambiarCama from '../modals/ModalCambiarCama';
import IndicacionesList from '../indicaciones/IndicacionesList';
import NuevaIndicacionModal from '../indicaciones/NuevaIndicacionModal';
import styles from './BedDetail.module.css';
import Loader from '../Loader/Loader';
import { useBedRelatedData } from '../../hooks/useBedRelatedData';

interface BedDetailProps {
  selectedBed: Bed | null;
  allBeds: Bed[];
  bedStates: BedState[];
  sectors: {id: string, valor: string, descripcion: string}[];
  serviciosMedicos: string[];
  onClose: () => void;
}

const BedDetail = ({
  selectedBed,
  allBeds,
  bedStates,
  sectors,
  serviciosMedicos,
  onClose
}: BedDetailProps) => {
  
  // Estados locales para los modales
  const [nursingModalOpen, setNursingModalOpen] = useState(false);
  const [egresoModalOpen, setEgresoModalOpen] = useState(false);
  const [cambiarCamaModalOpen, setCambiarCamaModalOpen] = useState(false);
  const [nuevaIndicacionOpen, setNuevaIndicacionOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<{id: string, valor: string, descripcion: string} | null>(null);
  const [showAllIndicaciones, setShowAllIndicaciones] = useState(false);
  
  // Handlers locales para los modales
  const handleNursingReport = () => {
    setNursingModalOpen(true);
  };
  
  const handleChangeBed = () => {
    const sectorInfo = sectors.find(sector => sector.valor === selectedBed?.sector);
    setSelectedSector(sectorInfo || null);
    setCambiarCamaModalOpen(true);
  };
  
  const handleLabResults = () => {
    console.log('Mostrando resultados de laboratorio para la cama:', selectedBed?.id);
    // Aquí se puede implementar la lógica para mostrar un modal o navegar a una página de resultados
  };
  
  const handleDischarge = () => {
    setEgresoModalOpen(true);
  };

  const handleAddIndication = () => {
    setNuevaIndicacionOpen(true);
  };

  const handleViewAllIndicaciones = () => {
    setShowAllIndicaciones(!showAllIndicaciones);
  };
  
  if (!selectedBed) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Cama no encontrada</h2>
          <p>La cama seleccionada no existe o no está disponible.</p>
          <button onClick={onClose} className={styles.backButton}>
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (clarionDate: number) => {
    if (!clarionDate || clarionDate <= 0) return 'No disponible';
    try {
      // Usar la función de dateUtils para consistencia
      const date = new Date((clarionDate - 2) * 24 * 60 * 60 * 1000 + new Date('1900-01-01').getTime());
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getSectorDescription = (sectorValue: string) => {
    const sector = sectors.find(s => s.valor === sectorValue);
    return sector ? sector.descripcion : sectorValue;
  };

  const getEstadoDescription = (estadoValue: string) => {
    const estado = bedStates.find(s => s.valor === estadoValue);
    return estado ? estado.descripcion : estadoValue;
  };

  // Datos relacionados (medicación y estudios) por número de visita
  const { meds, studies, loading: loadingRelated, error: errorRelated } = useBedRelatedData(selectedBed.numeroVisita ?? null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onClose} className={styles.backButton}>
          ← Volver a la lista 
        </button>
        <h1 className={styles.title}>
          {getSectorDescription(selectedBed.sector)} - Cama {selectedBed.numeroCama}
                  <label> - Número de Visita </label>
                  <span>{selectedBed.mostrarNumeroVisita || selectedBed.numeroVisita}</span>
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.mainInfo}>

          {selectedBed.estado === 'ocupada' && (
            <div className={styles.patientInfo}>
              <h2>Información del Paciente</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Nombre:</label>
                  <span className={styles.patientName}>{selectedBed.NombrePaciente}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Documento:</label>
                  <span>{selectedBed.documentoPaciente}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Sexo:</label>
                  <span>{selectedBed.descripcionSexo}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Fecha de Ingreso:</label>
                  <span>{selectedBed.fechaIngresoFormateada || '-'}</span>
                </div>
                {selectedBed.diagnosticoDescripcion && (
                  <div className={styles.infoItem}>
                    <label>Diagnóstico:</label>
                    <span>{selectedBed.diagnosticoDescripcion}</span>
                  </div>
                )}
                {selectedBed.servicioMedicoDescripcion && (
                  <div className={styles.infoItem}>
                    <label>Servicio Médico:</label>
                    <span>{selectedBed.servicioMedicoDescripcion}</span>
                  </div>
                )}
                {selectedBed.razonSocialCliente && (
                  <div className={styles.infoItem}>
                    <label>Obra Social:</label>
                    <span>{selectedBed.razonSocialCliente}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedBed.estado === 'ocupada' && (
          <>
            <div className={styles.actions}>
              <h2>Acciones Disponibles</h2>
              <div className={styles.actionButtons}>
                <button 
                  onClick={handleNursingReport}
                  className={`${styles.actionButton} ${styles.nursing}`}
                >
                  📋 Reporte de Enfermería
                </button>
                <button 
                  onClick={handleChangeBed}
                  className={`${styles.actionButton} ${styles.changeBed}`}
                >
                  🔄 Cambiar Cama
                </button>
                <button 
                  onClick={handleLabResults}
                  className={`${styles.actionButton} ${styles.lab}`}
                >
                  🧪 Resultados de Laboratorio
                </button>
                <button 
                  onClick={handleDischarge}
                  className={`${styles.actionButton} ${styles.discharge}`}
                >
                  📤 Egreso de Paciente
                </button>
              </div>
            </div>

            {/* Fila de tarjetas con información relacionada a la cama */}
            <div className={styles.cardsRow}>
              {/* Card: Últimas Indicaciones */}
              <div className={`${styles.card} ${styles.cardIndicaciones}`}>
                <div className={styles.cardHeader}>
                  <h2>{showAllIndicaciones ? 'Todas las Indicaciones' : 'Últimas Indicaciones'}</h2>
                  <button 
                    onClick={handleViewAllIndicaciones}
                    className={styles.linkButton}
                  >
                    {showAllIndicaciones ? 'Ver últimas' : 'Ver todas'}
                  </button>
                </div>
                <div className={styles.cardBody}>
                  <IndicacionesList 
                    numeroVisita={selectedBed.numeroVisita || null}
                    showAll={showAllIndicaciones}
                    limit={showAllIndicaciones ? undefined : 3}
                  />
                </div>
                <div className={styles.cardFooter}>
                  <button 
                    onClick={handleAddIndication}
                    className={`${styles.actionButton} ${styles.addIndication}`}
                  >
                    ➕ Nueva Indicación
                  </button>
                </div>
              </div>

              {/* Card: Medicación Activa (placeholder) */}
              <div className={`${styles.card} ${styles.cardMedications}`}>
                <div className={styles.cardHeader}>
                  <h2>Medicación Activa</h2>
                </div>
                <div className={styles.cardBody}>
                  {loadingRelated ? (
                    <div style={{ position: 'relative', minHeight: '100px' }}>
                      <Loader />
                    </div>
                  ) : errorRelated ? (
                    <p>Error: {errorRelated}</p>
                  ) : meds.length === 0 ? (
                    <p>No hay medicación activa.</p>
                  ) : (
                    <ul>
                      {meds.map(m => (
                        <li key={m.id}>
                          <strong>{m.descripcion}</strong>
                          {m.dosis ? ` · ${m.dosis}` : ''}
                          {m.frecuencia ? ` · ${m.frecuencia}` : ''}
                          {m.via ? ` · ${m.via}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Card: Próximos Estudios (placeholder) */}
              <div className={`${styles.card} ${styles.cardStudies}`}>
                <div className={styles.cardHeader}>
                  <h2>Próximos Estudios</h2>
                </div>
                <div className={styles.cardBody}>
                  {loadingRelated ? (
                    <div style={{ position: 'relative', minHeight: '100px' }}>
                      <Loader />
                    </div>
                  ) : errorRelated ? (
                    <p>Error: {errorRelated}</p>
                  ) : studies.length === 0 ? (
                    <p>No hay estudios programados.</p>
                  ) : (
                    <ul>
                      {studies.map(s => (
                        <li key={s.id}>
                          <strong>{s.descripcion}</strong>
                          {s.area ? ` · ${s.area}` : ''}
                          {s.fecha ? ` · ${s.fecha}` : ''}
                          {s.hora ? ` ${s.hora}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.statistics}>
          <h2>Estadísticas del Sector</h2>
          <div className={styles.statsGrid}>
            {(() => {
              const sectorBeds = allBeds.filter(bed => bed.sector === selectedBed.sector);
              const ocupadas = sectorBeds.filter(bed => bed.estado === 'ocupada').length;
              const disponibles = sectorBeds.filter(bed => bed.estado === 'desocupada').length;
              const total = sectorBeds.length;
              
              return (
                <>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{total}</span>
                    <span className={styles.statLabel}>Total Camas</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{ocupadas}</span>
                    <span className={styles.statLabel}>Ocupadas</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{disponibles}</span>
                    <span className={styles.statLabel}>Disponibles</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>
                      {total > 0 ? Math.round((ocupadas / total) * 100) : 0}%
                    </span>
                    <span className={styles.statLabel}>Ocupación</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      
      {/* Modales renderizados directamente en BedDetail */}
      {nursingModalOpen && selectedBed && (
        <NursingReportModal
          isOpen={nursingModalOpen}
          onClose={() => setNursingModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita ?? 0}
          nombrePaciente={selectedBed.NombrePaciente ?? 'Paciente'}
        />
      )}

      {nuevaIndicacionOpen && selectedBed && (
        <NuevaIndicacionModal
          onClose={() => setNuevaIndicacionOpen(false)}
          onSave={async (_data) => {
            // TODO: implementar POST cuando esté disponible
            setNuevaIndicacionOpen(false);
          }}
          defaultNumeroVisita={selectedBed.numeroVisita ?? null}
        />
      )}
      
      {egresoModalOpen && selectedBed && (
        <ModalEgresoPaciente
          isOpen={egresoModalOpen}
          onClose={() => setEgresoModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita ?? 0}
          bedId={selectedBed.numeroCama ?? ''}
        />
      )}
      
      {cambiarCamaModalOpen && selectedBed && (
        <ModalCambiarCama
          isOpen={cambiarCamaModalOpen}
          onClose={() => setCambiarCamaModalOpen(false)}
          numeroVisita={selectedBed.numeroVisita ?? 0}
          bedId={selectedBed.numeroCama ?? ''}
          bedSector={selectedBed.sector ?? ''}
          sectorInfo={selectedSector}
        />
      )}
    </div>
  );
};

export default BedDetail;
