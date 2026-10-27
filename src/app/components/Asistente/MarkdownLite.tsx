"use client";

import { Fragment, type ReactNode } from "react";
import styles from "./Asistente.module.css";

/** Inline: **negrita**, `código`, [texto](/dashboard/...) */
function inline(
  text: string,
  onLink: (href: string) => void,
  keyBase: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={k} className={styles.code}>
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      const href = lm?.[2] || "";
      if (lm && href.startsWith("/dashboard")) {
        out.push(
          <button
            key={k}
            type="button"
            className={styles.inlineLink}
            onClick={() => onLink(href)}
          >
            {lm[1]}
          </button>,
        );
      } else {
        out.push(lm ? lm[1] : tok);
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function esFilaTabla(l: string) {
  return /^\s*\|.*\|\s*$/.test(l);
}

function esSeparador(l: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
}

function celdas(l: string) {
  return l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const RE_ITEM = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
const RE_TITULO = /^\s*(#{1,4})\s+(.*)$/;
/** Una línea que es solo negrita («**Resumen**:») hace de subtítulo. */
const RE_SUBTITULO = /^\s*\*\*([^*]+)\*\*\s*:?\s*$/;

type Item = { indent: number; ordered: boolean; num: number; text: string };

function itemDe(line: string): Item | null {
  const m = RE_ITEM.exec(line);
  if (!m) return null;
  const ordered = /\d/.test(m[2]);
  return {
    indent: m[1].replace(/\t/g, "  ").length,
    ordered,
    num: ordered ? parseInt(m[2], 10) : 1,
    text: m[3],
  };
}

function lista(
  items: Item[],
  k: string,
  onLink: (href: string) => void,
): ReactNode {
  const base = Math.min(...items.map((it) => it.indent));
  const grupos: { item: Item; hijos: Item[] }[] = [];
  for (const it of items) {
    if (it.indent > base && grupos.length) grupos[grupos.length - 1].hijos.push(it);
    else grupos.push({ item: it, hijos: [] });
  }
  const primero = grupos[0].item;
  const Tag = primero.ordered ? "ol" : "ul";
  return (
    <Tag
      key={k}
      className={styles.list}
      start={primero.ordered && primero.num !== 1 ? primero.num : undefined}
    >
      {grupos.map((g, j) => (
        <li key={j}>
          {inline(g.item.text, onLink, `${k}${j}`)}
          {g.hijos.length ? lista(g.hijos, `${k}-${j}`, onLink) : null}
        </li>
      ))}
    </Tag>
  );
}

type Bloque =
  | { tipo: "titulo"; nivel: number; texto: string }
  | { tipo: "nodo"; nodo: ReactNode }
  | { tipo: "espacio" };

function bloquesDe(text: string, onLink: (href: string) => void): Bloque[] {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const out: Bloque[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (esFilaTabla(line) && i + 1 < lines.length && esSeparador(lines[i + 1])) {
      const head = celdas(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && esFilaTabla(lines[i])) {
        rows.push(celdas(lines[i]));
        i++;
      }
      const k = `t${key++}`;
      out.push({
        tipo: "nodo",
        nodo: (
          <div key={k} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {head.map((h, j) => (
                    <th key={j}>{inline(h, onLink, `${k}h${j}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci}>{inline(c, onLink, `${k}r${ri}c${ci}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      });
      continue;
    }

    const primero = itemDe(line);
    if (primero) {
      const items: Item[] = [primero];
      i++;
      // Sigue la lista: ítems, líneas en blanco entre ítems y texto con sangría (continuación del anterior).
      while (i < lines.length) {
        const it = itemDe(lines[i]);
        if (it) {
          items.push(it);
          i++;
          continue;
        }
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && itemDe(lines[j])) {
            i = j;
            continue;
          }
          break;
        }
        if (/^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
          continue;
        }
        break;
      }
      out.push({ tipo: "nodo", nodo: lista(items, `l${key++}`, onLink) });
      continue;
    }

    const h = RE_TITULO.exec(line);
    if (h) {
      out.push({
        tipo: "titulo",
        nivel: h[1].length,
        texto: h[2].replace(/\*\*/g, "").replace(/\s*:\s*$/, ""),
      });
      i++;
      continue;
    }

    const sub = RE_SUBTITULO.exec(line);
    if (sub) {
      out.push({ tipo: "titulo", nivel: 9, texto: sub[1] });
      i++;
      continue;
    }

    if (!line.trim()) {
      out.push({ tipo: "espacio" });
      i++;
      continue;
    }

    const k = `p${key++}`;
    out.push({
      tipo: "nodo",
      nodo: (
        <Fragment key={k}>
          {inline(line, onLink, k)}
          <br />
        </Fragment>
      ),
    });
    i++;
  }
  return out;
}

/** Secciones de los análisis clínicos (ver analisisClinico.js en el back). */
function tonoDe(titulo: string) {
  if (/alerta|atenci[oó]n|riesgo/i.test(titulo)) return styles.tonoAlerta;
  if (/considerar|sugerenc|recomend|pr[oó]ximos pasos/i.test(titulo)) return styles.tonoSugerencia;
  if (/s[ií]ntesis|conclusi[oó]n|impresi[oó]n/i.test(titulo)) return styles.tonoSintesis;
  return "";
}

/** Quita espacios al principio y al final, y deja uno solo entre bloques. */
function cuerpo(bloques: Bloque[], k: string): ReactNode[] {
  const out: ReactNode[] = [];
  let espacio = false;
  bloques.forEach((b, j) => {
    if (b.tipo === "espacio") {
      espacio = out.length > 0;
      return;
    }
    if (espacio) out.push(<div key={`${k}s${j}`} className={styles.spacer} />);
    espacio = false;
    out.push(
      b.tipo === "titulo" ? (
        <p key={`${k}h${j}`} className={styles.subheading}>
          {b.texto}
        </p>
      ) : (
        b.nodo
      ),
    );
  });
  return out;
}

export default function MarkdownLite({
  text,
  onLink,
}: {
  text: string;
  onLink: (href: string) => void;
}) {
  const bloques = bloquesDe(text, onLink);
  const niveles = bloques.flatMap((b) => (b.tipo === "titulo" && b.nivel < 9 ? [b.nivel] : []));
  if (!niveles.length) return <div className={styles.md}>{cuerpo(bloques, "c")}</div>;

  // El nivel de título más alto arma las secciones; los demás quedan como subtítulos adentro.
  const nivelSeccion = Math.min(...niveles);
  const secciones: { titulo: string | null; bloques: Bloque[] }[] = [{ titulo: null, bloques: [] }];
  for (const b of bloques) {
    if (b.tipo === "titulo" && b.nivel === nivelSeccion) secciones.push({ titulo: b.texto, bloques: [] });
    else secciones[secciones.length - 1].bloques.push(b);
  }

  return (
    <div className={styles.md}>
      {secciones.map((s, j) => {
        const contenido = cuerpo(s.bloques, `s${j}`);
        if (s.titulo == null) return contenido.length ? <div key={j}>{contenido}</div> : null;
        const tono = tonoDe(s.titulo);
        return (
          <section key={j} className={`${styles.seccion} ${tono}`}>
            <p className={styles.heading}>{s.titulo}</p>
            {contenido}
          </section>
        );
      })}
    </div>
  );
}
