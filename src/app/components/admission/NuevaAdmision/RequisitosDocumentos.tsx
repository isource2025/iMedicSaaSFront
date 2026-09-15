'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Eye, FileUp, Paperclip, Plus, Trash2 } from 'lucide-react';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import AdjuntoFileViewer, {
  type AdjuntoViewerState,
} from '@/app/components/beds/adjuntos/AdjuntoFileViewer';
import admisionNuevaService from '@/app/services/admisionNuevaService';
import { admissionApiErrorMessage } from '@/app/services/admissionSearchService';
import type { RequisitoCobertura, RequisitoFormulario } from '@/app/types/admisionNueva';
import styles from './styles.module.css';

interface Props {
  requisitos: RequisitoFormulario[];
  catalogo: RequisitoCobertura[];
  cargando: boolean;
  bloqueado: boolean;
  /** La admisión ya existe: se pueden cambiar archivos pero no la lista de requisitos. */
  soloArchivos?: boolean;
  /** Necesario para ver los archivos que ya están subidos al servidor. */
  numeroVisita?: number | null;
  onArchivo: (valor: number, archivo: File | null) => void;
  onQuitar: (valor: number) => void;
  onAgregar: (valor: number) => void;
}

const ACEPTA = 'image/jpeg,image/png,image/gif,application/pdf';

