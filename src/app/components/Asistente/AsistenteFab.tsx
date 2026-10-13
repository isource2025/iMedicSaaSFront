"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Asistente.module.css";
import MarkdownLite from "./MarkdownLite";
import LoaderIa, { type ProgresoIa } from "./LoaderIa";
import ResultadoAccion from "./ResultadoAccion";
import { escribirEnCampo, iniciarSeguimiento, leerPantalla } from "./pantalla";
import {
  aplicarInsercion,
  cancelarPendiente,
  confirmarPendiente,
  enviarMensaje,
  enviarMensajeStream,
  type AsistenteInsercion,
  type AsistenteMensajeUi,
  type EventoEstado,
  type AsistentePendiente,
} from "./asistenteService";

const STORAGE_KEY = "imedic:asistente";
const MAX_TABS = 8;
const TITULO_NUEVO = "Nuevo chat";

type Tab = {
  id: string;
  titulo: string;
  idConversacion: string | null;
  mensajes: AsistenteMensajeUi[];
  borrador: string;
};

type Persistido = {
  tabs: Tab[];
  activa: string;
  open: boolean;
  amplio: boolean;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tabNueva(): Tab {
  return {
    id: uid(),
    titulo: TITULO_NUEVO,
    idConversacion: null,
    mensajes: [],
    borrador: "",
  };
}

function leerPersistido(): Persistido {
  const vacio = () => {
    const t = tabNueva();
    return { tabs: [t], activa: t.id, open: false, amplio: false };
  };
  if (typeof window === "undefined") return vacio();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return vacio();
    const p = JSON.parse(raw) as Partial<Persistido> & {
      mensajes?: AsistenteMensajeUi[];
      idConversacion?: string;
    };
    let tabs: Tab[] = Array.isArray(p.tabs)
      ? p.tabs.filter((t) => t && t.id)
      : [];
    if (!tabs.length && Array.isArray(p.mensajes) && p.mensajes.length) {
      const primero = p.mensajes.find((m) => m.role === "user");
      tabs = [
        {
          ...tabNueva(),
          titulo: primero ? primero.content.slice(0, 24) : TITULO_NUEVO,
          idConversacion: p.idConversacion ?? null,
          mensajes: p.mensajes,
        },
      ];
    }
    if (!tabs.length) return vacio();
    const activa = tabs.some((t) => t.id === p.activa)
      ? (p.activa as string)
      : tabs[0].id;
    return { tabs, activa, open: Boolean(p.open), amplio: Boolean(p.amplio) };
  } catch {
    return vacio();
  }
}

const NOMBRES_HERRAMIENTA: Record<string, string> = {
  resolver_contexto: "Ubicando el registro",
  buscar_codigo: "Buscando el proceso en el código",
  leer_codigo: "Leyendo el handler",
  consulta_sql: "Consultando la base",
  describir_tabla: "Revisando la estructura de datos",
  listar_tablas: "Revisando tablas",
  buscar_endpoints: "Buscando en la API",
  describir_endpoint: "Revisando el endpoint",
  llamar_api: "Llamando a la API",
  escribir_en_campo: "Redactando para el campo",
  navegar: "Abriendo la pantalla",
  buscar_en_manual: "Buscando en el manual",
  diagnosticar: "Revisando por qué no anda",
  buscar_internado: "Buscando al internado",
  ver_estudios: "Revisando los estudios",
  ver_evoluciones: "Leyendo las evoluciones",
  ver_indicaciones: "Leyendo las indicaciones",
  preparar_egreso: "Preparando el egreso",
  preparar_evolucion: "Redactando la evolución",
  preparar_hc_ingreso: "Armando la HC de ingreso",
  preparar_indicacion: "Armando la indicación",
  solicitar_estudios: "Armando el pedido de estudios",
  solicitar_interconsulta: "Armando la interconsulta",
  preparar_protocolo: "Armando el protocolo",
  preparar_epicrisis: "Redactando la epicrisis",
  editar_evolucion: "Preparando el cambio de la evolución",
  eliminar_evolucion: "Preparando el borrado de la evolución",
  listar_camas_libres: "Buscando camas libres",
  ver_movimientos: "Leyendo los movimientos",
  ver_historia_clinica: "Leyendo la historia clínica",
  trasladar_cama: "Preparando el traslado",
  asignar_cama: "Preparando la asignación de cama",
  revertir_egreso: "Revisando el egreso",
};

