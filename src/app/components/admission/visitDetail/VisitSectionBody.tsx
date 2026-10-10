'use client';

import type { ReactNode } from 'react';
import { buildHCIPhysicalExamSections, HCI_CAMPOS_TEXTO_LIBRE } from '@/app/utils/hciIngresoDisplay';
import { buildPacienteFields } from '@/app/components/beds/shared/pacientePedidoFields';
import type { DatosFiliatoriosPaciente } from '@/app/types/pacienteDatos';
import MovimientosTimelineTable from '@/app/components/beds/movimientos/MovimientosTimelineTable';
import AdmissionAdjuntosGrid from '../AdmissionAdjuntosGrid';
import {
  estadoIndicacion,
  fmtFechaHora,
  responsable,
  rtfToPlain,
  str,
  tipoIndicacion,
  tituloIndicacion,
  valorControl,
  type Profesional,
  type Row,
  type VisitSectionId,
} from './visitDetailModel';
import s from './VisitDetail.module.css';

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

export function ProfesionalCell({ p }: { p: Profesional | null }) {
  if (!p) return <span className={s.muted}>Sin registrar</span>;
  return (
    <span className={s.profCell}>
      <span className={s.profName}>{p.nombre}</span>
      {p.matricula ? <span className={s.profMat}>{p.matricula}</span> : null}
    </span>
  );
}

