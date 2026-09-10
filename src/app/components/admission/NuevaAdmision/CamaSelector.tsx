'use client';

import { useEffect, useMemo, useState } from 'react';
import { BedDouble } from 'lucide-react';
import { bedsService } from '@/app/services/bedsService';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
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
  const [cargandoSectores, setCargandoSectores] = useState(true);
  const [cargandoCamas, setCargandoCamas] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setCargandoSectores(true);
    bedsService
      .getSectores()
      .then((rows) => {
        if (vivo) setSectores(rows.map((s) => ({ valor: s.valor, descripcion: s.descripcion })));
      })
      .catch(() => vivo && setError('No se pudieron cargar los sectores'))
      .finally(() => vivo && setCargandoSectores(false));
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
    setCargandoCamas(true);
    setError('');
    bedsService
      .getAllBeds(sector)
      .then((rows) => {
        if (vivo) setCamas(rows);
      })
      .catch(() => vivo && setError('No se pudieron cargar las camas del sector'))
      .finally(() => vivo && setCargandoCamas(false));
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

  const opcionesSector = useMemo(
    () => [
      { value: '', label: 'Sin asignar' },
      ...sectores.map((s) => ({
        value: s.valor,
        label: s.descripcion || s.valor,
      })),
    ],
    [sectores],
  );

  const vacioCama = !sector
    ? 'Elegí un sector'
    : libres.length === 0
      ? 'Sin camas libres en el sector'
      : 'Sin asignar';

  const opcionesCama = useMemo(
    () => [
      { value: '', label: vacioCama },
      ...libres.map((c) => ({
        value: c.numeroCama,
        label: c.estadoDescripcion ? `${c.numeroCama} — ${c.estadoDescripcion}` : c.numeroCama,
      })),
    ],
    [libres, vacioCama],
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
        <div className={styles.campo}>
          <CustomSelect
            label="Sector"
            name="sectorCama"
            value={sector}
            isLoading={cargandoSectores}
            disabled={disabled}
            onChange={(v) => {
              setSector(String(v ?? ''));
              onSeleccionar(null);
            }}
            options={opcionesSector}
          />
        </div>

        <div className={styles.campo}>
          <CustomSelect
            label="Cama libre"
            name="camaLibre"
            value={seleccion?.bedId ?? ''}
            isLoading={cargandoCamas}
            disabled={disabled || !sector}
            onChange={(v) => {
              const bedId = String(v ?? '');
              onSeleccionar(bedId ? { bedId, valorSector: sector } : null);
            }}
            options={opcionesCama}
          />
        </div>
      </div>

      {error && <p className={styles.errorInline}>{error}</p>}
    </div>
  );
}
