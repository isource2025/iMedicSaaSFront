'use client';

import React, { useState, useMemo } from 'react';
import { MedicacionControl } from '../../../types/medicacionControl';
import {
  obtenerMedicacionPorVisitaYFecha,
  formatearFecha,
  formatearHora,
  obtenerNombreCompleto,
  eliminarMedicacion,
} from '../../../services/medicacionControlService';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from './MedicacionSuministradaSection.module.css';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';

interface MedicacionSuministradaSectionProps {
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

const MedicacionSuministradaSection: React.FC<MedicacionSuministradaSectionProps> = ({
  numeroVisita,
  patientName,
  patientLocation,
  documentoPaciente,
  fechaIngreso,
  horaIngreso
}) => {
  const { activeSection, selectedDate } = useBedDetail();
  const [selectedMedicacion, setSelectedMedicacion] = useState<MedicacionControl | null>(null);

  // Convertir fecha seleccionada a formato ISO
  const fechaISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

  console.log('🔵 [MedicacionSuministrada] Render:', {
    numeroVisita,
    activeSection,
    selectedDate,
    fechaISO,
    patientName,
    patientLocation
  });

  // Construir el path del endpoint igual que Indicaciones
  const medicacionPath = useMemo(
    () => numeroVisita ? `/medicacion-control/${numeroVisita}/byDate` : undefined,
    [numeroVisita]
  );

  console.log('🔵 [MedicacionSuministrada] medicacionPath:', medicacionPath);

  // Usar useBedSectionFetch igual que Indicaciones
  const { data, isLoading, error, refetch, url } = useBedSectionFetch<any>({
    enabled: !!medicacionPath && activeSection === 'medicacion-suministrada',
    endpointOverride: medicacionPath
      ? { 'medicacion-suministrada': medicacionPath }
      : undefined,
    cacheTimeMs: 15000,
  });

  console.log('🔵 [MedicacionSuministrada] useBedSectionFetch result:', {
    data,
    isLoading,
    error: error?.message,
    url,
    hasData: !!data,
    dataType: typeof data,
    isArray: Array.isArray(data)
  });

  // Extraer medicaciones del data (soporta tanto array directo como wrapper {data:[]})
  const medicaciones: MedicacionControl[] = useMemo(() => {
    console.log('🔵 [MedicacionSuministrada] Processing data:', data);
    
    const list: MedicacionControl[] = Array.isArray(data)
      ? data
      : data && Array.isArray((data as any).data)
      ? (data as any).data
      : [];
    
    console.log('🔵 [MedicacionSuministrada] Extracted list:', list);
    return list;
  }, [data]);

  // Agrupar medicaciones: principales con sus adicionales
  const medicacionesAgrupadas = useMemo(() => {
    const principales: MedicacionControl[] = [];
    const adicionales = new Map<number, MedicacionControl[]>();

    // Separar principales y adicionales
    medicaciones.forEach(med => {
      if (med.NroAdicional && med.NroAdicional > 0) {
        // Es una indicación adicional
        if (!adicionales.has(med.NroAdicional)) {
          adicionales.set(med.NroAdicional, []);
        }
        adicionales.get(med.NroAdicional)!.push(med);
      } else {
        // Es una indicación principal
        principales.push(med);
      }
    });

    // Agregar las adicionales a cada principal
    return principales.map(principal => ({
      ...principal,
      adicionales: adicionales.get(principal.NroIndicacion || 0) || []
    }));
  }, [medicaciones]);

  const handleVerDetalle = (medicacion: MedicacionControl) => {
    setSelectedMedicacion(medicacion);
  };

  const handleCerrarDetalle = () => {
    setSelectedMedicacion(null);
  };

  const handleEliminar = async (medicacion: MedicacionControl) => {
    if (!confirm(`¿Está seguro que desea eliminar este registro de medicación?\n\nMedicamento: ${medicacion.NombreMedicamento || medicacion.DescripcionMedicamento || medicacion.Troquel}\nFecha: ${formatearFecha(medicacion.FechaControl)}\nHora: ${formatearHora(medicacion.HoraControl)}`)) {
      return;
    }

    try {
      await eliminarMedicacion(medicacion.IDCtrlMedica);
      alert('Registro eliminado correctamente');
      refetch(); // Recargar la lista
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el registro');
    }
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return null;
    const diaSemana = selectedDate.toLocaleString('es-ES', { weekday: 'long' });
    const diaMes = selectedDate.getDate();
    const mes = selectedDate.toLocaleString('es-ES', { month: 'long' });
    return { diaSemana, diaMes, mes };
  };

  const handleExport = async (option: ExportOption, data: any[]) => {
    if (option === 'pdf') {
      const empresaInfo = await obtenerInfoEmpresa();
      const primeraMedicacion = medicaciones[0];
      const profesionalInfo = primeraMedicacion ? {
        nombre: obtenerNombreCompleto(primeraMedicacion.ProfesionalApellido, primeraMedicacion.ProfesionalNombres),
        matricula: undefined,
        especialidad: undefined
      } : undefined;

      const pdfData = medicaciones.map(row => [
        formatearFecha(row.FechaControl),
        formatearHora(row.HoraControl),
        row.Sector || '-',
        row.NombreMedicamento || row.DescripcionMedicamento || '-',
        row.CantidadIndicada || '-',
        row.TipoUnidad || '-',
        obtenerNombreCompleto(row.ProfesionalApellido, row.ProfesionalNombres) || obtenerNombreCompleto(row.OperadorApellido, row.OperadorNombres) || '-',
        row.Cantidad || '-'
      ]);

      exportToPDF({
        title: 'Medicación Suministrada',
        subtitle: `Fecha: ${formatSelectedDate()?.diaSemana} ${formatSelectedDate()?.diaMes}, ${formatSelectedDate()?.mes}`,
        headers: ['Fecha', 'Hora', 'Sector', 'Medicamento', 'Aplicado', 'Unidad', 'Profesional', 'Cantidad Total'],
        data: pdfData,
        fileName: `medicacion_${selectedDate?.toISOString().split('T')[0]}.pdf`,
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
  if (activeSection !== 'medicacion-suministrada') {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Medicación Suministrada</h2>
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
          <p>Cargando medicación suministrada...</p>
          <p style={{ fontSize: '0.75rem', color: '#666' }}>URL: {url}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Medicación Suministrada</h2>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error.message}</p>
          <p style={{ fontSize: '0.75rem', color: '#666' }}>URL: {url}</p>
        </div>
      </div>
    );
  }

  if (!numeroVisita) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Medicación Suministrada</h2>
        </div>
        <div className={styles.emptyContainer}>
          <p>No hay número de visita disponible</p>
        </div>
      </div>
    );
  }

  if (medicaciones.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Medicación Suministrada</h2>
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
          <p>No hay medicación suministrada registrada para esta visita</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Medicación Suministrada</h2>
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
          <span className={styles.statValue}>{medicaciones.length}</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Sector</th>
              <th>Nombre</th>
              <th>Aplicado</th>
              <th>Tipo Unidad</th>
              <th>Profesional</th>
              <th>Cantidad Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {medicacionesAgrupadas.map((medicacion: any) => (
              <tr key={medicacion.IDCtrlMedica}>
                <td>{formatearFecha(medicacion.FechaControl)}</td>
                <td>{formatearHora(medicacion.HoraControl)}</td>
                <td>{medicacion.Sector || '-'}</td>
                <td>
                  <div className={styles.medicamentoContainer}>
                    <span className={styles.medicamentoPrincipal}>
                      {medicacion.NombreMedicamento || medicacion.DescripcionMedicamento || '-'}
                    </span>
                    {medicacion.adicionales && medicacion.adicionales.length > 0 && (
                      <div className={styles.indicacionesAdicionales}>
                        {medicacion.adicionales.map((adicional: MedicacionControl, idx: number) => (
                          <div key={idx} className={styles.adicionalItem}>
                            + {adicional.FormaAdicional ? `${adicional.FormaAdicional} - ` : ''}{adicional.NombreMedicamento || adicional.DescripcionMedicamento}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td>{medicacion.CantidadIndicada || '-'}</td>
                <td>{medicacion.TipoUnidad || '-'}</td>
                <td>
                  {obtenerNombreCompleto(
                    medicacion.ProfesionalApellido,
                    medicacion.ProfesionalNombres
                  ) || obtenerNombreCompleto(
                    medicacion.OperadorApellido,
                    medicacion.OperadorNombres
                  ) || '-'}
                </td>
                <td>{medicacion.Cantidad || '-'}</td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.btnDetalle}
                      onClick={() => handleVerDetalle(medicacion)}
                      title="Ver detalle"
                    >
                      Ver detalle
                    </button>
                    <button
                      className={styles.btnEliminar}
                      onClick={() => handleEliminar(medicacion)}
                      title="Eliminar registro"
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
      {selectedMedicacion && (
        <div className={styles.modalOverlay} onClick={handleCerrarDetalle}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalle de Medicación</h3>
              <button className={styles.btnCerrar} onClick={handleCerrarDetalle}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>ID Control:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.IDCtrlMedica}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Nro. Indicación:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.NroIndicacion || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fecha de Carga:</span>
                  <span className={styles.detailValue}>
                    {formatearFecha(selectedMedicacion.FechaCarga)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Hora de Carga:</span>
                  <span className={styles.detailValue}>
                    {formatearHora(selectedMedicacion.HoraCarga)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Fecha de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearFecha(selectedMedicacion.FechaControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Hora de Control:</span>
                  <span className={styles.detailValue}>
                    {formatearHora(selectedMedicacion.HoraControl)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Medicamento:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.NombreMedicamento || selectedMedicacion.DescripcionMedicamento || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Troquel:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.Troquel || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tipo Medicamento:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.TipoMedicamento || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Cantidad:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.Cantidad || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Cantidad Indicada:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.CantidadIndicada || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tipo de Unidad:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.TipoUnidad || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sector:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.Sector || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Operador:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedMedicacion.OperadorApellido,
                      selectedMedicacion.OperadorNombres
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Profesional:</span>
                  <span className={styles.detailValue}>
                    {obtenerNombreCompleto(
                      selectedMedicacion.ProfesionalApellido,
                      selectedMedicacion.ProfesionalNombres
                    )}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Módulo Origen:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.ModuloOrigen || '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.Status || '-'}
                  </span>
                </div>
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>Observaciones:</span>
                  <span className={styles.detailValue}>
                    {selectedMedicacion.Observaciones || '-'}
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

export default MedicacionSuministradaSection;
