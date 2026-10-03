'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { mensajeDeError } from '@/app/utils/apiError';
import PrefijosPracticaPicker from '@/app/components/UI/PrefijosPracticaPicker';
import InfoHint from '@/app/components/UI/InfoHint';
import styles from './CatalogoCrudModal.module.css';

export type CatalogoOption = {
  value: string;
  label: string;
  detail?: string;
};

export type CatalogoColumn = {
  key: string;
  label: string;
  editable?: boolean;
  type?: string;
  autoKey?: boolean;
  requiredOnCreate?: boolean;
  required?: boolean;
  /** Explicación breve del campo, en lenguaje cotidiano. */
  help?: string;
  input?: 'select' | 'search' | 'multicheck';
  options?: CatalogoOption[];
  /** Solo 'multicheck': largo de la columna donde se guarda la lista. */
  maxLength?: number;
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
  /** Columnas con input 'search': devuelve opciones para el texto escrito. */
  onSearch?: (campo: string, q: string) => Promise<CatalogoOption[]>;
};

function vacioODefault(v: string): boolean {
  return !v || v === '0';
}

function CampoBusqueda({
  column,
  value,
  disabled,
  onChange,
  onSearch,
}: {
  column: CatalogoColumn;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSearch?: (campo: string, q: string) => Promise<CatalogoOption[]>;
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<CatalogoOption[]>([]);
  const [seleccion, setSeleccion] = useState<CatalogoOption | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const pedido = useRef(0);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    const buscar = onSearchRef.current;
    if (!abierto || !buscar) return;
    const id = ++pedido.current;
    const t = window.setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda('');
      try {
        const r = await buscar(column.key, texto.trim());
        if (id === pedido.current) setResultados(r);
      } catch (e) {
        if (id === pedido.current) setErrorBusqueda(mensajeDeError(e, 'No se pudo buscar'));
      } finally {
        if (id === pedido.current) setBuscando(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [texto, abierto, column.key]);

  if (!vacioODefault(value)) {
    const etiqueta = seleccion && seleccion.value === value ? seleccion : null;
    return (
      <div className={styles.busquedaSeleccion}>
        <span>
          {etiqueta ? etiqueta.label : value}
          {etiqueta?.detail ? (
            <span className={styles.busquedaItemDetalle}> · {etiqueta.detail}</span>
          ) : null}
        </span>
        {!disabled ? (
          <button
            type="button"
            className={styles.busquedaQuitar}
            onClick={() => {
              onChange('');
              setSeleccion(null);
              setTexto('');
            }}
            aria-label={`Quitar ${column.label.toLowerCase()}`}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.busqueda}>
      <input
        type="text"
        value={texto}
        disabled={disabled}
        placeholder="Buscar por paciente, documento o número de visita…"
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
      />
      {abierto ? (
        <ul className={styles.busquedaLista}>
          {buscando ? <li className={styles.busquedaEstado}>Buscando…</li> : null}
          {!buscando && errorBusqueda ? (
            <li className={styles.busquedaEstado}>{errorBusqueda}</li>
          ) : null}
          {!buscando && !errorBusqueda && resultados.length === 0 ? (
            <li className={styles.busquedaEstado}>Sin resultados</li>
          ) : null}
          {!buscando &&
            resultados.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={styles.busquedaItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSeleccion(o);
                    onChange(o.value);
                    setAbierto(false);
                  }}
                >
                  <span className={styles.busquedaItemTitulo}>{o.label}</span>
                  {o.detail ? <span className={styles.busquedaItemDetalle}>{o.detail}</span> : null}
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

type Modo = 'lista' | 'alta' | 'editar' | 'borrar';

const PAGE = 50;

function cell(row: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!row || !key) return undefined;
  if (row[key] != null && String(row[key]).trim() !== '') return row[key];
  const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
  return found != null ? row[found] : undefined;
}

function textoCelda(row: Record<string, unknown> | null | undefined, key: string): string {
  const v = cell(row, key);
  return v == null ? '' : String(v).trim();
}

function textoMostrado(row: Record<string, unknown> | null | undefined, col: CatalogoColumn): string {
  const v = textoCelda(row, col.key);
  if (!v || col.input !== 'select') return v;
  const o = col.options?.find((x) => x.value.toUpperCase() === v.toUpperCase());
  return o ? o.label : v;
}

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
  onSearch,
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
        const v = textoCelda(row, col.key);
        return v.toLowerCase().includes(q);
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
      inicial[c.key] = textoCelda(row, c.key);
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
          if (c.required) return !v;
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
    const desc = columns.find((c) => /desc|nombre|razon/i.test(c.key));
    if (desc) {
      const t = textoCelda(row, desc.key);
      if (t) return t;
    }
    return (
      columns
        .map((c) => textoMostrado(row, c))
        .filter(Boolean)
        .join(' · ') || '—'
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className="modal-title">{title}</h2>
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
                    <li key={`${textoCelda(row, keyField) || idx}-${idx}`} className={styles.fila}>
                      <div className={styles.filaTexto}>
                        <span className={styles.filaTitulo}>{etiquetaPrincipal(row)}</span>
                        <span className={styles.filaMeta}>
                          {columns
                            .filter((c) => !/desc|nombre|razon/i.test(c.key))
                            .slice(0, 2)
                            .map((c) => `${c.label}: ${textoMostrado(row, c) || '—'}`)
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
                {camposForm.map((c) => {
                  const valor = form[c.key] ?? '';
                  const bloqueado = modo === 'editar' && c.editable === false;
                  const obligatorio = c.required || (modo === 'alta' && c.requiredOnCreate);
                  const setValor = (v: string) => setForm((f) => ({ ...f, [c.key]: v }));
                  const idEtiqueta = `campo-${c.key}`;
                  const etiqueta = (
                    <span>
                      <span id={idEtiqueta}>
                        {c.label}
                        {obligatorio ? <span className={styles.obligatorio}>*</span> : null}
                      </span>
                      {c.help ? <InfoHint label={c.label} text={c.help} /> : null}
                    </span>
                  );

                  if (c.input === 'search') {
                    return (
                      <div key={c.key} className={styles.campo}>
                        {etiqueta}
                        <CampoBusqueda
                          column={c}
                          value={valor}
                          disabled={bloqueado}
                          onChange={setValor}
                          onSearch={onSearch}
                        />
                      </div>
                    );
                  }

                  if (c.input === 'multicheck') {
                    return (
                      <div key={c.key} className={styles.campo}>
                        {etiqueta}
                        <PrefijosPracticaPicker
                          name={c.key}
                          options={c.options ?? []}
                          value={valor}
                          disabled={bloqueado}
                          maxLength={c.maxLength}
                          onChange={setValor}
                        />
                      </div>
                    );
                  }

                  if (c.input === 'select') {
                    const opciones = c.options ?? [];
                    const fueraDeLista =
                      valor && !opciones.some((o) => o.value.toUpperCase() === valor.toUpperCase());
                    return (
                      <label key={c.key} className={styles.campo}>
                        {etiqueta}
                        <select
                          aria-labelledby={idEtiqueta}
                          value={valor}
                          disabled={bloqueado}
                          onChange={(e) => setValor(e.target.value)}
                        >
                          <option value="">Seleccioná…</option>
                          {fueraDeLista ? <option value={valor}>{valor} (actual)</option> : null}
                          {opciones.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={c.key} className={styles.campo}>
                      {etiqueta}
                      <input
                        aria-labelledby={idEtiqueta}
                        type={c.type || 'text'}
                        value={valor}
                        disabled={bloqueado}
                        onChange={(e) => setValor(e.target.value)}
                      />
                    </label>
                  );
                })}
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
