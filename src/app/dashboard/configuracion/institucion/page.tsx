"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePermiso } from "@/app/hooks/usePermiso";
import {
  actualizarDatosInstitucion,
  eliminarLogoEmpresa,
  obtenerCatalogosInstitucion,
  obtenerInfoEmpresa,
  obtenerLogoEmpresa,
  obtenerPdfDiseno,
  subirLogoEmpresa,
  type CatalogosInstitucion,
  type DatosInstitucion,
  type EmpresaInfo,
} from "@/app/services/empresaService";
import { mensajeDeError } from "@/app/utils/apiError";
import { normalizarDiseno, PDF_DISENO_DEFAULT, type PdfDiseno } from "@/app/utils/pdfDiseno";
import DisenoPdfEditor from "./DisenoPdfEditor";
import { previewRecortes, type PreviewRecortes } from "./previewPdf";
import styles from "./institucion.module.css";

const LADO_MAX_PX = 800;
const BYTES_MAX = 1024 * 1024;

const IVA_POR_DEFECTO: CatalogosInstitucion["iva"] = [
  { valor: 4, descripcion: "Consumidor Final" },
  { valor: 2, descripcion: "Exento" },
  { valor: 3, descripcion: "Monotributo" },
  { valor: 1, descripcion: "Responsable Inscripto" },
];

/** Reescala la imagen en el navegador (PNG conserva transparencia; si pesa mucho, WEBP). */
async function prepararLogo(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo leer la imagen"));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const aBlob = (tipo: string, calidad?: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, calidad));
    const png = await aBlob("image/png");
    if (png && png.size <= BYTES_MAX) return png;
    const webp = await aBlob("image/webp", 0.9);
    if (webp && webp.size <= BYTES_MAX) return webp;
    throw new Error("La imagen es demasiado pesada aun reducida: probá con otra");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function valor(v?: string | number | null) {
  const s = String(v ?? "").trim();
  return !s || ["-", "0", "null", "undefined"].includes(s.toLowerCase()) ? "" : s;
}

function aFormulario(e: EmpresaInfo | null): DatosInstitucion {
  return {
    descripcion: valor(e?.razonSocial) || valor(e?.descripcion),
    cuit: valor(e?.cuit),
    idTipoIva: e?.idTipoIva ?? null,
    ingresosBrutos: valor(e?.ingresosBrutos),
    calle: valor(e?.calle),
    calle_nro: valor(e?.calle_nro),
    piso: valor(e?.piso),
    depto: valor(e?.Depto),
    localidad: valor(e?.localidad),
    provincia: valor(e?.provincia),
    telefono: valor(e?.telefono),
    email: valor(e?.email),
  };
}

/** EmpresaInfo con lo que hay en el formulario, para previsualizar antes de guardar. */
function empresaDesdeFormulario(
  base: EmpresaInfo | null,
  f: DatosInstitucion,
  iva: CatalogosInstitucion["iva"],
): EmpresaInfo {
  return {
    ...(base ?? { id: "" }),
    descripcion: f.descripcion,
    razonSocial: f.descripcion,
    cuit: f.cuit.replace(/[\s.-]/g, ""),
    condicionIva: iva.find((i) => i.valor === f.idTipoIva)?.descripcion ?? "",
    ingresosBrutos: f.ingresosBrutos.replace(/[\s.-]/g, ""),
    calle: f.calle,
    calle_nro: f.calle_nro,
    piso: f.piso,
    Depto: f.depto,
    localidad: f.localidad,
    provincia: f.provincia,
    telefono: f.telefono,
    email: f.email,
  };
}

type CampoProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  editable: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "email" | "tel" | "text";
  list?: string;
  ancho?: "completo" | "mitad" | "chico";
};

function Campo({ label, value, onChange, max, editable, placeholder, inputMode, list, ancho = "mitad" }: CampoProps) {
  return (
    <label className={`${styles.campo} ${styles[ancho]}`}>
      <span>{label}</span>
      {editable ? (
        <input
          className={styles.input}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          inputMode={inputMode}
          list={list}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span className={styles.lectura}>{value || <span className={styles.muted}>Sin cargar</span>}</span>
      )}
    </label>
  );
}

