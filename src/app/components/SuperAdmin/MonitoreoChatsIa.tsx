'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  MensajeConsumoIa,
  PaginaMensajesIa,
  ReporteConsumoIaPlataforma,
} from '@/app/services/consumoIaService';
import { superAdminService } from '@/app/services/superAdminService';
import type { EmpresaAdmin } from '@/app/types/superAdmin';
import { mensajeDeError } from '@/app/utils/apiError';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import shell from './superAdmin.module.css';
import styles from './MonitoreoChatsIa.module.css';

const LIMITE = 40;

const TIPOS_IA: Record<string, string> = {
  EPICRISIS_IA: 'Epicrisis IA',
  RESUMEN_VISITA_IA: 'Resumen de visita IA',
  BOT_WHATSAPP: 'Bot WhatsApp',
};

function isoHoy(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function usd(n: number | null | undefined, decimales = 4) {
  if (n == null) return '—';
  return `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

function miles(n: number | null | undefined) {
  if (n == null) return '—';
  return n >= 1000
    ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`
    : String(n);
}

function fechaCorta(s: string) {
  const [f, h] = String(s || '').split(' ');
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y.slice(2)} ${h?.slice(0, 5) || ''}`.trim();
}

type Filtros = {
  desde: string;
  hasta: string;
  idEmpresa: number | null;
  actor: number | null;
  q: string;
};

export default function MonitoreoChatsIa() {
  const [filtros, setFiltros] = useState<Filtros>({
    desde: isoHoy(-29),
    hasta: isoHoy(),
    idEmpresa: null,
    actor: null,
    q: '',
  });
  const [qDraft, setQDraft] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [reporte, setReporte] = useState<ReporteConsumoIaPlataforma | null>(null);
  const [mensajes, setMensajes] = useState<PaginaMensajesIa | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<MensajeConsumoIa | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async (f: Filtros, p: number) => {
    setCargando(true);
    setError(null);
    try {
      const params = {
        desde: f.desde,
        hasta: f.hasta,
        idEmpresa: f.idEmpresa,
        actor: f.actor,
        q: f.q || undefined,
      };
      const [r, m] = await Promise.all([
        superAdminService.reporteChatsIa(params),
        superAdminService.mensajesChatsIa(params, p, LIMITE),
      ]);
      setReporte(r);
      setMensajes(m);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar el monitoreo de chats IA'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(filtros, pagina);
  }, [cargar, filtros, pagina]);

  useEffect(() => {
    void superAdminService
      .listEmpresas()
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
  }, []);

  const cambiarFiltro = (parcial: Partial<Filtros>) => {
    setPagina(1);
    setFiltros((f) => ({ ...f, ...parcial }));
  };

  const abrirDetalle = async (id: number) => {
    setCargandoDetalle(true);
    try {
      const d = await superAdminService.detalleChatIa(id);
      setDetalle(d);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo abrir el mensaje'));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const t = reporte?.totales;
  const totalPaginas = mensajes ? Math.max(1, Math.ceil(mensajes.total / mensajes.limite)) : 1;
  const empresaFiltrada =
    filtros.idEmpresa == null
      ? null
      : empresas.find((e) => Number(e.id) === filtros.idEmpresa)?.descripcion ||
        reporte?.porEmpresa?.find((e) => e.idEmpresa === filtros.idEmpresa)?.nombre ||
        `Empresa ${filtros.idEmpresa}`;

  return (
    <SuperAdminShell
      title="Chats IA"
      subtitle="Monitoreo de todo lo que se habla con el asistente en todas las empresas: mensajes, respuestas, herramientas y costo."
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Chats IA' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
      actions={
        <button
          type="button"
          className={shell.btn}
          onClick={() => void cargar(filtros, pagina)}
          disabled={cargando}
        >
          Actualizar
        </button>
      }
    >
      <div className={shell.panel}>
        <div className={styles.filtros}>
          <label>
            Desde
            <input
              type="date"
              value={filtros.desde}
              max={filtros.hasta}
              onChange={(e) => cambiarFiltro({ desde: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              min={filtros.desde}
              onChange={(e) => cambiarFiltro({ hasta: e.target.value })}
            />
          </label>
          <label>
            Empresa
            <select
              value={filtros.idEmpresa ?? ''}
              onChange={(e) =>
                cambiarFiltro({
                  idEmpresa: e.target.value ? Number(e.target.value) : null,
                  actor: null,
                })
              }
            >
              <option value="">Todas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.descripcion}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 200 }}>
            Buscar en el chat
            <input
              className={styles.busqueda}
              type="search"
              placeholder="Palabra en pregunta o respuesta…"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') cambiarFiltro({ q: qDraft.trim() });
              }}
            />
          </label>
          <button
            type="button"
            className={`${shell.btn} ${shell.btnSecondary}`}
            onClick={() => cambiarFiltro({ q: qDraft.trim() })}
          >
            Buscar
          </button>
          {filtros.q ? (
            <button type="button" className={styles.chip} onClick={() => { setQDraft(''); cambiarFiltro({ q: '' }); }}>
              Texto: {filtros.q} ×
            </button>
          ) : null}
          {filtros.actor != null ? (
            <button type="button" className={styles.chip} onClick={() => cambiarFiltro({ actor: null })}>
              Usuario filtrado ×
            </button>
          ) : null}
          {cargando ? <span className={styles.muted}>Actualizando…</span> : null}
        </div>
      </div>

      {reporte && !reporte.disponible ? (
        <div className={shell.panel}>
          <p className={styles.muted}>{reporte.mensaje || 'La auditoría no está disponible.'}</p>
        </div>
      ) : null}

      {t ? (
        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.cardPrimaria}`}>
            <span className={styles.rotulo}>Costo del período</span>
            <strong>{usd(t.costoUsd, 2)}</strong>
            <small>{t.pedidos.toLocaleString('es-AR')} mensajes</small>
          </div>
          <div className={styles.card}>
            <span className={styles.rotulo}>Empresas con uso</span>
            <strong>{(t.empresas ?? reporte?.porEmpresa?.length ?? 0).toLocaleString('es-AR')}</strong>
            <small>{empresaFiltrada ? `Filtro: ${empresaFiltrada}` : 'Toda la plataforma'}</small>
          </div>
          <div className={styles.card}>
            <span className={styles.rotulo}>Proyección mensual</span>
            <strong>{usd(reporte?.proyeccionMensual?.costoUsd, 2)}</strong>
            <small>{reporte?.proyeccionMensual?.base}</small>
          </div>
          <div className={styles.card}>
            <span className={styles.rotulo}>Promedio / mensaje</span>
            <strong>{usd(t.promedioUsd)}</strong>
            <small>
              p95 {usd(t.p95Usd)} · {t.llamadasPorPedido} llamadas/msg
            </small>
          </div>
          <div className={styles.card}>
            <span className={styles.rotulo}>Tokens</span>
            <strong>{miles(t.tokens.total)}</strong>
            <small>
              {miles(t.tokens.entrada)} in · {miles(t.tokens.salida)} out · {t.pctCache}% caché
              {t.errores ? ` · ${t.errores} errores` : ''}
            </small>
          </div>
        </div>
      ) : cargando ? (
        <Loader />
      ) : null}

      <div className={styles.grid}>
        <section className={shell.panel}>
          <h2 className={shell.sectionTitle}>Por empresa</h2>
          <div className={styles.tablaScroll}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th className={styles.num}>Mensajes</th>
                  <th className={styles.num}>Tokens</th>
                  <th className={styles.num}>Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte?.porEmpresa?.length ? (
                  reporte.porEmpresa.map((e) => (
                    <tr
                      key={e.idEmpresa ?? 'sin'}
                      className={`${styles.fila} ${filtros.idEmpresa === e.idEmpresa ? styles.filaActiva : ''}`}
                      onClick={() =>
                        cambiarFiltro({
                          idEmpresa: filtros.idEmpresa === e.idEmpresa ? null : e.idEmpresa,
                          actor: null,
                        })
                      }
                      title="Filtrar por esta empresa"
                    >
                      <td>{e.nombre}</td>
                      <td className={styles.num}>{e.pedidos}</td>
                      <td className={styles.num}>{miles(e.tokens.total)}</td>
                      <td className={`${styles.num} ${styles.fuerte}`}>{usd(e.costoUsd)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={styles.vacio}>
                      Sin consumo en el período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={shell.panel}>
          <h2 className={shell.sectionTitle}>Usuarios que más consumen</h2>
          <div className={styles.tablaScroll}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th className={styles.num}>Msgs</th>
                  <th className={styles.num}>Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte?.porUsuario?.length ? (
                  reporte.porUsuario.slice(0, 15).map((u) => (
                    <tr
                      key={`${u.idEmpresa ?? 'x'}-${u.actor ?? 'sin'}`}
                      className={`${styles.fila} ${filtros.actor === u.actor && filtros.idEmpresa === (u.idEmpresa ?? null) ? styles.filaActiva : ''}`}
                      onClick={() =>
                        cambiarFiltro({
                          actor: filtros.actor === u.actor ? null : u.actor,
                          idEmpresa: u.idEmpresa ?? filtros.idEmpresa,
                        })
                      }
                      title="Filtrar mensajes de este usuario"
                    >
                      <td>{u.nombre || `Personal ${u.actor ?? '?'}`}</td>
                      <td className={styles.muted}>{u.empresaNombre || '—'}</td>
                      <td className={styles.num}>{u.pedidos}</td>
                      <td className={`${styles.num} ${styles.fuerte}`}>{usd(u.costoUsd)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={styles.vacio}>
                      Sin usuarios en el período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className={shell.panel}>
        <h2 className={shell.sectionTitle}>
          Conversaciones
          {mensajes ? (
            <span className={styles.muted}>
              {' '}
              · {mensajes.total.toLocaleString('es-AR')} registros
            </span>
          ) : null}
        </h2>
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empresa</th>
                <th>Usuario</th>
                <th>Pregunta</th>
                <th>Respuesta</th>
                <th>Herramientas</th>
                <th className={styles.num}>Costo</th>
              </tr>
            </thead>
            <tbody>
              {mensajes?.filas.length ? (
                mensajes.filas.map((m) => (
                  <tr
                    key={m.id}
                    className={`${styles.fila} ${m.error ? styles.filaError : ''}`}
                    onClick={() => void abrirDetalle(m.id)}
                    title="Ver detalle completo"
                  >
                    <td className={styles.nowrap}>{fechaCorta(m.fecha)}</td>
                    <td>{m.empresaNombre || (m.idEmpresa != null ? `Empresa ${m.idEmpresa}` : '—')}</td>
                    <td>{m.nombre || (m.actor == null ? '—' : `Personal ${m.actor}`)}</td>
                    <td className={styles.pregunta} title={m.pregunta || ''}>
                      {m.tipo !== 'CHAT' ? (
                        <span className={styles.badge}>{TIPOS_IA[m.tipo] || m.tipo}</span>
                      ) : null}
                      {m.error ? <span className={`${styles.badge} ${styles.badgeError}`}>Error</span> : null}
                      {m.agente ? <span className={`${styles.badge} ${styles.badgeModo}`}>{m.agente}</span> : null}
                      {m.pregunta || (m.tipo === 'CHAT' ? <span className={styles.muted}>—</span> : null)}
                    </td>
                    <td className={styles.pregunta} title={m.respuesta || ''}>
                      {m.respuesta || <span className={styles.muted}>—</span>}
                    </td>
                    <td className={styles.muted}>
                      {(m.herramientas || []).join(', ') || '—'}
                    </td>
                    <td className={`${styles.num} ${styles.fuerte}`}>{usd(m.costoUsd)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.vacio}>
                    {cargando ? 'Cargando…' : 'Sin mensajes en el período.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {mensajes && totalPaginas > 1 ? (
          <div className={styles.paginado}>
            <button type="button" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas || cargando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        ) : null}
        {reporte?.notas?.pedidosSinMedir ? (
          <p className={styles.muted} style={{ marginTop: '0.75rem' }}>
            {reporte.notas.pedidosSinMedir} mensajes anteriores a la medición no tienen consumo registrado.
          </p>
        ) : null}
      </section>

      {detalle || cargandoDetalle ? (
        <div
          className={styles.drawerBackdrop}
          onClick={() => !cargandoDetalle && setDetalle(null)}
          role="presentation"
        >
          <aside
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Detalle del mensaje"
          >
            <div className={styles.drawerHeader}>
              <div>
                <h2>Detalle del mensaje</h2>
                <p className={styles.muted}>
                  {detalle ? fechaCorta(detalle.fecha) : 'Cargando…'}
                </p>
              </div>
              <button type="button" className={styles.drawerClose} onClick={() => setDetalle(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.drawerBody}>
              {cargandoDetalle && !detalle ? <Loader /> : null}
              {detalle ? (
                <>
                  <dl className={styles.meta}>
                    <div>
                      <dt>Empresa</dt>
                      <dd>{detalle.empresaNombre || detalle.idEmpresa || '—'}</dd>
                    </div>
                    <div>
                      <dt>Usuario</dt>
                      <dd>{detalle.nombre || (detalle.actor == null ? '—' : `Personal ${detalle.actor}`)}</dd>
                    </div>
                    <div>
                      <dt>Agente / modo</dt>
                      <dd>
                        {[detalle.agente, detalle.modo].filter(Boolean).join(' · ') || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Ruta</dt>
                      <dd>{detalle.ruta || '—'}</dd>
                    </div>
                    <div>
                      <dt>Modelo</dt>
                      <dd>{detalle.modelo || '—'}</dd>
                    </div>
                    <div>
                      <dt>Costo</dt>
                      <dd>
                        {usd(detalle.costoUsd)}
                        {detalle.tokens
                          ? ` · ${miles(detalle.tokens.total)} tokens · ${detalle.llamadas || 0} llamadas`
                          : ''}
                        {detalle.ms != null ? ` · ${detalle.ms} ms` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Conversación</dt>
                      <dd>{detalle.idConversacion || '—'}</dd>
                    </div>
                    <div>
                      <dt>IP</dt>
                      <dd>{detalle.ip || '—'}</dd>
                    </div>
                  </dl>

                  {detalle.error ? (
                    <div className={`${styles.burbuja} ${styles.burbujaUser}`} style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
                      <span className={styles.burbujaLabel}>Error</span>
                      {detalle.error}
                    </div>
                  ) : null}

                  <div className={`${styles.burbuja} ${styles.burbujaUser}`}>
                    <span className={styles.burbujaLabel}>Usuario</span>
                    {detalle.pregunta || <span className={styles.sinRespuesta}>Sin texto de pregunta</span>}
                  </div>

                  <div className={`${styles.burbuja} ${styles.burbujaIa}`}>
                    <span className={styles.burbujaLabel}>Asistente</span>
                    {detalle.respuesta || (
                      <span className={styles.sinRespuesta}>
                        Sin respuesta guardada (mensajes anteriores a este monitoreo solo tenían un recorte de la pregunta).
                      </span>
                    )}
                  </div>

                  {detalle.herramientas?.length ? (
                    <div>
                      <span className={styles.burbujaLabel}>Herramientas usadas</span>
                      <div className={styles.herramientasLista}>
                        {detalle.herramientas.map((h) => (
                          <span key={h} className={styles.badge}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </SuperAdminShell>
  );
}
