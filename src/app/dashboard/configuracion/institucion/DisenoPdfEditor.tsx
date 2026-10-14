"use client";

import { useEffect, useRef, useState } from "react";
import { guardarPdfDiseno, type EmpresaInfo } from "@/app/services/empresaService";
import { mensajeDeError } from "@/app/utils/apiError";
import {
  aplicarPlantilla,
  CAMPOS_INSTITUCION,
  CAMPOS_PACIENTE,
  COLORES_SUGERIDOS,
  normalizarDiseno,
  PDF_DISENO_DEFAULT,
  PLANTILLAS_PDF,
  type PdfBarra,
  type PdfDiseno,
  type PdfEstiloPanel,
  type PdfFuente,
  type PdfModoDatos,
} from "@/app/utils/pdfDiseno";
import { previewPagina } from "./previewPdf";
import styles from "./institucion.module.css";

type Props = {
  empresa: EmpresaInfo | null;
  logo: string | null;
  guardado: PdfDiseno;
  puedeEditar: boolean;
  onGuardado: (d: PdfDiseno) => void;
};

const FUENTES: Array<{ id: PdfFuente; label: string }> = [
  { id: "helvetica", label: "Helvetica (sin serifa)" },
  { id: "times", label: "Times (con serifa)" },
  { id: "courier", label: "Courier (monoespaciada)" },
];

