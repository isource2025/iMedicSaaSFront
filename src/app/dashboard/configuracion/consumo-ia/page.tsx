"use client";

import { useCallback, useEffect, useState } from "react";
import { usePermiso } from "@/app/hooks/usePermiso";
import {
  consumoIaService,
  type FiltrosConsumoIa,
  type PaginaMensajesIa,
  type ReporteConsumoIa,
} from "@/app/services/consumoIaService";
import { mensajeDeError } from "@/app/utils/apiError";
import styles from "./consumoIa.module.css";

const LIMITE = 50;

const TIPOS_IA: Record<string, string> = {
  EPICRISIS_IA: "Epicrisis IA",
  RESUMEN_VISITA_IA: "Resumen de visita IA",
  BOT_WHATSAPP: "Bot WhatsApp",
};

const ROTULO_PARTE: Record<string, string> = {
  sistema: "Prompt de sistema",
  definicionesHerramientas: "Definiciones de herramientas",
  historial: "Historial de la conversación",
  mensaje: "Mensaje del usuario",
  argumentosHerramientas: "Argumentos de herramientas",
  resultadosHerramientas: "Resultados de herramientas",
};

function isoHoy(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function usd(n: number | null | undefined, decimales = 4) {
  if (n == null) return "—";
  return `US$ ${n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

function ars(n: number | null | undefined) {
  return n == null
    ? null
    : `$ ${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function miles(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000
    ? `${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}k`
    : String(n);
}

function fechaCorta(s: string) {
  const [f, h] = s.split(" ");
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y.slice(2)} ${h?.slice(0, 5) || ""}`;
}

export default function ConsumoIaPage() {
  const { puede, loaded } = usePermiso();
  const puedeVer = puede("CONFIGURACION.CONSUMO_IA.VER");

  const [filtros, setFiltros] = useState<FiltrosConsumoIa>({
    desde: isoHoy(-29),
    hasta: isoHoy(),
  });
  const [reporte, setReporte] = useState<ReporteConsumoIa | null>(null);
  const [mensajes, setMensajes] = useState<PaginaMensajesIa | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (f: FiltrosConsumoIa, p: number) => {
    setCargando(true);
    setError("");
    try {
      const [r, m] = await Promise.all([
        consumoIaService.reporte(f),
        consumoIaService.mensajes(f, p, LIMITE),
      ]);
      setReporte(r);
      setMensajes(m);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo cargar el consumo de IA"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (loaded && puedeVer) void cargar(filtros, pagina);
  }, [loaded, puedeVer, filtros, pagina, cargar]);

  const cambiarFiltro = (parcial: Partial<FiltrosConsumoIa>) => {
    setPagina(1);
    setFiltros((f) => ({ ...f, ...parcial }));
  };

  if (!loaded) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Cargando…</p>
      </div>
    );
  }

  if (!puedeVer) {
    return (
      <div className={styles.page}>
        <div className={`${styles.banner} ${styles.bannerError}`}>
          No tenés permiso para ver el consumo de IA.
        </div>
      </div>
    );
  }

  const t = reporte?.totales;
  const usuarioFiltrado = reporte?.porUsuario?.find(
    (u) => u.actor === filtros.actor,
  );
  const totalPaginas = mensajes
    ? Math.max(1, Math.ceil(mensajes.total / mensajes.limite))
    : 1;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Consumo IA</h1>
        <p>
          Costo real del asistente según los tokens que informa OpenAI en cada
          llamada. Los precios son de lista por modelo; el reparto por
          herramienta y por parte del prompt es aproximado.
        </p>
      </header>

      <div className={styles.filtros}>
        <label>
          Desde
          <input
            type="date"
            value={filtros.desde || ""}
            max={filtros.hasta}
            onChange={(e) => cambiarFiltro({ desde: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filtros.hasta || ""}
            min={filtros.desde}
            onChange={(e) => cambiarFiltro({ hasta: e.target.value })}
          />
        </label>
        {filtros.actor != null ? (
          <button
            type="button"
            className={styles.chipFiltro}
            onClick={() => cambiarFiltro({ actor: null })}
          >
            Usuario: {usuarioFiltrado?.nombre || filtros.actor} ×
          </button>
        ) : null}
        {cargando ? <span className={styles.muted}>Actualizando…</span> : null}
      </div>

      {error ? (
        <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>
      ) : null}
      {reporte && !reporte.disponible ? (
        <div className={styles.banner}>
          {reporte.mensaje || "La auditoría no está disponible."}
        </div>
      ) : null}

      {t ? (
        <section className={styles.cards}>
          <div className={`${styles.card} ${styles.cardPrimaria}`}>
            <span className={styles.cardRotulo}>Costo del período</span>
            <strong>{usd(t.costoUsd, 2)}</strong>
            <small>{ars(t.costoArs) || `${t.pedidos} mensajes`}</small>
          </div>
          <div className={styles.card}>
            <span className={styles.cardRotulo}>Proyección mensual</span>
            <strong>{usd(reporte?.proyeccionMensual?.costoUsd, 2)}</strong>
            <small>
              {ars(reporte?.proyeccionMensual?.costoArs) ||
                reporte?.proyeccionMensual?.base}
            </small>
          </div>
          <div className={styles.card}>
            <span className={styles.cardRotulo}>Promedio por mensaje</span>
            <strong>{usd(t.promedioUsd)}</strong>
            <small>
              mediana {usd(t.p50Usd)} · p95 {usd(t.p95Usd)}
            </small>
          </div>
          <div className={styles.card}>
            <span className={styles.cardRotulo}>Mensajes</span>
            <strong>{t.pedidos.toLocaleString("es-AR")}</strong>
            <small>
              {t.llamadasPorPedido} llamadas/mensaje
              {t.errores ? ` · ${t.errores} con error` : ""}
            </small>
          </div>
          <div className={styles.card}>
            <span className={styles.cardRotulo}>Tokens</span>
            <strong>{miles(t.tokens.total)}</strong>
            <small>
              {miles(t.tokens.entrada)} entrada · {miles(t.tokens.salida)}{" "}
              salida · {t.pctCache}% en caché
            </small>
          </div>
        </section>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Por usuario</h2>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th className={styles.num}>Mensajes</th>
                <th className={styles.num}>Tokens</th>
                <th className={styles.num}>Promedio</th>
                <th className={styles.num}>Total</th>
              </tr>
            </thead>
            <tbody>
              {reporte?.porUsuario?.length ? (
                reporte.porUsuario.map((u) => (
                  <tr
                    key={u.actor ?? "sin"}
                    className={`${styles.fila} ${filtros.actor === u.actor ? styles.filaActiva : ""}`}
                    onClick={() =>
                      cambiarFiltro({
                        actor: filtros.actor === u.actor ? null : u.actor,
                      })
                    }
                    title="Filtrar los mensajes de este usuario"
                  >
                    <td>{u.nombre || `Personal ${u.actor ?? "?"}`}</td>
                    <td className={styles.num}>{u.pedidos}</td>
                    <td className={styles.num}>{miles(u.tokens.total)}</td>
                    <td className={styles.num}>{usd(u.promedioUsd)}</td>
                    <td className={`${styles.num} ${styles.fuerte}`}>
                      {usd(u.costoUsd)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.vacio}>
                    Sin consumo en el período.
                  </td>
                </tr>
              )}
            </tbody>
            {t && reporte?.porUsuario && reporte.porUsuario.length > 1 ? (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className={styles.num}>{t.pedidos}</td>
                  <td className={styles.num}>{miles(t.tokens.total)}</td>
                  <td className={styles.num}>{usd(t.promedioUsd)}</td>
                  <td className={styles.num}>{usd(t.costoUsd)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </section>

        <section className={styles.panel}>
          <h2>Dónde se va el costo</h2>
          {reporte?.composicionEntrada
            ? Object.entries(reporte.composicionEntrada)
                .filter(([, v]) => v.tokens > 0)
                .sort((a, b) => b[1].tokens - a[1].tokens)
                .map(([k, v]) => (
                  <div key={k} className={styles.barra}>
                    <div className={styles.barraTexto}>
                      <span>{ROTULO_PARTE[k] || k}</span>
                      <span>
                        {v.pct}% · {usd(v.costoUsd)}
                      </span>
                    </div>
                    <div className={styles.barraFondo}>
                      <div
                        className={styles.barraValor}
                        style={{ width: `${Math.min(100, v.pct)}%` }}
                      />
                    </div>
                  </div>
                ))
            : null}
          {reporte?.porHerramienta?.length ? (
            <>
              <h3>Herramientas más costosas</h3>
              <table className={styles.tabla}>
                <tbody>
                  {reporte.porHerramienta.slice(0, 8).map((h) => (
                    <tr key={h.nombre}>
                      <td>{h.nombre}</td>
                      <td className={styles.num}>{h.veces} usos</td>
                      <td className={styles.num}>{usd(h.costoUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </section>
      </div>

      <section className={styles.panel}>
        <h2>
          Consumo por mensaje
          {mensajes ? (
            <span className={styles.muted}>
              {" "}
              · {mensajes.total.toLocaleString("es-AR")} registros
            </span>
          ) : null}
        </h2>
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Mensaje</th>
                <th>Herramientas</th>
                <th className={styles.num}>Llamadas</th>
                <th className={styles.num}>Tokens</th>
                <th className={styles.num}>Costo</th>
              </tr>
            </thead>
            <tbody>
              {mensajes?.filas.length ? (
                mensajes.filas.map((m) => (
                  <tr key={m.id} className={m.error ? styles.filaError : ""}>
                    <td className={styles.nowrap}>{fechaCorta(m.fecha)}</td>
                    <td>{m.nombre || (m.actor == null ? "—" : `Personal ${m.actor}`)}</td>
                    <td className={styles.pregunta} title={m.pregunta || ""}>
                      {m.tipo !== "CHAT" ? (
                        <span className={styles.badge}>
                          {TIPOS_IA[m.tipo] || m.tipo}
                        </span>
                      ) : null}
                      {m.error ? (
                        <span
                          className={`${styles.badge} ${styles.badgeError}`}
                        >
                          Error
                        </span>
                      ) : null}
                      {m.pregunta ||
                        (m.tipo === "CHAT" ? (
                          <span className={styles.muted}>—</span>
                        ) : null)}
                      {m.incluidoEnChat ? (
                        <span className={styles.muted}>
                          {" "}
                          (ya sumado en el chat)
                        </span>
                      ) : null}
                    </td>
                    <td className={styles.herramientas}>
                      {m.herramientas.join(", ") || "—"}
                    </td>
                    <td className={styles.num}>{m.llamadas || "—"}</td>
                    <td
                      className={styles.num}
                      title={
                        m.tokens
                          ? `entrada ${m.tokens.entrada} (caché ${m.tokens.cacheadas}) · salida ${m.tokens.salida}`
                          : ""
                      }
                    >
                      {miles(m.tokens?.total)}
                    </td>
                    <td className={`${styles.num} ${styles.fuerte}`}>
                      {usd(m.costoUsd)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.vacio}>
                    Sin mensajes en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {mensajes && totalPaginas > 1 ? (
          <div className={styles.paginado}>
            <button
              type="button"
              disabled={pagina <= 1 || cargando}
              onClick={() => setPagina((p) => p - 1)}
            >
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
          <p className={styles.muted}>
            {reporte.notas.pedidosSinMedir} mensajes anteriores a la medición no
            tienen consumo registrado.
          </p>
        ) : null}
      </section>
    </div>
  );
}
