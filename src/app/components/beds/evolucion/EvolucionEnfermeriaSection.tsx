'use client';

import React, { useState, useMemo } from 'react';
import { EvolucionEnfermeria } from '../../../types/evolucionEnfermeria';
import {
  crearEvolucion,
  actualizarEvolucion,
} from '../../../services/evolucionEnfermeriaService';
import NuevaEvolucionEnfermeriaModal from './NuevaEvolucionEnfermeriaModal';
import ModalBasePaciente from '../../modals/ModalBasePaciente';
import { useBedDetail } from '../contexts/BedDetailContext';
import { useBedSectionFetch } from '../contexts/useBedSectionQuery';
import styles from './EvolucionEnfermeriaSection.module.css';
import BedSectionLoading from '../shared/BedSectionLoading';
import EvolucionEnfermeriaTable from './EvolucionEnfermeriaTable';
import EmptyState from '../shared/EmptyState';
import ExportButton, { ExportOption } from '../shared/ExportButton';
import { exportToPDF } from '../../../utils/pdfExport';
import { obtenerInfoEmpresa } from '../../../services/empresaService';

interface EvolucionEnfermeriaSectionProps {
  numeroVisita: number | null;
  patientName?: string;
  patientLocation?: string;
  documentoPaciente?: string;
  fechaIngreso?: string;
  horaIngreso?: string;
}