function Firmas({ items }: { items: Array<Profesional | null> }) {
  const list = items.filter((p): p is Profesional => Boolean(p));
  if (!list.length) {
    return (
      <footer className={s.cardFooter}>
        <span className={s.muted}>Sin profesional registrado</span>
      </footer>
    );
  }
  return (
    <footer className={s.cardFooter}>
      {list.map((p, i) => (
        <span key={`${p.nombre}-${i}`} className={s.firma}>
          <span className={s.firmaRol}>{p.rol || 'Registró'}</span>
          <span className={s.profName}>{p.nombre}</span>
          {p.matricula ? <span className={s.profMat}>{p.matricula}</span> : null}
        </span>
      ))}
    </footer>
  );
}

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${s.badge} ${s[`badge_${tone}`]}`}>{children}</span>;
}

function RecordCard({
  title,
  meta,
  badges,
  firmas,
  children,
  muted,
}: {
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  firmas?: Array<Profesional | null>;
  children?: ReactNode;
  muted?: boolean;
}) {
  return (
    <article className={`${s.card} ${muted ? s.cardMuted : ''}`}>
      <header className={s.cardHead}>
        <div className={s.cardTitleWrap}>
          <h4 className={s.cardTitle}>{title}</h4>
          {badges ? <div className={s.cardBadges}>{badges}</div> : null}
        </div>
        {meta ? <span className={s.cardMeta}>{meta}</span> : null}
      </header>
      {children ? <div className={s.cardBody}>{children}</div> : null}
      {firmas ? <Firmas items={firmas} /> : null}
    </article>
  );
}

function TextBlock({ label, text }: { label?: string; text: unknown }) {
  const t = rtfToPlain(text);
  if (!t) return null;
  return (
    <div className={s.textBlock}>
      {label ? <span className={s.textLabel}>{label}</span> : null}
      <p className={s.textBody}>{t}</p>
    </div>
  );
}

function FieldGrid({ pairs }: { pairs: Array<[string, unknown]> }) {
  const list = pairs.filter(([, v]) => str(v) !== '');
  if (!list.length) return null;
  return (
    <dl className={s.fieldGrid}>
      {list.map(([k, v]) => (
        <div key={k} className={s.field}>
          <dt>{k}</dt>
          <dd>{str(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={s.empty}>{children}</p>;
}

function Table({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>{head}</thead>
        <tbody>{children}</tbody>
        {foot ? <tfoot>{foot}</tfoot> : null}
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

function HciCard({ r }: { r: Row }) {
  const extra = Object.entries(HCI_CAMPOS_TEXTO_LIBRE).filter(([field]) => str(r[field]));
  const exam = buildHCIPhysicalExamSections(r)
    .filter((sec) => sec.campos.length)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const filiatorios = buildPacienteFields(r as DatosFiliatoriosPaciente).filter(
    (f) => f.label !== 'Atención' && f.value,
  );
  const vacio = !str(r.MotivoConsulta) && !str(r.EnfermedadActual) && !extra.length && !exam.length;
  return (
    <RecordCard
      title="Historia clínica de ingreso"
      meta={[fmtFechaHora(r.FechaFormateada || r.Fecha, r.HoraFormateada), str(r.SectorDescripcion)]
        .filter(Boolean)
        .join(' · ')}
      firmas={[responsable.hci(r)]}
    >
      <TextBlock label="Motivo de consulta" text={r.MotivoConsulta} />
      <TextBlock label="Enfermedad actual" text={r.EnfermedadActual} />
      {extra.map(([field, titulo]) => (
        <TextBlock key={field} label={titulo} text={r[field]} />
      ))}
      {exam.map((sec) => (
        <div key={sec.titulo} className={s.subBlock}>
          <span className={s.textLabel}>{sec.titulo}</span>
          <FieldGrid pairs={sec.campos.map((c) => [c.label, c.valor])} />
        </div>
      ))}
      {vacio ? <p className={s.muted}>Sin texto clínico ni examen físico cargado.</p> : null}
      {filiatorios.length ? (
        <details className={s.collapse}>
          <summary>Datos del paciente registrados en la HC</summary>
          <FieldGrid pairs={filiatorios.map((f) => [f.label, f.value])} />
        </details>
      ) : null}
    </RecordCard>
  );
}

function Indicaciones({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th className={s.colNum}>Nº</th>
          <th>Indicada</th>
          <th>Tipo</th>
          <th className={s.colWide}>Indicación</th>
          <th>Frecuencia</th>
          <th>Estado</th>
          <th>Indicó</th>
        </tr>
      }
    >
      {rows.map((r, i) => {
        const estado = estadoIndicacion(r);
        const desc = str(r.descripcion);
        const med = str(r.medicamento);
        const dosis = Number(r.cantidad) > 0 ? [str(r.cantidad), str(r.tipoUnidad)].filter(Boolean).join(' ') : '';
        const hijas = Array.isArray(r.indicacionesHijas) ? (r.indicacionesHijas as Row[]) : [];
        return (
          <tr key={`${str(r.nroIndicacion)}-${i}`} className={estado === 'Suspendida' ? s.rowMuted : undefined}>
            <td className={s.colNum} data-label="Nº">{str(r.nroIndicacion)}</td>
            <td className={s.nowrap} data-label="Indicada">{fmtFechaHora(r.vigenteDesde, r.horaCarga)}</td>
            <td data-label="Tipo">{tipoIndicacion(r)}</td>
            <td className={s.colWide} data-label="Indicación">
              <span className={s.cellTitle}>{tituloIndicacion(r)}</span>
              {med && desc && med !== desc ? <span className={s.cellLine}>{med}</span> : null}
              {dosis ? <span className={s.cellLine}>Dosis: {dosis}</span> : null}
              {hijas.map((h, j) => (
                <span key={j} className={s.cellLine}>
                  + {[str(h.descripcion || h.medicamento), [str(h.cantidad), str(h.tipoUnidad)].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              ))}
              {str(r.observaciones) ? <span className={s.cellObs}>Obs.: {str(r.observaciones)}</span> : null}
            </td>
            <td data-label="Frecuencia">{str(r.frecuencia)}</td>
            <td data-label="Estado">
              <Badge tone={estado === 'Suspendida' ? 'danger' : estado === 'Única vez' ? 'info' : 'ok'}>{estado}</Badge>
            </td>
            <td data-label="Indicó">
              <ProfesionalCell p={responsable.indicacion(r)} />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function Practicas({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th>Fecha</th>
          <th>Código</th>
          <th className={s.colWide}>Práctica</th>
          <th className={s.colNum}>Cant.</th>
          <th>Sector</th>
          <th>Profesionales</th>
        </tr>
      }
    >
      {rows.map((p, i) => {
        const pros = Array.isArray(p.ProfesionalesLista) && p.ProfesionalesLista.length
          ? (p.ProfesionalesLista as string[])
          : str(p.Profesionales)
            ? [str(p.Profesionales)]
            : [
                str(p.SolicitanteNombre) && `Solicita: ${str(p.SolicitanteNombre)}`,
                ...(Array.isArray(p.Realizadores) ? (p.Realizadores as string[]).map((x) => `Realizó: ${x}`) : []),
              ].filter(Boolean);
        return (
          <tr key={`${str(p.Valor ?? p.Practica)}-${i}`}>
            <td className={s.nowrap} data-label="Fecha">
              {fmtFechaHora(p.FechaPractica, p.HoraPracticaInicio)}
              {str(p.HoraPracticaFin) ? ` – ${str(p.HoraPracticaFin)}` : ''}
            </td>
            <td data-label="Código">{str(p.Practica)}</td>
            <td className={s.colWide} data-label="Práctica">
              <span className={s.cellTitle}>{str(p.PracticaDescripcion) || 'Sin descripción'}</span>
              {str(p.TipoPractica) ? <span className={s.cellLine}>{str(p.TipoPractica)}</span> : null}
            </td>
            <td className={s.colNum} data-label="Cant.">{str(p.CantidadPractica)}</td>
            <td data-label="Sector">{str(p.ValorSector)}</td>
            <td data-label="Profesionales">
              {pros.length ? pros.map((x, j) => <span key={j} className={s.cellLine}>{x}</span>) : <span className={s.muted}>—</span>}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function Estudios({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((ex, i) => {
        const resultado = rtfToPlain(ex.ResultadoEstudio ?? ex.resultadoEstudio);
        const urg = str(ex.EstadoUrgencia ?? ex.estadoUrgencia);
        return (
          <RecordCard
            key={str(ex.IdPedido ?? ex.id) || i}
            title={str(ex.PracticaDescripcion ?? ex.practicaDescripcion) || `Pedido #${str(ex.IdPedido ?? ex.id ?? i + 1)}`}
            meta={fmtFechaHora(ex.FechaPedido ?? ex.fechaPedido)}
            badges={
              <>
                {urg ? <Badge tone={/urg/i.test(urg) ? 'danger' : 'neutral'}>{urg}</Badge> : null}
                <Badge tone={resultado ? 'ok' : 'warn'}>{resultado ? 'Con resultado' : 'Sin resultado'}</Badge>
              </>
            }
            firmas={[responsable.estudioSolicitante(ex), responsable.estudioRealizador(ex)]}
          >
            <FieldGrid
              pairs={[
                ['Nº de protocolo', ex.NroProtocolo ?? ex.nroProtocolo],
                ['Fecha de resultado', fmtFechaHora(ex.FechaResultado ?? ex.fechaResultado)],
                ['Adjuntos', Number(ex.cantidadAdjuntos) > 0 ? `${ex.cantidadAdjuntos} archivo(s)` : ''],
              ]}
            />
            <TextBlock label="Pedido" text={ex.PedidoEstudio ?? ex.pedidoEstudio} />
            {resultado ? <TextBlock label="Resultado" text={resultado} /> : null}
          </RecordCard>
        );
      })}
    </div>
  );
}

