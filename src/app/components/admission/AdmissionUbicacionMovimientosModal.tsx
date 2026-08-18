'use client';

import { useCallback, useEffect, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import {
  admissionSearchService,
  type AdmissionDatosPrincipalesVisita,
} from '@/app/services/admissionSearchService';
import visitaMovimientoService from '@/app/services/visitaMovimientoService';
import { getDisposicionesEgreso } from '@/app/services/disposicionEgresoService';
import diagnosticosService from '@/app/services/diagnosticosService';
import { clarionDateToISO, fechaLocalISO, horaLocalHHMM, horaMostrada, isoCalendarioADmy } from '@/app/utils/dateUtils';
import type { DisposicionEgreso } from '@/app/types/disposicionEgreso.types';
import type { DiagnosticoCie10 } from '@/app/types/diagnosticos';
import { authService } from '@/app/services/authService';
import { esAdminClinico } from '@/app/hooks/useUsuarioActual';
import {
  catalogoDisposiciones,
  diagnosticoTexto,
  disposicionTexto,
  nombreOperador,
} from '@/app/components/beds/movimientos/movimientosDisplay';
import styles from './AdmissionUbicacionMovimientosModal.module.css';
import tStyles from '@/app/components/beds/movimientos/MovimientosSection.module.css';

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
  NumeroCama?: string;
  NombreServicio?: string;
  ServicioHospital?: string;
  FechaAdmision?: number;
  HoraAdmision?: number | string;
  FechaEgreso?: number;
  HoraEgreso?: number | string;
  FechaAdmisionISO?: string;
  HoraAdmisionISO?: string;
  FechaEgresoISO?: string;
  HoraEgresoISO?: string;
  Operador?: string;
  OperadorNombre?: string;
  Diagnostico?: string;
  DiagnosticoDescripcion?: string;
  DisposicionEgreso?: number;
  DisposicionEgresoDescripcion?: string;
};

function etiquetaDiagnosticoEgreso(codigo: string, descripcion: string): string {
  const code = codigo.trim();
  const desc = descripcion.trim();
  if (code && desc) return `${code} — ${desc}`;
  return code || desc;
}