function fechaCorta(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function nombreDeRuta(ruta: string): string {
  const partes = ruta.split(/[\\/]/).filter(Boolean);
  return partes.length ? partes[partes.length - 1] : ruta;
}

export default function RequisitosDocumentos({
  requisitos,
  catalogo,
  cargando,
  bloqueado,
  soloArchivos = false,
  numeroVisita,
  onArchivo,
  onQuitar,
  onAgregar,
}: Props) {
  const [aAgregar, setAAgregar] = useState('');
  const [viewer, setViewer] = useState<AdjuntoViewerState | null>(null);
  const [cargandoViewer, setCargandoViewer] = useState(false);
  const [errorViewer, setErrorViewer] = useState('');
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(
    () => () => {
      if (viewer?.blobUrl) URL.revokeObjectURL(viewer.blobUrl);
    },
    [viewer?.blobUrl],
  );

  const disponibles = useMemo(() => {
    const yaEstan = new Set(requisitos.map((r) => r.valor));
    return catalogo.filter((c) => !yaEstan.has(c.Valor));
  }, [catalogo, requisitos]);

  const opcionesAgregar = useMemo(
    () => [
      {
        value: '',
        label:
          disponibles.length === 0
            ? 'No quedan requisitos por agregar'
            : 'Agregar requisito…',
      },
      ...disponibles.map((c) => ({
        value: String(c.Valor),
        label: c.Descripcion,
      })),
    ],
    [disponibles],
  );

  const abrirViewer = (blobUrl: string, fileName: string, mimeType: string) => {
    setViewer((previo) => {
      if (previo?.blobUrl) URL.revokeObjectURL(previo.blobUrl);
      return { blobUrl, fileName, mimeType };
    });
  };

  const cerrarViewer = () => {
    setViewer((previo) => {
      if (previo?.blobUrl) URL.revokeObjectURL(previo.blobUrl);
      return null;
    });
  };

  /** El archivo local todavía no viajó al servidor: se ve directo desde el File. */
  const verArchivoLocal = (archivo: File) => {
    setErrorViewer('');
    abrirViewer(URL.createObjectURL(archivo), archivo.name, archivo.type);
  };

  const verArchivoSubido = async (r: RequisitoFormulario, visita: number) => {
    setErrorViewer('');
    setCargandoViewer(true);
    try {
      const { blob, blobUrl } = await admisionNuevaService.getArchivoRequisito(
        visita,
        r.valor,
      );
      const nombre = r.presentado ? nombreDeRuta(r.presentado.ruta) : r.descripcion;
      abrirViewer(blobUrl, nombre, blob.type);
    } catch (e) {
      setErrorViewer(admissionApiErrorMessage(e, 'No se pudo abrir el archivo'));
    } finally {
      setCargandoViewer(false);
    }
  };

  const conArchivo = requisitos.filter((r) => r.archivo || r.estado === 'ok').length;
  const sinTocarRequisitos = bloqueado || soloArchivos;

  return (
    <div className={styles.bloque}>
      <div className={styles.bloqueHeader}>
        <h2>
          <Paperclip size={18} /> Documentos y requisitos
        </h2>
        <span className={styles.contador}>
          {conArchivo} de {requisitos.length} con imagen
        </span>
      </div>

      <p className={styles.ayuda}>
        Se cargan solos según la cobertura elegida (imClientesRequisitos). Si la cobertura no tiene
        requisitos, se usan los de base. Podés agregar cualquier otro y subir una imagen o PDF por
        cada uno (DNI, hoja de derivación, recibo de sueldo, carnet de obra social).
      </p>

      {errorViewer && <p className={styles.errorInline}>{errorViewer}</p>}

      {cargando ? (
        <p className={styles.ayuda}>Cargando requisitos de la cobertura…</p>
      ) : requisitos.length === 0 ? (
        <p className={styles.ayuda}>
          La cobertura seleccionada no tiene requisitos configurados. Podés agregar los que
          necesites.
        </p>
      ) : (
        <ul className={styles.listaRequisitos}>
          {requisitos.map((r) => {
            const visitaParaVer =
              r.presentado?.numeroVisita ||
              (r.estado === 'ok' && numeroVisita ? numeroVisita : 0);
            const verSubido = visitaParaVer > 0;
            return (
              <li key={r.valor} className={styles.filaRequisito}>
                <div className={styles.requisitoInfo}>
                  <span className={styles.requisitoNombre}>{r.descripcion}</span>
                  <span className={styles.requisitoMeta}>
                    {r.aplicable || '—'}
                    {r.deCobertura ? null : r.deBase ? (
                      <em className={styles.tagBase}> · base</em>
                    ) : (
                      <em className={styles.tagBase}> · agregado</em>
                    )}
                  </span>
                </div>

                <div className={styles.requisitoArchivo}>
                  {r.archivo ? (
                    <span className={styles.nombreArchivo} title={r.archivo.name}>
                      {r.archivo.name}
                    </span>
                  ) : r.presentado ? (
                    <span
                      className={styles.yaPresentado}
                      title={`Presentado en la visita ${r.presentado.numeroVisita}`}
                    >
                      Ya presentado
                      {r.presentado.fecha ? ` el ${fechaCorta(r.presentado.fecha)}` : ''}
                    </span>
                  ) : (
                    <span className={styles.sinArchivo}>Sin imagen</span>
                  )}

                  {r.estado === 'subiendo' && (
                    <span className={styles.estadoSubiendo}>Subiendo…</span>
                  )}
                  {r.estado === 'ok' && !r.presentado && (
                    <span className={styles.estadoOk}>
                      <Check size={14} /> Subida
                    </span>
                  )}
                  {r.estado === 'error' && (
                    <span className={styles.estadoError} title={r.error}>
                      <AlertCircle size={14} /> {r.error || 'Error'}
                    </span>
                  )}
                </div>

                <div className={styles.requisitoAcciones}>
                  <input
                    ref={(el) => {
                      inputs.current[r.valor] = el;
                    }}
                    type="file"
                    accept={ACEPTA}
                    hidden
                    onChange={(e) => {
                      onArchivo(r.valor, e.target.files?.[0] ?? null);
                      // Sin esto, volver a elegir el mismo archivo no dispara el change.
                      e.target.value = '';
                    }}
                  />

                  {(r.archivo || verSubido) && (
                    <button
                      type="button"
                      className={styles.botonIcono}
                      title="Ver archivo"
                      disabled={cargandoViewer}
                      onClick={() =>
                        r.archivo
                          ? verArchivoLocal(r.archivo)
                          : void verArchivoSubido(r, visitaParaVer)
                      }
                    >
                      <Eye size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.botonSecundario}
                    disabled={bloqueado}
                    onClick={() => inputs.current[r.valor]?.click()}
                  >
                    <FileUp size={14} />{' '}
                    {r.archivo || r.estado === 'ok' ? 'Cambiar' : 'Adjuntar'}
                  </button>

                  {!sinTocarRequisitos && (
                    <button
                      type="button"
                      className={styles.botonIcono}
                      title="Quitar requisito"
                      onClick={() => onQuitar(r.valor)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!sinTocarRequisitos && (
        <div className={styles.agregarRequisito}>
          <div className={styles.agregarRequisitoSelect}>
            <CustomSelect
              label=""
              name="agregarRequisito"
              value={aAgregar}
              isLoading={cargando}
              disabled={disponibles.length === 0}
              onChange={(v) => setAAgregar(String(v ?? ''))}
              options={opcionesAgregar}
            />
          </div>
          <button
            type="button"
            className={styles.botonSecundario}
            disabled={!aAgregar}
            onClick={() => {
              onAgregar(Number(aAgregar));
              setAAgregar('');
            }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      )}

      <AdjuntoFileViewer viewer={viewer} loading={cargandoViewer} onClose={cerrarViewer} />
    </div>
  );
}
