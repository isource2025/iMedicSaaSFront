'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import visitaAcompanantesService from '@/app/services/visitaAcompanantesService';
import type {
  CatalogosAcompanantes,
  NuevoAcompanante,
  OpcionCatalogo,
} from '@/app/types/visitaAcompanantes';
import styles from './styles.module.css';

export type AcompanantePendiente = NuevoAcompanante & { idLocal: string };

type Props = {
  acompanantes: AcompanantePendiente[];
  novedades: string[];
  disabled?: boolean;
  onAcompanantesChange: (lista: AcompanantePendiente[]) => void;
  onNovedadesChange: (lista: string[]) => void;
};

const VACIO: NuevoAcompanante = {
  apellidos: '',
  parentesco: '',
  rolContacto: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  telefono: '',
  telefonoAlternativo: '',
  direccion: '',
};

const TIPOS_DOCUMENTO = [
  { value: '', label: '—' },
  { value: 'DNI', label: 'DNI' },
  { value: 'LC', label: 'LC' },
  { value: 'LE', label: 'LE' },
  { value: 'PAS', label: 'PAS' },
];

function opciones(lista: OpcionCatalogo[], vacio: string) {
  return [
    { value: '', label: vacio },
    ...lista.map((o) => ({ value: o.Valor, label: o.Descripcion || o.Valor })),
  ];
}

/**
 * Acompañantes y novedades en el alta. Se acumulan en memoria y se graban
 * recién cuando existe NumeroVisita (después de Confirmar admisión).
 * La observación de la visita es el campo Observaciones del bloque principal.
 */
