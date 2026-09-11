'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import visitaAcompanantesService from '@/app/services/visitaAcompanantesService';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
  Acompanante,
  CatalogosAcompanantes,
  Novedad,
  NuevoAcompanante,
  OpcionCatalogo,
} from '@/app/types/visitaAcompanantes';
import styles from './AdmissionAcompanantesNovedades.module.css';

type Props = {
  numeroVisita: number | null;
  onSaved?: () => void;
};

const TIPOS_DOCUMENTO = [
  { value: '', label: '—' },
  { value: 'DNI', label: 'DNI' },
  { value: 'LC', label: 'LC' },
  { value: 'LE', label: 'LE' },
  { value: 'PAS', label: 'PAS' },
];

const ACOMPANANTE_VACIO: NuevoAcompanante = {
  apellidos: '',
  parentesco: '',
  rolContacto: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  telefono: '',
  telefonoAlternativo: '',
  direccion: '',
};

const CATALOGOS_VACIOS: CatalogosAcompanantes = { parentescos: [], rolesContacto: [] };

function opciones(lista: OpcionCatalogo[], vacio: string) {
  return [
    { value: '', label: vacio },
    ...lista.map((o) => ({ value: o.Valor, label: o.Descripcion || o.Valor })),
  ];
}

function fechaHora(fechaISO: string, horaISO: string): string {
  const f = (fechaISO || '').slice(0, 10);
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  const dia = `${d}/${m}/${y}`;
  return horaISO ? `${dia} ${horaISO}` : dia;
}