function Interconsultas({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((ic, i) => {
        const respondida = Boolean(str(ic.Respuesta));
        const urg = str(ic.EstadoUrgencia);
        return (
          <RecordCard
            key={str(ic.IdPedido ?? ic.id) || i}
            title={`Interconsulta a ${str(ic.ServicioDescripcion || ic.SectorReceptorNombre || ic.Especialidad) || '—'}`}
            meta={fmtFechaHora(ic.FechaSolicitud, ic.HoraSolicitud)}
            badges={
              <>
                <Badge tone={respondida ? 'ok' : 'warn'}>{str(ic.EstadoWorkflow || ic.Estado) || (respondida ? 'Respondida' : 'Pendiente')}</Badge>
                {urg ? <Badge tone={/urg/i.test(urg) ? 'danger' : 'neutral'}>{urg}</Badge> : null}
              </>
            }
            firmas={[responsable.interSolicitante(ic), responsable.interRespuesta(ic)]}
          >
            <FieldGrid
              pairs={[
                ['Sector solicitante', ic.SectorSolicitanteNombre],
                ['Especialidad', ic.Especialidad],
                ['Fecha de respuesta', fmtFechaHora(ic.FechaRespuesta)],
              ]}
            />
            <TextBlock label="Motivo" text={ic.Motivo} />
            {respondida ? <TextBlock label="Respuesta" text={ic.Respuesta} /> : <p className={s.muted}>Sin respuesta cargada.</p>}
          </RecordCard>
        );
      })}
    </div>
  );
}

