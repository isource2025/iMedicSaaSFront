'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import type { VisitDetailPayload } from '../AdmissionVisitDetailModal';
import { admissionSearchService, type VisitaResumenIa } from '@/app/services/admissionSearchService';
import { Badge, ProfesionalCell } from './VisitSectionBody';
import {
  buildTimeline,
  estadoIndicacion,
  fmtFechaHora,
  GROUP_LABELS,
  GROUP_ORDER,
  resumenVitales,
  responsable,
  SECTION_BY_ID,
  sectionLabel,
  sortKey,
  str,
  tituloIndicacion,
  valorControl,
  type Row,
  type VisitSectionGroup,
  type VisitSectionId,
} from './visitDetailModel';
import s from './VisitDetail.module.css';

type Props = {
  data: VisitDetailPayload;
  numeroVisita: number | null;
  onOpenSection: (id: VisitSectionId) => void;
};

const TIMELINE_PAGE = 25;

function ResumenIaPanel({ numeroVisita }: { numeroVisita: number | null }) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'error'>('idle');
  const [resumen, setResumen] = useState<VisitaResumenIa | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEstado('idle');
    setResumen(null);
    setError('');
  }, [numeroVisita]);

  const generar = async () => {
    if (!numeroVisita) return;
    setEstado('cargando');
    setError('');
    try {
      setResumen(await admissionSearchService.resumenIa(numeroVisita));
      setEstado('listo');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : '');
      setError(msg || 'No se pudo generar el resumen.');
      setEstado('error');
    }
  };

  if (estado === 'idle') {
    return (
      <button type="button" className={s.aiBtn} onClick={() => void generar()} disabled={!numeroVisita}>
        <Sparkles size={15} aria-hidden />
        Resumen de IA
      </button>
    );
  }

  return (
    <div className={s.aiPanel} aria-live="polite">
      <div className={s.aiHead}>
        <span className={s.aiTitle}>
          <Sparkles size={15} aria-hidden />
          Resumen de IA
        </span>
        {estado !== 'cargando' ? (
          <button type="button" className={s.linkBtn} onClick={() => void generar()}>
            <RefreshCw size={13} aria-hidden /> Regenerar
          </button>
        ) : null}
      </div>

      {estado === 'cargando' ? (
        <div className={s.aiLoading}>
          <span className={s.spinner} aria-hidden />
          Leyendo la historia clínica de la visita…
        </div>
      ) : null}

      {estado === 'error' ? <p className={s.aiError}>{error}</p> : null}

      {estado === 'listo' && resumen ? (
        <>
          <p className={s.aiResumen}>{resumen.resumen}</p>
          {resumen.puntos.length ? (
            <div className={s.aiBlock}>
              <span className={s.textLabel}>Hitos clave</span>
              <ul className={s.aiList}>
                {resumen.puntos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {resumen.pendientes.length ? (
            <div className={`${s.aiBlock} ${s.aiPendientes}`}>
              <span className={s.textLabel}>
                <AlertTriangle size={12} aria-hidden /> Pendientes / alertas
              </span>
              <ul className={s.aiList}>
                {resumen.pendientes.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className={s.aiAviso}>
            {resumen.generadoConIA ? 'Generado con IA' : 'Resumen automático'} ·{' '}
            {new Date(resumen.generadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
            {resumen.aviso ? ` · ${resumen.aviso}` : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}

export default function VisitSummary({ data, numeroVisita, onOpenSection }: Props) {
  const a = (data.admision || {}) as Row;
  const [grupo, setGrupo] = useState<VisitSectionGroup | 'todos'>('todos');
  const [limite, setLimite] = useState(TIMELINE_PAGE);

  const timeline = useMemo(() => buildTimeline(data), [data]);
  const timelineFiltrada = useMemo(
    () => (grupo === 'todos' ? timeline : timeline.filter((e) => SECTION_BY_ID[e.section].group === grupo)),
    [timeline, grupo],
  );

  const indicacionesVigentes = useMemo(
    () => (data.indicaciones || []).filter((r) => estadoIndicacion(r) === 'Vigente'),
    [data.indicaciones],
  );

  const ultimoControl = useMemo(() => {
    const rows = [...(data.controles || [])].filter((c) => resumenVitales(c));
    return rows.sort((x, y) =>
      sortKey(y.FechaControl, y.HoraControl).localeCompare(sortKey(x.FechaControl, x.HoraControl)),
    )[0];
  }, [data.controles]);

  const vitales: Array<[string, string]> = ultimoControl
    ? [
        ['TA', valorControl(ultimoControl.Maximo) ? `${valorControl(ultimoControl.Maximo)}/${valorControl(ultimoControl.Minimo) || '—'}` : ''],
        ['FC', valorControl(ultimoControl.Pulso)],
        ['FR', valorControl(ultimoControl.FrecuenciaRespiratoria)],
        ['T°', valorControl(ultimoControl.Axilar, 1) || valorControl(ultimoControl.Rectal, 1)],
        ['Sat', valorControl(ultimoControl.Saturometria) && `${valorControl(ultimoControl.Saturometria)}%`],
        ['HGT', str(ultimoControl.Hgt)],
      ].filter((x): x is [string, string] => Boolean(x[1]))
    : [];

  const admisionPairs: Array<[string, unknown]> = [
    ['Nº de internación', a.NumeroInternacion],
    ['Clase de paciente', a.ClasePacienteDescripcion || a.ClasePaciente],
    ['Tipo de paciente', a.TipoPacienteDescripcion || a.TipoPaciente],
    ['Tipo de admisión', a.TipoAdmisionDescripcion || a.TipoAdmision],
    ['Origen', a.OrigenAdmisionDescripcion],
    ['Lugar del episodio', a.LugarEpisodioDescripcion],
    ['Plan / convenio', a.ContratoDescripcion],
    ['Nº de afiliado', a.NumeroSSN],
    ['Médico admisor', a.DoctorAdmisorNombre],
    ['Médico de cabecera', a.DoctorCabeceraNombre],
    ['Servicio', a.ServicioHospitalDescripcion || a.ServicioEgresoDescripcion],
    ['Centro de salud', a.CentroSalud],
  ];
  const admisionVisibles = admisionPairs.filter(([, v]) => str(v) !== '');

  return (
    <div className={s.summary}>
      {admisionVisibles.length ? (
        <section className={s.panel}>
          <header className={s.panelHead}>
            <h4>Datos de la admisión</h4>
          </header>
          <dl className={s.fieldGrid}>
            {admisionVisibles.map(([k, v]) => (
              <div key={k} className={s.field}>
                <dt>{k}</dt>
                <dd>{str(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className={s.summaryCols}>
        <section className={s.panel}>
          <header className={s.panelHead}>
            <h4>Últimos signos vitales</h4>
            {ultimoControl ? (
              <span className={s.panelMeta}>{fmtFechaHora(ultimoControl.FechaControl, ultimoControl.HoraControl)}</span>
            ) : null}
          </header>
          {vitales.length ? (
            <>
              <div className={s.vitals}>
                {vitales.map(([k, v]) => (
                  <div key={k} className={s.vital}>
                    <span className={s.vitalLabel}>{k}</span>
                    <span className={s.vitalValue}>{v}</span>
                  </div>
                ))}
              </div>
              <div className={s.panelFoot}>
                <ProfesionalCell p={responsable.control(ultimoControl as Row)} />
                <button type="button" className={s.linkBtn} onClick={() => onOpenSection('controles')}>
                  Ver todos los controles
                </button>
              </div>
            </>
          ) : (
            <p className={s.muted}>Sin controles registrados.</p>
          )}
        </section>

        <section className={s.panel}>
          <header className={s.panelHead}>
            <h4>Indicaciones vigentes</h4>
            <span className={s.panelMeta}>
              {indicacionesVigentes.length} de {(data.indicaciones || []).length}
            </span>
          </header>
          {indicacionesVigentes.length ? (
            <ul className={s.miniList}>
              {indicacionesVigentes.slice(0, 8).map((r, i) => (
                <li key={`${str(r.nroIndicacion)}-${i}`}>
                  <span className={s.miniTitle}>{tituloIndicacion(r)}</span>
                  <span className={s.miniMeta}>
                    {[str(r.frecuencia), str(r.fullName)].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.muted}>No hay indicaciones vigentes.</p>
          )}
          {(data.indicaciones || []).length ? (
            <div className={s.panelFoot}>
              <span />
              <button type="button" className={s.linkBtn} onClick={() => onOpenSection('indicaciones')}>
                Ver todas las indicaciones
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className={s.panel}>
        <header className={s.panelHead}>
          <div>
            <h4>Trazabilidad de la visita</h4>
            <span className={s.panelMeta}>
              Cada registro clínico en orden cronológico, con quién lo hizo · {timelineFiltrada.length} registros
            </span>
          </div>
        </header>
        <ResumenIaPanel numeroVisita={numeroVisita} />
        <div className={s.chips} role="group" aria-label="Filtrar trazabilidad">
          {(['todos', ...GROUP_ORDER.filter((g) => g !== 'documentacion')] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`${s.chip} ${grupo === g ? s.chipActive : ''}`}
              onClick={() => {
                setGrupo(g);
                setLimite(TIMELINE_PAGE);
              }}
            >
              {g === 'todos' ? 'Todo' : GROUP_LABELS[g]}
            </button>
          ))}
        </div>
        {timelineFiltrada.length ? (
          <ol className={s.timeline}>
            {timelineFiltrada.slice(0, limite).map((ev) => (
              <li key={ev.key} className={`${s.tlItem} ${s[`tl_${SECTION_BY_ID[ev.section].group}`]}`}>
                <span className={s.tlDot} aria-hidden />
                <div className={s.tlBody}>
                  <div className={s.tlHead}>
                    <button type="button" className={s.tlTitle} onClick={() => onOpenSection(ev.section)}>
                      {ev.titulo}
                    </button>
                    {ev.alerta ? <Badge tone="danger">Suspendida</Badge> : null}
                    <span className={s.tlWhen}>{ev.cuando || 'Sin fecha'}</span>
                  </div>
                  {ev.detalle ? <p className={s.tlDetail}>{ev.detalle}</p> : null}
                  <span className={s.tlMeta}>
                    {sectionLabel(ev.section)}
                    {ev.profesional
                      ? ` · ${ev.profesional.nombre}${ev.profesional.matricula ? ` (${ev.profesional.matricula})` : ''}`
                      : ''}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={s.muted}>Sin actividad registrada.</p>
        )}
        {timelineFiltrada.length > limite ? (
          <button type="button" className={s.moreBtn} onClick={() => setLimite((n) => n + TIMELINE_PAGE * 2)}>
            Ver más ({timelineFiltrada.length - limite} restantes)
          </button>
        ) : null}
      </section>
    </div>
  );
}
