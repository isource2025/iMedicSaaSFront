'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BedDouble, ClipboardPlus, Pencil, RotateCcw, Save, Stethoscope, UserRound } from 'lucide-react';

import PacienteSelector, {
  type PacienteElegido,
} from '@/app/components/admission/NuevaAdmision/PacienteSelector';
import RequisitosDocumentos from '@/app/components/admission/NuevaAdmision/RequisitosDocumentos';
import AcompanantesNovedadesAlta, {
  type AcompanantePendiente,
} from '@/app/components/admission/NuevaAdmision/AcompanantesNovedadesAlta';
import CamaSelector from '@/app/components/admission/NuevaAdmision/CamaSelector';
import AdmissionAcompanantesNovedades from '@/app/components/admission/AdmissionAcompanantesNovedades';
import AdmissionUbicacionMovimientosModal from '@/app/components/admission/AdmissionUbicacionMovimientosModal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import Loader from '@/app/components/Loader/Loader';

import admisionNuevaService from '@/app/services/admisionNuevaService';
import visitaAcompanantesService from '@/app/services/visitaAcompanantesService';
import {
  admissionApiErrorMessage,
  admissionSearchService,
  type AdmissionCatalogOption,
  type AdmissionDatosPrincipalesVisita,
} from '@/app/services/admissionSearchService';
import { getPersonalList } from '@/app/services/personalService';
import diagnosticosService from '@/app/services/diagnosticosService';
import { getPatientById } from '@/app/services/patientService';

