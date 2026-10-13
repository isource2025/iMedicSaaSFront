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

export default function MarkdownLite({
  text,
  onLink,
}: {
  text: string;
  onLink: (href: string) => void;
}) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (
      esFilaTabla(line) &&
      i + 1 < lines.length &&
      esSeparador(lines[i + 1])
    ) {
      const head = celdas(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && esFilaTabla(lines[i])) {
        rows.push(celdas(lines[i]));
        i++;
      }
      const k = `t${key++}`;
      blocks.push(
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
        </div>,
      );
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (
        i < lines.length &&
        (/^\s*[-*•]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      const k = `l${key++}`;
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k} className={styles.list}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, onLink, `${k}${j}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    const h = /^\s*#{1,4}\s+(.*)$/.exec(line);
    if (h) {
      const k = `h${key++}`;
      blocks.push(
        <p key={k} className={styles.heading}>
          {inline(h[1], onLink, k)}
        </p>,
      );
      i++;
      continue;
    }

    if (!line.trim()) {
      blocks.push(<div key={`s${key++}`} className={styles.spacer} />);
      i++;
      continue;
    }

    const k = `p${key++}`;
    blocks.push(
      <Fragment key={k}>
        {inline(line, onLink, k)}
        <br />
      </Fragment>,
    );
    i++;
  }

  return <div className={styles.md}>{blocks}</div>;
}