export default function AcompanantesNovedadesAlta({
  acompanantes,
  novedades,
  disabled,
  onAcompanantesChange,
  onNovedadesChange,
}: Props) {
  const [catalogos, setCatalogos] = useState<CatalogosAcompanantes>({
    parentescos: [],
    rolesContacto: [],
  });
  const [nuevo, setNuevo] = useState<NuevoAcompanante>(VACIO);
  const [textoNovedad, setTextoNovedad] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    visitaAcompanantesService
      .getCatalogos()
      .then(setCatalogos)
      .catch(() => setError('No se pudieron cargar parentescos y roles de contacto'));
  }, []);

  const agregarAcompanante = () => {
    const apellidos = String(nuevo.apellidos || '').trim();
    if (!apellidos) {
      setError('El apellido del acompañante es obligatorio');
      return;
    }
    if (!nuevo.parentesco) {
      setError('Elegí el parentesco');
      return;
    }
    setError('');
    onAcompanantesChange([
      ...acompanantes,
      { ...nuevo, apellidos, idLocal: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    ]);
    setNuevo(VACIO);
  };

  const agregarNovedad = () => {
    const t = textoNovedad.trim();
    if (!t) return;
    onNovedadesChange([...novedades, t]);
    setTextoNovedad('');
  };

  const labelParentesco = (valor: string) =>
    catalogos.parentescos.find((p) => p.Valor === valor)?.Descripcion || valor || '—';

  return (
    <div className={styles.bloque}>
      <div className={styles.bloqueHeader}>
        <h2>
          <Users size={18} /> Acompañantes y novedades
        </h2>
        <span className={styles.contador}>
          {acompanantes.length} acompañante{acompanantes.length === 1 ? '' : 's'} · {novedades.length}{' '}
          novedad{novedades.length === 1 ? '' : 'es'}
        </span>
      </div>

      <p className={styles.ayuda}>
        Se guardan al confirmar la admisión. La observación de la visita es el campo Observaciones
        de Datos principales.
      </p>

      {error ? <p className={styles.errorInline}>{error}</p> : null}

      <h3 className={styles.subBloqueTitulo}>Acompañantes</h3>
      <div className={styles.grillaCampos}>
        <label className={`${styles.campo} ${styles.campoAncho}`}>
          <span>Apellido y nombre</span>
          <input
            type="text"
            value={nuevo.apellidos}
            disabled={disabled}
            maxLength={80}
            onChange={(e) => setNuevo((n) => ({ ...n, apellidos: e.target.value }))}
          />
        </label>
        <div className={styles.campo}>
          <CustomSelect
            label="Parentesco"
            name="parentescoAlta"
            value={nuevo.parentesco}
            isLoading={false}
            disabled={disabled}
            onChange={(v) => setNuevo((n) => ({ ...n, parentesco: String(v ?? '') }))}
            options={opciones(catalogos.parentescos, 'Seleccionar…')}
          />
        </div>
        <div className={styles.campo}>
          <CustomSelect
            label="Rol de contacto"
            name="rolContactoAlta"
            value={nuevo.rolContacto}
            isLoading={false}
            disabled={disabled}
            onChange={(v) => setNuevo((n) => ({ ...n, rolContacto: String(v ?? '') }))}
            options={opciones(catalogos.rolesContacto, '—')}
          />
        </div>
        <div className={styles.campo}>
          <CustomSelect
            label="Tipo doc."
            name="tipoDocAlta"
            value={nuevo.tipoDocumento}
            isLoading={false}
            disabled={disabled}
            onChange={(v) => setNuevo((n) => ({ ...n, tipoDocumento: String(v ?? '') }))}
            options={TIPOS_DOCUMENTO}
          />
        </div>
        <label className={styles.campo}>
          <span>Nº documento</span>
          <input
            type="text"
            value={nuevo.numeroDocumento}
            disabled={disabled}
            maxLength={20}
            onChange={(e) => setNuevo((n) => ({ ...n, numeroDocumento: e.target.value }))}
          />
        </label>
        <label className={styles.campo}>
          <span>Teléfono</span>
          <input
            type="text"
            value={nuevo.telefono}
            disabled={disabled}
            maxLength={20}
            onChange={(e) => setNuevo((n) => ({ ...n, telefono: e.target.value }))}
          />
        </label>
        <label className={`${styles.campo} ${styles.campoAncho}`}>
          <span>Dirección</span>
          <input
            type="text"
            value={nuevo.direccion}
            disabled={disabled}
            maxLength={80}
            onChange={(e) => setNuevo((n) => ({ ...n, direccion: e.target.value }))}
          />
        </label>
      </div>
      <div className={styles.accionesBloque}>
        <button
          type="button"
          className={styles.botonSecundario}
          disabled={disabled}
          onClick={agregarAcompanante}
        >
          <Plus size={14} /> Agregar acompañante
        </button>
      </div>

      {acompanantes.length === 0 ? (
        <p className={styles.ayuda}>Todavía no hay acompañantes cargados.</p>
      ) : (
        <ul className={styles.listaSimple}>
          {acompanantes.map((a) => (
            <li key={a.idLocal} className={styles.filaSimple}>
              <div>
                <strong>{a.apellidos}</strong>
                <span className={styles.metaSimple}>
                  {labelParentesco(a.parentesco)}
                  {a.numeroDocumento ? ` · ${a.tipoDocumento || 'Doc'} ${a.numeroDocumento}` : ''}
                  {a.telefono ? ` · ${a.telefono}` : ''}
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className={styles.botonIcono}
                  title="Quitar"
                  onClick={() =>
                    onAcompanantesChange(acompanantes.filter((x) => x.idLocal !== a.idLocal))
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.subBloqueTitulo}>Novedades</h3>
      <label className={`${styles.campo} ${styles.campoAncho}`}>
        <span>Novedad</span>
        <textarea
          value={textoNovedad}
          rows={2}
          maxLength={500}
          disabled={disabled}
          onChange={(e) => setTextoNovedad(e.target.value)}
        />
      </label>
      <div className={styles.accionesBloque}>
        <button
          type="button"
          className={styles.botonSecundario}
          disabled={disabled || !textoNovedad.trim()}
          onClick={agregarNovedad}
        >
          <Plus size={14} /> Agregar novedad
        </button>
      </div>
      {novedades.length === 0 ? (
        <p className={styles.ayuda}>Todavía no hay novedades.</p>
      ) : (
        <ul className={styles.listaSimple}>
          {novedades.map((n, i) => (
            <li key={`${i}-${n.slice(0, 12)}`} className={styles.filaSimple}>
              <span>{n}</span>
              {!disabled && (
                <button
                  type="button"
                  className={styles.botonIcono}
                  title="Quitar"
                  onClick={() => onNovedadesChange(novedades.filter((_, idx) => idx !== i))}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
