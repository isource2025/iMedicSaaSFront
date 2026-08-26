'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './ModalAsignarCamaAVisita.module.css';
import Loader from '../Loader/Loader';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { getClasesPaciente } from '../../services/clasePacienteService';
import { ClasePaciente } from '../../types/clasePaciente.types';
import { useBedsManagement } from '../../hooks/useBedsManagement';
import BedFilters from '../beds/BedFilters';
import {
  dateToClarionDate,
  timeToClarionTime,
  fechaLocalISO,
  horaLocalHHMM,
  codigoCamaDesdeId,
} from '../../utils/dateUtils';
import { getSessionUser, getUserCodOperador } from '../../utils/sessionUser';
import { detalleDeError, mensajeDeError } from '../../utils/apiError';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  numeroVisita: number;
  pacienteNombre?: string;
  diagnostico?: string;
  clasePacienteDefault?: string;
};

const CLASE_INTERNADO = 'I';

export default function ModalAsignarCamaAVisita({
  isOpen,
  onClose,
  onSuccess,
  numeroVisita,
  pacienteNombre = '',
  diagnostico = '',
  clasePacienteDefault = CLASE_INTERNADO,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [horaIngreso, setHoraIngreso] = useState('');
  const [clasePaciente, setClasePaciente] = useState(clasePacienteDefault);
  const [clasesPaciente, setClasesPaciente] = useState<ClasePaciente[]>([]);
  const [camaSeleccionada, setCamaSeleccionada] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  const {
    allBeds,
    bedStates,
    sectors,
    serviciosMedicos,
    loading: loadingBeds,
    error: errorBeds,
    filter,
    setFilter,
    sectorFilter,
    setSectorFilter,
    servicioFilter,
    setServicioFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds,
  } = useBedsManagement({ enableAutoRefresh: false });

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setCamaSeleccionada(null);
      setClasePaciente(clasePacienteDefault || CLASE_INTERNADO);
      return;
    }

    const now = new Date();
    setFechaIngreso(fechaLocalISO(now));
    setHoraIngreso(horaLocalHHMM(now));
    setCamaSeleccionada(null);
    setSuccess(false);
    setError(null);

    getClasesPaciente()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setClasesPaciente(list);
        const def = (clasePacienteDefault || CLASE_INTERNADO).trim().toUpperCase();
        const match =
          list.find((c) => String(c.Valor || '').trim().toUpperCase() === def) ||
          list.find((c) => /INTERN/i.test(String(c.Descripcion || '')));
        if (match?.Valor != null) setClasePaciente(String(match.Valor).trim());
      })
      .catch(() => setError('No se pudieron cargar las clases de paciente'));

    void refreshBeds().then(() => setLastUpdateTime(Date.now()));
  }, [isOpen, clasePacienteDefault, refreshBeds]);

  const camasDisponibles = useMemo(
    () =>
      allBeds
        .filter((cama) => {
          const estadoMatch = cama.estado === 'desocupada' || cama.estado === 'disponible';
          const sectorMatch = sectorFilter === 'all' || cama.sector === sectorFilter;
          const servicioMatch =
            servicioFilter === 'all' || cama.servicioMedicoDescripcion === servicioFilter;
          const searchMatch =
            !searchTerm ||
            String(cama.numeroCama || '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
          const esCama = !cama.tipoRecurso || cama.tipoRecurso === 'cama';
          return estadoMatch && sectorMatch && servicioMatch && searchMatch && esCama;
        })
        .map((cama) => ({
          id: cama.id,
          sector: cama.sector,
          numeroCama: cama.numeroCama,
        })),
    [allBeds, sectorFilter, servicioFilter, searchTerm],
  );

  const handleSubmit = async () => {
    if (!camaSeleccionada) {
      setError('Seleccioná una cama libre');
      return;
    }
    if (!fechaIngreso || !horaIngreso) {
      setError('Fecha y hora son obligatorias');
      return;
    }
    if (!clasePaciente) {
      setError('Seleccioná la clase de paciente');
      return;
    }

    const cama = camasDisponibles.find((c) => c.id === camaSeleccionada);
    if (!cama) {
      setError('La cama seleccionada ya no está disponible');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fechaObj = new Date(`${fechaIngreso}T${horaIngreso}:00`);
      const clarionDate = dateToClarionDate(fechaObj);
      const clarionTime = timeToClarionTime(fechaObj);
      const operador = getUserCodOperador(getSessionUser());
      if (!operador) {
        throw new Error('Sesión sin CodOperador — no se puede asignar la cama');
      }

      const numeroCamaSolo = codigoCamaDesdeId(cama.id, cama.sector, cama.numeroCama || cama.id);

      await visitaMovimientoService.asignarPacienteACama(numeroVisita, {
        FechaAdmision: clarionDate,
        HoraAdmision: clarionTime,
        ClasePaciente: clasePaciente,
        Diagnostico: diagnostico || '',
        bedId: numeroCamaSolo,
        ValorSector: cama.sector,
        Operador: String(operador),
        FechaCarga: clarionDate,
        HoraCarga: clarionTime,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err: unknown) {
      console.error('Error al asignar la cama:', detalleDeError(err));
      setError(mensajeDeError(err, 'Error al asignar la cama'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asignar-cama-visita-title"
      >
        <div className={styles.header}>
          <h2 id="asignar-cama-visita-title" className={styles.title}>
            Asignar cama
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className={styles.patientBanner}>
          <strong>{pacienteNombre || `Visita ${numeroVisita}`}</strong>
          <span>Visita #{numeroVisita} — internado sin ubicación</span>
        </div>

        <div className={styles.body}>
          {error ? <div className={styles.errorMessage}>{error}</div> : null}
          {success ? (
            <div className={styles.successMessage}>Cama asignada correctamente</div>
          ) : null}

          {!success ? (
            <>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="fechaAsignacionVisita">
                    Fecha de ingreso a cama
                  </label>
                  <input
                    id="fechaAsignacionVisita"
                    type="date"
                    className={styles.input}
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="horaAsignacionVisita">
                    Hora
                  </label>
                  <input
                    id="horaAsignacionVisita"
                    type="time"
                    className={styles.input}
                    value={horaIngreso}
                    onChange={(e) => setHoraIngreso(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className={styles.formGroupFull}>
                  <label className={styles.label} htmlFor="clasePacienteVisita">
                    Clase paciente
                  </label>
                  <select
                    id="clasePacienteVisita"
                    className={styles.select}
                    value={clasePaciente}
                    onChange={(e) => setClasePaciente(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Seleccione una clase</option>
                    {clasesPaciente.map((c) => (
                      <option key={c.Valor} value={String(c.Valor || '').trim()}>
                        {c.Descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.filtersWrap}>
                <BedFilters
                  placeHolder="Buscar cama…"
                  filter={filter}
                  setFilter={setFilter}
                  sectorFilter={sectorFilter}
                  setSectorFilter={setSectorFilter}
                  servicioFilter={servicioFilter}
                  setServicioFilter={setServicioFilter}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  bedStates={bedStates}
                  sectors={sectors}
                  serviciosMedicos={serviciosMedicos}
                  refreshBeds={async () => {
                    await refreshBeds();
                    setLastUpdateTime(Date.now());
                  }}
                  autoRefresh={false}
                  setAutoRefresh={() => {}}
                  refreshInterval={30000}
                  setRefreshInterval={() => {}}
                  lastUpdateTime={lastUpdateTime}
                />
              </div>

              <div className={styles.camasBox}>
                <h3 className={styles.camasTitle}>
                  Camas disponibles ({camasDisponibles.length})
                </h3>
                {loadingBeds ? (
                  <div className={styles.loadingWrap}>
                    <Loader />
                  </div>
                ) : errorBeds ? (
                  <div className={styles.errorMessage}>{errorBeds}</div>
                ) : camasDisponibles.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hay camas libres con los filtros seleccionados
                  </div>
                ) : (
                  <div className={styles.camasGrid}>
                    {camasDisponibles.map((cama) => (
                      <button
                        key={cama.id}
                        type="button"
                        className={`${styles.camaCard} ${
                          camaSeleccionada === cama.id ? styles.camaSeleccionada : ''
                        }`}
                        onClick={() => setCamaSeleccionada(cama.id)}
                        disabled={loading}
                      >
                        <span className={styles.camaSector}>{cama.sector}</span>
                        <span className={styles.camaNumero}>{cama.numeroCama}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => void handleSubmit()}
            disabled={loading || success || !camaSeleccionada}
          >
            {loading ? 'Asignando…' : 'Asignar cama'}
          </button>
        </div>
      </div>
    </div>
  );
}
