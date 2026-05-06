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
import styles from '../indicaciones/IndicacionesSection.module.css';
import tableStyles from './MedicacionSuministradaSection.module.css';
import Loader from '../../Loader/Loader';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import EmptyState from '../shared/EmptyState';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';
import { IoEyeOutline, IoTrashOutline } from 'react-icons/io5';

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


  // Construir el path del endpoint igual que Indicaciones
  const medicacionPath = useMemo(
    () => numeroVisita ? `/medicacion-control/${numeroVisita}/byDate` : undefined,
    [numeroVisita]
  );


  // Usar useBedSectionFetch igual que Indicaciones
  const { data, isLoading, error, refetch, url } = useBedSectionFetch<any>({
    enabled: !!medicacionPath && activeSection === 'medicacion-suministrada',
    endpointOverride: medicacionPath
      ? { 'medicacion-suministrada': medicacionPath }
      : undefined,
    cacheTimeMs: 15000,
  });


  const medicacionesAgrupadas = useMemo(() => {
    const list = Array.isArray(data)
      ? data
      : data && Array.isArray((data as any).data)
      ? (data as any).data
      : [];
    return list;
  }, [data]);

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

  // formatear fecha para el header y el PDF
  const formatSelectedDate = () => {
    if (!selectedDate) return null;
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return { diaSemana: dias[selectedDate.getDay()], diaMes: selectedDate.getDate(), mes: meses[selectedDate.getMonth()] };
  };
  const fechaFormateada = formatSelectedDate();

  const handleExport = async (option: ExportOption, data: any[]) => {
    if (option === 'pdf') {
      const empresaInfo = await obtenerInfoEmpresa();
      const primeraMedicacion = medicacionesAgrupadas[0];
      const profesionalInfo = primeraMedicacion ? {
        nombre: obtenerNombreCompleto(primeraMedicacion.ProfesionalApellido, primeraMedicacion.ProfesionalNombres),
        matricula: undefined,
        especialidad: undefined
      } : undefined;

      const fd = fechaFormateada;
      const pdfData = medicacionesAgrupadas.map((row: any) => [
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
        subtitle: `Fecha: ${fd?.diaSemana} ${fd?.diaMes}, ${fd?.mes}`,
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

  return (
    <div className={styles.root}>
      {/* Header idéntico al de Indicaciones */}
      {fechaFormateada && (
        <div className={styles.dateHeader}>
          <h2 className={styles.sectionTitle}>Medicación</h2>
          <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
          <span className={styles.dateText}>
            {fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
          </span>
          <div className={styles.dateActions}>
            <ExportButton
              data={medicacionesAgrupadas}
              fileName={`medicacion_${fechaISO}.pdf`}
              onExport={handleExport}
              options={['pdf']}
            />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className={styles.content}>
        <div className={styles.tableHolder}>
          {isLoading && <div style={{ position: 'relative', minHeight: 200 }}><Loader /></div>}
          {error && <div className={styles.errorBox}>Error al cargar: {error.message}</div>}
          {!isLoading && !error && medicacionesAgrupadas.length === 0 && (
            <EmptyState
              variant="medicacion"
              text="Sin medicación registrada"
              description="No hay registros de medicación suministrada para esta fecha."
            />
          )}
          {!isLoading && !error && medicacionesAgrupadas.length > 0 && (
      <div className={tableStyles.tableContainer}>
        <table className={tableStyles.table}>
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
                  <div className={tableStyles.medicamentoContainer}>
                    <span className={tableStyles.medicamentoPrincipal}>
                      {medicacion.NombreMedicamento || medicacion.DescripcionMedicamento || '-'}
                    </span>
                    {medicacion.adicionales && medicacion.adicionales.length > 0 && (
                      <div className={tableStyles.indicacionesAdicionales}>
                        {medicacion.adicionales.map((adicional: MedicacionControl, idx: number) => (
                          <div key={idx} className={tableStyles.adicionalItem}>
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
                  <div className={tableStyles.profesionalContainer}>
                    <div className={tableStyles.profesionalPrimary}>
                      {medicacion.Profesional || medicacion.OperadorCarga || '-'}
                    </div>
                    <div className={tableStyles.profesionalSub}>
                      {medicacion.ProfesionalFullName || medicacion.OperadorFullName || ''}
                    </div>
                  </div>
                </td>
                <td>{medicacion.Cantidad || '-'}</td>
                <td className={tableStyles.cellAccion}>
                  <div className={tableStyles.actionBtns}>
                    <button
                      className={tableStyles.btnAction}
                      onClick={() => handleVerDetalle(medicacion)}
                      title="Ver detalle"
                    >
                      <IoEyeOutline color="#5BC0DE" size="18px" />
                    </button>
                    <button
                      className={tableStyles.btnAction}
                      onClick={() => handleEliminar(medicacion)}
                      title="Eliminar registro"
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
      )}

      {/* Modal de detalle */}
      {selectedMedicacion && (
        <div className={tableStyles.modalOverlay} onClick={handleCerrarDetalle}>
          <div className={tableStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={tableStyles.modalHeader}>
              <h3>Detalle de Medicación</h3>
              <button className={tableStyles.btnCerrar} onClick={handleCerrarDetalle}>
                ✕
              </button>
            </div>
            <div className={tableStyles.modalBody}>
              <div className={tableStyles.detailGrid}>
                {[
                  ['ID Control', selectedMedicacion.IDCtrlMedica],
                  ['Nro. Indicación', selectedMedicacion.NroIndicacion || '-'],
                  ['Fecha Control', formatearFecha(selectedMedicacion.FechaControl)],
                  ['Hora Control', formatearHora(selectedMedicacion.HoraControl)],
                  ['Medicamento', selectedMedicacion.NombreMedicamento || selectedMedicacion.DescripcionMedicamento || '-'],
                  ['Cantidad aplicada', selectedMedicacion.Cantidad || '-'],
                  ['Cantidad indicada', selectedMedicacion.CantidadIndicada || '-'],
                  ['Tipo unidad', selectedMedicacion.TipoUnidad || '-'],
                  ['Sector', selectedMedicacion.Sector || '-'],
                  ['Profesional', selectedMedicacion.ProfesionalFullName || selectedMedicacion.Profesional || '-'],
                  ['Operador', selectedMedicacion.OperadorFullName || selectedMedicacion.OperadorCarga || '-'],
                  ['Observaciones', selectedMedicacion.Observaciones || '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className={tableStyles.detailItem}>
                    <span className={tableStyles.detailLabel}>{label}:</span>
                    <span className={tableStyles.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default MedicacionSuministradaSection;