export default function InstitucionPage() {
  const { puede, loaded } = usePermiso();
  const puedeVer = puede("CONFIGURACION.INSTITUCION.VER");
  const puedeEditar = puede("CONFIGURACION.INSTITUCION.EDITAR");

  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [form, setForm] = useState<DatosInstitucion>(() => aFormulario(null));
  const [catalogos, setCatalogos] = useState<CatalogosInstitucion>({ iva: IVA_POR_DEFECTO, provincias: [] });
  const [logo, setLogo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [preview, setPreview] = useState<PreviewRecortes | null>(null);
  const [errorPreview, setErrorPreview] = useState("");
  const [diseno, setDiseno] = useState<PdfDiseno>(PDF_DISENO_DEFAULT);
  const [tab, setTab] = useState<"datos" | "diseno">("datos");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewSeq = useRef(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [e, l, c, d] = await Promise.all([
        obtenerInfoEmpresa(),
        obtenerLogoEmpresa(),
        obtenerCatalogosInstitucion().catch(() => null),
        obtenerPdfDiseno(),
      ]);
      setEmpresa(e);
      setForm(aFormulario(e));
      setLogo(l);
      setDiseno(normalizarDiseno(d));
      if (c) setCatalogos({ iva: c.iva.length ? c.iva : IVA_POR_DEFECTO, provincias: c.provincias });
    } catch (e) {
      setError(mensajeDeError(e, "No se pudieron cargar los datos de la institución"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (loaded && puedeVer) void cargar();
  }, [loaded, puedeVer, cargar]);

  const original = useMemo(() => aFormulario(empresa), [empresa]);
  const hayCambios = JSON.stringify(original) !== JSON.stringify(form);
  const empresaPreview = useMemo(
    () => (empresa ? empresaDesdeFormulario(empresa, form, catalogos.iva) : null),
    [empresa, form, catalogos.iva],
  );

  useEffect(() => {
    if (!empresaPreview || tab !== "datos") return;
    const seq = ++previewSeq.current;
    const t = setTimeout(() => {
      previewRecortes(empresaPreview, logo, diseno)
        .then((p) => {
          if (seq !== previewSeq.current) return;
          setPreview(p);
          setErrorPreview("");
        })
        .catch((e) => {
          if (seq !== previewSeq.current) return;
          console.error("[institucion] vista previa:", e);
          setErrorPreview("No se pudo generar la vista previa");
        });
    }, 350);
    return () => clearTimeout(t);
  }, [empresaPreview, logo, diseno, tab]);

  const set = <K extends keyof DatosInstitucion>(campo: K) => (v: DatosInstitucion[K]) =>
    setForm((f) => ({ ...f, [campo]: v }));

  const guardarDatos = async () => {
    if (!form.descripcion.trim()) {
      setError("La razón social es obligatoria");
      return;
    }
    setGuardandoDatos(true);
    setError("");
    setAviso("");
    try {
      const e = await actualizarDatosInstitucion(form);
      setEmpresa(e);
      setForm(aFormulario(e));
      setAviso("Datos guardados. Los próximos PDFs ya salen con estos datos.");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudieron guardar los datos"));
    } finally {
      setGuardandoDatos(false);
    }
  };

  const onArchivo = async (file?: File | null) => {
    if (!file) return;
    setGuardandoLogo(true);
    setError("");
    setAviso("");
    try {
      const blob = await prepararLogo(file);
      await subirLogoEmpresa(blob, blob.type === "image/webp" ? "logo.webp" : "logo.png");
      setLogo(await obtenerLogoEmpresa());
      setAviso("Logo guardado. Ya se usa en todos los PDFs.");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar el logo"));
    } finally {
      setGuardandoLogo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const quitar = async () => {
    if (!confirm("¿Quitar el logo? Los PDFs van a mostrar las iniciales de la institución.")) return;
    setGuardandoLogo(true);
    setError("");
    setAviso("");
    try {
      await eliminarLogoEmpresa();
      setLogo(null);
      setAviso("Logo quitado.");
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo quitar el logo"));
    } finally {
      setGuardandoLogo(false);
    }
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
          No tenés permiso para ver los datos de la institución.
        </div>
      </div>
    );
  }

  const editable = puedeEditar && !cargando;
  const ivaActual = catalogos.iva.find((i) => i.valor === form.idTipoIva)?.descripcion;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Institución</h1>
        <p>
          Estos datos y el logo encabezan todos los PDFs que genera el sistema
          (historia clínica, evoluciones, epicrisis, interconsultas, etc.).
        </p>
      </header>

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "datos"} className={tab === "datos" ? styles.tabActiva : undefined} onClick={() => setTab("datos")}>
          Datos y logo
        </button>
        <button type="button" role="tab" aria-selected={tab === "diseno"} className={tab === "diseno" ? styles.tabActiva : undefined} onClick={() => setTab("diseno")}>
          Diseño de PDF
        </button>
      </div>

      {tab === "diseno" ? (
        <DisenoPdfEditor
          empresa={empresa}
          logo={logo}
          guardado={diseno}
          puedeEditar={puedeEditar && !cargando}
          onGuardado={setDiseno}
        />
      ) : (
      <>
      {error ? <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div> : null}
      {aviso ? <div className={`${styles.banner} ${styles.bannerOk}`}>{aviso}</div> : null}

      <div className={styles.grid}>
        <div className={styles.columna}>
          <section className={styles.panel}>
            <h2>Logo</h2>
            <div className={styles.logoBox}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo de la institución" className={styles.logoImg} />
              ) : (
                <span className={styles.logoVacio}>Sin logo: los PDFs muestran las iniciales</span>
              )}
            </div>
            <p className={styles.muted}>
              PNG, JPG o WEBP. Queda mejor con fondo transparente y forma cuadrada.
            </p>
            {puedeEditar ? (
              <div className={styles.acciones}>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => void onArchivo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className={styles.btnPrimario}
                  disabled={guardandoLogo || cargando}
                  onClick={() => inputRef.current?.click()}
                >
                  {guardandoLogo ? "Guardando…" : logo ? "Cambiar logo" : "Subir logo"}
                </button>
                {logo ? (
                  <button
                    type="button"
                    className={styles.btnSecundario}
                    disabled={guardandoLogo}
                    onClick={() => void quitar()}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <form
            className={styles.panel}
            onSubmit={(e) => {
              e.preventDefault();
              if (editable && hayCambios) void guardarDatos();
            }}
          >
            <h2>Datos de la institución</h2>

            <h3 className={styles.grupo}>Identificación</h3>
            <div className={styles.campos}>
              <Campo label="Razón social *" value={form.descripcion} onChange={set("descripcion")} max={80} editable={editable} ancho="completo" />
              <Campo label="CUIT" value={form.cuit} onChange={set("cuit")} max={13} editable={editable} inputMode="numeric" placeholder="30-12345678-9" />
              <label className={`${styles.campo} ${styles.mitad}`}>
                <span>Condición IVA</span>
                {editable ? (
                  <select
                    className={styles.input}
                    value={form.idTipoIva ?? ""}
                    onChange={(e) => set("idTipoIva")(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Sin especificar</option>
                    {catalogos.iva.map((i) => (
                      <option key={i.valor} value={i.valor}>{i.descripcion}</option>
                    ))}
                  </select>
                ) : (
                  <span className={styles.lectura}>{ivaActual || <span className={styles.muted}>Sin cargar</span>}</span>
                )}
              </label>
              <Campo label="Ingresos brutos" value={form.ingresosBrutos} onChange={set("ingresosBrutos")} max={20} editable={editable} inputMode="numeric" />
            </div>

            <h3 className={styles.grupo}>Domicilio</h3>
            <div className={styles.campos}>
              <Campo label="Calle" value={form.calle} onChange={set("calle")} max={25} editable={editable} />
              <Campo label="N°" value={form.calle_nro} onChange={set("calle_nro")} max={5} editable={editable} inputMode="numeric" ancho="chico" />
              <Campo label="Piso" value={form.piso} onChange={set("piso")} max={3} editable={editable} ancho="chico" />
              <Campo label="Depto" value={form.depto} onChange={set("depto")} max={4} editable={editable} ancho="chico" />
              <Campo label="Localidad" value={form.localidad} onChange={set("localidad")} max={30} editable={editable} />
              <Campo label="Provincia" value={form.provincia} onChange={set("provincia")} max={30} editable={editable} list="institucion-provincias" />
              <datalist id="institucion-provincias">
                {catalogos.provincias.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <h3 className={styles.grupo}>Contacto</h3>
            <div className={styles.campos}>
              <Campo label="Teléfono" value={form.telefono} onChange={set("telefono")} max={45} editable={editable} inputMode="tel" />
              <Campo label="Email" value={form.email} onChange={set("email")} max={40} editable={editable} inputMode="email" />
            </div>

            {puedeEditar ? (
              <div className={styles.acciones}>
                <button type="submit" className={styles.btnPrimario} disabled={!hayCambios || guardandoDatos || cargando}>
                  {guardandoDatos ? "Guardando…" : "Guardar cambios"}
                </button>
                {hayCambios ? (
                  <button
                    type="button"
                    className={styles.btnSecundario}
                    disabled={guardandoDatos}
                    onClick={() => setForm(original)}
                  >
                    Descartar
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className={styles.muted}>
              {diseno.encabezado.datosInstitucion === "todos"
                ? "Los datos vacíos salen con guion en el PDF (se cambia en «Diseño de PDF»)."
                : "Los datos vacíos no aparecen en el PDF."}
              {puedeEditar ? " La vista previa se actualiza mientras escribís." : " Para corregirlos, pedilo a un administrador."}
            </p>
          </form>
        </div>

        <section className={`${styles.panel} ${styles.panelPreview}`}>
          <h2>
            Vista previa del encabezado
            {hayCambios ? <span className={styles.chip}>Sin guardar</span> : null}
          </h2>
          {preview ? (
            <div className={styles.hoja}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.header} alt="Encabezado del PDF" className={styles.recorte} />
              <div className={styles.corte} aria-hidden>
                contenido del documento
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.footer} alt="Pie de página del PDF" className={styles.recorte} />
            </div>
          ) : (
            <p className={styles.muted}>{errorPreview || (cargando ? "Cargando…" : "Generando vista previa…")}</p>
          )}
          {preview && errorPreview ? <p className={styles.muted}>{errorPreview}</p> : null}
        </section>
      </div>
      </>
      )}
    </div>
  );
}