function etiquetaHerramienta(nombre: string) {
  return (
    NOMBRES_HERRAMIENTA[nombre] || `Consultando ${nombre.replace(/_/g, " ")}`
  );
}

function etiquetaAccion(p: AsistentePendiente) {
  if (p.metodo === "DELETE") return "Confirmar y eliminar";
  if (p.metodo === "PUT" || p.metodo === "PATCH") return "Confirmar cambios";
  return "Confirmar y guardar";
}

function pantallaSegura() {
  try {
    return leerPantalla();
  } catch {
    return null;
  }
}

function ejemplosPara(pathname: string | null): string[] {
  const p = pathname || "";
  if (p.startsWith("/dashboard/beds") || p.startsWith("/dashboard/visita")) {
    return [
      "Redactá la evolución en el campo abierto con los controles de hoy",
      "Resumime las últimas evoluciones de este paciente",
      "Abrí los controles de este paciente",
      "¿Qué puedo hacer en esta pantalla?",
    ];
  }
  if (p.startsWith("/dashboard/turnos")) {
    return [
      "¿Cuántos turnos hay hoy por profesional?",
      `¿Hay disponibilidad el ${new Date().toISOString().slice(0, 10)}?`,
      "¿Cómo reservo un turno en la agenda?",
    ];
  }
  return [
    "¿Cuántos pacientes internados hay por sector?",
    "Abrí los controles de Pérez",
    "Cargá una evolución a Pérez: paciente estable, afebril, buena tolerancia oral",
    "¿Qué pacientes llevan más de 10 días internados?",
  ];
}

function IconoIa({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10 2.5l1.9 5.2a2 2 0 0 0 1.2 1.2l5.2 1.9-5.2 1.9a2 2 0 0 0-1.2 1.2L10 19.1l-1.9-5.2a2 2 0 0 0-1.2-1.2L1.7 10.8l5.2-1.9a2 2 0 0 0 1.2-1.2z" />
      <path d="M18.5 13.5l.8 2.2a1 1 0 0 0 .6.6l2.2.8-2.2.8a1 1 0 0 0-.6.6l-.8 2.2-.8-2.2a1 1 0 0 0-.6-.6l-2.2-.8 2.2-.8a1 1 0 0 0 .6-.6z" />
    </svg>
  );
}

