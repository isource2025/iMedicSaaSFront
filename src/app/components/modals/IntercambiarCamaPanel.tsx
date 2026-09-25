'use client';

import { useEffect, useMemo, useState } from 'react';
import Loader from '../Loader/Loader';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { useBedsManagement } from '../../hooks/useBedsManagement';
import type { Bed } from '../../types/beds';
import {
  clarionDateToISO,
  codigoCamaDesdeId,
  dateToClarionDate,
  fechaLocalISO,
  formatTime,
  horaLocalHHMM,
  timeToClarionTime,
} from '../../utils/dateUtils';
import { detalleDeError, mensajeDeError } from '../../utils/apiError';
import { clearBedSnapshot } from '../../utils/bedSnapshotCache';
import styles from './IntercambiarCamaPanel.module.css';

interface IntercambiarCamaPanelProps {
  numeroVisita: number;
  nombrePaciente?: string;
  /** `camaNueva` es la cama que pasa a ocupar el paciente de `numeroVisita`. */
  onSuccess?: (camaNueva: Bed) => void;
  disabled?: boolean;
}

const visitaDeCama = (bed: Bed): number => Number(bed.NumeroVisita || bed.numeroVisita || 0);

const etiquetaCama = (bed: Bed): string =>
  `${bed.sector} · ${codigoCamaDesdeId(bed.id, bed.sector, bed.numeroCama) || bed.numeroCama}`;

