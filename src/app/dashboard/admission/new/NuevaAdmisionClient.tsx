'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardPlus, RotateCcw, Save, Stethoscope, UserRound } from 'lucide-react';

import PacienteSelector, {
  type PacienteElegido,
} from '@/app/components/admission/NuevaAdmision/PacienteSelector';
import RequisitosDocumentos from '@/app/components/admission/NuevaAdmision/RequisitosDocumentos';
import CamaSelector from '@/app/components/admission/NuevaAdmision/CamaSelector';
import { useBorradorAdmision } from '@/app/components/admission/NuevaAdmision/useBorradorAdmision';

import admisionNuevaService from '@/app/services/admisionNuevaService';
import { admissionApiErrorMessage, type AdmissionCatalogOption } from '@/app/services/admissionSearchService';
import { getPersonalList } from '@/app/services/personalService';
import diagnosticosService from '@/app/services/diagnosticosService';
import { getPatientById } from '@/app/services/patientService';
import { useAppContext } from '@/app/contexts/AppContext';

import type {
  AdmisionCreada,
  AdmisionNuevaCatalogos,
  CamaSeleccionada,
  RequisitoCobertura,
  RequisitoFormulario,
} from '@/app/types/admisionNueva';
import type { DiagnosticoCie10 } from '@/app/types/diagnosticos';
import type { Personal } from '@/app/types/personal';

import styles from '@/app/components/admission/NuevaAdmision/styles.module.css';

type CampoProfesional = 'doctorAdmisor' | 'doctorAsistiendo' | 'doctorCabecera';

interface FormState {
  fechaAdmision: string;
  horaAdmision: string;
  clasePaciente: string;
  tipoAdmision: string;
  idLugarEpisodio: string;
  centroSalud: string;
  diagnostico: string;
  diagnosticoDescripcion: string;
  estadoAmbulatorio: string;
  doctorAdmisor: string;
  doctorAdmisorNombre: string;
  doctorAsistiendo: string;
  doctorAsistiendoNombre: string;
  doctorCabecera: string;
  doctorCabeceraNombre: string;
  cliente: string;
  contrato: string;
  tipoPaciente: string;
  numeroInternacion: string;
  observaciones: string;
}

function ahoraLocal(): { fecha: string; hora: string } {
  const d = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return {
    fecha: `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`,
    hora: `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`,
  };
}

function formInicial(): FormState {
  const { fecha, hora } = ahoraLocal();
  return {
    fechaAdmision: fecha,
    horaAdmision: hora,
    clasePaciente: '',
    tipoAdmision: '',
    idLugarEpisodio: '',
    centroSalud: '',
    diagnostico: '',
    diagnosticoDescripcion: '',
    estadoAmbulatorio: '',
    doctorAdmisor: '',
    doctorAdmisorNombre: '',
    doctorAsistiendo: '',
    doctorAsistiendoNombre: '',
    doctorCabecera: '',
    doctorCabeceraNombre: '',
    cliente: '',
    contrato: '',
    tipoPaciente: '',
    numeroInternacion: '',
    observaciones: '',
  };
}

function opcion(o: AdmissionCatalogOption): { valor: string; label: string } {
  const valor = String(o.Valor ?? '').trim();
  const desc = String(o.Descripcion ?? '').trim();
  return { valor, label: desc || valor || '—' };
}

function requisitoDesdeCatalogo(r: RequisitoCobertura): RequisitoFormulario {
  return {
    valor: r.Valor,
    descripcion: r.Descripcion,
    aplicable: r.Aplicable,
    deCobertura: r.DeCobertura,
    archivo: null,
    estado: 'pendiente',
  };
}

