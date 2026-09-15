'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Save, Search, X } from 'lucide-react';
import clientesRequisitosService, {
  type CoberturaConRequisitos,
  type RequisitoDeCobertura,
} from '@/app/services/clientesRequisitosService';
import styles from './RequisitosCoberturaModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Cliente 0 de imClientesRequisitos: los requisitos que pide toda admisión. */
const CLIENTE_BASE = 0;

export default function RequisitosCoberturaModal({ isOpen, onClose }: Props) {
  const [coberturas, setCoberturas] = useState<CoberturaConRequisitos[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [elegida, setElegida] = useState<CoberturaConRequisitos | null>(null);
  const [requisitos, setRequisitos] = useState<RequisitoDeCobertura[]>([]);
  const [cargandoCoberturas, setCargandoCoberturas] = useState(false);
  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCargandoCoberturas(true);
    setError('');
    clientesRequisitosService
      .getCoberturas()
      .then(setCoberturas)
      .catch(() => setError('No se pudieron cargar las coberturas'))
      .finally(() => setCargandoCoberturas(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setElegida(null);
      setRequisitos([]);
      setBusqueda('');
      setAviso('');
      setError('');
    }
  }, [isOpen]);

  const abrirCobertura = useCallback(async (c: CoberturaConRequisitos) => {
    setElegida(c);
    setAviso('');
    setError('');
    setCargandoRequisitos(true);
    try {
      setRequisitos(await clientesRequisitosService.getRequisitos(c.Valor));
    } catch {
      setError('No se pudieron cargar los requisitos de la cobertura');
      setRequisitos([]);
    } finally {
      setCargandoRequisitos(false);
    }
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return coberturas;
    return coberturas.filter((c) => c.Descripcion.toLowerCase().includes(q));
  }, [coberturas, busqueda]);

  const alternar = (valor: number) =>
    setRequisitos((rs) =>
      rs.map((r) => (r.Valor === valor ? { ...r, Pedido: !r.Pedido } : r)),
    );

  const guardar = async () => {
    if (!elegida) return;
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      const elegidos = requisitos.filter((r) => r.Pedido).map((r) => r.Valor);
      setRequisitos(await clientesRequisitosService.guardar(elegida.Valor, elegidos));
      setCoberturas((cs) =>
        cs.map((c) => (c.Valor === elegida.Valor ? { ...c, Requisitos: elegidos.length } : c)),
      );
      setAviso('Requisitos guardados');
    } catch {
      setError('No se pudieron guardar los requisitos');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const esBase = elegida?.Valor === CLIENTE_BASE;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Requisitos por cobertura</h2>
          <button type="button" className={styles.cerrar} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <p className={styles.ayuda}>
          Elegí una cobertura para definir qué documentación pide al admitir. La entrada «Base»
          (Cliente 0) aplica solo cuando la cobertura no tiene requisitos propios. No se mezclan
          con los de cada cobertura.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {aviso && <div className={styles.aviso}>{aviso}</div>}

        <div className={styles.cuerpo}>
          <div className={styles.columnaCoberturas}>
            <div className={styles.buscador}>
              <Search size={15} />
              <input
                type="text"
                value={busqueda}
                placeholder="Buscar cobertura…"
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {cargandoCoberturas ? (
              <p className={styles.vacio}>Cargando coberturas…</p>
            ) : filtradas.length === 0 ? (
              <p className={styles.vacio}>Sin resultados</p>
            ) : (
              <ul className={styles.listaCoberturas}>
                {filtradas.map((c) => (
                  <li key={c.Valor}>
                    <button
                      type="button"
                      className={`${styles.itemCobertura} ${
                        elegida?.Valor === c.Valor ? styles.itemActivo : ''
                      }`}
                      onClick={() => void abrirCobertura(c)}
                    >
                      <span className={styles.nombreCobertura}>{c.Descripcion}</span>
                      <span className={styles.contadorCobertura}>{c.Requisitos}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.columnaRequisitos}>
            {!elegida ? (
              <p className={styles.vacio}>Elegí una cobertura de la lista.</p>
            ) : cargandoRequisitos ? (
              <p className={styles.vacio}>Cargando requisitos…</p>
            ) : (
              <>
                <h3 className={styles.tituloCobertura}>{elegida.Descripcion}</h3>
                <ul className={styles.listaRequisitos}>
                  {requisitos.map((r) => (
                    <li key={r.Valor}>
                      <label className={styles.filaRequisito}>
                        <input
                          type="checkbox"
                          checked={r.Pedido}
                          onChange={() => alternar(r.Valor)}
                        />
                        <span className={styles.nombreRequisito}>{r.Descripcion}</span>
                        <span className={styles.metaRequisito}>
                          {r.Aplicable || '—'}
                          {r.EsDeBase && !esBase && (
                            <em className={styles.tagBase}> · de base</em>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <div className={styles.acciones}>
                  <button
                    type="button"
                    className={styles.guardar}
                    disabled={guardando}
                    onClick={() => void guardar()}
                  >
                    {guardando ? <Check size={15} /> : <Save size={15} />}
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