function fechaHoraMovimiento(bed: Bed | undefined): Date | null {
  const fechaISO = clarionDateToISO(bed?.fechaAdmisionMovimiento);
  const hora = formatTime(bed?.horaAdmisionMovimiento);
  if (!fechaISO || !hora || hora === '-') return null;
  const d = new Date(`${fechaISO}T${hora}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function IntercambiarCamaPanel({
  numeroVisita,
  nombrePaciente,
  onSuccess,
  disabled = false,
}: IntercambiarCamaPanelProps) {
  const { allBeds, loading: loadingBeds, error: errorBeds, refreshBeds } = useBedsManagement({
    enableAutoRefresh: false,
  });

  const [busqueda, setBusqueda] = useState('');
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => fechaLocalISO());
  const [hora, setHora] = useState(() => horaLocalHHMM());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    refreshBeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const camaPropia = useMemo(
    () => allBeds.find((b) => b.estado === 'ocupada' && visitaDeCama(b) === numeroVisita),
    [allBeds, numeroVisita],
  );

  const candidatas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return allBeds
      .filter((b) => {
        const nv = visitaDeCama(b);
        if (b.estado !== 'ocupada' || !nv || nv === numeroVisita || b.egresada) return false;
        if (!q) return true;
        return [b.NombrePaciente, b.documentoPaciente, b.numeroCama, b.sector, String(nv)]
          .map((s) => String(s || '').toLowerCase())
          .some((s) => s.includes(q));
      })
      .sort((a, b) => etiquetaCama(a).localeCompare(etiquetaCama(b)));
  }, [allBeds, busqueda, numeroVisita]);

  const seleccionada = useMemo(
    () => allBeds.find((b) => b.id === seleccionId),
    [allBeds, seleccionId],
  );

  const validar = (): string | null => {
    if (!seleccionada) return 'Elegí el paciente con el que intercambiar la cama';
    if (!fecha || !hora) return 'Indicá fecha y hora del intercambio';
    const elegida = new Date(`${fecha}T${hora}:00`);
    for (const bed of [camaPropia, seleccionada]) {
      const ingreso = fechaHoraMovimiento(bed);
      if (ingreso && elegida <= ingreso) {
        return `La fecha y hora deben ser posteriores al ingreso actual de ${
          bed?.NombrePaciente || 'cada paciente'
        } (${clarionDateToISO(bed?.fechaAdmisionMovimiento)} ${formatTime(bed?.horaAdmisionMovimiento)})`;
      }
    }
    return null;
  };

  const confirmar = async () => {
    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }
    if (!seleccionada) return;
    setGuardando(true);
    setError(null);
    try {
      const momento = new Date(`${fecha}T${hora}:00`);
      const clarionFecha = dateToClarionDate(momento);
      const clarionHora = timeToClarionTime(momento);
      await visitaMovimientoService.intercambiarCamas(numeroVisita, visitaDeCama(seleccionada), {
        FechaEgreso: clarionFecha,
        HoraEgreso: clarionHora,
        FechaAdmision: clarionFecha,
        HoraAdmision: clarionHora,
        FechaCarga: clarionFecha,
        HoraCarga: clarionHora,
      });
      clearBedSnapshot(seleccionada.id);
      if (camaPropia) clearBedSnapshot(camaPropia.id);
      setExito(true);
      refreshBeds();
      onSuccess?.(seleccionada);
    } catch (err: unknown) {
      console.error('Error al intercambiar camas:', detalleDeError(err));
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        mensajeDeError(
          err,
          status === 403
            ? 'No tiene permiso para mover camas (se requiere INTERNACION.MOVIMIENTOS.GESTIONAR)'
            : 'Error al intercambiar camas',
        ),
      );
    } finally {
      setGuardando(false);
    }
  };

  if (exito && seleccionada) {
    return (
      <div className={styles.exito}>
        Intercambio realizado: {nombrePaciente || camaPropia?.NombrePaciente || `Visita ${numeroVisita}`} pasó a{' '}
        <strong>{etiquetaCama(seleccionada)}</strong>
        {camaPropia ? (
          <>
            {' '}y {seleccionada.NombrePaciente || `Visita ${visitaDeCama(seleccionada)}`} pasó a{' '}
            <strong>{etiquetaCama(camaPropia)}</strong>
          </>
        ) : null}
        .
      </div>
    );
  }

  const bloqueado = disabled || guardando;

  return (
    <div className={styles.root}>
      {error ? <div className={styles.error}>{error}</div> : null}

      <p className={styles.ayuda}>
        Elegí el paciente internado con el que se intercambian las camas. Se cierra el movimiento actual de
        los dos y se abre uno nuevo en la cama del otro.
      </p>

      <input
        type="search"
        className={styles.buscador}
        placeholder="Buscar por paciente, DNI, cama, sector o Nº de visita…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        disabled={bloqueado}
      />

      {loadingBeds && allBeds.length === 0 ? (
        <div className={styles.loaderWrap}>
          <Loader />
        </div>
      ) : errorBeds ? (
        <div className={styles.error}>{errorBeds}</div>
      ) : candidatas.length === 0 ? (
        <div className={styles.vacio}>No hay otros pacientes internados que coincidan.</div>
      ) : (
        <ul className={styles.lista} role="listbox" aria-label="Pacientes internados">
          {candidatas.map((b) => {
            const activa = b.id === seleccionId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activa}
                  className={`${styles.item} ${activa ? styles.itemActivo : ''}`}
                  onClick={() => setSeleccionId(b.id)}
                  disabled={bloqueado}
                >
                  <span className={styles.itemCama}>{etiquetaCama(b)}</span>
                  <span className={styles.itemPaciente}>{b.NombrePaciente || 'Paciente sin nombre'}</span>
                  <span className={styles.itemMeta}>
                    Visita {visitaDeCama(b)}
                    {b.documentoPaciente ? ` · DNI ${b.documentoPaciente}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.fechaHora}>
        <label className={styles.campo}>
          <span>Fecha del intercambio</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={bloqueado} />
        </label>
        <label className={styles.campo}>
          <span>Hora</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} disabled={bloqueado} />
        </label>
      </div>

      {seleccionada ? (
        <div className={styles.resumen}>
          <div className={styles.resumenFila}>
            <strong>{nombrePaciente || camaPropia?.NombrePaciente || `Visita ${numeroVisita}`}</strong>
            <span>
              {camaPropia ? etiquetaCama(camaPropia) : 'cama actual'} → {etiquetaCama(seleccionada)}
            </span>
          </div>
          <div className={styles.resumenFila}>
            <strong>{seleccionada.NombrePaciente || `Visita ${visitaDeCama(seleccionada)}`}</strong>
            <span>
              {etiquetaCama(seleccionada)} → {camaPropia ? etiquetaCama(camaPropia) : 'cama actual'}
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.acciones}>
        <button
          type="button"
          className={styles.confirmar}
          onClick={() => void confirmar()}
          disabled={bloqueado || !seleccionada}
        >
          {guardando ? 'Intercambiando…' : 'Confirmar intercambio'}
        </button>
      </div>
    </div>
  );
}