export default function NuevaAdmisionClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { usuario } = useAppContext();

  const [form, setForm] = useState<FormState>(formInicial);
  const [paciente, setPaciente] = useState<PacienteElegido | null>(null);
  const [cama, setCama] = useState<CamaSeleccionada | null>(null);

  const [catalogos, setCatalogos] = useState<AdmisionNuevaCatalogos | null>(null);
  const [catalogoRequisitos, setCatalogoRequisitos] = useState<RequisitoCobertura[]>([]);
  const [requisitos, setRequisitos] = useState<RequisitoFormulario[]>([]);
  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<AdmisionCreada | null>(null);

  const [profBusqueda, setProfBusqueda] = useState('');
  const [profCampo, setProfCampo] = useState<CampoProfesional | null>(null);
  const [profResultados, setProfResultados] = useState<Personal[]>([]);

  const [diagBusqueda, setDiagBusqueda] = useState('');
  const [diagAbierto, setDiagAbierto] = useState(false);
  const [diagResultados, setDiagResultados] = useState<DiagnosticoCie10[]>([]);

  const esInternado = form.clasePaciente.trim().toUpperCase() === 'I';
  const bloqueado = guardando || Boolean(creada);

  const snapshot = useMemo(() => ({ form, paciente, cama, requisitos: requisitos.map((r) => r.valor) }), [
    form,
    paciente,
    cama,
    requisitos,
  ]);

  const idUsuario = usuario?.idValorpersonal ?? usuario?.valorPersonal ?? usuario?.idCodOperador ?? null;
  const { borradorGuardado, limpiar: limpiarBorrador, descartarAviso } = useBorradorAdmision(
    idUsuario,
    snapshot,
    !creada,
  );

  useEffect(() => {
    admisionNuevaService
      .getCatalogos()
      .then(setCatalogos)
      .catch((e) => setError(admissionApiErrorMessage(e, 'Error al cargar los catálogos')));
    admisionNuevaService.getRequisitosCatalogo().then(setCatalogoRequisitos).catch(() => {});
  }, []);

  // Alta iniciada desde la ficha del paciente: /dashboard/admission/new?idPaciente=123
  const idPacienteUrl = params.get('idPaciente');
  useEffect(() => {
    const id = Number(idPacienteUrl);
    if (!Number.isFinite(id) || id <= 0) return;
    getPatientById(id)
      .then((p) =>
        setPaciente({
          idPaciente: Number(p.IDPaciente),
          apellidoyNombre: String(p.ApellidoyNombre || '').trim(),
          documento: String(p.NumeroDocumento || '').trim(),
          numeroHC: String(p.NumeroHC || '').trim(),
          cobertura: String(p.Cobertura || '').trim(),
        }),
      )
      .catch(() => {});
  }, [idPacienteUrl]);

  const cargarRequisitos = useCallback(async (cliente: number) => {
    try {
      setCargandoRequisitos(true);
      const rows = await admisionNuevaService.getRequisitosCobertura(cliente);
      setRequisitos(rows.map(requisitoDesdeCatalogo));
    } catch (e) {
      setError(admissionApiErrorMessage(e, 'Error al cargar los requisitos de la cobertura'));
    } finally {
      setCargandoRequisitos(false);
    }
  }, []);

  // Requisitos y convenios dependen de la cobertura: cambian juntos.
  const clienteActual = form.cliente;
  useEffect(() => {
    const cli = Number(clienteActual) || 0;
    void cargarRequisitos(cli);
    admisionNuevaService
      .getCatalogos(cli)
      .then((c) => setCatalogos((prev) => (prev ? { ...prev, convenios: c.convenios } : c)))
      .catch(() => {});
  }, [clienteActual, cargarRequisitos]);

  useEffect(() => {
    if (!paciente?.cobertura) return;
    const cob = String(paciente.cobertura).trim();
    if (cob && Number(cob) > 0) setForm((f) => (f.cliente ? f : { ...f, cliente: cob }));
  }, [paciente]);

  useEffect(() => {
    const q = profBusqueda.trim();
    if (!profCampo || q.length < 2) {
      setProfResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await getPersonalList(1, 20, q);
        setProfResultados(res.data || []);
      } catch {
        setProfResultados([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [profBusqueda, profCampo]);

  useEffect(() => {
    const q = diagBusqueda.trim();
    if (q.length < 3) {
      setDiagResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setDiagResultados(await diagnosticosService.buscarDiagnosticosCie10(q));
      } catch {
        setDiagResultados([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [diagBusqueda]);

  const setCampo = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const elegirProfesional = (p: Personal) => {
    if (!profCampo) return;
    const nombreCampo = `${profCampo}Nombre` as keyof FormState;
    setForm((f) => ({
      ...f,
      [profCampo]: String(p.Valor),
      [nombreCampo]: String(p.ApellidoNombre || '').trim(),
    }));
    setProfCampo(null);
    setProfBusqueda('');
    setProfResultados([]);
  };

  const restaurarBorrador = () => {
    if (!borradorGuardado) return;
    setForm(borradorGuardado.form);
    setPaciente(borradorGuardado.paciente);
    setCama(borradorGuardado.cama);
    descartarAviso();
  };

  const limpiarFormulario = () => {
    setForm(formInicial());
    setPaciente(null);
    setCama(null);
    setRequisitos([]);
    setError('');
    limpiarBorrador();
  };

  const onArchivo = (valor: number, archivo: File | null) =>
    setRequisitos((rs) =>
      rs.map((r) => (r.valor === valor ? { ...r, archivo, estado: 'pendiente', error: undefined } : r)),
    );

  const onQuitarRequisito = (valor: number) =>
    setRequisitos((rs) => rs.filter((r) => r.valor !== valor));

  const onAgregarRequisito = (valor: number) => {
    const encontrado = catalogoRequisitos.find((c) => c.Valor === valor);
    if (!encontrado) return;
    setRequisitos((rs) =>
      rs.some((r) => r.valor === valor)
        ? rs
        : [...rs, { ...requisitoDesdeCatalogo(encontrado), deCobertura: false }],
    );
  };

  const validar = (): string => {
    if (!paciente) return 'Seleccioná un paciente';
    if (!form.clasePaciente) return 'Elegí la clase de paciente';
    if (!form.fechaAdmision) return 'Indicá la fecha de admisión';
    return '';
  };

  const guardar = async () => {
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    setGuardando(true);
    setError('');

    try {
      const resultado = await admisionNuevaService.crear({
        idPaciente: paciente!.idPaciente,
        fechaAdmision: form.fechaAdmision,
        horaAdmision: form.horaAdmision,
        clasePaciente: form.clasePaciente,
        tipoAdmision: form.tipoAdmision,
        tipoPaciente: form.tipoPaciente,
        idLugarEpisodio: form.idLugarEpisodio,
        centroSalud: form.centroSalud,
        diagnostico: form.diagnostico,
        estadoAmbulatorio: form.estadoAmbulatorio,
        doctorAdmisor: form.doctorAdmisor,
        doctorAsistiendo: form.doctorAsistiendo,
        doctorCabecera: form.doctorCabecera,
        cliente: form.cliente,
        contrato: form.contrato,
        numeroInternacion: form.numeroInternacion,
        observaciones: form.observaciones,
        requisitos: requisitos.map((r) => r.valor),
        cama: esInternado ? cama : null,
      });

      setCreada(resultado);
      limpiarBorrador();

      // La visita ya existe: cada imagen se sube aparte para poder reintentar
      // una sola sin repetir el alta.
      const pendientes = requisitos.filter((r) => r.archivo);
      for (const r of pendientes) {
        setRequisitos((rs) =>
          rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'subiendo' } : x)),
        );
        try {
          await admisionNuevaService.subirArchivoRequisito(
            resultado.numeroVisita,
            r.valor,
            r.archivo!,
          );
          setRequisitos((rs) =>
            rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'ok' } : x)),
          );
        } catch (e) {
          const mensaje = admissionApiErrorMessage(e, 'No se pudo subir el archivo');
          setRequisitos((rs) =>
            rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'error', error: mensaje } : x)),
          );
        }
      }
    } catch (e) {
      setError(admissionApiErrorMessage(e, 'Error al crear la admisión'));
    } finally {
      setGuardando(false);
    }
  };

  const reintentarArchivos = async () => {
    if (!creada) return;
    const fallidos = requisitos.filter((r) => r.estado === 'error' && r.archivo);
    for (const r of fallidos) {
      setRequisitos((rs) => rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'subiendo' } : x)));
      try {
        await admisionNuevaService.subirArchivoRequisito(creada.numeroVisita, r.valor, r.archivo!);
        setRequisitos((rs) => rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'ok' } : x)));
      } catch (e) {
        const mensaje = admissionApiErrorMessage(e, 'No se pudo subir el archivo');
        setRequisitos((rs) =>
          rs.map((x) => (x.valor === r.valor ? { ...x, estado: 'error', error: mensaje } : x)),
        );
      }
    }
  };

  const opciones = (lista?: AdmissionCatalogOption[]) => (lista ?? []).map(opcion);
  const hayFallidos = requisitos.some((r) => r.estado === 'error');

  if (creada) {
    return (
      <div className={styles.pagina}>
        <div className={styles.exito}>
          <h1>Admisión creada</h1>
          <p className={styles.exitoNumero}>N° de visita {creada.numeroVisita}</p>
          <p>{creada.paciente}</p>

          {creada.cama && !creada.cama.asignada && (
            <p className={styles.avisoCama}>
              La visita quedó creada pero la cama no se pudo asignar: {creada.cama.error}. Ubicá al
              paciente desde Camas.
            </p>
          )}
          {creada.cama?.asignada && (
            <p className={styles.exitoDetalle}>
              Cama asignada: {creada.cama.valorSector}-{creada.cama.bedId}
            </p>
          )}

          <RequisitosDocumentos
            requisitos={requisitos}
            catalogo={catalogoRequisitos}
            cargando={false}
            bloqueado
            onArchivo={() => {}}
            onQuitar={() => {}}
            onAgregar={() => {}}
          />

          <div className={styles.acciones}>
            {hayFallidos && (
              <button type="button" className={styles.botonSecundario} onClick={reintentarArchivos}>
                <RotateCcw size={16} /> Reintentar archivos con error
              </button>
            )}
            <button
              type="button"
              className={styles.botonSecundario}
              onClick={() => {
                setCreada(null);
                limpiarFormulario();
              }}
            >
              <ClipboardPlus size={16} /> Nueva admisión
            </button>
            <button
              type="button"
              className={styles.botonPrimario}
              onClick={() => router.push('/dashboard/admission/search')}
            >
              Ir a Consultar Historia Clínica
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <h1>
          <ClipboardPlus size={22} /> Nueva Admisión
        </h1>
        <p>Admisión ambulatoria o internación sobre la historia clínica del paciente.</p>
      </header>

      {borradorGuardado && (
        <div className={styles.avisoBorrador}>
          <span>Tenés una admisión sin terminar. Los archivos adjuntos hay que elegirlos de nuevo.</span>
          <div>
            <button type="button" className={styles.botonSecundario} onClick={restaurarBorrador}>
              Retomar
            </button>
            <button type="button" className={styles.botonTexto} onClick={limpiarBorrador}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.bloque}>
        <div className={styles.bloqueHeader}>
          <h2>
            <UserRound size={18} /> Paciente
          </h2>
        </div>
        <PacienteSelector
          paciente={paciente}
          onSeleccionar={setPaciente}
          onLimpiar={() => setPaciente(null)}
          disabled={bloqueado}
        />
      </div>

      <div className={styles.bloque}>
        <div className={styles.bloqueHeader}>
          <h2>
            <Stethoscope size={18} /> Datos principales
          </h2>
        </div>

        <div className={styles.grillaCampos}>
          <label className={styles.campo}>
            <span>Fecha de admisión *</span>
            <input
              type="date"
              value={form.fechaAdmision}
              disabled={bloqueado}
              onChange={(e) => setCampo('fechaAdmision', e.target.value)}
            />
          </label>

          <label className={styles.campo}>
            <span>Hora</span>
            <input
              type="time"
              value={form.horaAdmision}
              disabled={bloqueado}
              onChange={(e) => setCampo('horaAdmision', e.target.value)}
            />
          </label>

          <label className={styles.campo}>
            <span>Clase de paciente *</span>
            <select
              value={form.clasePaciente}
              disabled={bloqueado}
              onChange={(e) => setCampo('clasePaciente', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.clasesPaciente).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Tipo de admisión</span>
            <select
              value={form.tipoAdmision}
              disabled={bloqueado}
              onChange={(e) => setCampo('tipoAdmision', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.tiposAdmision).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Lugar del episodio</span>
            <select
              value={form.idLugarEpisodio}
              disabled={bloqueado}
              onChange={(e) => setCampo('idLugarEpisodio', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.lugaresEpisodio).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Derivado de</span>
            <select
              value={form.centroSalud}
              disabled={bloqueado}
              onChange={(e) => setCampo('centroSalud', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.centrosSalud).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className={`${styles.campo} ${styles.campoAncho}`}>
            <span>Diagnóstico</span>
            <div className={styles.autocomplete}>
              <input
                type="text"
                value={
                  diagAbierto
                    ? diagBusqueda
                    : form.diagnostico
                      ? `${form.diagnostico.trim()} — ${form.diagnosticoDescripcion}`
                      : ''
                }
                placeholder="Buscar por código CIE-10 o descripción"
                disabled={bloqueado}
                onFocus={() => {
                  setDiagAbierto(true);
                  setDiagBusqueda('');
                }}
                onBlur={() => setTimeout(() => setDiagAbierto(false), 150)}
                onChange={(e) => setDiagBusqueda(e.target.value)}
              />
              {diagAbierto && diagResultados.length > 0 && (
                <ul className={styles.resultados}>
                  {diagResultados.map((d) => (
                    <li key={`${d.idDiagnostico}-${d.CodigoOMS}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            diagnostico: String(d.CodigoOMS || '').trim(),
                            diagnosticoDescripcion: d.descripcion,
                          }));
                          setDiagAbierto(false);
                        }}
                      >
                        <span className={styles.resultadoNombre}>{d.CodigoOMS}</span>
                        <span className={styles.resultadoMeta}>{d.descripcion}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <label className={styles.campo}>
            <span>Estado ambulatorio</span>
            <select
              value={form.estadoAmbulatorio}
              disabled={bloqueado}
              onChange={(e) => setCampo('estadoAmbulatorio', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.estadosAmbulatorios).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {(['doctorAdmisor', 'doctorAsistiendo', 'doctorCabecera'] as CampoProfesional[]).map(
            (campo) => {
              const etiquetas: Record<CampoProfesional, string> = {
                doctorAdmisor: 'Profesional que interna',
                doctorAsistiendo: 'Profesional que asiste',
                doctorCabecera: 'Profesional de cabecera',
              };
              const nombre = form[`${campo}Nombre` as keyof FormState] as string;
              const activo = profCampo === campo;
              return (
                <div key={campo} className={styles.campo}>
                  <span>{etiquetas[campo]}</span>
                  <div className={styles.autocomplete}>
                    <input
                      type="text"
                      value={activo ? profBusqueda : nombre}
                      placeholder="Buscar por apellido o matrícula"
                      disabled={bloqueado}
                      onFocus={() => {
                        setProfCampo(campo);
                        setProfBusqueda('');
                      }}
                      onBlur={() => setTimeout(() => setProfCampo(null), 150)}
                      onChange={(e) => setProfBusqueda(e.target.value)}
                    />
                    {activo && profResultados.length > 0 && (
                      <ul className={styles.resultados}>
                        {profResultados.map((p) => (
                          <li key={p.Valor}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => elegirProfesional(p)}
                            >
                              <span className={styles.resultadoNombre}>{p.ApellidoNombre}</span>
                              <span className={styles.resultadoMeta}>
                                Matrícula {p.MatriculaProvincial ?? p.MatriculaNacional ?? '—'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            },
          )}

          <label className={styles.campo}>
            <span>Cobertura</span>
            <select
              value={form.cliente}
              disabled={bloqueado}
              onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value, contrato: '' }))}
            >
              <option value="">Sin cobertura</option>
              {opciones(catalogos?.coberturas).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Convenio / plan</span>
            <select
              value={form.contrato}
              disabled={bloqueado || !form.cliente}
              onChange={(e) => setCampo('contrato', e.target.value)}
            >
              <option value="">{form.cliente ? 'Seleccionar…' : 'Elegí una cobertura'}</option>
              {opciones(catalogos?.convenios).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span>Tipo de paciente</span>
            <select
              value={form.tipoPaciente}
              disabled={bloqueado}
              onChange={(e) => setCampo('tipoPaciente', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {opciones(catalogos?.tiposPaciente).map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {esInternado && (
            <label className={styles.campo}>
              <span>N° de internación</span>
              <input
                type="text"
                value={form.numeroInternacion}
                maxLength={40}
                disabled={bloqueado}
                onChange={(e) => setCampo('numeroInternacion', e.target.value)}
              />
            </label>
          )}

          <label className={`${styles.campo} ${styles.campoAncho}`}>
            <span>Observaciones</span>
            <textarea
              value={form.observaciones}
              maxLength={1000}
              rows={2}
              disabled={bloqueado}
              onChange={(e) => setCampo('observaciones', e.target.value)}
            />
          </label>
        </div>
      </div>

      <RequisitosDocumentos
        requisitos={requisitos}
        catalogo={catalogoRequisitos}
        cargando={cargandoRequisitos}
        bloqueado={bloqueado}
        onArchivo={onArchivo}
        onQuitar={onQuitarRequisito}
        onAgregar={onAgregarRequisito}
      />

      {esInternado && (
        <CamaSelector seleccion={cama} onSeleccionar={setCama} disabled={bloqueado} />
      )}

      <div className={styles.acciones}>
        <button
          type="button"
          className={styles.botonTexto}
          disabled={guardando}
          onClick={limpiarFormulario}
        >
          Limpiar
        </button>
        <button
          type="button"
          className={styles.botonPrimario}
          disabled={guardando}
          onClick={guardar}
        >
          <Save size={16} /> {guardando ? 'Guardando…' : 'Confirmar admisión'}
        </button>
      </div>
    </div>
  );
}