export default function AsistenteFab({ stack = false }: { stack?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [amplio, setAmplio] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>(() => [tabNueva()]);
  const [activa, setActiva] = useState<string>("");
  const [ocupadas, setOcupadas] = useState<Record<string, string>>({});
  const [progresos, setProgresos] = useState<Record<string, ProgresoIa>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [verSql, setVerSql] = useState<Record<string, boolean>>({});
  const tabsRef = useRef(tabs);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabsBarRef = useRef<HTMLDivElement>(null);

  tabsRef.current = tabs;
  const tab = tabs.find((t) => t.id === activa) || tabs[0];
  const status = tab ? ocupadas[tab.id] || "" : "";
  const busy = Boolean(status);
  const error = tab ? errores[tab.id] || "" : "";

  useEffect(() => {
    const p = leerPersistido();
    setTabs(p.tabs);
    setActiva(p.activa);
    setOpen(p.open);
    setAmplio(p.amplio);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const recortadas = tabs.map((t) => ({
        ...t,
        mensajes: t.mensajes.slice(-60),
      }));
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: recortadas, activa, open, amplio }),
      );
    } catch {
      /* sin storage */
    }
  }, [hydrated, tabs, activa, open, amplio]);

  useEffect(() => {
    iniciarSeguimiento();
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, activa]);

  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [tab?.mensajes, status, progresos, open, activa]);

  useEffect(() => {
    const bar = tabsBarRef.current;
    const el = bar?.querySelector<HTMLElement>(`[data-tab="${activa}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activa, tabs.length]);

  const actualizarTab = useCallback((id: string, fn: (t: Tab) => Tab) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const agregarMensaje = useCallback(
    (id: string, m: AsistenteMensajeUi) =>
      actualizarTab(id, (t) => ({ ...t, mensajes: [...t.mensajes, m] })),
    [actualizarTab],
  );

  const setOcupada = (id: string, valor: string) =>
    setOcupadas((prev) => {
      const n = { ...prev };
      if (valor) n[id] = valor;
      else delete n[id];
      return n;
    });

  const setError = (id: string, valor: string) =>
    setErrores((prev) => ({ ...prev, [id]: valor }));

  const setProgreso = useCallback(
    (id: string, fn: ((p: ProgresoIa) => ProgresoIa) | null) =>
      setProgresos((prev) => {
        const n = { ...prev };
        if (!fn) delete n[id];
        else
          n[id] = fn(
            prev[id] || {
              fase: "pensando",
              iter: 1,
              hechos: [],
              inicio: Date.now(),
            },
          );
        return n;
      }),
    [],
  );

  const avanzarProgreso = useCallback(
    (id: string, evt: EventoEstado) =>
      setProgreso(id, (p) => {
        if (evt.tipo === "iteracion") {
          return {
            ...p,
            iter: evt.n || p.iter,
            fase: p.hechos.length ? "analizando" : "pensando",
            herramienta: undefined,
          };
        }
        if (evt.nombre && evt.estado === "ejecutando")
          return { ...p, fase: "herramienta", herramienta: evt.nombre };
        if (evt.nombre && (evt.estado === "ok" || evt.estado === "error")) {
          return {
            ...p,
            fase: "analizando",
            herramienta: undefined,
            hechos: [
              ...p.hechos,
              { nombre: evt.nombre, ok: evt.estado === "ok" },
            ],
          };
        }
        if (evt.tipo === "cierre_forzado")
          return { ...p, fase: "cerrando", herramienta: undefined };
        return p;
      }),
    [setProgreso],
  );

  const irA = useCallback(
    (href: string) => {
      const destino = href.split("?")[0];
      if (destino === pathname) {
        window.location.assign(href);
        return;
      }
      router.push(href);
    },
    [router, pathname],
  );

  const nuevaPestana = () => {
    if (tabs.length >= MAX_TABS) return;
    const t = tabNueva();
    setTabs((prev) => [...prev, t]);
    setActiva(t.id);
  };

  const cerrarPestana = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    const resto = tabs.filter((t) => t.id !== id);
    if (!resto.length) {
      const t = tabNueva();
      setTabs([t]);
      setActiva(t.id);
      return;
    }
    setTabs(resto);
    if (id === activa) setActiva(resto[Math.min(idx, resto.length - 1)].id);
  };

  const sendTexto = useCallback(
    async (mensajeRaw: string) => {
      const tabId = tab?.id;
      const mensaje = mensajeRaw.trim();
      if (!tabId || !mensaje || ocupadas[tabId]) return;
      setError(tabId, "");
      setOcupada(tabId, "Pensando…");
      setProgreso(tabId, () => ({
        fase: "pensando",
        iter: 1,
        hechos: [],
        inicio: Date.now(),
      }));
      actualizarTab(tabId, (t) => ({
        ...t,
        borrador: "",
        titulo: t.titulo === TITULO_NUEVO ? mensaje.slice(0, 24) : t.titulo,
        mensajes: [
          ...t.mensajes,
          { id: uid(), role: "user", content: mensaje },
        ],
      }));
      try {
        const actual = tabsRef.current.find((t) => t.id === tabId);
        const payload = {
          mensaje,
          rutaActual: pathname || "/dashboard",
          idConversacion: actual?.idConversacion ?? null,
          pantalla: pantallaSegura(),
        };
        let data: Awaited<ReturnType<typeof enviarMensaje>> | null = null;
        try {
          data = await enviarMensajeStream(payload, {
            onEstado: (evt) => avanzarProgreso(tabId, evt),
          });
        } catch {
          data = null;
        }
        if (!data) data = await enviarMensaje(payload);
        const r = data;
        actualizarTab(tabId, (t) => ({
          ...t,
          idConversacion: r.idConversacion || t.idConversacion,
          mensajes: [
            ...t.mensajes,
            {
              id: uid(),
              role: "assistant",
              content: r.texto || r.mensaje || "Sin respuesta",
              disclaimer: r.disclaimer,
              navegaciones: r.navegaciones,
              pendientes: r.pendientes,
              consultas: r.consultas,
              inserciones: r.inserciones,
              herramientas: r.herramientas,
              modo: r.modo,
            },
          ],
        }));
      } catch (e) {
        setError(
          tabId,
          e instanceof Error ? e.message : "Error al consultar el asistente",
        );
      } finally {
        setOcupada(tabId, "");
        setProgreso(tabId, null);
      }
    },
    [tab?.id, ocupadas, pathname, actualizarTab, setProgreso, avanzarProgreso],
  );

  const quitarDeMensajes = (
    tabId: string,
    campo: "pendientes" | "inserciones",
    id: string,
  ) =>
    actualizarTab(tabId, (t) => ({
      ...t,
      mensajes: t.mensajes.map((m) => {
        const lista = m[campo] as { id: string }[] | undefined;
        return lista?.some((x) => x.id === id)
          ? { ...m, [campo]: lista.filter((x) => x.id !== id) }
          : m;
      }),
    }));

  const onConfirm = async (p: AsistentePendiente) => {
    if (!tab) return;
    const tabId = tab.id;
    setOcupada(tabId, "Ejecutando…");
    setError(tabId, "");
    try {
      const r = await confirmarPendiente(p.id, tab.idConversacion);
      const link = r.link || p.link;
      quitarDeMensajes(tabId, "pendientes", p.id);
      agregarMensaje(tabId, {
        id: uid(),
        role: "assistant",
        content: r.mensaje || "",
        resultado: {
          ok: r.success,
          metodo: p.metodo,
          titulo: r.titulo || (r.success ? "Listo" : "No se guardó"),
          resumen: r.resumen || p.resumen,
          motivo: r.motivo ?? (r.success ? null : r.mensaje),
          detalleTecnico: r.detalleTecnico ?? null,
          link: r.success ? link || null : null,
        },
      });
    } catch (e) {
      setError(tabId, e instanceof Error ? e.message : "No se pudo confirmar");
    } finally {
      setOcupada(tabId, "");
    }
  };

  const onCancelPend = async (p: AsistentePendiente) => {
    if (!tab) return;
    await cancelarPendiente(p.id, tab.idConversacion);
    quitarDeMensajes(tab.id, "pendientes", p.id);
    agregarMensaje(tab.id, {
      id: uid(),
      role: "assistant",
      content: "Cancelado. No se guardó nada.",
    });
  };

  const onAplicar = async (ins: AsistenteInsercion) => {
    if (!tab) return;
    const tabId = tab.id;
    setOcupada(tabId, "Aplicando…");
    setError(tabId, "");
    try {
      const r = await aplicarInsercion(ins.id, tab.idConversacion);
      const out = escribirEnCampo(r.campoId, r.texto, {
        modo: r.modo,
        marca: r.marca,
        marcaEnTexto: r.marcaEnTexto,
      });
      quitarDeMensajes(tabId, "inserciones", ins.id);
      agregarMensaje(tabId, {
        id: uid(),
        role: "assistant",
        content: "",
        resultado: out.ok
          ? {
              ok: true,
              titulo: `Texto escrito en «${ins.etiqueta}»`,
              resumen:
                "Todavía no está guardado: revisalo y guardá el formulario como siempre.",
              nota: r.marcaEnTexto
                ? r.marca
                : `${r.marca} · queda en la auditoría y resaltado en violeta`,
            }
          : {
              ok: false,
              titulo: "No pude escribir en el campo",
              resumen: ins.etiqueta,
              motivo:
                out.error ||
                "El campo ya no está en pantalla. Abrí el formulario y probá de nuevo.",
            },
      });
    } catch (e) {
      setError(tabId, e instanceof Error ? e.message : "No se pudo aplicar");
    } finally {
      setOcupada(tabId, "");
    }
  };

  const onDescartar = async (ins: AsistenteInsercion) => {
    if (!tab) return;
    await cancelarPendiente(ins.id, tab.idConversacion);
    quitarDeMensajes(tab.id, "inserciones", ins.id);
  };

  const mensajes = tab?.mensajes || [];

  return (
    <div
      className={`${styles.wrap} ${stack ? styles.wrapInStack : ""}`}
      data-asistente-root
    >
      <button
        type="button"
        className={`${styles.fabIa} ${open ? styles.fabIaActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Abrir asistente IA"
        title="Asistente IA (Ctrl+Shift+K)"
      >
        <IconoIa size={20} />
        <span className={styles.fabIaLabel}>IA</span>
      </button>

      {open && hydrated && tab
        ? createPortal(
            <div
              className={`${styles.panel} ${amplio ? styles.panelAmplio : ""}`}
              role="dialog"
              aria-label="Asistente IA de iMedic"
              data-asistente-root
            >
              <div className={styles.header}>
                <span className={styles.brand} aria-hidden>
                  <IconoIa size={16} />
                </span>
                <div className={styles.tabsBar} role="tablist" ref={tabsBarRef}>
                  {tabs.map((t) => (
                    <div
                      key={t.id}
                      data-tab={t.id}
                      className={`${styles.tab} ${t.id === tab.id ? styles.tabActiva : ""}`}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={t.id === tab.id}
                        className={styles.tabBtn}
                        onClick={() => setActiva(t.id)}
                        title={t.titulo}
                      >
                        {ocupadas[t.id] ? (
                          <span
                            className={styles.tabDot}
                            aria-label="trabajando"
                          />
                        ) : null}
                        <span className={styles.tabTitulo}>{t.titulo}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.tabClose}
                        onClick={() => cerrarPestana(t.id)}
                        aria-label={`Cerrar ${t.titulo}`}
                        title="Cerrar pestaña"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.tabAdd}
                    onClick={nuevaPestana}
                    disabled={tabs.length >= MAX_TABS}
                    aria-label="Nueva pestaña"
                    title={
                      tabs.length >= MAX_TABS
                        ? `Máximo ${MAX_TABS} pestañas`
                        : "Nueva pestaña"
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setAmplio((v) => !v)}
                    title={amplio ? "Achicar" : "Agrandar"}
                    aria-label={amplio ? "Achicar" : "Agrandar"}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      {amplio ? (
                        <path d="M4 14h6v6M20 10h-6V4" />
                      ) : (
                        <path d="M15 3h6v6M9 21H3v-6" />
                      )}
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setOpen(false)}
                    title="Cerrar"
                    aria-label="Cerrar asistente"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.messages} ref={listRef}>
                {mensajes.length === 0 ? (
                  <div className={styles.empty}>
                    <strong>¿En qué te ayudo?</strong>
                    Consulto datos, cargo evoluciones, armo epicrisis, completo
                    campos de la pantalla y te abro la ficha donde haga falta.
                    Todo lo que guarda te lo muestro antes para confirmar.
                    <div className={styles.chips}>
                      {ejemplosPara(pathname).map((ej) => (
                        <button
                          key={ej}
                          type="button"
                          className={styles.chip}
                          disabled={busy}
                          onClick={() => void sendTexto(ej)}
                        >
                          {ej}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  mensajes.map((m) =>
                    m.resultado ? (
                      <ResultadoAccion
                        key={m.id}
                        r={m.resultado}
                        onLink={irA}
                      />
                    ) : (
                      <div
                        key={m.id}
                        className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant} ${
                          m.tono === "ok"
                            ? styles.bubbleOk
                            : m.tono === "error"
                              ? styles.bubbleError
                              : ""
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <MarkdownLite text={m.content} onLink={irA} />
                        ) : (
                          m.content
                        )}
                        {m.disclaimer ? (
                          <div className={styles.disclaimer}>{m.disclaimer}</div>
                        ) : null}
                        {m.modo === "local" ? (
                          <div className={styles.meta}>
                            Modo local (sin modelo de IA)
                          </div>
                        ) : null}
                        {m.navegaciones?.length ? (
                          <div className={styles.chips}>
                            {m.navegaciones.map((n) => (
                              <button
                                key={n.href}
                                type="button"
                                className={styles.chipLink}
                                onClick={() => irA(n.href)}
                              >
                                ↗ {n.motivo || n.path}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {m.inserciones?.map((ins) => (
                          <div key={ins.id} className={styles.cardInsercion}>
                            <p className={styles.cardTitle}>
                              <span className={styles.badgeIa}>IA</span> Texto
                              para «{ins.etiqueta}»
                              {ins.modo === "agregar"
                                ? " (se agrega al final)"
                                : ""}
                            </p>
                            <pre className={styles.cardDetalle}>
                              {ins.texto}
                            </pre>
                            <p className={styles.cardNota}>
                              Al aplicarlo se firma como validado por vos.
                            </p>
                            <div className={styles.cardActions}>
                              <button
                                type="button"
                                className={styles.btnOk}
                                disabled={busy}
                                onClick={() => void onAplicar(ins)}
                              >
                                Aplicar en el campo
                              </button>
                              <button
                                type="button"
                                className={styles.btnCancel}
                                disabled={busy}
                                onClick={() => void onDescartar(ins)}
                              >
                                Descartar
                              </button>
                            </div>
                          </div>
                        ))}

                        {m.pendientes?.map((p) => (
                          <div
                            key={p.id}
                            className={`${styles.cardPendiente} ${p.metodo === "DELETE" ? styles.cardPeligro : ""}`}
                          >
                            <p className={styles.cardTitle}>
                              {p.generativo ? (
                                <span className={styles.badgeIa}>IA</span>
                              ) : null}{" "}
                              Revisá antes de{" "}
                              {p.metodo === "DELETE" ? "eliminar" : "guardar"}
                            </p>
                            <p>{p.resumen}</p>
                            {p.generativo ? (
                              <p className={styles.cardNota}>
                                Se guarda con la marca «[IA iMedic] … validado
                                por» tu usuario.
                              </p>
                            ) : null}
                            <div className={styles.cardActions}>
                              <button
                                type="button"
                                className={
                                  p.metodo === "DELETE"
                                    ? styles.btnDanger
                                    : styles.btnOk
                                }
                                disabled={busy}
                                onClick={() => void onConfirm(p)}
                              >
                                {etiquetaAccion(p)}
                              </button>
                              <button
                                type="button"
                                className={styles.btnCancel}
                                disabled={busy}
                                onClick={() => void onCancelPend(p)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ))}

                        {m.consultas?.length ? (
                          <div className={styles.sqlBox}>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() =>
                                setVerSql((v) => ({ ...v, [m.id]: !v[m.id] }))
                              }
                            >
                              {verSql[m.id] ? "Ocultar" : "Ver"} SQL (
                              {m.consultas.length})
                            </button>
                            {verSql[m.id]
                              ? m.consultas.map((c, i) => (
                                  <pre key={i} className={styles.cardDetalle}>
                                    {c.sql}
                                  </pre>
                                ))
                              : null}
                          </div>
                        ) : null}
                      </div>
                    ),
                  )
                )}
                {status ? (
                  <LoaderIa
                    progreso={tab ? progresos[tab.id] : undefined}
                    texto={status}
                    etiqueta={etiquetaHerramienta}
                  />
                ) : null}
              </div>

              {error ? <div className={styles.err}>{error}</div> : null}

              <form
                className={styles.composer}
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendTexto(tab.borrador);
                }}
              >
                <textarea
                  ref={inputRef}
                  className={styles.input}
                  rows={1}
                  placeholder="Preguntá, pedí un dato o dictá una evolución…"
                  value={tab.borrador}
                  disabled={busy}
                  onChange={(e) => {
                    const v = e.target.value;
                    actualizarTab(tab.id, (t) => ({ ...t, borrador: v }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendTexto(tab.borrador);
                    }
                  }}
                />
                <button
                  type="submit"
                  className={styles.send}
                  disabled={busy || !tab.borrador.trim()}
                  aria-label="Enviar"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