export default function AdmissionAcompanantesNovedades({ numeroVisita, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [catalogos, setCatalogos] = useState<CatalogosAcompanantes>(CATALOGOS_VACIOS);
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);

  const [nuevo, setNuevo] = useState<NuevoAcompanante>(ACOMPANANTE_VACIO);
  const [guardandoAcompanante, setGuardandoAcompanante] = useState(false);
  const [borrandoAcompanante, setBorrandoAcompanante] = useState('');

  const [observaciones, setObservaciones] = useState('');
  const [observacionesGuardadas, setObservacionesGuardadas] = useState('');
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);

  const [nuevaNovedad, setNuevaNovedad] = useState('');
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);
  const [borrandoNovedad, setBorrandoNovedad] = useState('');

  const load = useCallback(async () => {
    if (!numeroVisita) return;
    try {
      setLoading(true);
      setError('');
      const panel = await visitaAcompanantesService.getPanel(numeroVisita);
      setCatalogos(panel.catalogos || CATALOGOS_VACIOS);
      setAcompanantes(panel.acompanantes || []);
      setNovedades(panel.novedades || []);
      setObservaciones(panel.observaciones || '');
      setObservacionesGuardadas(panel.observaciones || '');
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al cargar acompañantes y novedades'));
    } finally {
      setLoading(false);
    }
  }, [numeroVisita]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCampo = <K extends keyof NuevoAcompanante>(key: K, value: NuevoAcompanante[K]) => {
    setNuevo((n) => ({ ...n, [key]: value }));
  };

  const observacionSucia = observaciones !== observacionesGuardadas;

  const puedeAgregarAcompanante = useMemo(
    () => Boolean(nuevo.apellidos.trim() && nuevo.parentesco.trim()),
    [nuevo.apellidos, nuevo.parentesco],
  );

  const onAgregarAcompanante = async () => {
    if (!numeroVisita || !puedeAgregarAcompanante) return;
    try {
      setGuardandoAcompanante(true);
      setError('');
      setSuccess('');
      setAcompanantes(await visitaAcompanantesService.agregarAcompanante(numeroVisita, nuevo));
      setNuevo(ACOMPANANTE_VACIO);
      setSuccess('Acompañante agregado');
      onSaved?.();
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al agregar el acompañante'));
    } finally {
      setGuardandoAcompanante(false);
    }
  };

  const onQuitarAcompanante = async (a: Acompanante) => {
    if (!numeroVisita) return;
    const id = `${a.Apellidos}|${a.FechaCarga}|${a.HoraCarga}`;
    try {
      setBorrandoAcompanante(id);
      setError('');
      setSuccess('');
      setAcompanantes(
        await visitaAcompanantesService.quitarAcompanante(numeroVisita, {
          apellidos: a.Apellidos,
          parentesco: a.Parentesco,
          fechaComienzo: a.FechaComienzo,
          fechaFin: a.FechaFin,
          fechaCarga: a.FechaCarga,
          horaCarga: a.HoraCarga,
        }),
      );
      onSaved?.();
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al quitar el acompañante'));
    } finally {
      setBorrandoAcompanante('');
    }
  };

  const onGuardarObservacion = async () => {
    if (!numeroVisita) return;
    try {
      setGuardandoObservacion(true);
      setError('');
      setSuccess('');
      const guardada = await visitaAcompanantesService.guardarObservacion(
        numeroVisita,
        observaciones,
      );
      setObservaciones(guardada);
      setObservacionesGuardadas(guardada);
      setSuccess('Observación guardada');
      onSaved?.();
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al guardar la observación'));
    } finally {
      setGuardandoObservacion(false);
    }
  };

  const onAgregarNovedad = async () => {
    if (!numeroVisita || !nuevaNovedad.trim()) return;
    try {
      setGuardandoNovedad(true);
      setError('');
      setSuccess('');
      setNovedades(await visitaAcompanantesService.agregarNovedad(numeroVisita, nuevaNovedad));
      setNuevaNovedad('');
      setSuccess('Novedad registrada');
      onSaved?.();
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al registrar la novedad'));
    } finally {
      setGuardandoNovedad(false);
    }
  };

  const onQuitarNovedad = async (n: Novedad) => {
    if (!numeroVisita) return;
    const id = `${n.FechaCarga}|${n.HoraCarga}`;
    try {
      setBorrandoNovedad(id);
      setError('');
      setSuccess('');
      setNovedades(
        await visitaAcompanantesService.quitarNovedad(numeroVisita, n.FechaCarga, n.HoraCarga),
      );
      onSaved?.();
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'Error al quitar la novedad'));
    } finally {
      setBorrandoNovedad('');
    }
  };

  if (!numeroVisita) {
    return <div className={styles.empty}>Seleccioná una visita para ver sus acompañantes.</div>;
  }

  if (loading && acompanantes.length === 0 && novedades.length === 0) {
    return (
      <div className={styles.loadingWrap}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Acompañantes</h4>
        <p className={styles.sectionHint}>
          Personas que acompañan al paciente durante esta visita.
        </p>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Apellido y nombre *</span>
            <input
              className={styles.input}
              maxLength={40}
              value={nuevo.apellidos}
              onChange={(e) => setCampo('apellidos', e.target.value)}
              placeholder="PEREZ JUAN CARLOS"
            />
          </label>

          <div className={styles.selectCell}>
            <CustomSelect
              label="Parentesco *"
              name="parentesco"
              value={nuevo.parentesco}
              onChange={(v) => setCampo('parentesco', String(v))}
              options={opciones(catalogos.parentescos, 'Seleccionar…')}
              isLoading={false}
            />
          </div>

          <div className={styles.selectCell}>
            <CustomSelect
              label="Rol de contacto"
              name="rolContacto"
              value={nuevo.rolContacto}
              onChange={(v) => setCampo('rolContacto', String(v))}
              options={opciones(catalogos.rolesContacto, 'Sin rol')}
              isLoading={false}
            />
          </div>

          <div className={styles.selectCell}>
            <CustomSelect
              label="Tipo de documento"
              name="tipoDocumento"
              value={nuevo.tipoDocumento}
              onChange={(v) => setCampo('tipoDocumento', String(v))}
              options={TIPOS_DOCUMENTO}
              isLoading={false}
            />
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Nº de documento</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={nuevo.numeroDocumento}
              onChange={(e) => setCampo('numeroDocumento', e.target.value.replace(/\D/g, ''))}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Teléfono</span>
            <input
              className={styles.input}
              maxLength={20}
              value={nuevo.telefono}
              onChange={(e) => setCampo('telefono', e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Teléfono alternativo</span>
            <input
              className={styles.input}
              maxLength={20}
              value={nuevo.telefonoAlternativo}
              onChange={(e) => setCampo('telefonoAlternativo', e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Domicilio</span>
            <input
              className={styles.input}
              maxLength={40}
              value={nuevo.direccion}
              onChange={(e) => setCampo('direccion', e.target.value)}
            />
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void onAgregarAcompanante()}
              disabled={!puedeAgregarAcompanante || guardandoAcompanante}
            >
              {guardandoAcompanante ? 'Agregando…' : 'Agregar acompañante'}
            </button>
          </div>
        </div>

        {acompanantes.length === 0 ? (
          <div className={styles.empty}>Sin acompañantes cargados</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Apellido y nombre</th>
                  <th>Parentesco</th>
                  <th>Rol</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Domicilio</th>
                  <th>Cargado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {acompanantes.map((a) => {
                  const id = `${a.Apellidos}|${a.FechaCarga}|${a.HoraCarga}`;
                  const tel = [a.Telefono, a.TelefonoAlternativo].filter(Boolean).join(' / ');
                  return (
                    <tr key={id}>
                      <td>{a.Apellidos}</td>
                      <td>{a.ParentescoDescripcion || a.Parentesco || '—'}</td>
                      <td>{a.RolContactoDescripcion || a.RolContacto || '—'}</td>
                      <td>
                        {a.NumeroDocumento > 0
                          ? `${a.TipoDocumento || ''} ${a.NumeroDocumento}`.trim()
                          : '—'}
                      </td>
                      <td>{tel || '—'}</td>
                      <td>{a.Direccion || '—'}</td>
                      <td>
                        {fechaHora(a.FechaCargaISO, a.HoraCargaISO)}
                        {a.OperadorNombre ? ` · ${a.OperadorNombre}` : ''}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.btnLink}
                          onClick={() => void onQuitarAcompanante(a)}
                          disabled={borrandoAcompanante === id}
                        >
                          {borrandoAcompanante === id ? 'Quitando…' : 'Quitar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Observación de la visita</h4>
        <p className={styles.sectionHint}>
          Texto libre que queda asociado a la visita. Se pisa cada vez que se guarda.
        </p>
        <textarea
          className={styles.textarea}
          maxLength={1000}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Ej.: no tiene DNI, se extravió recientemente."
        />
        <div className={styles.contador}>{observaciones.length} / 1000</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void onGuardarObservacion()}
            disabled={guardandoObservacion || !observacionSucia}
          >
            {guardandoObservacion ? 'Guardando…' : 'Guardar observación'}
          </button>
          {observacionSucia ? (
            <button
              type="button"
              className={styles.btn}
              onClick={() => setObservaciones(observacionesGuardadas)}
              disabled={guardandoObservacion}
            >
              Descartar cambios
            </button>
          ) : null}
        </div>
      </section>

      <hr className={styles.divider} />

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Novedades</h4>
        <p className={styles.sectionHint}>
          Cada novedad queda fechada con el momento en que se carga y el usuario de la sesión.
        </p>
        <textarea
          className={styles.textarea}
          maxLength={1000}
          value={nuevaNovedad}
          onChange={(e) => setNuevaNovedad(e.target.value)}
          placeholder="Escribí la novedad…"
        />
        <div className={styles.contador}>{nuevaNovedad.length} / 1000</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void onAgregarNovedad()}
            disabled={guardandoNovedad || !nuevaNovedad.trim()}
          >
            {guardandoNovedad ? 'Registrando…' : 'Agregar novedad'}
          </button>
        </div>

        {novedades.length === 0 ? (
          <div className={styles.empty}>Sin novedades registradas</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Novedad</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {novedades.map((n) => {
                  const id = `${n.FechaCarga}|${n.HoraCarga}`;
                  return (
                    <tr key={id}>
                      <td>{fechaHora(n.FechaCargaISO, n.HoraCargaISO)}</td>
                      <td>{n.OperadorNombre || (n.CodOperador ? String(n.CodOperador) : '—')}</td>
                      <td className={styles.novedadTexto}>{n.Novedad || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.btnLink}
                          onClick={() => void onQuitarNovedad(n)}
                          disabled={borrandoNovedad === id}
                        >
                          {borrandoNovedad === id ? 'Quitando…' : 'Quitar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
