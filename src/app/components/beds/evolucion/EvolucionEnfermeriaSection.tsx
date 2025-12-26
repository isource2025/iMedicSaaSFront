'use client';

import React, { useState, useMemo } from 'react';
import { EvolucionEnfermeria } from '../../../types/evolucionEnfermeria';
import {
  formatearFecha,
  formatearHora,
  obtenerNombreCompleto,
  eliminarEvolucion,
  convertirFechaAClarion,
  convertirHoraAClarion,
} from '../../../services/evolucionEnfermeriaService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from './EvolucionEnfermeriaSection.module.css';

interface EvolucionEnfermeriaSectionProps {
  numeroVisita: number | null;
  patientName?: string;
  patientLocation?: string;
}

// Helper para convertir Date a YYYY-MM-DD
function toISODate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EvolucionEnfermeriaSection: React.FC<EvolucionEnfermeriaSectionProps> = ({
  numeroVisita,
  patientName,
  patientLocation,
}) => {
  const { activeSection, selectedDate } = useBedDetail();
  const [selectedEvolucion, setSelectedEvolucion] = useState<EvolucionEnfermeria | null>(null);

  // Convertir fecha seleccionada a formato ISO
  const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

  // Construir el path del endpoint
  const evolucionPath = useMemo(
    () => numeroVisita ? `/evolucion-enfermeria/${numeroVisita}/byDate` : undefined,
    [numeroVisita]
  );

  // Usar useBedSectionFetch
  const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
    enabled: !!evolucionPath && activeSection === 'evolucion-enfermeria',
    endpointOverride: evolucionPath
      ? { 'evolucion-enfermeria': evolucionPath }
      : undefined,
    cacheTimeMs: 15000,
  });

  // Extraer evoluciones del data
  const evoluciones: EvolucionEnfermeria[] = useMemo(() => {
    const list: EvolucionEnfermeria[] = Array.isArray(data)
      ? data
      : data && Array.isArray((data as any).data)
      ? (data as any).data
      : [];
    
    return list;
  }, [data]);

  const handleVerDetalle = (evolucion: EvolucionEnfermeria) => {
    setSelectedEvolucion(evolucion);
  };

  const handleCerrarDetalle = () => {
    setSelectedEvolucion(null);
  };

  const handleEliminar = async (evolucion: EvolucionEnfermeria) => {
    if (!confirm(`¿Está seguro que desea eliminar esta evolución?\n\nFecha: ${formatearFecha(evolucion.FechaControl)}\nHora: ${formatearHora(evolucion.HoraControl)}`)) {
      return;
    }

    try {
      // Convertir fecha y hora a formato Clarion para la eliminación
      const fechaClarion = convertirFechaAClarion(evolucion.FechaControl);
      const horaClarion = convertirHoraAClarion(evolucion.HoraControl);
      
      await eliminarEvolucion(evolucion.NumeroVisita, fechaClarion, horaClarion);
      alert('Evolución eliminada correctamente');
      refetch();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la evolución');
    }
  };

  // No renderizar si no es la sección activa
  if (activeSection !== 'evolucion-enfermeria') {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolución de Enfermería</h2>
          {patientName && (
            <div className={styles.patientInfo}>
              <span className={styles.patientName}>{patientName}</span>
              {patientLocation && (
                <span className={styles.patientLocation}>{patientLocation}</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando evoluciones de enfermería...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolución de Enfermería</h2>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!numeroVisita) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolución de Enfermería</h2>
        </div>
        <div className={styles.emptyContainer}>
          <p>No hay número de visita disponible</p>
        </div>
      </div>
    );
  }

  if (evoluciones.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolución de Enfermería</h2>
          {patientName && (
            <div className={styles.patientInfo}>
              <span className={styles.patientName}>{patientName}</span>
              {patientLocation && (
                <span className={styles.patientLocation}>{patientLocation}</span>
              )}
            </div>
          )}
        </div>
        <div className={styles.emptyContainer}>
          <p>No hay evoluciones de enfermería registradas para esta visita</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Evolución de Enfermería</h2>
        {patientName && (
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{patientName}</span>
            {patientLocation && (
              <span className={styles.patientLocation}>{patientLocation}</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.statsBar}>
        {fechaISO && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Fecha seleccionada:</span>
            <span className={styles.statValue}>{formatearFecha(fechaISO)}</span>
          </div>
        )}
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total de registros:</span>
          <span className={styles.statValue}>{evoluciones.length}</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Profesional</th>
              <th>Observaciones</th>
              <th>Operador Carga</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {evoluciones.map((evolucion, index) => (
              <tr key={`${evolucion.NumeroVisita}-${evolucion.FechaControl}-${evolucion.HoraControl}-${index}`}>
                <td>{formatearFecha(evolucion.FechaControl)}</td>
                <td>{formatearHora(evolucion.HoraControl)}</td>
                <td>
                  {obtenerNombreCompleto(
                    evolucion.ProfesionalApellido,
                    evolucion.ProfesionalNombres
                  )}
                </td>
                <td className={styles.observaciones}>
                  {evolucion.Observaciones || '-'}
                </td>
                <td>
                  {obtenerNombreCompleto(
                    evolucion.OperadorApellido,
                    evolucion.OperadorNombres
                  )}
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.btnDetalle}
                      onClick={() => handleVerDetalle(evolucion)}
                      title="Ver detalle"
                    >
                      Ver detalle
                    </button>
                    <button
                      className={styles.btnEliminar}
                      onClick={() => handleEliminar(evolucion)}
                      title="Eliminar evolución"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle */}
      {selectedEvolucion && (
        <div className={styles.modalOverlay} onClick={handleCerrarDetalle}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalle de Evolución de Enfermería</h3>
              <button className={styles.btnCerrar} onClick={handleCerrarDetalle}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fecha de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearFecha(selectedEvolucion.FechaControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Hora de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearHora(selectedEvolucion.HoraControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Profesional:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedEvolucion.ProfesionalApellido,
                      selectedEvolucion.ProfesionalNombres
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Operador de Carga:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedEvolucion.OperadorApellido,
                      selectedEvolucion.OperadorNombres
                    )}
                  </span>
                </div>
                {selectedEvolucion.FechaHoraCarga && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fecha/Hora de Carga:</span>
                    <span className={styles.detailValue}>
                      {new Date(selectedEvolucion.FechaHoraCarga).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}
                <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.detailLabel}>Observaciones:</span>
                  <span className={styles.detailValue}>
                    {selectedEvolucion.Observaciones || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvolucionEnfermeriaSection;
