/**
 * Lee lo que el usuario tiene a la vista (formularios, pestañas, selección)
 * para darle contexto al asistente y poder escribir en los campos.
 */
import { erroresRecientes, type ErrorApiReciente } from "./erroresRecientes";

export type CampoPantalla = {
  id: string;
  etiqueta: string;
  /** Sección del formulario donde está («Datos del paciente», «Acompañantes › #2»). */
  grupo: string | null;
  tipo: string;
  multilinea: boolean;
  valor: string;
  foco: boolean;
};

export type InternadoPantalla = {
  numeroVisita: number;
  paciente: string | null;
  documento: string | null;
  sector: string | null;
  cama: string | null;
};

export type PantallaSnapshot = {
  url: string;
  titulo: string;
  seccion: string | null;
  encabezados: string[];
  pestanas: string[];
  pestanaActiva: string | null;
  seleccion: string | null;
  resumenVisible: string | null;
  campos: CampoPantalla[];
  internado: InternadoPantalla | null;
  internadosVisibles: InternadoPantalla[];
  errores: ErrorApiReciente[];
  alertas: string[];
  deshabilitados: string[];
};

const ATTR = "data-asistente-campo";
const ROOT_SEL = "[data-asistente-root]";
const TIPOS_INPUT = new Set([
  "",
  "text",
  "search",
  "email",
  "number",
  "tel",
  "url",
  "date",
  "time",
  "datetime-local",
]);

let contador = 0;
let ultimoFoco: HTMLElement | null = null;
let ultimaSeleccion: { texto: string; t: number } | null = null;
let escuchando = false;

function fueraDelAsistente(el: Element | null) {
  return !!el && !el.closest(ROOT_SEL);
}

export function iniciarSeguimiento() {
  if (escuchando || typeof document === "undefined") return;
  escuchando = true;
  document.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && fueraDelAsistente(t) && esEditable(t)) ultimoFoco = t;
  });
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    const texto = sel?.toString().trim() || "";
    if (!texto) return;
    const nodo = sel?.anchorNode;
    const el = nodo instanceof Element ? nodo : nodo?.parentElement || null;
    if (fueraDelAsistente(el)) ultimaSeleccion = { texto, t: Date.now() };
  });
}

function esEditable(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (el instanceof HTMLTextAreaElement) return !el.disabled && !el.readOnly;
  if (el instanceof HTMLInputElement) {
    return (
      TIPOS_INPUT.has((el.getAttribute("type") || "").toLowerCase()) &&
      !el.disabled &&
      !el.readOnly
    );
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

function visible(el: Element) {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r || r.width === 0 || r.height === 0) return false;
  const st = window.getComputedStyle(el);
  return st.visibility !== "hidden" && st.display !== "none";
}

function limpio(s: string | null | undefined, max = 80) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\*\s*$/, "")
    .trim()
    .slice(0, max);
}

function etiquetaDe(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return limpio(aria);
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const t = by
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || "")
      .join(" ");
    if (t.trim()) return limpio(t);
  }
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l?.textContent?.trim()) return limpio(l.textContent);
  }
  const envolvente = el.closest("label");
  if (envolvente?.textContent?.trim()) return limpio(envolvente.textContent);
  let p: HTMLElement | null = el.parentElement;
  for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
    const campos = p.querySelectorAll(
      'input, textarea, select, [contenteditable="true"]',
    );
    const label = p.querySelector("label, legend, h4, h5");
    if (label?.textContent?.trim() && campos.length <= 2)
      return limpio(label.textContent);
  }
  const ph = el.getAttribute("placeholder");
  if (ph) return limpio(ph);
  return limpio(el.getAttribute("name")) || "Campo";
}

const TITULOS =
  'legend, h1, h2, h3, h4, h5, h6, [role="heading"], [data-asistente-titulo]';
const GRUPO_ATTR = "data-asistente-grupo";
const FILA_ATTR = "data-asistente-fila";

function precede(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Último título dentro de `anc` que está antes de `el` (el más cercano por arriba). */
function tituloPrevio(anc: Element, el: Element): string | null {
  let ultimo: Element | null = null;
  for (const t of Array.from(anc.querySelectorAll(TITULOS))) {
    if (t.contains(el) || !precede(t, el) || !visible(t)) continue;
    ultimo = t;
  }
  return ultimo ? limpio(ultimo.getAttribute("data-asistente-titulo") || ultimo.textContent, 50) || null : null;
}

/**
 * Sección del campo: `data-asistente-grupo` explícito o los títulos de las cajas que lo
 * contienen (de afuera hacia adentro, hasta 2), más el número de fila si es una lista repetida.
 */
function grupoDe(el: HTMLElement, root: Element): string | null {
  const explicito = el.closest(`[${GRUPO_ATTR}]`);
  const partes: string[] = [];
  if (explicito) partes.push(limpio(explicito.getAttribute(GRUPO_ATTR), 50));
  else {
    let p: Element | null = el.parentElement;
    const vistos = new Set<string>();
    while (p && p !== document.body && partes.length < 2) {
      const t = tituloPrevio(p, el);
      if (t && !vistos.has(t) && t !== etiquetaDe(el)) {
        vistos.add(t);
        partes.unshift(t);
      }
      if (p === root) break;
      p = p.parentElement;
    }
  }
  const fila = el.closest(`[${FILA_ATTR}]`)?.getAttribute(FILA_ATTR);
  if (fila) partes.push(`#${fila}`);
  const out = partes.filter(Boolean).join(" › ");
  return out || null;
}

function raizActiva(): Element {
  const dialogos = Array.from(
    document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], [class*="modalOverlay"], [class*="overlay"]',
    ),
  ).filter(
    (d) =>
      fueraDelAsistente(d) && visible(d) && d.querySelector("input, textarea"),
  );
  return (
    dialogos[dialogos.length - 1] ||
    document.querySelector("main") ||
    document.body
  );
}

function textos(root: ParentNode, sel: string, max: number, largo = 80) {
  const out: string[] = [];
  for (const el of Array.from(root.querySelectorAll(sel))) {
    if (out.length >= max) break;
    if (!fueraDelAsistente(el) || !visible(el)) continue;
    const t = limpio(el.textContent, largo);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function leerPantalla(): PantallaSnapshot {
  const root = raizActiva();
  const campos: CampoPantalla[] = [];
  const nodos = Array.from(
    root.querySelectorAll('textarea, input, [contenteditable="true"]'),
  );
  for (const el of nodos) {
    if (campos.length >= 40) break;
    if (!fueraDelAsistente(el) || !esEditable(el) || !visible(el)) continue;
    const h = el as HTMLElement;
    let id = h.getAttribute(ATTR);
    if (!id) {
      contador += 1;
      id = `c${contador}`;
      h.setAttribute(ATTR, id);
    }
    const multilinea =
      h instanceof HTMLTextAreaElement ||
      (!(h instanceof HTMLInputElement) && h.isContentEditable);
    const valor =
      h instanceof HTMLInputElement || h instanceof HTMLTextAreaElement
        ? h.value
        : h.innerText;
    campos.push({
      id,
      etiqueta: etiquetaDe(h),
      grupo: grupoDe(h, root),
      tipo:
        h instanceof HTMLInputElement
          ? h.type || "text"
          : multilinea
            ? "textarea"
            : "text",
      multilinea,
      valor: String(valor || "").slice(0, 400),
      foco: h === ultimoFoco,
    });
  }

  const tabs = textos(document, '[role="tab"]', 12, 40);
  const activa = document.querySelector('[role="tab"][aria-selected="true"]');
  const seleccion =
    ultimaSeleccion && Date.now() - ultimaSeleccion.t < 3 * 60 * 1000
      ? ultimaSeleccion.texto
      : null;
  const main = document.querySelector("main");
  const resumen =
    (root !== document.body ? (root as HTMLElement) : main)?.innerText || "";
  const internadosVisibles = internadosDom();

  return {
    url: `${window.location.pathname}${window.location.search}`,
    titulo: limpio(document.title, 120),
    seccion: new URLSearchParams(window.location.search).get("seccion"),
    encabezados: textos(
      root === document.body ? main || root : root,
      "h1, h2, h3",
      8,
    ),
    pestanas: tabs,
    pestanaActiva: activa ? limpio(activa.textContent, 60) : null,
    seleccion: seleccion ? seleccion.slice(0, 1500) : null,
    resumenVisible: resumen.replace(/\s+/g, " ").trim().slice(0, 1500) || null,
    campos,
    internado: internadosVisibles[0] || null,
    internadosVisibles,
    errores: erroresRecientes(),
    alertas: textos(document, '[role="alert"], [role="alertdialog"], [aria-live="assertive"]', 5, 200),
    deshabilitados: botonesDeshabilitados(root === document.body ? main || root : root),
  };
}

/** «No me deja» suele ser un botón en gris: va el texto y, si lo tiene, el motivo del title. */
function botonesDeshabilitados(root: ParentNode): string[] {
  const out: string[] = [];
  for (const el of Array.from(
    root.querySelectorAll('button[disabled], button[aria-disabled="true"], [role="button"][aria-disabled="true"]'),
  )) {
    if (out.length >= 10) break;
    if (!fueraDelAsistente(el) || !visible(el)) continue;
    const texto = limpio(el.textContent || el.getAttribute("aria-label"), 50);
    if (!texto) continue;
    const motivo = limpio(el.getAttribute("title"), 80);
    const linea = motivo ? `${texto} (${motivo})` : texto;
    if (!out.includes(linea)) out.push(linea);
  }
  return out;
}

function internadosDom(): InternadoPantalla[] {
  const out: InternadoPantalla[] = [];
  const seen = new Set<number>();
  for (const el of Array.from(
    document.querySelectorAll("[data-asistente-visita]"),
  )) {
    if (out.length >= 40) break;
    if (!fueraDelAsistente(el) || !visible(el)) continue;
    const numeroVisita = Number(el.getAttribute("data-asistente-visita"));
    if (!Number.isFinite(numeroVisita) || numeroVisita <= 0 || seen.has(numeroVisita))
      continue;
    seen.add(numeroVisita);
    out.push({
      numeroVisita,
      paciente: limpio(el.getAttribute("data-asistente-paciente"), 80) || null,
      documento: limpio(el.getAttribute("data-asistente-documento"), 20) || null,
      sector: limpio(el.getAttribute("data-asistente-sector"), 12) || null,
      cama: limpio(el.getAttribute("data-asistente-cama"), 12) || null,
    });
  }
  return out;
}

function setNativo(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, valor);
  else el.value = valor;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Escribe en el campo como si lo tipeara el usuario (dispara onChange de React). */
export function escribirEnCampo(
  campoId: string,
  texto: string,
  opciones: {
    modo: "reemplazar" | "agregar";
    marca: string;
    marcaEnTexto: boolean;
  },
): { ok: boolean; error?: string } {
  const el = document.querySelector<HTMLElement>(
    `[${ATTR}="${CSS.escape(campoId)}"]`,
  );
  if (!el)
    return {
      ok: false,
      error:
        "El campo ya no está en pantalla. Abrí el formulario y pedímelo de nuevo.",
    };

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const sep = el instanceof HTMLTextAreaElement ? "\n\n" : " ";
    const actual = el.value.trim();
    setNativo(
      el,
      opciones.modo === "agregar" && actual ? `${actual}${sep}${texto}` : texto,
    );
  } else {
    el.focus();
    if (opciones.modo !== "agregar") el.innerText = "";
    document.execCommand(
      "insertText",
      false,
      opciones.modo === "agregar" && el.innerText.trim()
        ? `\n\n${texto}`
        : texto,
    );
  }

  el.setAttribute("data-ia-validada", "1");
  el.title = opciones.marca;
  if (!opciones.marcaEnTexto) {
    el.style.outline = "2px solid #8b5cf6";
    el.style.outlineOffset = "1px";
  }
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus();
  return { ok: true };
}

const CLICKEABLES =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="option"], summary, label, li, [title], [aria-label]';

function normal(s: string) {
  return limpio(s, 120)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buscarOpcion(texto: string): HTMLElement | null {
  const q = normal(texto);
  if (!q) return null;
  let parcial: HTMLElement | null = null;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(CLICKEABLES))) {
    if (!fueraDelAsistente(el) || !visible(el)) continue;
    const nombres = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.textContent,
    ].map((s) => normal(s || ""));
    if (nombres.some((n) => n === q)) return el;
    if (!parcial && nombres.some((n) => n.includes(q) && n.length <= q.length + 30))
      parcial = el;
  }
  return parcial;
}

/**
 * Señala una opción de la pantalla por su texto («Cambiar Cama», «Nuevo turno»).
 * Reintenta mientras la página termina de cargar; devuelve false si no apareció.
 */
export async function resaltarOpcion(
  texto: string,
  { esperaMs = 6000, enRuta }: { esperaMs?: number; enRuta?: string } = {},
): Promise<boolean> {
  const hasta = Date.now() + esperaMs;
  const buscar = () =>
    !enRuta || window.location.pathname === enRuta ? buscarOpcion(texto) : null;
  let el = buscar();
  while (!el && Date.now() < hasta) {
    await new Promise((r) => setTimeout(r, 300));
    el = buscar();
  }
  if (!el) return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.animate(
    [
      { boxShadow: "0 0 0 0 rgba(139, 92, 246, 0.9)" },
      { boxShadow: "0 0 0 8px rgba(139, 92, 246, 0)" },
    ],
    { duration: 900, iterations: 4 },
  );
  const previo = el.style.outline;
  el.style.outline = "2px solid #8b5cf6";
  setTimeout(() => {
    el.style.outline = previo;
  }, 4000);
  return true;
}
