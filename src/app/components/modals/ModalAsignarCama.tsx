'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ModalAsignarCama.module.css';
import Loader from '../Loader/Loader';
import visitaMovimientoService, { InternadoSinCama } from '../../services/visitaMovimientoService';
import { getClasesPaciente } from '../../services/clasePacienteService';
import { ClasePaciente } from '../../types/clasePaciente.types';
import { dateToClarionDate, timeToClarionTime, fechaLocalISO, horaLocalHHMM, codigoCamaDesdeId } from '../../utils/dateUtils';
import { getSessionUser, getUserCodOperador } from '../../utils/sessionUser';

interface ModalAsignarCamaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bedId: string;
  bedSector: string;
  numeroCama: string;
  /** Valor de imClasePaciente por defecto al abrir desde internación (ej. "I"). */
  clasePacienteDefault?: string;
}

const CLASE_INTERNADO = 'I';

const ModalAsignarCama: React.FC<ModalAsignarCamaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bedId,
  bedSector,
  numeroCama,
  clasePacienteDefault = CLASE_INTERNADO,
}) => {
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<InternadoSinCama[]>([]);
  const [seleccionado, setSeleccionado] = useState<InternadoSinCama | null>(null);

  const [fechaIngreso, setFechaIngreso] = useState('');
  const [horaIngreso, setHoraIngreso] = useState('');
  const [clasePaciente, setClasePaciente] = useState(clasePacienteDefault);
  const [clasesPaciente, setClasesPaciente] = useState<ClasePaciente[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      loadedRef.current = false;
      setTermino('');
      setResultados([]);
      setSeleccionado(null);
      setError(null);
      setSuccess(false);
      setClasePaciente(clasePacienteDefault || CLASE_INTERNADO);
      return;
    }

    const now = new Date();
    setFechaIngreso(fechaLocalISO(now));
    setHoraIngreso(horaLocalHHMM(now));
    setClasePaciente(clasePacienteDefault || CLASE_INTERNADO);

    if (!loadedRef.current) {
      loadedRef.current = true;
      getClasesPaciente()
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          setClasesPaciente(list);
          const def = (clasePacienteDefault || CLASE_INTERNADO).trim().toUpperCase();
          const match =
            list.find((c) => String(c.Valor || '').trim().toUpperCase() === def) ||
            list.find((c) => /INTERN/i.test(String(c.Descripcion || '')));
          if (match?.Valor != null) {
            setClasePaciente(String(match.Valor).trim());
          }
        })
        .catch(() => setError('No se pudieron cargar las clases de paciente'));
      void buscar('');
    }
  }, [isOpen, clasePacienteDefault]);

  const buscar = async (q: string) => {
    setBuscando(true);
    setError(null);
    try {
      const data = await visitaMovimientoService.getInternadosSinCama(q);
      setResultados(data);
    } catch (err: any) {
      setError(err?.message || 'Error al buscar pacientes');
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  const handleTerminoChange = (value: string) => {
    setTermino(value);
    setSeleccionado(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void buscar(value), 300);
  };

  const handleSubmit = async () => {
    if (!seleccionado) {
      setError('Seleccione un paciente internado sin cama');
      return;
    }
    if (!fechaIngreso || !horaIngreso) {
      setError('Fecha y hora son obligatorias');
      return;
    }
    if (!clasePaciente) {
      setError('Seleccione la clase de paciente');
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

      const numeroCamaSolo = codigoCamaDesdeId(bedId, bedSector, numeroCama || bedId);

      await visitaMovimientoService.asignarPacienteACama(seleccionado.numeroVisita, {
        FechaAdmision: clarionDate,
        HoraAdmision: clarionTime,
        ClasePaciente: clasePaciente,
        Diagnostico: seleccionado.diagnostico || '',
        bedId: numeroCamaSolo,
        ValorSector: bedSector,
        Operador: String(operador),
        FechaCarga: clarionDate,
        HoraCarga: clarionTime,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.mensaje ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al asignar la cama';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Asignar paciente a cama</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className={styles.bedBanner}>
          <span className={styles.bedSector}>{bedSector}</span>
          <span className={styles.bedNumber}>{numeroCama || bedId}</span>
          <span className={styles.bedHint}>Cama libre — buscar internados sin ubicación</span>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && (
            <div className={styles.successMessage}>Cama asignada correctamente</div>
          )}

          {!success && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="buscarInternado">
                  Buscar internado sin cama
                </label>
                <input
                  id="buscarInternado"
                  type="text"
                  className={styles.input}
                  value={termino}
                  onChange={(e) => handleTerminoChange(e.target.value)}
                  placeholder="Nombre, documento, HC o N° de visita"
                  disabled={loading}
                  autoComplete="off"
                />
              </div>

              <div className={styles.resultsBox}>
                {buscando ? (
                  <div style={{ position: 'relative', minHeight: 80 }}>
                    <Loader />
                  </div>
                ) : resultados.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hay internados sin cama
                    {termino.trim() ? ` para "${termino.trim()}"` : ''}
                  </div>
                ) : (
                  resultados.map((p) => (
                    <button
                      key={p.numeroVisita}
                      type="button"
                      className={`${styles.resultRow} ${
                        seleccionado?.numeroVisita === p.numeroVisita ? styles.resultRowActive : ''
                      }`}
                      onClick={() => setSeleccionado(p)}
                      disabled={loading}
                    >
                      <div className={styles.resultMain}>
                        <strong>{p.apellidoYNombre}</strong>
                        <span className={styles.resultMeta}>
                          Doc. {p.numeroDocumento || '—'} · Visita {p.numeroVisita}
                        </span>
                      </div>
                      <div className={styles.resultSide}>
                        {p.fechaAdmision && (
                          <span>
                            Adm. {p.fechaAdmision}
                            {p.horaAdmision ? ` ${p.horaAdmision}` : ''}
                          </span>
                        )}
                        {p.diagnosticoDescripcion || p.diagnostico ? (
                          <span className={styles.diag}>
                            {p.diagnostico} {p.diagnosticoDescripcion}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {seleccionado && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="fechaAsignacion">
                      Fecha de ingreso a cama
                    </label>
                    <input
                      id="fechaAsignacion"
                      type="date"
                      className={styles.input}
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="horaAsignacion">
                      Hora
                    </label>
                    <input
                      id="horaAsignacion"
                      type="time"
                      className={styles.input}
                      value={horaIngreso}
                      onChange={(e) => setHoraIngreso(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label} htmlFor="clasePaciente">
                      Clase paciente
                    </label>
                    <select
                      id="clasePaciente"
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
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => void handleSubmit()}
            disabled={loading || success || !seleccionado}
          >
            {loading ? 'Asignando...' : 'Asignar cama'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAsignarCama;
