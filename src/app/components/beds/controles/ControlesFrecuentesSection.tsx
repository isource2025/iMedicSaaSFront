'use client';

import React, { useState, useMemo } from 'react';
import { ControlFrecuente } from '../../../types/controlesFrecuentes';
import {
  formatearFecha,
  formatearHora,
  obtenerNombreCompleto,
  eliminarControl,
} from '../../../services/controlesFrecuentesService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from './ControlesFrecuentesSection.module.css';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { IoEyeOutline, IoTrashOutline } from 'react-icons/io5';

interface ControlesFrecuentesSectionProps {
  numeroVisita: number | null;
  patientName?: string;
  patientLocation?: string;
  documentoPaciente?: string;
  fechaIngreso?: string;
  horaIngreso?: string;
}

// Helper para convertir Date a YYYY-MM-DD
function toISODate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ControlesFrecuentesSection: React.FC<ControlesFrecuentesSectionProps> = ({
  numeroVisita,
  patientName,
  patientLocation,
  documentoPaciente,
  fechaIngreso,
  horaIngreso
}) => {
  const { activeSection, selectedDate } = useBedDetail();
  const [selectedControl, setSelectedControl] = useState<ControlFrecuente | null>(null);

  // Convertir fecha seleccionada a formato ISO
  const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

  // Construir el path del endpoint
  const controlesPath = useMemo(
    () => numeroVisita ? `/controles-frecuentes/${numeroVisita}/byDate` : undefined,
    [numeroVisita]
  );

  // Usar useBedSectionFetch
  const { data, isLoading, error, refetch, url } = useBedSectionFetch<any>({
    enabled: !!controlesPath && activeSection === 'controles-frecuentes',
    endpointOverride: controlesPath
      ? { 'controles-frecuentes': controlesPath }
      : undefined,
    cacheTimeMs: 15000,
  });

  // Extraer controles del data
  const controles: ControlFrecuente[] = useMemo(() => {
    const list: ControlFrecuente[] = Array.isArray(data)
      ? data
      : data && Array.isArray((data as any).data)
      ? (data as any).data
      : [];
    
    return list;
  }, [data]);

  const handleVerDetalle = (control: ControlFrecuente) => {
    setSelectedControl(control);
  };

  const handleCerrarDetalle = () => {
    setSelectedControl(null);
  };

  const handleEliminar = async (control: ControlFrecuente) => {
    if (!confirm(`¿Está seguro que desea eliminar este control?\n\nFecha: ${formatearFecha(control.FechaControl)}\nHora: ${formatearHora(control.HoraControl)}`)) {
      return;
    }

    try {
      await eliminarControl(control.Valor);
      alert('Control eliminado correctamente');
      refetch();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el control');
    }
  };

  const handleExport = async (option: ExportOption, data: any[]) => {
    if (option === 'pdf') {
      const empresaInfo = await obtenerInfoEmpresa();
      const primerControl = controles[0];
      const profesionalInfo = primerControl ? {
        nombre: obtenerNombreCompleto(primerControl.OperadorApellido, primerControl.OperadorNombres),
        matricula: undefined,
        especialidad: 'Enfermería'
      } : undefined;

      const pdfData = controles.map(row => [
        formatearFecha(row.FechaControl),
        formatearHora(row.HoraControl),
        row.Pulso || '-',
        `${row.Maximo || '-'}/${row.Minimo || '-'}`,
        row.Axilar ? `${row.Axilar}°C` : '-',
        row.FrecuenciaRespiratoria || '-'
      ]);

      exportToPDF({
        title: 'Controles Frecuentes',
        subtitle: `Fecha: ${fechaISO}`,
        headers: ['Fecha', 'Hora', 'Pulso', 'Presión', 'Temperatura', 'Frec. Resp.'],
        data: pdfData,
        fileName: `controles_${selectedDate?.toISOString().split('T')[0]}.pdf`,
        orientation: 'landscape',
        empresaInfo,
        patientInfo: {
          numeroVisita: numeroVisita || undefined,
          nombre: patientName,
          numeroDocumento: documentoPaciente,
          ubicacion: patientLocation,
          fechaIngreso: fechaIngreso,
          horaIngreso: horaIngreso
        },
        profesionalInfo
      });
    }
  };

  // No renderizar si no es la sección activa
  if (activeSection !== 'controles-frecuentes') {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Controles Frecuentes</h2>
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
          <p>Cargando controles frecuentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Controles Frecuentes</h2>
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
          <h2 className={styles.title}>Controles Frecuentes</h2>
        </div>
        <div className={styles.emptyContainer}>
          <p>No hay número de visita disponible</p>
        </div>
      </div>
    );
  }

  if (controles.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Controles Frecuentes</h2>
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
          <p>No hay controles frecuentes registrados para esta visita</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Controles Frecuentes</h2>
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
          <span className={styles.statValue}>{controles.length}</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Pulso</th>
              <th>TA Máx</th>
              <th>TA Mín</th>
              <th>FR</th>
              <th>T° Axilar</th>
              <th>Saturación</th>
              <th>Origen</th>
              <th>Operador</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {controles.map((control) => (
              <tr key={control.Valor}>
                <td>{formatearFecha(control.FechaControl)}</td>
                <td>{formatearHora(control.HoraControl)}</td>
                <td>{control.Pulso || '-'}</td>
                <td>{control.Maximo || '-'}</td>
                <td>{control.Minimo || '-'}</td>
                <td>{control.FrecuenciaRespiratoria || '-'}</td>
                <td>{control.Axilar ? `${control.Axilar}°C` : '-'}</td>
                <td>{control.Saturometria ? `${control.Saturometria}%` : '-'}</td>
                <td>
                  {control.IdHci && control.IdHci > 0 ? (
                    <span style={{ 
                      display: 'inline-block',
                      padding: '2px 8px', 
                      backgroundColor: '#00B5E2', 
                      color: 'white', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: '600' 
                    }}>HC</span>
                  ) : (
                    <span style={{ 
                      display: 'inline-block',
                      padding: '2px 8px', 
                      backgroundColor: '#6c757d', 
                      color: 'white', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: '600' 
                    }}>ENF</span>
                  )}
                </td>
                <td>
                  {obtenerNombreCompleto(
                    control.OperadorApellido,
                    control.OperadorNombres
                  )}
                </td>
                <td className={styles.observaciones}>
                  {control.Observaciones || '-'}
                </td>
                <td className={styles.cellAccion}>
                  <div className={styles.actionBtns}>
                    <button
                      className={styles.btnAction}
                      onClick={() => handleVerDetalle(control)}
                      title="Ver detalle"
                    >
                      <IoEyeOutline color="#5BC0DE" size="18px" />
                    </button>
                    <button
                      className={styles.btnAction}
                      onClick={() => handleEliminar(control)}
                      title="Eliminar control"
                    >
                      <IoTrashOutline color="#5BC0DE" size="18px" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle */}
      {selectedControl && (
        <div className={styles.modalOverlay} onClick={handleCerrarDetalle}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalle del Control Frecuente</h3>
              <button className={styles.btnCerrar} onClick={handleCerrarDetalle}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fecha de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearFecha(selectedControl.FechaControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Hora de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearHora(selectedControl.HoraControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Pulso:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Pulso || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>TA Máxima:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Maximo || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>TA Mínima:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Minimo || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>PA Media:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.PAMedia || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Frecuencia Respiratoria:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.FrecuenciaRespiratoria || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Temperatura Axilar:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Axilar ? `${selectedControl.Axilar}°C` : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Temperatura Rectal:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Rectal ? `${selectedControl.Rectal}°C` : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Saturometría:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Saturometria ? `${selectedControl.Saturometria}%` : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>HGT:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Hgt || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Peso:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Peso ? `${selectedControl.Peso} kg` : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Talla:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Talla ? `${selectedControl.Talla} cm` : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Operador:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedControl.OperadorApellido,
                      selectedControl.OperadorNombres
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Profesional:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedControl.ProfesionalApellido,
                      selectedControl.ProfesionalNombres
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Origen:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.IdHci && selectedControl.IdHci > 0 ? (
                      <span style={{ 
                        display: 'inline-block',
                        padding: '2px 10px', 
                        backgroundColor: '#00B5E2', 
                        color: 'white', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>Historia Clínica (HC #{selectedControl.IdHci})</span>
                    ) : (
                      <span style={{ 
                        display: 'inline-block',
                        padding: '2px 10px', 
                        backgroundColor: '#6c757d', 
                        color: 'white', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>Gestión de Enfermería</span>
                    )}
                  </span>
                </div>
                <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.detailLabel}>Observaciones:</span>
                  <span className={styles.detailValue}>
                    {selectedControl.Observaciones || '-'}
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

export default ControlesFrecuentesSection;
