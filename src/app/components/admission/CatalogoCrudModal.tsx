'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { mensajeDeError } from '@/app/utils/apiError';
import styles from './CatalogoCrudModal.module.css';

export type CatalogoColumn = {
  key: string;
  label: string;
  editable?: boolean;
  type?: string;
  autoKey?: boolean;
  requiredOnCreate?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  help?: string;
  data: Record<string, unknown>[];
  columns: CatalogoColumn[];
  keyField?: string;
  onAddItem?: (values: Record<string, string>) => Promise<void>;
  onUpdateItem?: (key: string, values: Record<string, string>) => Promise<void>;
  onDeleteItem?: (key: string) => Promise<void>;
};

type Modo = 'lista' | 'alta' | 'editar' | 'borrar';

const PAGE = 12;

export default function CatalogoCrudModal({
  isOpen,
  onClose,
  title,
  help,
  data,
  columns,
  keyField = 'Valor',
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modo, setModo] = useState<Modo>('lista');
  const [seleccionado, setSeleccionado] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setBusqueda('');
      setPagina(1);
      setModo('lista');
      setSeleccionado(null);
      setForm({});
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    setPagina(1);
  }, [data, busqueda]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      columns.some((col) => {
        const v = row[col.key];
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [data, busqueda, columns]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE, paginaActual * PAGE);

  const camposForm = columns.filter((c) => {
    if (c.autoKey) return false;
    if (modo === 'alta') return c.editable !== false || c.requiredOnCreate === true;
    return c.editable !== false;
  });

  const abrirAlta = () => {
    const inicial: Record<string, string> = {};
    columns.forEach((c) => {
      if (c.autoKey) return;
      if (c.editable !== false || c.requiredOnCreate === true) inicial[c.key] = '';
    });
    setForm(inicial);
    setSeleccionado(null);
    setError('');
    setModo('alta');
  };

  const abrirEditar = (row: Record<string, unknown>) => {
    const inicial: Record<string, string> = {};
    columns.forEach((c) => {
      if (c.editable === false) return;
      inicial[c.key] = row[c.key] != null ? String(row[c.key]) : '';
    });
    setForm(inicial);
    setSeleccionado(row);
    setError('');
    setModo('editar');
  };

  const abrirBorrar = (row: Record<string, unknown>) => {
    setSeleccionado(row);
    setError('');
    setModo('borrar');
  };

  const volverLista = () => {
    setModo('lista');
    setSeleccionado(null);
    setForm({});
    setError('');
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      if (modo === 'alta' || modo === 'editar') {
        const faltante = camposForm.find((c) => {
          if (c.autoKey) return false;
          const v = String(form[c.key] ?? '').trim();
          if (c.requiredOnCreate && modo === 'alta') return !v;
          const k = c.key.toLowerCase();
          if (k.includes('desc') || k === 'nombre' || k === 'razonsocial') return !v;
          return false;
        });
        if (faltante) {
          setError(`Completá ${faltante.label.toLowerCase()}`);
          setGuardando(false);
          return;
        }
      }
      if (modo === 'alta') {
        if (!onAddItem) return;
        await onAddItem(form);
      } else if (modo === 'editar' && seleccionado) {
        if (!onUpdateItem) return;
        await onUpdateItem(String(seleccionado[keyField]), form);
      } else if (modo === 'borrar' && seleccionado) {
        if (!onDeleteItem) return;
        await onDeleteItem(String(seleccionado[keyField]));
      }
      volverLista();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo guardar'));
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const etiquetaPrincipal = (row: Record<string, unknown>) => {
    const desc = columns.find((c) => c.key.toLowerCase().includes('desc'));
    if (desc && row[desc.key] != null && String(row[desc.key]).trim()) {
      return String(row[desc.key]);
    }
    return columns.map((c) => row[c.key]).filter((v) => v != null && String(v).trim()).join(' · ') || '—';
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button type="button" className={styles.cerrar} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {help ? <p className={styles.ayuda}>{help}</p> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {modo === 'lista' ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.buscador}>
                <Search size={15} />
                <input
                  type="text"
                  value={busqueda}
                  placeholder="Buscar…"
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {onAddItem ? (
                <button type="button" className={styles.botonPrimario} onClick={abrirAlta}>
                  <Plus size={15} /> Nuevo
                </button>
              ) : null}
            </div>

            <div className={styles.listaWrap}>
              {visibles.length === 0 ? (
                <p className={styles.vacio}>
                  {busqueda ? `Sin resultados para “${busqueda}”.` : 'No hay registros.'}
                </p>
              ) : (
                <ul className={styles.lista}>
                  {visibles.map((row, idx) => (
                    <li key={`${String(row[keyField])}-${idx}`} className={styles.fila}>
                      <div className={styles.filaTexto}>
                        <span className={styles.filaTitulo}>{etiquetaPrincipal(row)}</span>
                        <span className={styles.filaMeta}>
                          {columns
                            .filter((c) => !c.key.toLowerCase().includes('desc'))
                            .slice(0, 2)
                            .map((c) => `${c.label}: ${row[c.key] ?? '—'}`)
                            .join(' · ')}
                        </span>
                      </div>
                      <div className={styles.filaAcciones}>
                        {onUpdateItem ? (
                          <button
                            type="button"
                            className={styles.botonIcono}
                            title="Editar"
                            onClick={() => abrirEditar(row)}
                          >
                            <Pencil size={15} />
                          </button>
                        ) : null}
                        {onDeleteItem ? (
                          <button
                            type="button"
                            className={`${styles.botonIcono} ${styles.botonPeligro}`}
                            title="Eliminar"
                            onClick={() => abrirBorrar(row)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.pie}>
              <span className={styles.contador}>
                {filtrados.length} registro{filtrados.length === 1 ? '' : 's'}
                {totalPaginas > 1 ? ` · pág. ${paginaActual}/${totalPaginas}` : ''}
              </span>
              {totalPaginas > 1 ? (
                <div className={styles.paginacion}>
                  <button
                    type="button"
                    className={styles.botonTexto}
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className={styles.botonTexto}
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.formulario}>
            <h3 className={styles.formTitulo}>
              {modo === 'alta' ? 'Nuevo registro' : modo === 'editar' ? 'Editar registro' : 'Eliminar registro'}
            </h3>

            {modo === 'borrar' ? (
              <div className={styles.confirmacion}>
                <p>¿Eliminar “{seleccionado ? etiquetaPrincipal(seleccionado) : ''}”?</p>
                <p className={styles.avisoPeligro}>Esta acción no se puede deshacer.</p>
              </div>
            ) : (
              <div className={styles.campos}>
                {camposForm.map((c) => (
                  <label key={c.key} className={styles.campo}>
                    <span>{c.label}</span>
                    <input
                      type={c.type || 'text'}
                      value={form[c.key] ?? ''}
                      disabled={modo === 'editar' && c.editable === false}
                      onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            )}

            <div className={styles.formAcciones}>
              <button type="button" className={styles.botonTexto} disabled={guardando} onClick={volverLista}>
                Cancelar
              </button>
              <button
                type="button"
                className={modo === 'borrar' ? styles.botonEliminar : styles.botonPrimario}
                disabled={guardando}
                onClick={() => void guardar()}
              >
                {guardando
                  ? 'Guardando…'
                  : modo === 'borrar'
                    ? 'Eliminar'
                    : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