const EvolucionEnfermeriaSection: React.FC<EvolucionEnfermeriaSectionProps> = ({
  numeroVisita,
  patientName,
  patientLocation,
  documentoPaciente,
  fechaIngreso,
  horaIngreso
}) => {
  const { activeSection, selectedDate } = useBedDetail();
  const [periodFilter, setPeriodFilter] = useState<'0' | '7' | '30' | 'all'>('0');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvolucion, setEditingEvolucion] = useState<EvolucionEnfermeria | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

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
    params: {
      days: periodFilter,
    },
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

  // Filtrar evoluciones según query
  const filteredEvoluciones = useMemo(() => {
    if (!query.trim()) return evoluciones;
    
    const q = query.toLowerCase();
    return evoluciones.filter((ev) => {
      const profesional = `${ev.ProfesionalApellido || ''} ${ev.ProfesionalNombres || ''}`.toLowerCase();
      const observaciones = (ev.Observaciones || '').toLowerCase();
      const operador = `${ev.OperadorApellido || ''} ${ev.OperadorNombres || ''}`.toLowerCase();
      
      return profesional.includes(q) || observaciones.includes(q) || operador.includes(q);
    });
  }, [evoluciones, query]);

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (editingEvolucion) {
        const fechaClarion = Number(
          data.FechaControlClarion ?? editingEvolucion.FechaControlClarion,
        );
        const horaClarion = Number(
          data.HoraControlClarion ?? editingEvolucion.HoraControlClarion,
        );
        if (!Number.isFinite(fechaClarion) || !Number.isFinite(horaClarion)) {
          throw new Error('No se pudo identificar la evolución a editar');
        }
        await actualizarEvolucion(
          editingEvolucion.NumeroVisita,
          fechaClarion,
          horaClarion,
          data.Observaciones,
        );
        return data;
      }

      const finalPayload = {
        ...data,
        NumeroVisita: data.NumeroVisita ?? numeroVisita ?? 0,
      };
      await crearEvolucion(finalPayload);
      return finalPayload;
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message ?? "Error inesperado al guardar la evolución");
      }
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const onAddEvolucion = () => {
    setEditingEvolucion(null);
    setModalOpen(true);
  };

  const onEditEvolucion = (row: EvolucionEnfermeria) => {
    setEditingEvolucion(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEvolucion(null);
  };

  // Formatear fecha seleccionada para mostrar
  const formatSelectedDate = () => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diaSemana = dias[date.getDay()];
    const diaMes = date.getDate();
    const mes = meses[date.getMonth()];
    return { diaSemana, diaMes, mes };
  };

  const fechaFormateada = formatSelectedDate();

  const handleExport = async (option: ExportOption, data: any[]) => {
    if (option === 'pdf') {
      const empresaInfo = await obtenerInfoEmpresa();

      const parts = filteredEvoluciones.map((ev: any, idx: number) => {
        const nombre =
          `${ev.ProfesionalApellido || ''} ${ev.ProfesionalNombres || ''}`.trim() ||
          `${ev.OperadorApellido || ''} ${ev.OperadorNombres || ''}`.trim() ||
          'PROFESIONAL';
        return {
          title: `Evolución de enfermería ${idx + 1}`,
          fields: [
            { label: 'Fecha', value: ev.FechaControl || ev.FechaEv || '—' },
            { label: 'Hora', value: ev.HoraControl || ev.HoraEv || '—' },
          ],
          textLabel: 'Observaciones',
          text: ev.Observaciones || '—',
          profesional: {
            nombre,
            matricula: ev.Matricula ?? undefined,
            idPersonal: ev.Profesional ?? undefined,
            especialidad: 'Enfermería',
          },
        };
      });

      await exportToPDF({
        title: 'Evolución de Enfermería',
        subtitle: `Fecha: ${fechaFormateada?.diaSemana} ${fechaFormateada?.diaMes}, ${fechaFormateada?.mes}`,
        parts,
        fileName: `evolucion_enfermeria_${selectedDate?.toISOString().split('T')[0]}.pdf`,
        orientation: 'portrait',
        empresaInfo,
        patientInfo: {
          numeroVisita: numeroVisita || undefined,
          nombre: patientName,
          numeroDocumento: documentoPaciente,
          ubicacion: patientLocation,
          fechaIngreso: fechaIngreso,
          horaIngreso: horaIngreso
        },
      });
    }
  };

  // No renderizar si no es la sección activa
  if (activeSection !== 'evolucion-enfermeria') {
    return null;
  }

  if (isLoading) {
    return <BedSectionLoading />;
  }

  return (
    <div className={styles.root}>
      {/* Fecha seleccionada + botón agregar */}
      {fechaFormateada && (
        <div className={styles.dateHeader}>
          <h2 className={styles.sectionTitle}>Evolución de Enfermería</h2>
          <span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
          <span className={styles.dateText}>{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}</span>
          <div className={styles.dateActions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
              onClick={onAddEvolucion}
            >
              <span className={styles.addIcon} aria-hidden>
                +
              </span>
              Evolución
            </button>
            <ExportButton
              data={filteredEvoluciones}
              fileName={`evolucion_enfermeria_${selectedDate?.toISOString().split('T')[0]}.pdf`}
              onExport={handleExport}
              options={['pdf']}
            />
          </div>
        </div>
      )}

      {/* Buscador y filtros de período */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por profesional, observaciones..."
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.periodFilters}>
          <button
            type="button"
            className={`${styles.periodTag} ${periodFilter === '0' ? styles.periodTagActive : ''}`}
            onClick={() => setPeriodFilter('0')}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`${styles.periodTag} ${periodFilter === '7' ? styles.periodTagActive : ''}`}
            onClick={() => setPeriodFilter('7')}
          >
            7 días
          </button>
          <button
            type="button"
            className={`${styles.periodTag} ${periodFilter === '30' ? styles.periodTagActive : ''}`}
            onClick={() => setPeriodFilter('30')}
          >
            1 mes
          </button>
          <button
            type="button"
            className={`${styles.periodTag} ${periodFilter === 'all' ? styles.periodTagActive : ''}`}
            onClick={() => setPeriodFilter('all')}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.content}>
        <div className={styles.tableHolder}>
          {error && (
            <div className={styles.errorBox}>
              Error al cargar evoluciones: {error.message}
            </div>
          )}
          {!isLoading && !error && filteredEvoluciones.length === 0 && (
            <EmptyState
              variant="evolucion"
              text="Sin evoluciones registradas"
              description="No hay evoluciones de enfermería para esta fecha. Podés agregar una haciendo clic en el botón de arriba."
              actionLabel="Nueva Evolución"
              onAction={onAddEvolucion}
            />
          )}
          {!isLoading && !error && filteredEvoluciones.length > 0 && (
            <EvolucionEnfermeriaTable
              rows={filteredEvoluciones}
              refetch={refetch}
              onEdit={onEditEvolucion}
            />
          )}
        </div>
      </div>

      {/* Modal de nueva / editar evolución */}
      <ModalBasePaciente
        numeroVisita={numeroVisita ? String(numeroVisita) : ""}
        onClose={closeModal}
        isOpen={modalOpen}
        titulo={
          editingEvolucion
            ? "Editando Evolución de Enfermería"
            : "Agregando nueva Evolución de Enfermería"
        }
        footerButtons={
          <>
            <button
              className={styles.btn + " " + styles.btnPrimary}
              type="submit"
              form="nueva-evolucion-enfermeria-form"
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <NuevaEvolucionEnfermeriaModal
          onClose={closeModal}
          onSave={handleSave}
          defaultNumeroVisita={numeroVisita}
          refetch={refetch}
          initialEvolucion={editingEvolucion}
        />
      </ModalBasePaciente>
    </div>
  );
};

export default EvolucionEnfermeriaSection;
