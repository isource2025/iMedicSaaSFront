'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import ModalCambiarCama from '@/app/components/modals/ModalCambiarCama';
import {
  admissionSearchService,
  type AdmissionDatosPrincipalesVisita,
} from '@/app/services/admissionSearchService';
import visitaMovimientoService from '@/app/services/visitaMovimientoService';
import { getDisposicionesEgreso } from '@/app/services/disposicionEgresoService';
import diagnosticosService from '@/app/services/diagnosticosService';
import { dateToClarionDate, timeToClarionTime, fechaLocalISO, horaLocalHHMM } from '@/app/utils/dateUtils';
import type { DisposicionEgreso } from '@/app/types/disposicionEgreso.types';
import type { DiagnosticoCie10 } from '@/app/types/diagnosticos';
import type { PatientHeaderSnapshot } from '@/app/utils/bedHeader';
import { authService } from '@/app/services/authService';
import styles from './AdmissionUbicacionMovimientosModal.module.css';

type Props = {
  isOpen: boolean;
  numeroVisita: number | null;
  onClose: () => void;
  /** Sin overlay propio: se embebe en el modal de gestión de visita */
  embedded?: boolean;
  /** Qué bloque mostrar (para menú lateral) */
  focusSection?: 'ubicacion' | 'movimientos' | 'egreso' | 'all' | 'ubicacion_movimientos';
};

type MovimientoRow = {
  ValorSector?: string;
  ValorHabitacionCama?: string;
  NombreSector?: string;
  NombreCama?: string;
  NombreServicio?: string;
  ServicioHospital?: string;
  FechaAdmisionISO?: string;
  HoraAdmisionISO?: string;
  FechaEgresoISO?: string;
  HoraEgresoISO?: string;
  Operador?: string;
  FechaCargaISO?: string;
  HoraCargaISO?: string;
  Diagnostico?: string;
  DisposicionEgreso?: number;
};