function Protocolos({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((p, i) => {
        const practicas = Array.isArray(p.practicas) ? (p.practicas as Row[]) : [];
        const equipo = Array.from(
          new Set(
            practicas
              .flatMap((x) => (Array.isArray(x.profesionales) ? (x.profesionales as Row[]) : []))
              .map((pr) => [str(pr.apellidoNombre), str(pr.funcionNombre) && `(${str(pr.funcionNombre)})`].filter(Boolean).join(' '))
              .filter(Boolean),
          ),
        );
        const meds = Array.isArray(p.medicamentos) ? (p.medicamentos as Row[]) : [];
        return (
          <RecordCard
            key={str(p.idProtocolo) || i}
            title={`${str(p.tipoDescripcion || p.tipoProtocolo) || 'Protocolo'}${p.numeroProtocolo != null ? ` · Nº ${str(p.numeroProtocolo)}` : ''}`}
            meta={fmtFechaHora(p.fecha ?? p.fechaHoraInicio)}
            badges={str(p.estado) ? <Badge>{str(p.estado)}</Badge> : null}
            firmas={[responsable.protocolo(p)]}
          >
            <FieldGrid
              pairs={[
                ['Inicio', fmtFechaHora(p.fechaHoraInicio)],
                ['Fin', fmtFechaHora(p.fechaHoraFin)],
                ['Diagnóstico pre', p.diagnosticoPre],
                ['Diagnóstico post', p.diagnosticoPos],
              ]}
            />
            {equipo.length ? <FieldGrid pairs={[['Equipo', equipo.join(' · ')]]} /> : null}
            {practicas.length ? (
              <FieldGrid
                pairs={[['Prácticas', practicas.map((x) => [str(x.codigoPractica), str(x.descripcion)].filter(Boolean).join(' ')).join(' · ')]]}
              />
            ) : null}
            {meds.length ? (
              <FieldGrid
                pairs={[
                  [
                    'Medicación',
                    meds
                      .map((m) => [str(m.descripcion), [str(m.cantidad), str(m.unidad)].filter(Boolean).join(' ')].filter(Boolean).join(' '))
                      .join(' · '),
                  ],
                ]}
              />
            ) : null}
            <TextBlock label="Técnica" text={p.tecnica} />
            <TextBlock label="Descripción" text={p.texto} />
          </RecordCard>
        );
      })}
    </div>
  );
}

function Evoluciones({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((e, i) => (
        <RecordCard
          key={str(e.IdHCEvolucion) || i}
          title={str(e.EspecialidadDescripcion) || str(e.SectorDescripcion) || 'Evolución médica'}
          meta={fmtFechaHora(e.FechaEv, e.HoraEv)}
          badges={valorControl(e.Glucemia) ? <Badge tone="info">Glucemia {valorControl(e.Glucemia)}</Badge> : null}
          firmas={[responsable.evolucion(e)]}
        >
          {rtfToPlain(e.Evolucion) ? <TextBlock text={e.Evolucion} /> : <p className={s.muted}>Sin texto.</p>}
        </RecordCard>
      ))}
    </div>
  );
}