function codigoCieDesdeTexto(raw: string): string {
  const v = raw.trim();
  const conDesc = /^([A-Za-z][0-9][0-9A-Za-z.]{1,6})\s*[—–-]\s+/.exec(v);
  if (conDesc) return conDesc[1].toUpperCase();
  if (/^[A-Za-z][0-9][0-9A-Za-z.]{1,6}$/.test(v)) return v.toUpperCase();
  return v;
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
  const [disposiciones, setDisposiciones] = useState<DisposicionEgreso[]>([]);
  const [dispCatalogo, setDispCatalogo] = useState<Map<number, string>>(new Map());

  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [disposicionEgreso, setDisposicionEgreso] = useState('');
  const [diagnosticoEgreso, setDiagnosticoEgreso] = useState('');
  const [diagnosticoEgresoDesc, setDiagnosticoEgresoDesc] = useState('');
  const [diagQuery, setDiagQuery] = useState('');
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagTyping, setDiagTyping] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticoCie10[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [operadorEgreso, setOperadorEgreso] = useState('');
  const [revertBusy, setRevertBusy] = useState(false);
  const puedeRevertirEgreso = esAdminClinico();

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
      setDisposiciones(disp || []);
      setDispCatalogo(catalogoDisposiciones(disp || []));
      const fe = String(payload.visita.FechaEgreso || '').slice(0, 10);
      const he = String(payload.visita.HoraEgreso || '').slice(0, 5);
      if (/^\d{4}-\d{2}-\d{2}$/.test(fe)) {
        setFechaEgreso(fe);
        setHoraEgreso(/^\d{2}:\d{2}/.test(he) ? he.slice(0, 5) : horaLocalHHMM());
      } else {
        setFechaEgreso(fechaLocalISO());
        setHoraEgreso(horaLocalHHMM());
      }
      const dispVisita = Number(payload.visita.DisposicionEgreso);
      const dispMov = Number((ultimo as MovimientoRow | null)?.DisposicionEgreso);
      const dispVal =
        Number.isFinite(dispVisita) && dispVisita > 0
          ? String(dispVisita)
          : Number.isFinite(dispMov) && dispMov > 0
            ? String(dispMov)
            : '';
      setDisposicionEgreso(dispVal);
      const diagCode = String(payload.visita.DiagnosticoEgreso || '').trim();
      setDiagnosticoEgreso(diagCode);
      let diagDesc = String(payload.visita.DiagnosticoEgresoDescripcion || '').trim();
      if (diagCode && !diagDesc) {
        try {
          const rows = await diagnosticosService.buscarDiagnosticosCie10(diagCode);
          const hit = (rows || []).find((r) => String(r.CodigoOMS || '').trim() === diagCode);
          if (hit) diagDesc = String(hit.descripcion || '').trim();
        } catch {
          /* catálogo CIE opcional */
        }
      }
      setDiagnosticoEgresoDesc(diagDesc);
      setDiagOpen(false);
      setDiagTyping(false);
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
    setDiagTyping(false);
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
  const yaEgresado = Boolean(visita?.FechaEgreso);
  const canEgreso = Boolean(numeroVisita);

  const onEgresoRapido = async () => {
    if (!numeroVisita || !fechaEgreso || !horaEgreso) {
      setError('Indicá fecha y hora de egreso');
      return;
    }
    if (!disposicionEgreso) {
      setError('Indicá la condición de egreso');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await visitaMovimientoService.actualizarUltimoMovimiento(numeroVisita, {
        fechaEgreso,
        horaEgreso,
        disposicionEgreso: Number(disposicionEgreso) || null,
        diagnostico: codigoCieDesdeTexto(diagnosticoEgreso) || null,
        bedId: bedId || null,
      });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; mensaje?: string } }; message?: string };
      setError(
        err?.response?.data?.mensaje ||
          err?.response?.data?.message ||
          err?.message ||
          'Error al registrar egreso',
      );
    } finally {
      setLoading(false);
    }
  };

  const onRevertirEgreso = async () => {
    if (!numeroVisita) return;
    const ok = window.confirm(
      '¿Revertir el egreso? El paciente volverá a internación en la misma cama, si sigue libre.',
    );
    if (!ok) return;
    try {
      setRevertBusy(true);
      setError('');
      await visitaMovimientoService.revertirEgreso(numeroVisita);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; mensaje?: string } }; message?: string };
      setError(
        err?.response?.data?.mensaje ||
          err?.response?.data?.message ||
          err?.message ||
          'Error al revertir el egreso',
      );
    } finally {
      setRevertBusy(false);
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
                  <table className={tStyles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Operador</th>
                        <th>Cama</th>
                        <th>Sector</th>
                        <th>Fecha ingreso</th>
                        <th>Hora ingreso</th>
                        <th>Fecha egreso</th>
                        <th>Hora egreso</th>
                        <th>Disposición</th>
                        <th>Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m, idx) => {
                        const fechaAdm = m.FechaAdmisionISO
                          ? isoCalendarioADmy(m.FechaAdmisionISO)
                          : clarionDateToISO(m.FechaAdmision)
                            ? isoCalendarioADmy(clarionDateToISO(m.FechaAdmision))
                            : '—';
                        const horaAdm = horaMostrada(m.HoraAdmisionISO || m.HoraAdmision);
                        const fechaEg = m.FechaEgresoISO
                          ? isoCalendarioADmy(m.FechaEgresoISO)
                          : clarionDateToISO(m.FechaEgreso)
                            ? isoCalendarioADmy(clarionDateToISO(m.FechaEgreso))
                            : '—';
                        const horaEg = horaMostrada(m.HoraEgresoISO || m.HoraEgreso);
                        const abierto = !(Number(m.FechaEgreso) > 0) && !m.FechaEgresoISO;
                        const esActual = idx === 0 && abierto;
                        const row = m as Record<string, unknown>;
                        return (
                          <tr key={`${m.FechaAdmisionISO}-${m.HoraAdmisionISO}-${idx}`} className={esActual ? tStyles.rowActual : undefined}>
                            <td className={tStyles.cellIdx}>
                              {movimientos.length - idx}
                              {esActual ? <span className={tStyles.badgeActual}>actual</span> : null}
                            </td>
                            <td className={tStyles.cellOperador}>{nombreOperador(row)}</td>
                            <td className={tStyles.cellCama}>
                              {m.NombreCama || m.NumeroCama || m.ValorHabitacionCama || '—'}
                            </td>
                            <td>{m.NombreSector || m.ValorSector || '—'}</td>
                            <td>{fechaAdm}</td>
                            <td>{horaAdm}</td>
                            <td>{fechaEg}</td>
                            <td>{horaEg}</td>
                            <td>{disposicionTexto(row, dispCatalogo)}</td>
                            <td className={tStyles.cellDiag}>{diagnosticoTexto(row)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
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
                      <option key={String(d.Valor)} value={String(Number(d.Valor) || d.Valor)}>
                        {d.Descripcion || d.Valor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.fieldDiag}`}>
                  <span>Diagnóstico egreso</span>
                  <div className={styles.diagLookup}>
                    <input
                      value={
                        diagTyping
                          ? diagQuery
                          : etiquetaDiagnosticoEgreso(diagnosticoEgreso, diagnosticoEgresoDesc)
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setDiagTyping(true);
                        setDiagQuery(v);
                        setDiagnosticoEgreso(codigoCieDesdeTexto(v));
                        setDiagnosticoEgresoDesc('');
                        setDiagOpen(true);
                      }}
                      onFocus={() => {
                        setDiagQuery(diagnosticoEgreso || diagnosticoEgresoDesc);
                        setDiagOpen(true);
                      }}
                      placeholder="Código o descripción CIE"
                    />
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
                  {yaEgresado ? 'Actualizar egreso' : 'Registrar egreso'}
                </button>
                {yaEgresado && puedeRevertirEgreso ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={loading || revertBusy}
                    onClick={() => void onRevertirEgreso()}
                    title="Devuelve al paciente a internación en la cama anterior"
                  >
                    {revertBusy ? 'Revirtiendo…' : 'Revertir egreso'}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      )}
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