function dmy(iso?: string | null) {
  if (!iso) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function etiquetaOperadorSesion(): { codigo: string; label: string } {
  const u = authService.getCurrentUser() as Record<string, unknown> | null;
  const codigoRaw = u?.codOperador ?? u?.CodOperador ?? u?.idCodOperador ?? '';
  const codigo = codigoRaw != null && String(codigoRaw).trim() !== '' ? String(codigoRaw).trim() : '';
  const nom = [u?.apellido, u?.nombre].filter(Boolean).join(', ').trim()
    || [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim()
    || String(u?.username || u?.user || '').trim();
  if (nom && codigo) return { codigo, label: `${nom} (${codigo})` };
  if (nom) return { codigo, label: nom };
  if (codigo) return { codigo, label: `Operador ${codigo}` };
  return { codigo: '', label: 'Sesión sin CodOperador' };
}

function etiquetaOperadorGuardado(visita: AdmissionDatosPrincipalesVisita | null): string {
  const codigo =
    visita?.OperadorEgreso != null && Number(visita.OperadorEgreso) > 0
      ? String(visita.OperadorEgreso)
      : '';
  const nombre = String(visita?.OperadorEgresoNombre || '').trim();
  if (nombre && codigo) return `${nombre} (${codigo})`;
  if (nombre) return nombre;
  if (codigo) return `Operador ${codigo}`;
  return '';
}

export default function AdmissionUbicacionMovimientosModal({
  isOpen,
  numeroVisita,
  onClose,
  embedded = false,
  focusSection = 'all',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visita, setVisita] = useState<AdmissionDatosPrincipalesVisita | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [disposiciones, setDisposiciones] = useState<DisposicionEgreso[]>([]);

  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [disposicionEgreso, setDisposicionEgreso] = useState('');
  const [diagnosticoEgreso, setDiagnosticoEgreso] = useState('');
  const [diagnosticoEgresoDesc, setDiagnosticoEgresoDesc] = useState('');
  const [diagQuery, setDiagQuery] = useState('');
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [operadorEgreso, setOperadorEgreso] = useState('');

  const [cambiarOpen, setCambiarOpen] = useState(false);
  const [swapVisita, setSwapVisita] = useState('');
  const [swapBusy, setSwapBusy] = useState(false);

  const load = useCallback(async () => {
    if (!numeroVisita) return;
    try {
      setLoading(true);
      setError('');
      const [payload, movs, disp, ultimo] = await Promise.all([
        admissionSearchService.getDatosPrincipales(numeroVisita),
        visitaMovimientoService.getMovimientosVisita(numeroVisita).catch(() => [] as MovimientoRow[]),
        getDisposicionesEgreso().catch(() => [] as DisposicionEgreso[]),
        visitaMovimientoService.getUltimoMovimiento(numeroVisita).catch(() => null),
      ]);
      setVisita(payload.visita);
      let list = (movs || []) as MovimientoRow[];
      // Si el listado viene vacío pero hay último movimiento, usarlo para cama/sector e historial mínimo
      if (list.length === 0 && ultimo) {
        const bed =
          String((ultimo as { ValorHabitacionCama?: string; bedId?: string }).ValorHabitacionCama ||
            (ultimo as { bedId?: string }).bedId ||
            '').trim();
        const sec = String((ultimo as { ValorSector?: string }).ValorSector || '').trim();
        if (bed || sec) {
          list = [
            {
              ValorHabitacionCama: bed,
              ValorSector: sec,
              NombreCama: bed,
            },
          ];
        }
      }
      setMovimientos(list);
      setSelectedIdx(0);
      setDisposiciones(disp || []);
      const fe = String(payload.visita.FechaEgreso || '').slice(0, 10);
      const he = String(payload.visita.HoraEgreso || '').slice(0, 5);
      if (/^\d{4}-\d{2}-\d{2}$/.test(fe)) {
        setFechaEgreso(fe);
        setHoraEgreso(/^\d{2}:\d{2}/.test(he) ? he.slice(0, 5) : horaLocalHHMM());
      } else {
        setFechaEgreso(fechaLocalISO());
        setHoraEgreso(horaLocalHHMM());
      }
      setDisposicionEgreso(
        payload.visita.DisposicionEgreso != null ? String(payload.visita.DisposicionEgreso) : '',
      );
      setDiagnosticoEgreso(String(payload.visita.DiagnosticoEgreso || '').trim());
      setDiagnosticoEgresoDesc('');
      setDiagOpen(false);
      setDiagQuery('');
      setDiagResults([]);
      const guardado = etiquetaOperadorGuardado(payload.visita);
      if (guardado) {
        setOperadorEgreso(guardado);
      } else {
        setOperadorEgreso(etiquetaOperadorSesion().label);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al cargar ubicación / movimientos');
    } finally {
      setLoading(false);
    }
  }, [numeroVisita]);

  useEffect(() => {
    if (!isOpen || !numeroVisita) return;
    void load();
  }, [isOpen, numeroVisita, load]);

  useEffect(() => {
    if (!diagOpen) return;
    const q = diagQuery.trim();
    if (q.length < 1) {
      setDiagResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setDiagLoading(true);
        const rows = await diagnosticosService.buscarDiagnosticosCie10(q);
        if (!cancelled) setDiagResults(rows.slice(0, 25));
      } catch {
        if (!cancelled) setDiagResults([]);
      } finally {
        if (!cancelled) setDiagLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [diagQuery, diagOpen]);

  const pickDiagnosticoEgreso = (d: DiagnosticoCie10) => {
    setDiagnosticoEgreso(String(d.CodigoOMS || '').trim());
    setDiagnosticoEgresoDesc(String(d.descripcion || '').trim());
    setDiagOpen(false);
    setDiagQuery('');
    setDiagResults([]);
  };

  const actual = movimientos[0] || null;
  const sector = String(actual?.ValorSector || visita?.Sector || '').trim();
  const hab = String(actual?.ValorHabitacionCama || visita?.Habitacion || '').trim();
  const sectorDesc = String(actual?.NombreSector || visita?.SectorDescripcion || '').trim();
  const servicio = String(
    actual?.NombreServicio || actual?.ServicioHospital || visita?.ServicioHospitalDescripcion || visita?.ServicioHospital || '',
  ).trim();

  const bedId = hab;
  const canMove = Boolean(numeroVisita && bedId);
  const canEgreso = Boolean(numeroVisita && bedId);

  const headerSnapshot = useMemo<PatientHeaderSnapshot | null>(
    () =>
      visita
        ? {
            nombre: String(visita.ApellidoYNombre || '').trim(),
            documento: String(visita.NumeroDocumento || ''),
            sector,
            numeroCama: hab,
          }
        : null,
    [visita, sector, hab],
  );

  const onEgresoRapido = async () => {
    if (!numeroVisita || !fechaEgreso || !horaEgreso) {
      setError('Indicá fecha y hora de egreso');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await visitaMovimientoService.actualizarUltimoMovimiento(numeroVisita, {
        fechaEgreso,
        horaEgreso,
        disposicionEgreso: disposicionEgreso ? Number(disposicionEgreso) : null,
        diagnostico: diagnosticoEgreso || null,
        bedId: bedId || null,
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Error al registrar egreso');
    } finally {
      setLoading(false);
    }
  };

  const onIntercambiar = async () => {
    if (!numeroVisita) return;
    const other = Number(swapVisita);
    if (!Number.isFinite(other) || other <= 0) {
      setError('Indicá el Nº de admisión del paciente con el que intercambiar cama');
      return;
    }
    try {
      setSwapBusy(true);
      setError('');
      const now = new Date();
      await visitaMovimientoService.intercambiarCamas(numeroVisita, other, {
        FechaEgreso: dateToClarionDate(now),
        HoraEgreso: timeToClarionTime(now),
        FechaAdmision: dateToClarionDate(now),
        HoraAdmision: timeToClarionTime(now),
        Diagnostico: visita?.Diagnostico || '',
        FechaCarga: dateToClarionDate(now),
        HoraCarga: timeToClarionTime(now),
      });
      setSwapVisita('');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; mensaje?: string } }; message?: string };
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.mensaje ||
          err?.message ||
          'Error al intercambiar camas',
      );
    } finally {
      setSwapBusy(false);
    }
  };

  if (!isOpen) return null;

  const showUbicacion =
    focusSection === 'all' ||
    focusSection === 'ubicacion' ||
    focusSection === 'ubicacion_movimientos';
  const showMovimientos =
    focusSection === 'all' ||
    focusSection === 'movimientos' ||
    focusSection === 'ubicacion_movimientos';
  const showEgreso = focusSection === 'all' || focusSection === 'egreso';

  const body = (
    <div className={embedded ? styles.embeddedBody : styles.body}>
      {!embedded && visita ? (
        <p className={styles.patientLine}>
          Visita #{visita.NumeroVisita} · {String(visita.ApellidoYNombre || '').trim()} · DNI{' '}
          {visita.NumeroDocumento || '—'}
        </p>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading && !visita ? (
        <div className={styles.loadingWrap}>
          <Loader />
        </div>
      ) : (
        <>
          {showUbicacion ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              {!embedded ? <h3 className={styles.sectionTitle}>Ubicación actual</h3> : null}
              <div className={styles.ubicacionGrid}>
                <label className={styles.field}>
                  <span>Sector</span>
                  <input className={styles.readonly} value={sector || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Hab-Cama</span>
                  <input className={styles.readonly} value={hab || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Descripción</span>
                  <input className={styles.readonly} value={sectorDesc || '—'} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Servicio</span>
                  <input className={styles.readonly} value={servicio || '—'} readOnly />
                </label>
              </div>
            </section>
          ) : null}

          {showMovimientos ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              <h3 className={styles.sectionTitle}>Historial de movimientos</h3>
              <div className={styles.tableWrap}>
                {movimientos.length === 0 ? (
                  <div className={styles.empty}>Sin movimientos registrados</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Ingreso / Hora</th>
                        <th>Sector</th>
                        <th>Habitación</th>
                        <th>Diagnóstico / Servicio</th>
                        <th>Egreso / Hora</th>
                        <th>Pase por</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m, idx) => (
                        <tr
                          key={`${m.FechaAdmisionISO}-${m.HoraAdmisionISO}-${idx}`}
                          className={idx === selectedIdx ? styles.rowSelected : undefined}
                          onClick={() => setSelectedIdx(idx)}
                        >
                          <td>
                            {dmy(m.FechaAdmisionISO)} {m.HoraAdmisionISO || ''}
                          </td>
                          <td>{m.ValorSector || '—'}</td>
                          <td>{m.ValorHabitacionCama || m.NombreCama || '—'}</td>
                          <td>{m.NombreServicio || m.Diagnostico || m.ServicioHospital || '—'}</td>
                          <td>
                            {m.FechaEgresoISO ? `${dmy(m.FechaEgresoISO)} ${m.HoraEgresoISO || ''}` : '—'}
                          </td>
                          <td>{m.Operador || '—'}</td>
                          <td>{dmy(m.FechaCargaISO)}</td>
                          <td>{m.HoraCargaISO || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className={styles.actions} style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!canMove}
                  onClick={() => setCambiarOpen(true)}
                  title={canMove ? 'Agregar movimiento / cambiar cama' : 'La visita no tiene cama asignada'}
                >
                  Agregar movimiento
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={!canMove}
                  onClick={() => setCambiarOpen(true)}
                >
                  Modificar movimiento
                </button>
                <div className={styles.actions}>
                  <input
                    style={{ width: 120, border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 8px' }}
                    placeholder="Nº visita"
                    value={swapVisita}
                    onChange={(e) => setSwapVisita(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={!canMove || swapBusy}
                    onClick={() => void onIntercambiar()}
                  >
                    Intercambiar cama
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {showEgreso ? (
            <section className={embedded ? styles.sectionFlat : styles.section}>
              {!embedded ? <h3 className={styles.sectionTitle}>Egreso</h3> : null}
              <div className={styles.egresoGrid}>
                <label className={styles.field}>
                  <span>Fecha de egreso</span>
                  <input type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Hora de egreso</span>
                  <input type="time" value={horaEgreso} onChange={(e) => setHoraEgreso(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Condición de egreso</span>
                  <select value={disposicionEgreso} onChange={(e) => setDisposicionEgreso(e.target.value)}>
                    <option value="">—</option>
                    {disposiciones.map((d) => (
                      <option key={String(d.Valor)} value={String(d.Valor)}>
                        {d.Descripcion || d.Valor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldDiag}`}>
                  <span>Diagnóstico egreso</span>
                  <div className={styles.diagLookup}>
                    <input
                      value={diagnosticoEgreso}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDiagnosticoEgreso(v);
                        setDiagnosticoEgresoDesc('');
                        setDiagQuery(v);
                        setDiagOpen(true);
                      }}
                      onFocus={() => {
                        setDiagQuery(diagnosticoEgreso || diagnosticoEgresoDesc);
                        setDiagOpen(true);
                      }}
                      placeholder="Código o descripción CIE"
                    />
                    {diagnosticoEgresoDesc ? (
                      <small className={styles.diagHint}>{diagnosticoEgresoDesc}</small>
                    ) : null}
                    {diagOpen ? (
                      <div className={styles.diagPanel}>
                        {diagLoading ? <div className={styles.diagItem}>Buscando…</div> : null}
                        {!diagLoading && diagQuery.trim() && diagResults.length === 0 ? (
                          <div className={styles.diagItem}>Sin coincidencias</div>
                        ) : null}
                        {diagResults.map((d) => (
                          <button
                            key={`${d.idDiagnostico}-${d.CodigoOMS}`}
                            type="button"
                            className={styles.diagItem}
                            onClick={() => pickDiagnosticoEgreso(d)}
                          >
                            {d.CodigoOMS} — {d.descripcion}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={styles.diagItem}
                          onClick={() => {
                            setDiagOpen(false);
                            setDiagResults([]);
                          }}
                        >
                          Cerrar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Operador egreso</span>
                  <input
                    value={operadorEgreso}
                    readOnly
                    title="Se registra automáticamente con el usuario de la sesión (nombre y código)"
                  />
                </label>
              </div>
              <div className={styles.actions} style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={loading || !canEgreso}
                  onClick={() => void onEgresoRapido()}
                >
                  Registrar egreso
                </button>
              </div>
            </section>
          ) : null}
        </>
      )}

      {numeroVisita ? (
        <ModalCambiarCama
          isOpen={cambiarOpen && Boolean(bedId)}
          onClose={() => {
            setCambiarOpen(false);
            void load();
          }}
          numeroVisita={numeroVisita}
          bedId={bedId}
          bedSector={sector}
          header={headerSnapshot}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            {focusSection === 'ubicacion'
              ? 'Ubicación'
              : focusSection === 'movimientos'
                ? 'Movimientos'
                : focusSection === 'ubicacion_movimientos'
                  ? 'Ubicación y movimientos'
                  : focusSection === 'egreso'
                    ? 'Egreso'
                    : 'Ubicación · Movimientos · Egreso'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