import type {
  AdmisionCreada,
  AdmisionNuevaCatalogos,
  CamaSeleccionada,
  RequisitoCobertura,
  RequisitoFormulario,
  RequisitoVisita,
  UltimaVisitaPaciente,
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

function opcionesSelect(
  lista: AdmissionCatalogOption[] | undefined,
  vacio: string,
): { value: string; label: string }[] {
  return [
    { value: '', label: vacio },
    ...(lista ?? []).map((o) => {
      const value = String(o.Valor ?? '').trim();
      const desc = String(o.Descripcion ?? '').trim();
      return { value, label: desc || value || '—' };
    }),
  ];
}

function opcionesCobertura(
  lista: AdmissionCatalogOption[] | undefined,
  paciente: PacienteElegido | null,
): { value: string; label: string }[] {
  const base = opcionesSelect(lista, 'Sin cobertura');
  if (!paciente?.cobertura) return base;
  const cob = String(paciente.cobertura).trim();
  if (!cob || Number(cob) <= 0) return base;
  if (base.some((o) => o.value === cob)) return base;
  const label = String(paciente.coberturaDescripcion || '').trim() || cob;
  return [...base, { value: cob, label }];
}

function formDesdeVisita(v: AdmissionDatosPrincipalesVisita, observaciones = ''): FormState {
  const numPositivo = (n: unknown) => (n != null && Number(n) > 0 ? String(n) : '');
  return {
    fechaAdmision: String(v.FechaAdmision || '').slice(0, 10),
    horaAdmision: String(v.HoraAdmision || '').slice(0, 5),
    clasePaciente: String(v.ClasePaciente || '').trim(),
    tipoAdmision: String(v.TipoAdmision || '').trim(),
    idLugarEpisodio: v.IdLugarEpisodio != null && Number(v.IdLugarEpisodio) > 0 ? String(v.IdLugarEpisodio) : '',
    centroSalud: numPositivo(v.OrigenAdmision),
    diagnostico: String(v.Diagnostico || '').trim(),
    diagnosticoDescripcion: String(v.DiagnosticoDescripcion || '').trim(),
    estadoAmbulatorio: String(v.EstadoAmbulatorio || '').trim(),
    doctorAdmisor: numPositivo(v.DoctorAdmisor),
    doctorAdmisorNombre: String(v.DoctorAdmisorNombre || '').trim(),
    doctorAsistiendo: numPositivo(v.DoctorAsistiendo),
    doctorAsistiendoNombre: String(v.DoctorAsistiendoNombre || '').trim(),
    doctorCabecera: numPositivo(v.DoctorCabecera),
    doctorCabeceraNombre: String(v.DoctorCabeceraNombre || '').trim(),
    cliente: numPositivo(v.Cliente),
    contrato: v.Contrato != null && Number(v.Contrato) > 0 ? String(v.Contrato) : '',
    tipoPaciente: String(v.TipoPaciente || '').trim(),
    numeroInternacion: String(v.NumeroInternacion || '').trim(),
    observaciones,
  };
}

function requisitoDesdeVisita(r: RequisitoVisita): RequisitoFormulario {
  return {
    valor: r.Valor,
    descripcion: r.Descripcion,
    aplicable: r.Aplicable,
    deCobertura: true,
    deBase: false,
    archivo: null,
    estado: r.tieneArchivo ? 'ok' : 'pendiente',
    presentado: null,
  };
}

function requisitoDesdeCatalogo(r: RequisitoCobertura): RequisitoFormulario {
  return {
    valor: r.Valor,
    descripcion: r.Descripcion,
    aplicable: r.Aplicable,
    deCobertura: r.DeCobertura,
    deBase: Boolean(r.DeBase),
    archivo: null,
    // Si ya lo presentó en otra visita, el archivo se hereda al crear la admisión.
    estado: r.Presentado ? 'ok' : 'pendiente',
    presentado: r.Presentado,
  };
}

export default function NuevaAdmisionClient() {
  const router = useRouter();
  const params = useSearchParams();

  const numeroVisitaUrl = Number(params.get('numeroVisita') || 0);
  const enEdicion = Number.isFinite(numeroVisitaUrl) && numeroVisitaUrl > 0;
  const idPacienteUrl = enEdicion ? null : params.get('idPaciente');

  const [form, setForm] = useState<FormState>(formInicial);
  const [paciente, setPaciente] = useState<PacienteElegido | null>(null);
  const [ultimaVisita, setUltimaVisita] = useState<UltimaVisitaPaciente | null>(null);
  const [cama, setCama] = useState<CamaSeleccionada | null>(null);

  const [catalogos, setCatalogos] = useState<AdmisionNuevaCatalogos | null>(null);
  const [catalogoRequisitos, setCatalogoRequisitos] = useState<RequisitoCobertura[]>([]);
  const [requisitos, setRequisitos] = useState<RequisitoFormulario[]>([]);
  const [acompanantesPendientes, setAcompanantesPendientes] = useState<AcompanantePendiente[]>([]);
  const [novedadesPendientes, setNovedadesPendientes] = useState<string[]>([]);
  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(enEdicion);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<AdmisionCreada | null>(null);
  const [modoExito, setModoExito] = useState<'alta' | 'edicion' | null>(null);

  const [profBusqueda, setProfBusqueda] = useState('');
  const [profCampo, setProfCampo] = useState<CampoProfesional | null>(null);
  const [profResultados, setProfResultados] = useState<Personal[]>([]);

  const [diagBusqueda, setDiagBusqueda] = useState('');
  const [diagAbierto, setDiagAbierto] = useState(false);
  const [diagResultados, setDiagResultados] = useState<DiagnosticoCie10[]>([]);

  const esInternado = form.clasePaciente.trim().toUpperCase() === 'I';
  const bloqueado = guardando || Boolean(creada);

  // Limpia borradores viejos de sesiones anteriores (ya no se usan).
  useEffect(() => {
    try {
      const prefijo = 'imedic:admision-nueva:';
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefijo)) localStorage.removeItem(k);
      }
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  useEffect(() => {
    admisionNuevaService
      .getCatalogos()
      .then(setCatalogos)
      .catch((e) => setError(admissionApiErrorMessage(e, 'Error al cargar los catálogos')));
    admisionNuevaService.getRequisitosCatalogo().then(setCatalogoRequisitos).catch(() => {});
  }, []);

  // Alta: /new?idPaciente=123 — Edición: /new?numeroVisita=456
  useEffect(() => {
    setCreada(null);
    setModoExito(null);
    setError('');
    setCama(null);
    setAcompanantesPendientes([]);
    setNovedadesPendientes([]);
    setUltimaVisita(null);

    if (enEdicion) {
      let vigente = true;
      setCargandoEdicion(true);
      setRequisitos([]);
      void (async () => {
        try {
          const payload = await admissionSearchService.getDatosPrincipales(numeroVisitaUrl);
          if (!vigente) return;
          const v = payload.visita;
          const [panel, requisitosVisita, pacienteDb] = await Promise.all([
            visitaAcompanantesService.getPanel(numeroVisitaUrl).catch(() => null),
            admisionNuevaService.getRequisitosVisita(numeroVisitaUrl).catch(() => []),
            getPatientById(Number(v.IdPaciente)).catch(() => null),
          ]);
          if (!vigente) return;

          const cob = v.Cliente != null && Number(v.Cliente) > 0 ? String(v.Cliente) : '';
          setPaciente({
            idPaciente: Number(v.IdPaciente),
            apellidoyNombre: String(v.ApellidoYNombre || pacienteDb?.ApellidoyNombre || '').trim(),
            documento: String(v.NumeroDocumento || pacienteDb?.NumeroDocumento || '').trim(),
            numeroHC: String(v.NumeroHC || pacienteDb?.NumeroHC || '').trim(),
            cobertura: cob || String(pacienteDb?.Cobertura || '').trim(),
            coberturaDescripcion: String(
              v.CoberturaOS || pacienteDb?.CoberturaDescripcion || '',
            ).trim(),
            nAfiliado: String(pacienteDb?.nAfiliado || v.NumeroSSN || '').trim(),
          });
          setForm(formDesdeVisita(v, panel?.observaciones || ''));
          setRequisitos((requisitosVisita || []).map(requisitoDesdeVisita));
        } catch (e) {
          if (!vigente) return;
          setPaciente(null);
          setForm(formInicial());
          setError(admissionApiErrorMessage(e, 'No se pudo cargar la admisión'));
        } finally {
          if (vigente) setCargandoEdicion(false);
        }
      })();
      return () => {
        vigente = false;
      };
    }

    setCargandoEdicion(false);
    setRequisitos([]);
    setForm(formInicial());

    const id = Number(idPacienteUrl);
    if (!Number.isFinite(id) || id <= 0) {
      setPaciente(null);
      return;
    }

    let vigente = true;
    getPatientById(id)
      .then((p) => {
        if (!vigente) return;
        const cob = String(p.Cobertura || '').trim();
        setPaciente({
          idPaciente: Number(p.IDPaciente),
          apellidoyNombre: String(p.ApellidoyNombre || '').trim(),
          documento: String(p.NumeroDocumento || '').trim(),
          numeroHC: String(p.NumeroHC || '').trim(),
          cobertura: cob,
          coberturaDescripcion: String(p.CoberturaDescripcion || '').trim(),
          nAfiliado: String(p.nAfiliado || '').trim(),
        });
        setForm((f) => ({
          ...f,
          cliente: cob && Number(cob) > 0 ? cob : '',
          contrato: '',
        }));
      })
      .catch(() => {
        if (vigente) setError('No se pudo cargar el paciente');
      });
    return () => {
      vigente = false;
    };
  }, [enEdicion, numeroVisitaUrl, idPacienteUrl]);

  const cargarRequisitos = useCallback(async (cliente: number, idPaciente: number) => {
    if (!cliente || cliente <= 0) {
      setRequisitos([]);
      return;
    }
    try {
      setCargandoRequisitos(true);
      const rows = await admisionNuevaService.getRequisitosCobertura(cliente, idPaciente);
      setRequisitos(rows.map(requisitoDesdeCatalogo));
    } catch (e) {
      setError(admissionApiErrorMessage(e, 'Error al cargar los requisitos de la cobertura'));
    } finally {
      setCargandoRequisitos(false);
    }
  }, []);

  const clienteActual = form.cliente;
  const idPacienteRequisitos = paciente?.idPaciente ?? 0;
  useEffect(() => {
    const cli = Number(clienteActual) || 0;
    if (!enEdicion) {
      void cargarRequisitos(cli, idPacienteRequisitos);
    }
    if (cli > 0) {
      admisionNuevaService
        .getCatalogos(cli)
        .then((c) => setCatalogos((prev) => (prev ? { ...prev, convenios: c.convenios } : c)))
        .catch(() => {});
    }
  }, [clienteActual, idPacienteRequisitos, cargarRequisitos, enEdicion]);

  // Al elegir paciente en el buscador (sin venir por URL), sincroniza cobertura.
  const pacienteIdSync = paciente?.idPaciente;
  const pacienteCoberturaSync = paciente?.cobertura;
  useEffect(() => {
    if (!pacienteIdSync || enEdicion) return;
    // Si llegó por URL, el efecto de idPacienteUrl ya setea cliente.
    if (idPacienteUrl && Number(idPacienteUrl) === pacienteIdSync) return;
    const cob = String(pacienteCoberturaSync || '').trim();
    setForm((f) => ({
      ...f,
      cliente: cob && Number(cob) > 0 ? cob : '',
      contrato: '',
    }));
  }, [pacienteIdSync, pacienteCoberturaSync, idPacienteUrl, enEdicion]);

  const idPacienteElegido = paciente?.idPaciente ?? 0;
  useEffect(() => {
    if (enEdicion || !idPacienteElegido) {
      if (!idPacienteElegido) setUltimaVisita(null);
      return;
    }
    let vigente = true;
    admisionNuevaService
      .getUltimaVisita(idPacienteElegido)
      .then((uv) => {
        if (!vigente || !uv) return;
        setUltimaVisita(uv);
        setForm((f) => {
          const sug: Partial<FormState> = {};
          if (!f.cliente && uv.cliente > 0) sug.cliente = String(uv.cliente);
          const clienteResultante = f.cliente || (sug.cliente ?? '');
          if (!f.contrato && uv.contrato > 0 && clienteResultante === String(uv.cliente)) {
            sug.contrato = String(uv.contrato);
          }
          if (!f.tipoPaciente && uv.tipoPaciente) sug.tipoPaciente = uv.tipoPaciente;
          if (!f.idLugarEpisodio && uv.idLugarEpisodio > 0) {
            sug.idLugarEpisodio = String(uv.idLugarEpisodio);
          }
          if (!f.doctorCabecera && uv.doctorCabecera > 0) {
            sug.doctorCabecera = String(uv.doctorCabecera);
            sug.doctorCabeceraNombre = uv.doctorCabeceraDescripcion;
          }
          return Object.keys(sug).length ? { ...f, ...sug } : f;
        });
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [idPacienteElegido, enEdicion]);

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

  const limpiarFormulario = () => {
    setForm(formInicial());
    setPaciente(null);
    setCama(null);
    setRequisitos([]);
    setAcompanantesPendientes([]);
    setNovedadesPendientes([]);
    setUltimaVisita(null);
    setModoExito(null);
    setError('');
  };

  const subirArchivo = useCallback(async (numeroVisita: number, valor: number, archivo: File) => {
    setRequisitos((rs) =>
      rs.map((x) => (x.valor === valor ? { ...x, estado: 'subiendo', error: undefined } : x)),
    );
    try {
      await admisionNuevaService.subirArchivoRequisito(numeroVisita, valor, archivo);
      setRequisitos((rs) => rs.map((x) => (x.valor === valor ? { ...x, estado: 'ok' } : x)));
    } catch (e) {
      const mensaje = admissionApiErrorMessage(e, 'No se pudo subir el archivo');
      setRequisitos((rs) =>
        rs.map((x) => (x.valor === valor ? { ...x, estado: 'error', error: mensaje } : x)),
      );
    }
  }, []);

  // Elegir un archivo lo deja pendiente hasta guardar. Si la visita ya se creó,
  // se sube en el momento para poder reemplazar un adjunto sin rehacer el alta.
  const onArchivo = (valor: number, archivo: File | null) => {
    setRequisitos((rs) =>
      rs.map((r) =>
        r.valor === valor ? { ...r, archivo, estado: 'pendiente', error: undefined } : r,
      ),
    );
    const visitaArchivo = creada?.numeroVisita || (enEdicion ? numeroVisitaUrl : 0);
    if (archivo && visitaArchivo) void subirArchivo(visitaArchivo, valor, archivo);
  };

  const onQuitarRequisito = (valor: number) => {
    setRequisitos((rs) => rs.filter((r) => r.valor !== valor));
    if (!enEdicion) return;
    void admisionNuevaService.quitarRequisito(numeroVisitaUrl, valor).catch((e) => {
      setError(admissionApiErrorMessage(e, 'No se pudo quitar el requisito'));
      void admisionNuevaService.getRequisitosVisita(numeroVisitaUrl).then((rows) => {
        setRequisitos((rows || []).map(requisitoDesdeVisita));
      });
    });
  };

  const onAgregarRequisito = (valor: number) => {
    const encontrado = catalogoRequisitos.find((c) => c.Valor === valor);
    if (!encontrado) return;
    setRequisitos((rs) =>
      rs.some((r) => r.valor === valor)
        ? rs
        : [...rs, { ...requisitoDesdeCatalogo(encontrado), deCobertura: false, deBase: false }],
    );
    if (!enEdicion || !paciente) return;
    void admisionNuevaService
      .agregarRequisito(numeroVisitaUrl, valor, paciente.idPaciente)
      .catch((e) => {
        setError(admissionApiErrorMessage(e, 'No se pudo agregar el requisito'));
        setRequisitos((rs) => rs.filter((r) => r.valor !== valor));
      });
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
      if (enEdicion) {
        await admissionSearchService.updateDatosPrincipales(numeroVisitaUrl, {
          fechaAdmision: form.fechaAdmision || undefined,
          horaAdmision: form.horaAdmision || undefined,
          clasePaciente: form.clasePaciente || undefined,
          numeroInternacion: form.numeroInternacion,
          tipoAdmision: form.tipoAdmision || undefined,
          idLugarEpisodio: form.idLugarEpisodio ? Number(form.idLugarEpisodio) : null,
          origenAdmision: form.centroSalud ? Number(form.centroSalud) : 0,
          diagnostico: form.diagnostico,
          estadoAmbulatorio: form.estadoAmbulatorio,
          doctorAdmisor: form.doctorAdmisor ? Number(form.doctorAdmisor) : 0,
          cliente: form.cliente ? Number(form.cliente) : 0,
          contrato: form.contrato ? Number(form.contrato) : 0,
          doctorAsistiendo: form.doctorAsistiendo ? Number(form.doctorAsistiendo) : 0,
          tipoPaciente: form.tipoPaciente || undefined,
          doctorCabecera: form.doctorCabecera ? Number(form.doctorCabecera) : null,
        });

        try {
          await visitaAcompanantesService.guardarObservacion(numeroVisitaUrl, form.observaciones);
        } catch {
          setError(
            'La admisión se actualizó, pero no se pudo guardar la observación. Completala desde acompañantes y novedades.',
          );
        }

        const pendientes = requisitos.filter((r) => r.archivo && r.estado !== 'ok');
        for (const r of pendientes) {
          await subirArchivo(numeroVisitaUrl, r.valor, r.archivo!);
        }

        setCreada({
          numeroVisita: numeroVisitaUrl,
          idPaciente: paciente!.idPaciente,
          paciente: paciente!.apellidoyNombre,
          requisitos: requisitos.map((r) => r.valor),
          cama: null,
        });
        setModoExito('edicion');
        return;
      }

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
      setModoExito('alta');

      // La visita ya existe: cada imagen se sube aparte para poder reintentar
      // una sola sin repetir el alta.
      const pendientes = requisitos.filter((r) => r.archivo);
      for (const r of pendientes) {
        await subirArchivo(resultado.numeroVisita, r.valor, r.archivo!);
      }

      // Acompañantes y novedades: la visita ya existe; un fallo acá no deshace el alta.
      const extrasFallidos: string[] = [];
      for (const a of acompanantesPendientes) {
        try {
          const { idLocal: _id, ...datos } = a;
          await visitaAcompanantesService.agregarAcompanante(resultado.numeroVisita, datos);
        } catch {
          extrasFallidos.push('acompañante');
        }
      }
      for (const texto of novedadesPendientes) {
        try {
          await visitaAcompanantesService.agregarNovedad(resultado.numeroVisita, texto);
        } catch {
          extrasFallidos.push('novedad');
        }
      }
      setAcompanantesPendientes([]);
      setNovedadesPendientes([]);
      if (extrasFallidos.length) {
        setError(
          'La admisión se creó, pero no se pudieron guardar todos los acompañantes o novedades. Completalos desde la visita.',
        );
      }
    } catch (e) {
      setError(
        admissionApiErrorMessage(
          e,
          enEdicion ? 'Error al actualizar la admisión' : 'Error al crear la admisión',
        ),
      );
    } finally {
      setGuardando(false);
    }
  };

  const reintentarArchivos = async () => {
    if (!creada) return;
    const fallidos = requisitos.filter((r) => r.estado === 'error' && r.archivo);
    for (const r of fallidos) {
      await subirArchivo(creada.numeroVisita, r.valor, r.archivo!);
    }
  };

  const hayFallidos = requisitos.some((r) => r.estado === 'error');
  const cargandoCatalogos = !catalogos;

  if (cargandoEdicion) {
    return (
      <div className={styles.pagina}>
        <div className={styles.cargandoCaja}>
          <Loader />
          <p>Cargando admisión…</p>
        </div>
      </div>
    );
  }

  if (creada) {
    return (
      <div className={styles.pagina}>
        <div className={styles.exito}>
          <h1>{modoExito === 'edicion' ? 'Admisión actualizada' : 'Admisión creada'}</h1>
          <p className={styles.exitoNumero}>N° de visita {creada.numeroVisita}</p>
          <p>{creada.paciente}</p>
          {error ? <p className={styles.avisoCama}>{error}</p> : null}

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

          {/* La visita ya existe: se puede reemplazar un adjunto, pero la lista
              de requisitos queda fija. */}
          <RequisitosDocumentos
            requisitos={requisitos}
            catalogo={catalogoRequisitos}
            cargando={false}
            bloqueado={false}
            soloArchivos
            numeroVisita={creada.numeroVisita}
            onArchivo={onArchivo}
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
                setModoExito(null);
                limpiarFormulario();
                if (enEdicion) router.replace('/dashboard/admission/new');
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
          {enEdicion ? <Pencil size={22} /> : <ClipboardPlus size={22} />}{' '}
          {enEdicion ? 'Modificar admisión' : 'Nueva Admisión'}
        </h1>
        <p>
          {enEdicion
            ? `Visita ${numeroVisitaUrl}. Los cambios se guardan sobre esta admisión, sea internación o ambulatorio.`
            : 'Admisión ambulatoria o internación sobre la historia clínica del paciente.'}
        </p>
      </header>

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
          disabled={bloqueado || enEdicion}
        />
        {paciente && ultimaVisita && !enEdicion && (
          <p className={styles.sugerenciaUltimaVisita}>
            Se completaron datos con la última admisión del {ultimaVisita.fechaAdmision} (visita{' '}
            {ultimaVisita.numeroVisita}). Revisalos antes de guardar.
          </p>
        )}
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

          <div className={styles.campo}>
            <CustomSelect
              label="Clase de paciente *"
              name="clasePaciente"
              value={form.clasePaciente}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('clasePaciente', String(v ?? ''))}
              options={opcionesSelect(catalogos?.clasesPaciente, 'Seleccionar…')}
            />
          </div>

          <div className={styles.campo}>
            <CustomSelect
              label="Tipo de admisión"
              name="tipoAdmision"
              value={form.tipoAdmision}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('tipoAdmision', String(v ?? ''))}
              options={opcionesSelect(catalogos?.tiposAdmision, 'Seleccionar…')}
            />
          </div>

          <div className={styles.campo}>
            <CustomSelect
              label="Lugar del episodio"
              name="idLugarEpisodio"
              value={form.idLugarEpisodio}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('idLugarEpisodio', String(v ?? ''))}
              options={opcionesSelect(catalogos?.lugaresEpisodio, 'Seleccionar…')}
            />
          </div>

          <div className={styles.campo}>
            <CustomSelect
              label="Derivado de"
              name="centroSalud"
              value={form.centroSalud}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('centroSalud', String(v ?? ''))}
              options={opcionesSelect(catalogos?.centrosSalud, 'Seleccionar…')}
            />
          </div>

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

          <div className={styles.campo}>
            <CustomSelect
              label="Estado ambulatorio"
              name="estadoAmbulatorio"
              value={form.estadoAmbulatorio}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('estadoAmbulatorio', String(v ?? ''))}
              options={opcionesSelect(catalogos?.estadosAmbulatorios, 'Seleccionar…')}
            />
          </div>

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

          <div className={styles.campo}>
            <CustomSelect
              label="Cobertura"
              name="cliente"
              value={form.cliente}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) =>
                setForm((f) => ({ ...f, cliente: String(v ?? ''), contrato: '' }))
              }
              options={opcionesCobertura(catalogos?.coberturas, paciente)}
            />
          </div>

          <div className={styles.campo}>
            <CustomSelect
              label="Convenio / plan"
              name="contrato"
              value={form.contrato}
              isLoading={cargandoCatalogos}
              disabled={bloqueado || !form.cliente}
              onChange={(v) => setCampo('contrato', String(v ?? ''))}
              options={opcionesSelect(
                catalogos?.convenios,
                form.cliente ? 'Seleccionar…' : 'Elegí una cobertura',
              )}
            />
          </div>

          <div className={styles.campo}>
            <CustomSelect
              label="Tipo de paciente"
              name="tipoPaciente"
              value={form.tipoPaciente}
              isLoading={cargandoCatalogos}
              disabled={bloqueado}
              onChange={(v) => setCampo('tipoPaciente', String(v ?? ''))}
              options={opcionesSelect(catalogos?.tiposPaciente, 'Seleccionar…')}
            />
          </div>

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
        numeroVisita={enEdicion ? numeroVisitaUrl : undefined}
        onArchivo={onArchivo}
        onQuitar={onQuitarRequisito}
        onAgregar={onAgregarRequisito}
      />

      {enEdicion ? (
        <div className={styles.bloque}>
          <AdmissionAcompanantesNovedades
            numeroVisita={numeroVisitaUrl}
            ocultarObservacion
          />
        </div>
      ) : (
        <AcompanantesNovedadesAlta
          acompanantes={acompanantesPendientes}
          novedades={novedadesPendientes}
          disabled={bloqueado}
          onAcompanantesChange={setAcompanantesPendientes}
          onNovedadesChange={setNovedadesPendientes}
        />
      )}

      {esInternado && !enEdicion && (
        <CamaSelector seleccion={cama} onSeleccionar={setCama} disabled={bloqueado} />
      )}
      {esInternado && enEdicion && (
        <div className={styles.bloque}>
          <div className={styles.bloqueHeader}>
            <h2>
              <BedDouble size={18} /> Ubicación y movimientos
            </h2>
          </div>
          <AdmissionUbicacionMovimientosModal
            isOpen
            embedded
            numeroVisita={numeroVisitaUrl}
            onClose={() => {}}
            focusSection="ubicacion_movimientos"
          />
        </div>
      )}

      <div className={styles.acciones}>
        <button
          type="button"
          className={styles.botonTexto}
          disabled={guardando}
          onClick={() => {
            if (enEdicion) {
              router.push('/dashboard/admission/search');
              return;
            }
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
              return;
            }
            router.push('/dashboard/patients');
          }}
        >
          Cerrar
        </button>
        <button
          type="button"
          className={styles.botonPrimario}
          disabled={guardando}
          onClick={guardar}
        >
          <Save size={16} />{' '}
          {guardando ? 'Guardando…' : enEdicion ? 'Guardar cambios' : 'Confirmar admisión'}
        </button>
      </div>
    </div>
  );
}