function Epicrisis({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((ep, i) => (
        <RecordCard
          key={str(ep.IdHCEpicrisis ?? ep.idHCEpicrisis) || i}
          title="Epicrisis"
          meta={[fmtFechaHora(ep.Fecha ?? ep.fecha, ep.Hora ?? ep.hora), str(ep.SectorDescripcion ?? ep.sectorDescripcion)]
            .filter(Boolean)
            .join(' · ')}
          firmas={[responsable.epicrisis(ep)]}
        >
          <FieldGrid pairs={[['Diagnóstico', ep.Diagnostico ?? ep.diagnostico]]} />
          <TextBlock label="Diagnóstico (detalle)" text={ep.DiagnosticoText ?? ep.diagnosticoText} />
          {rtfToPlain(ep.Epicrisis ?? ep.epicrisis) ? (
            <TextBlock label="Resumen de la internación" text={ep.Epicrisis ?? ep.epicrisis} />
          ) : (
            <p className={s.muted}>Sin texto de epicrisis.</p>
          )}
        </RecordCard>
      ))}
    </div>
  );
}

function Laboratorios({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((ex, i) => {
        const det = Array.isArray(ex.detalles) ? (ex.detalles as Row[]) : [];
        return (
          <RecordCard
            key={str(ex.IdExamen) || i}
            title={str(ex.TipoEstudio) || 'Análisis de laboratorio'}
            meta={[fmtFechaHora(ex.FechaExamen, ex.HoraExamen), str(ex.Laboratorio)].filter(Boolean).join(' · ')}
            badges={
              <>
                {str(ex.Protocolo) ? <Badge>Protocolo {str(ex.Protocolo)}</Badge> : null}
                {str(ex.Estado) ? <Badge tone="info">{str(ex.Estado)}</Badge> : null}
              </>
            }
          >
            {det.length ? (
              <Table
                head={
                  <tr>
                    <th>Parámetro</th>
                    <th>Resultado</th>
                    <th>Referencia</th>
                  </tr>
                }
              >
                {det.map((d, j) => (
                  <tr key={j}>
                    <td data-label="Parámetro">{str(d.NombreParametro)}</td>
                    <td data-label="Resultado">
                      <strong>{str(d.Resultado)}</strong> {str(d.Unidad)}
                    </td>
                    <td data-label="Referencia">{str(d.ValorReferencia)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className={s.muted}>Sin parámetros cargados.</p>
            )}
          </RecordCard>
        );
      })}
    </div>
  );
}

function Controles({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th>Fecha / hora</th>
          <th className={s.colNum}>TA</th>
          <th className={s.colNum}>FC</th>
          <th className={s.colNum}>FR</th>
          <th className={s.colNum}>T°</th>
          <th className={s.colNum}>Sat %</th>
          <th className={s.colNum}>HGT</th>
          <th className={s.colNum}>Peso</th>
          <th className={s.colWide}>Observaciones</th>
          <th>Registró</th>
        </tr>
      }
    >
      {rows.map((c, i) => {
        const sat = Number(c.Saturometria);
        return (
          <tr key={str(c.IdControl ?? c.IDControl) || i}>
            <td className={s.nowrap} data-label="Fecha / hora">{fmtFechaHora(c.FechaControl, c.HoraControl)}</td>
            <td className={s.colNum} data-label="TA">
              {valorControl(c.Maximo) ? `${valorControl(c.Maximo)}/${valorControl(c.Minimo) || '—'}` : ''}
            </td>
            <td className={s.colNum} data-label="FC">{valorControl(c.Pulso)}</td>
            <td className={s.colNum} data-label="FR">{valorControl(c.FrecuenciaRespiratoria)}</td>
            <td className={s.colNum} data-label="T°">{valorControl(c.Axilar, 1) || valorControl(c.Rectal, 1)}</td>
            <td className={`${s.colNum} ${sat > 0 && sat < 92 ? s.valueAlert : ''}`} data-label="Sat %">
              {valorControl(c.Saturometria)}
            </td>
            <td className={s.colNum} data-label="HGT">{str(c.Hgt)}</td>
            <td className={s.colNum} data-label="Peso">{valorControl(c.Peso, 1)}</td>
            <td className={s.colWide} data-label="Observaciones">{str(c.Observaciones)}</td>
            <td data-label="Registró">
              <ProfesionalCell p={responsable.control(c)} />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function Medicacion({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th>Fecha / hora</th>
          <th className={s.colWide}>Medicamento</th>
          <th>Cantidad</th>
          <th className={s.colNum}>Ind. Nº</th>
          <th>Observaciones</th>
          <th>Suministró</th>
        </tr>
      }
    >
      {rows.map((m, i) => {
        const adicionales = Array.isArray(m.adicionales) ? (m.adicionales as Row[]) : [];
        return (
          <tr key={str(m.IDCtrlMedica) || i}>
            <td className={s.nowrap} data-label="Fecha / hora">{fmtFechaHora(m.FechaControl, m.HoraControl)}</td>
            <td className={s.colWide} data-label="Medicamento">
              <span className={s.cellTitle}>{str(m.NombreMedicamento || m.AliasMedicamento || m.DescripcionMedicamento) || '—'}</span>
              {adicionales.map((a, j) => (
                <span key={j} className={s.cellLine}>
                  + {[str(a.NombreMedicamento || a.DescripcionMedicamento), [str(a.Cantidad), str(a.TipoUnidad)].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              ))}
            </td>
            <td data-label="Cantidad">{[str(m.Cantidad), str(m.TipoUnidad)].filter(Boolean).join(' ')}</td>
            <td className={s.colNum} data-label="Ind. Nº">{str(m.NroIndicacion)}</td>
            <td data-label="Observaciones">{str(m.Observaciones)}</td>
            <td data-label="Suministró">
              <ProfesionalCell p={responsable.medicacion(m)} />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function EvolucionEnfermeria({ rows }: { rows: Row[] }) {
  return (
    <div className={s.cardList}>
      {rows.map((e, i) => (
        <RecordCard
          key={i}
          title="Evolución de enfermería"
          meta={fmtFechaHora(e.FechaControl, e.HoraControl)}
          firmas={[responsable.control(e)]}
        >
          {rtfToPlain(e.Observaciones) ? <TextBlock text={e.Observaciones} /> : <p className={s.muted}>Sin texto.</p>}
        </RecordCard>
      ))}
    </div>
  );
}

function Balance({ rows }: { rows: Row[] }) {
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const tot = rows.reduce<{ i: number; e: number; t: number }>(
    (acc, b) => ({ i: acc.i + n(b.TotalIngresos), e: acc.e + n(b.TotalEgresos), t: acc.t + n(b.Total) }),
    { i: 0, e: 0, t: 0 },
  );
  return (
    <Table
      head={
        <tr>
          <th>Fecha / hora</th>
          <th className={s.colWide}>Medicación / vía</th>
          <th className={s.colNum}>Ingresos (ml)</th>
          <th className={s.colNum}>Egresos (ml)</th>
          <th className={s.colNum}>Balance (ml)</th>
          <th>Sector</th>
          <th>Registró</th>
        </tr>
      }
      foot={
        <tr>
          <td colSpan={2}>Total del período</td>
          <td className={s.colNum}>{tot.i}</td>
          <td className={s.colNum}>{tot.e}</td>
          <td className={`${s.colNum} ${tot.t < 0 ? s.valueAlert : ''}`}>{tot.t}</td>
          <td colSpan={2} />
        </tr>
      }
    >
      {rows.map((b, i) => (
        <tr key={i}>
          <td className={s.nowrap} data-label="Fecha / hora">{fmtFechaHora(b.Fecha, b.Hora)}</td>
          <td className={s.colWide} data-label="Medicación / vía">{[str(b.Medicacion), str(b.Via)].filter(Boolean).join(' · ')}</td>
          <td className={s.colNum} data-label="Ingresos">{str(b.TotalIngresos)}</td>
          <td className={s.colNum} data-label="Egresos">{str(b.TotalEgresos)}</td>
          <td className={s.colNum} data-label="Balance">{str(b.Total)}</td>
          <td data-label="Sector">{str(b.Sector)}</td>
          <td data-label="Registró">
            <ProfesionalCell p={responsable.control(b)} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Dietas({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th>Fecha / hora</th>
          <th className={s.colWide}>Dieta</th>
          <th>Estado</th>
          <th className={s.colNum}>Ind. Nº</th>
          <th>Observaciones</th>
          <th>Registró</th>
        </tr>
      }
    >
      {rows.map((d, i) => {
        const suministrada = Boolean(str(d.FechaDieta));
        return (
          <tr key={str(d.IdCtrlDieta) || i}>
            <td className={s.nowrap} data-label="Fecha / hora">
              {fmtFechaHora(d.FechaDieta || d.FechaCarga, d.HoraDieta || d.HoraCarga)}
            </td>
            <td className={s.colWide} data-label="Dieta">{str(d.DescripcionDieta)}</td>
            <td data-label="Estado">
              <Badge tone={suministrada ? 'ok' : 'info'}>{suministrada ? 'Suministrada' : 'Indicada'}</Badge>
            </td>
            <td className={s.colNum} data-label="Ind. Nº">{str(d.NroIndicacion)}</td>
            <td data-label="Observaciones">{str(d.Observaciones)}</td>
            <td data-label="Registró">
              <ProfesionalCell p={responsable.dieta(d)} />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function Insumos({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <tr>
          <th>Fecha / hora</th>
          <th className={s.colWide}>Insumo</th>
          <th className={s.colNum}>Cant.</th>
          <th>Observaciones</th>
          <th>Cargó</th>
        </tr>
      }
    >
      {rows.map((r, i) => (
        <tr key={i}>
          <td className={s.nowrap} data-label="Fecha / hora">{fmtFechaHora(r.vigenteDesde, r.horaCarga)}</td>
          <td className={s.colWide} data-label="Insumo">{str(r.descripcion || r.medicamento)}</td>
          <td className={s.colNum} data-label="Cant.">{str(r.cantidad)}</td>
          <td data-label="Observaciones">{str(r.observaciones)}</td>
          <td data-label="Cargó">
            <ProfesionalCell p={responsable.insumo(r)} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

// ---------------------------------------------------------------------------

function Egreso({ a }: { a: Row }) {
  const dias = str(a.DiasEstadia);
  const dxEgreso = [str(a.DiagnosticoEgreso), str(a.DiagnosticoEgresoDescripcion)].filter(Boolean).join(' — ');
  const ubicacion = [str(a.SectorDescripcion) || str(a.Sector), str(a.Habitacion) && `Cama ${str(a.Habitacion)}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <RecordCard
      title="Egreso de la internación"
      meta={fmtFechaHora(a.FechaEgreso, a.HoraEgreso)}
      badges={str(a.DisposicionEgresoDescripcion) ? <Badge tone="info">{str(a.DisposicionEgresoDescripcion)}</Badge> : null}
      firmas={[str(a.OperadorEgresoNombre) ? { nombre: str(a.OperadorEgresoNombre), matricula: '', rol: 'Registró el egreso' } : null]}
    >
      <FieldGrid
        pairs={[
          ['Ingreso', fmtFechaHora(a.FechaAdmision, a.HoraAdmision)],
          ['Egreso', fmtFechaHora(a.FechaEgreso, a.HoraEgreso)],
          ['Días de estadía', dias === '0' ? 'Menos de 1 día' : dias],
          ['Disposición', a.DisposicionEgresoDescripcion],
          ['Última ubicación', ubicacion],
          ['Servicio', a.ServicioEgresoDescripcion || a.ServicioHospitalDescripcion],
        ]}
      />
      {dxEgreso ? (
        <div className={s.textBlock}>
          <span className={s.textLabel}>Diagnóstico de egreso</span>
          <p className={s.textBody}>{dxEgreso}</p>
        </div>
      ) : (
        <p className={s.muted}>Sin diagnóstico de egreso registrado.</p>
      )}
    </RecordCard>
  );
}

const EMPTY_MSG: Record<VisitSectionId, string> = {
  movimientos: 'No hay movimientos de cama registrados para esta visita.',
  egreso: 'La internación sigue en curso: todavía no hay egreso registrado.',
  hcIngreso: 'No hay historia clínica de ingreso.',
  indicaciones: 'No hay indicaciones registradas.',
  evoluciones: 'No hay evoluciones médicas.',
  interconsultas: 'No hay interconsultas.',
  estudios: 'No hay estudios solicitados.',
  laboratorios: 'No hay análisis de laboratorio.',
  protocolos: 'No hay protocolos.',
  practicas: 'No hay prácticas registradas.',
  epicrisis: 'No hay epicrisis.',
  controles: 'No hay controles de signos vitales.',
  medicamentos: 'No hay medicación suministrada.',
  evolucionEnfermeria: 'No hay evoluciones de enfermería.',
  balanceHidrico: 'No hay registros de balance hídrico.',
  dietas: 'No hay dietas registradas.',
  insumos: 'No hay insumos cargados.',
  adjuntos: 'No hay adjuntos.',
};

export type VisitSectionBodyProps = {
  id: VisitSectionId;
  rows: Row[];
  /** true cuando hay registros pero los filtros los ocultaron todos. */
  filtered?: boolean;
  numeroVisita: number | null;
  allowAdjuntosUpload?: boolean;
  onReloadData?: () => void;
};

export default function VisitSectionBody({
  id,
  rows,
  filtered,
  numeroVisita,
  allowAdjuntosUpload,
  onReloadData,
}: VisitSectionBodyProps) {
  if (id === 'adjuntos') {
    return (
      <AdmissionAdjuntosGrid
        items={rows}
        numeroVisita={numeroVisita}
        allowUpload={Boolean(allowAdjuntosUpload && numeroVisita)}
        onUploaded={onReloadData}
      />
    );
  }
  if (!rows.length) {
    return <Empty>{filtered ? 'Ningún registro coincide con la búsqueda o el filtro.' : EMPTY_MSG[id]}</Empty>;
  }
  switch (id) {
    case 'movimientos':
      return <MovimientosTimelineTable movimientos={rows} />;
    case 'egreso':
      return <Egreso a={rows[0]} />;
    case 'hcIngreso':
      return (
        <div className={s.cardList}>
          {rows.map((r, i) => (
            <HciCard key={str(r.IdHCIngreso) || i} r={r} />
          ))}
        </div>
      );
    case 'indicaciones':
      return <Indicaciones rows={rows} />;
    case 'evoluciones':
      return <Evoluciones rows={rows} />;
    case 'interconsultas':
      return <Interconsultas rows={rows} />;
    case 'estudios':
      return <Estudios rows={rows} />;
    case 'laboratorios':
      return <Laboratorios rows={rows} />;
    case 'protocolos':
      return <Protocolos rows={rows} />;
    case 'practicas':
      return <Practicas rows={rows} />;
    case 'epicrisis':
      return <Epicrisis rows={rows} />;
    case 'controles':
      return <Controles rows={rows} />;
    case 'medicamentos':
      return <Medicacion rows={rows} />;
    case 'evolucionEnfermeria':
      return <EvolucionEnfermeria rows={rows} />;
    case 'balanceHidrico':
      return <Balance rows={rows} />;
    case 'dietas':
      return <Dietas rows={rows} />;
    case 'insumos':
      return <Insumos rows={rows} />;
    default:
      return null;
  }
}
