'use client';

import { useEffect, useMemo, useState } from 'react';
import { BedDouble } from 'lucide-react';
import { bedsService } from '@/app/services/bedsService';
import type { Bed } from '@/app/types/beds';
import type { CamaSeleccionada } from '@/app/types/admisionNueva';
import styles from './styles.module.css';

interface Props {
  seleccion: CamaSeleccionada | null;
  onSeleccionar: (cama: CamaSeleccionada | null) => void;
  disabled?: boolean;
}

export default function CamaSelector({ seleccion, onSeleccionar, disabled }: Props) {
  const [sectores, setSectores] = useState<{ valor: string; descripcion: string }[]>([]);
  const [sector, setSector] = useState(seleccion?.valorSector ?? '');
  const [camas, setCamas] = useState<Bed[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    bedsService
      .getSectores()
      .then((rows) => {
        if (vivo) setSectores(rows.map((s) => ({ valor: s.valor, descripcion: s.descripcion })));
      })
      .catch(() => setError('No se pudieron cargar los sectores'));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!sector) {
      setCamas([]);
      return;
    }
    let vivo = true;
    setCargando(true);
    setError('');
    bedsService
      .getAllBeds(sector)
      .then((rows) => {
        if (vivo) setCamas(rows);
      })
      .catch(() => vivo && setError('No se pudieron cargar las camas del sector'))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [sector]);

  // 'U' es el estado libre en imHabitacionCamas; asignar cualquier otro lo rechaza el backend.
  const libres = useMemo(
    () =>
      camas.filter(
        (c) =>
          c.tipoRecurso === 'cama' &&
          String(c.valorEstadoOriginal || '').trim().toUpperCase() === 'U',
      ),
    [camas],
  );

  return (
    <div className={styles.bloque}>
      <div className={styles.bloqueHeader}>
        <h2>
          <BedDouble size={18} /> Ubicación
        </h2>
        {seleccion && (
          <button
            type="button"
            className={styles.botonSecundario}
            disabled={disabled}
            onClick={() => {
              onSeleccionar(null);
              setSector('');
            }}
          >
            Internar sin cama
          </button>
        )}
      </div>

      <p className={styles.ayuda}>
        La clase de paciente es Internado. Elegí sector y cama libre, o dejalo sin asignar y
        ubicalo después desde Camas.
      </p>

      <div className={styles.grillaCampos}>
        <label className={styles.campo}>
          <span>Sector</span>
          <select
            value={sector}
            disabled={disabled}
            onChange={(e) => {
              setSector(e.target.value);
              onSeleccionar(null);
            }}
          >
            <option value="">Sin asignar</option>
            {sectores.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.descripcion || s.valor}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.campo}>
          <span>Cama libre</span>
          <select
            value={seleccion?.bedId ?? ''}
            disabled={disabled || !sector || cargando}
            onChange={(e) =>
              onSeleccionar(e.target.value ? { bedId: e.target.value, valorSector: sector } : null)
            }
          >
            <option value="">
              {cargando
                ? 'Cargando…'
                : !sector
                  ? 'Elegí un sector'
                  : libres.length === 0
                    ? 'Sin camas libres en el sector'
                    : 'Sin asignar'}
            </option>
            {libres.map((c) => (
              <option key={c.id} value={c.numeroCama}>
                {c.numeroCama}
                {c.estadoDescripcion ? ` — ${c.estadoDescripcion}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className={styles.errorInline}>{error}</p>}
    </div>
  );
}