function Opciones<T extends string>({
  valor,
  opciones,
  onChange,
  disabled,
}: {
  valor: T;
  opciones: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.segmentado} role="radiogroup">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          className={valor === o.id ? styles.segActivo : undefined}
          disabled={disabled}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function DisenoPdfEditor({ empresa, logo, guardado, puedeEditar, onGuardado }: Props) {
  const [d, setD] = useState<PdfDiseno>(guardado);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorPreview, setErrorPreview] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const seq = useRef(0);

  useEffect(() => setD(guardado), [guardado]);

  const hayCambios = JSON.stringify(d) !== JSON.stringify(guardado);
  const esDefault = JSON.stringify(guardado) === JSON.stringify(PDF_DISENO_DEFAULT);
  const off = !puedeEditar || guardando;

  useEffect(() => {
    if (!empresa) return;
    const n = ++seq.current;
    const t = setTimeout(() => {
      previewPagina(empresa, logo, d)
        .then((url) => {
          if (n !== seq.current) return;
          setPreview(url);
          setErrorPreview("");
        })
        .catch((e) => {
          if (n !== seq.current) return;
          console.error("[diseno-pdf] vista previa:", e);
          setErrorPreview("No se pudo generar la vista previa");
        });
    }, 300);
    return () => clearTimeout(t);
  }, [empresa, logo, d]);

  const enc = (patch: Partial<PdfDiseno["encabezado"]>) => setD((x) => ({ ...x, encabezado: { ...x.encabezado, ...patch } }));
  const pac = (patch: Partial<PdfDiseno["paciente"]>) => setD((x) => ({ ...x, paciente: { ...x.paciente, ...patch } }));
  const pie = (patch: Partial<PdfDiseno["pie"]>) => setD((x) => ({ ...x, pie: { ...x.pie, ...patch } }));

  const guardar = async (diseno: PdfDiseno | null) => {
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const res = await guardarPdfDiseno(diseno);
      const final = normalizarDiseno(res);
      onGuardado(final);
      setD(final);
      setAviso(diseno ? "Diseño guardado. Los próximos PDFs ya salen así." : "Se restableció el diseño predeterminado.");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar el diseño"));
    } finally {
      setGuardando(false);
    }
  };

  const datosOff = off || d.encabezado.datosInstitucion === "ninguno";
  const pacienteOff = off || !d.paciente.mostrar;

  return (
    <>
      {error ? <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div> : null}
      {aviso ? <div className={`${styles.banner} ${styles.bannerOk}`}>{aviso}</div> : null}

      <div className={styles.grid}>
        <div className={styles.columna}>
          <section className={styles.panel}>
            <h2>Plantilla</h2>
            <div className={styles.plantillas}>
              {PLANTILLAS_PDF.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={off}
                  className={`${styles.plantilla} ${d.plantilla === p.id ? styles.plantillaActiva : ""}`}
                  onClick={() => setD((x) => aplicarPlantilla(x, p.id))}
                >
                  <span className={styles.plantillaMuestra} style={{ borderColor: p.valores.colorMarca }}>
                    <span style={{ background: p.valores.colorMarca, height: p.valores.barra === "gruesa" ? 4 : p.valores.barra === "fina" ? 2 : 0 }} />
                    <i style={{ background: p.valores.estilo === "relleno" ? `${p.valores.colorMarca}18` : "#fff" }} />
                  </span>
                  <strong style={{ fontFamily: p.valores.fuente === "times" ? "Times New Roman, serif" : undefined }}>{p.nombre}</strong>
                  <small>{p.descripcion}</small>
                </button>
              ))}
            </div>
            <p className={styles.muted}>La plantilla fija el estilo de partida; después podés ajustar cada opción.</p>
          </section>

          <section className={styles.panel}>
            <h2>Estilo</h2>
            <div className={styles.fila}>
              <span className={styles.filaLabel}>Color de marca</span>
              <div className={styles.colores}>
                {COLORES_SUGERIDOS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={off}
                    aria-label={`Color ${c}`}
                    className={`${styles.swatch} ${d.colorMarca === c ? styles.swatchActivo : ""}`}
                    style={{ background: c }}
                    onClick={() => setD((x) => ({ ...x, colorMarca: c }))}
                  />
                ))}
                <input
                  type="color"
                  disabled={off}
                  className={styles.colorInput}
                  value={d.colorMarca}
                  onChange={(e) => setD((x) => ({ ...x, colorMarca: e.target.value.toUpperCase() }))}
                  aria-label="Elegir otro color"
                />
              </div>
            </div>
            <div className={styles.fila}>
              <span className={styles.filaLabel}>Tipografía</span>
              <select
                className={styles.input}
                disabled={off}
                value={d.fuente}
                onChange={(e) => setD((x) => ({ ...x, fuente: e.target.value as PdfFuente }))}
              >
                {FUENTES.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.fila}>
              <span className={styles.filaLabel}>Línea bajo el encabezado</span>
              <Opciones<PdfBarra>
                valor={d.encabezado.barra}
                disabled={off}
                onChange={(barra) => enc({ barra })}
                opciones={[
                  { id: "gruesa", label: "Gruesa" },
                  { id: "fina", label: "Fina" },
                  { id: "ninguna", label: "Gris" },
                ]}
              />
            </div>
            <div className={styles.fila}>
              <span className={styles.filaLabel}>Panel del paciente</span>
              <Opciones<PdfEstiloPanel>
                valor={d.paciente.estilo}
                disabled={off}
                onChange={(estilo) => pac({ estilo })}
                opciones={[
                  { id: "relleno", label: "Sombreado" },
                  { id: "borde", label: "Solo borde" },
                ]}
              />
            </div>
          </section>

          <section className={styles.panel}>
            <h2>Encabezado</h2>
            <Check label="Mostrar logo (o las iniciales si no hay logo)" checked={d.encabezado.mostrarLogo} disabled={off} onChange={(mostrarLogo) => enc({ mostrarLogo })} />
            <div className={styles.fila}>
              <span className={styles.filaLabel}>Datos de la institución</span>
              <Opciones<PdfModoDatos>
                valor={d.encabezado.datosInstitucion}
                disabled={off}
                onChange={(datosInstitucion) => enc({ datosInstitucion })}
                opciones={[
                  { id: "todos", label: "Todos (vacíos con guion)" },
                  { id: "cargados", label: "Solo los cargados" },
                  { id: "ninguno", label: "Ninguno" },
                ]}
              />
            </div>
            <div className={styles.checks}>
              {CAMPOS_INSTITUCION.map((c) => (
                <Check
                  key={c.id}
                  label={c.label}
                  checked={d.encabezado.campos[c.id]}
                  disabled={datosOff}
                  onChange={(v) => enc({ campos: { ...d.encabezado.campos, [c.id]: v } })}
                />
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>Paciente</h2>
            <Check label="Mostrar el panel del paciente" checked={d.paciente.mostrar} disabled={off} onChange={(mostrar) => pac({ mostrar })} />
            <Check label="Mostrar edad y fecha de nacimiento" checked={d.paciente.mostrarEdad} disabled={pacienteOff} onChange={(mostrarEdad) => pac({ mostrarEdad })} />
            <div className={styles.checks}>
              {CAMPOS_PACIENTE.map((c) => (
                <Check
                  key={c.id}
                  label={c.label}
                  checked={d.paciente.campos[c.id]}
                  disabled={pacienteOff}
                  onChange={(v) => pac({ campos: { ...d.paciente.campos, [c.id]: v } })}
                />
              ))}
            </div>
            <p className={styles.muted}>Los datos del paciente que no estén cargados nunca se muestran.</p>
          </section>

          <section className={styles.panel}>
            <h2>Pie de página</h2>
            <Check label="Nombre de la institución" checked={d.pie.institucion} disabled={off} onChange={(institucion) => pie({ institucion })} />
            <Check label="Fecha y hora de generación" checked={d.pie.generado} disabled={off} onChange={(generado) => pie({ generado })} />
            <Check label="Número de página" checked={d.pie.paginas} disabled={off} onChange={(paginas) => pie({ paginas })} />
            <label className={`${styles.campo} ${styles.completo}`} style={{ marginTop: "0.6rem" }}>
              <span>Texto adicional (opcional)</span>
              <input
                className={styles.input}
                maxLength={140}
                disabled={off}
                placeholder="Ej.: Documento confidencial — uso exclusivo del equipo de salud"
                value={d.pie.texto}
                onChange={(e) => pie({ texto: e.target.value })}
              />
            </label>
          </section>

          {puedeEditar ? (
            <div className={`${styles.acciones} ${styles.barraAcciones}`}>
              <button type="button" className={styles.btnPrimario} disabled={!hayCambios || guardando} onClick={() => void guardar(d)}>
                {guardando ? "Guardando…" : "Guardar diseño"}
              </button>
              {hayCambios ? (
                <button type="button" className={styles.btnSecundario} disabled={guardando} onClick={() => setD(guardado)}>
                  Descartar
                </button>
              ) : null}
              {!esDefault ? (
                <button
                  type="button"
                  className={styles.btnSecundario}
                  disabled={guardando}
                  onClick={() => {
                    if (confirm("¿Volver al diseño predeterminado? Se pierde el diseño guardado.")) void guardar(null);
                  }}
                >
                  Restablecer predeterminado
                </button>
              ) : null}
            </div>
          ) : (
            <p className={styles.muted}>Solo lectura: para cambiar el diseño hace falta permiso de edición de Institución.</p>
          )}
        </div>

        <section className={`${styles.panel} ${styles.panelPreview}`}>
          <h2>
            Vista previa
            {hayCambios ? <span className={styles.chip}>Sin guardar</span> : null}
          </h2>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa de la primera página" className={`${styles.hoja} ${styles.recorte}`} />
          ) : (
            <p className={styles.muted}>{errorPreview || "Generando vista previa…"}</p>
          )}
          {preview && errorPreview ? <p className={styles.muted}>{errorPreview}</p> : null}
        </section>
      </div>
    </>
  );
}
