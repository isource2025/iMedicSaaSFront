'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, FileUp, Paperclip, Plus, Trash2 } from 'lucide-react';
import type { RequisitoCobertura, RequisitoFormulario } from '@/app/types/admisionNueva';
import styles from './styles.module.css';

interface Props {
  requisitos: RequisitoFormulario[];
  catalogo: RequisitoCobertura[];
  cargando: boolean;
  bloqueado: boolean;
  onArchivo: (valor: number, archivo: File | null) => void;
  onQuitar: (valor: number) => void;
  onAgregar: (valor: number) => void;
}

const ACEPTA = 'image/jpeg,image/png,image/gif,application/pdf';

export default function RequisitosDocumentos({
  requisitos,
  catalogo,
  cargando,
  bloqueado,
  onArchivo,
  onQuitar,
  onAgregar,
}: Props) {
  const [aAgregar, setAAgregar] = useState('');
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const disponibles = useMemo(() => {
    const yaEstan = new Set(requisitos.map((r) => r.valor));
    return catalogo.filter((c) => !yaEstan.has(c.Valor));
  }, [catalogo, requisitos]);

  const conArchivo = requisitos.filter((r) => r.archivo || r.estado === 'ok').length;

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
        Se cargan solos según la cobertura elegida. Podés agregar cualquier otro requisito y subir
        una imagen o PDF por cada uno (DNI, hoja de derivación, recibo de sueldo, carnet de obra
        social).
      </p>

      {cargando ? (
        <p className={styles.ayuda}>Cargando requisitos de la cobertura…</p>
      ) : requisitos.length === 0 ? (
        <p className={styles.ayuda}>
          La cobertura seleccionada no tiene requisitos configurados. Podés agregar los que
          necesites.
        </p>
      ) : (
        <ul className={styles.listaRequisitos}>
          {requisitos.map((r) => (
            <li key={r.valor} className={styles.filaRequisito}>
              <div className={styles.requisitoInfo}>
                <span className={styles.requisitoNombre}>{r.descripcion}</span>
                <span className={styles.requisitoMeta}>
                  {r.aplicable || '—'}
                  {!r.deCobertura && <em className={styles.tagBase}> · agregado</em>}
                </span>
              </div>

              <div className={styles.requisitoArchivo}>
                {r.archivo ? (
                  <span className={styles.nombreArchivo} title={r.archivo.name}>
                    {r.archivo.name}
                  </span>
                ) : (
                  <span className={styles.sinArchivo}>Sin imagen</span>
                )}

                {r.estado === 'subiendo' && <span className={styles.estadoSubiendo}>Subiendo…</span>}
                {r.estado === 'ok' && (
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
                  onChange={(e) => onArchivo(r.valor, e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className={styles.botonSecundario}
                  disabled={bloqueado}
                  onClick={() => inputs.current[r.valor]?.click()}
                >
                  <FileUp size={14} /> {r.archivo ? 'Cambiar' : 'Adjuntar'}
                </button>
                <button
                  type="button"
                  className={styles.botonIcono}
                  disabled={bloqueado}
                  title="Quitar requisito"
                  onClick={() => onQuitar(r.valor)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.agregarRequisito}>
        <select
          value={aAgregar}
          onChange={(e) => setAAgregar(e.target.value)}
          disabled={bloqueado || disponibles.length === 0}
        >
          <option value="">
            {disponibles.length === 0 ? 'No quedan requisitos por agregar' : 'Agregar requisito…'}
          </option>
          {disponibles.map((c) => (
            <option key={c.Valor} value={c.Valor}>
              {c.Descripcion}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.botonSecundario}
          disabled={bloqueado || !aAgregar}
          onClick={() => {
            onAgregar(Number(aAgregar));
            setAAgregar('');
          }}
        >
          <Plus size={14} /> Agregar
        </button>
      </div>
    </div>
  );
}
