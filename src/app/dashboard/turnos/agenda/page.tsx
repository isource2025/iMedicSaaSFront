'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
	agendaService,
	type AgendaJornada,
	type AgendaProfesionalMeta,
	type AgendaSlot,
	type MedicoDisponible,
} from '@/app/services/agendaService';
import { authService } from '@/app/services/authService';
import { usePermiso } from '@/app/hooks/usePermiso';
import AgendaCalendar from '@/app/components/Agenda/AgendaCalendar';
import AsignarTurnoModal, {
	type ModalAsignarModo,
} from '@/app/components/Agenda/AsignarTurnoModal';
import SlotTurnoMenu, { type SlotMenuAction } from '@/app/components/Agenda/SlotTurnoMenu';
import AgendaEmptyState from '@/app/components/Agenda/AgendaEmptyState';
import AgendaResumenPanel from '@/app/components/Agenda/AgendaResumenPanel';
import AgendaPacienteBusqueda from '@/app/components/Agenda/AgendaPacienteBusqueda';
import RacEnfermeriaModal from '@/app/components/Agenda/RacEnfermeriaModal';
import AtencionTurnoModal from '@/app/components/Agenda/AtencionTurnoModal';
import DetalleTurnoModal from '@/app/components/Agenda/DetalleTurnoModal';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import {
	AgendaTurnoTablaHead,
	AgendaTurnoTablaRow,
} from '@/app/components/Agenda/AgendaTurnoTabla';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { personalService } from '@/app/services/personalService';
import { esFechaPasada } from '@/app/utils/agendaFecha';
import { claseFilaAgenda } from '@/app/utils/agendaFilaEstilos';
import { horaWallArgentina } from '@/app/utils/dateUtils';
import styles from './agenda.module.css';

function toIso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}

function formatFechaLarga(d: Date): string {
	return d
		.toLocaleDateString('es-AR', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		})
		.replace(/^\w/, (c) => c.toUpperCase());
}

type FiltroSlots = 'TODOS' | 'LIBRES' | 'OCUPADOS';

function badge(estado: string, esSobreturno?: boolean): string {
	if (estado === 'LIBRE') return `${styles.badge} ${styles.badgeLibre}`;
	if (estado === 'CANCELADO') return `${styles.badge} ${styles.badgeCancelado}`;
	if (estado === 'ATENDIDO') return `${styles.badge} ${styles.badgeAtendido}`;
	if (esSobreturno) return `${styles.badge} ${styles.badgeSobreturno}`;
	return `${styles.badge} ${styles.badgeOcupado}`;
}

function badgeText(estado: string, esSobreturno?: boolean): string {
	if (!esSobreturno || estado === 'LIBRE') return estado;
	// Sobreturno: mostrar la etiqueta base + su estado real (cancelado / atendido)
	if (estado === 'OCUPADO') return 'SOBRETURNO';
	return `SOBRETURNO ${estado}`;
}

function esLibre(s: AgendaSlot): boolean {
	return s.estado === 'LIBRE';
}

function esCancelado(s: AgendaSlot): boolean {
	return s.estado === 'CANCELADO' || s.status === 1;
}

/** Cupo disponible para asignar (libre o cancelado). */
function cupoDisponible(s: AgendaSlot): boolean {
	return esLibre(s) || esCancelado(s);
}

function descServicioCatalogo(
	codigo: string | number | null | undefined,
	catalogo: { valor: string; descripcion: string }[],
): string | undefined {
	if (codigo == null || codigo === '') return undefined;
	const norm = String(codigo).trim().toUpperCase();
	const item = catalogo.find(
		(s) =>
			String(s.valor || '')
				.trim()
				.toUpperCase() === norm ||
			String(s.descripcion || '')
				.trim()
				.toUpperCase() === norm,
	);
	return item?.descripcion?.trim() || undefined;
}

function descEspecialidadCatalogo(
	valor: number | null | undefined,
	catalogo: { valor: number; descripcion: string }[],
): string | undefined {
	if (valor == null || valor === 0) return undefined;
	return catalogo.find((e) => e.valor === valor)?.descripcion?.trim() || undefined;
}

function AgendaPageContent() {
	const { rol, puedeSubmodulo, puede } = usePermiso();
	const esMedico = String(rol?.nombre ?? '')
		.trim()
		.toUpperCase() === 'MEDICO';
	const esAdmin = String(rol?.nombre ?? '')
		.trim()
		.toUpperCase() === 'ADMIN';
	const esEnfermero = String(rol?.nombre ?? '')
		.trim()
		.toUpperCase() === 'ENFERMERO';
	const puedeVer = puedeSubmodulo('TURNOS', 'AGENDA');
	const puedeRacEnfermeria = esAdmin || esEnfermero || esMedico;
	const puedeAtender =
		(esMedico || puede('TURNOS.AGENDA.EDITAR') || puedeSubmodulo('TURNOS', 'AGENDA')) &&
		!esEnfermero;
	const puedeBorrarTurno =
		!esMedico && (puede('TURNOS.AGENDA.ELIMINAR') || puedeSubmodulo('TURNOS', 'AGENDA'));
	const puedeCancelarTurno =
		puede('TURNOS.AGENDA.EDITAR') || puedeSubmodulo('TURNOS', 'AGENDA');

	const [user, setUser] = useState<{
		matricula?: number | null;
		nombre?: string;
		apellido?: string;
	} | null>(null);

	useEffect(() => {
		let cancel = false;
		(async () => {
			const local = authService.getCurrentUser() as {
				matricula?: number | null;
				nombre?: string;
				apellido?: string;
			} | null;
			if (!cancel) setUser(local);
			if (!esMedico) return;
			try {
				const me = await authService.me();
				const u = me?.usuario as { matricula?: number | null } | undefined;
				const mat =
					u?.matricula != null && Number(u.matricula) > 0 ? Number(u.matricula) : null;
				if (mat && !cancel) {
					authService.patchCurrentUser({ matricula: mat });
					setUser((prev) => ({ ...(prev || {}), matricula: mat }));
				}
			} catch {
				/* keep localStorage */
			}
		})();
		return () => {
			cancel = true;
		};
	}, [esMedico]);

	const matriculaPropia = user?.matricula ?? null;

	const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
	const fechaIso = useMemo(() => toIso(selectedDate), [selectedDate]);
	const fechaPasada = useMemo(() => esFechaPasada(selectedDate), [selectedDate]);

	// Vista admin/administrativo
	const [medicos, setMedicos] = useState<MedicoDisponible[]>([]);
	const [statsDia, setStatsDia] = useState<Map<number, MedicoDisponible>>(new Map());
	const [matriculaSel, setMatriculaSel] = useState<number | null>(null);
	const [todosSlots, setTodosSlots] = useState<AgendaSlot[]>([]);
	const [jornadas, setJornadas] = useState<AgendaJornada[]>([]);
	const [jornadaSel, setJornadaSel] = useState(0);
	const [filtroSlots, setFiltroSlots] = useState<FiltroSlots>('TODOS');
	const [loadingMedicos, setLoadingMedicos] = useState(false);
	const [loadingSlots, setLoadingSlots] = useState(false);
	const [profesionalAgenda, setProfesionalAgenda] = useState<AgendaProfesionalMeta | null>(
		null,
	);
	const [servicioSel, setServicioSel] = useState<string>('');
	const [especialidadSel, setEspecialidadSel] = useState<number | ''>('');
	const [catalogoServicios, setCatalogoServicios] = useState<
		{ valor: string; descripcion: string }[]
	>([]);
	const [catalogoEspecialidades, setCatalogoEspecialidades] = useState<
		{ valor: number; descripcion: string }[]
	>([]);
	const [loadingCatalogos, setLoadingCatalogos] = useState(false);
	const [calendarioRefresh, setCalendarioRefresh] = useState(0);

	// Vista médico
	const [diaMotivo, setDiaMotivo] = useState<string | null>(null);
	const [fechaMedicoLista, setFechaMedicoLista] = useState(false);

	const [error, setError] = useState<string | null>(null);
	const [successCall, setSuccessCall] = useState<{
		paciente: string;
		displayPath?: string;
		publicadoEnPantalla?: boolean;
		pantallasPublicadas?: number;
	} | null>(null);

	// Menú contextual (posición del mouse) + modal asignar turno
	const [slotMenu, setSlotMenu] = useState<{
		slot: AgendaSlot;
		x: number;
		y: number;
	} | null>(null);
	const [modalSlot, setModalSlot] = useState<AgendaSlot | null>(null);
	const [modalModo, setModalModo] = useState<ModalAsignarModo>('asignar');
	const [racSlot, setRacSlot] = useState<AgendaSlot | null>(null);
	const [cerrarSlot, setCerrarSlot] = useState<AgendaSlot | null>(null);
	const [cerrarModoEdicion, setCerrarModoEdicion] = useState(false);
	const [detalleTurnoId, setDetalleTurnoId] = useState<number | null>(null);
	const searchParams = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		const bandeja = String(searchParams.get('bandeja') || '').toLowerCase();
		if (!bandeja) return;
		const qs = new URLSearchParams();
		if (bandeja === 'interconsultas' || bandeja === 'interconsulta') {
			qs.set('tab', 'interconsultas');
		} else {
			qs.set('tab', 'estudios');
		}
		const sectorQ = String(searchParams.get('sector') || '').trim();
		if (sectorQ) qs.set('sector', sectorQ);
		const pedidoQ = String(searchParams.get('pedido') || '').trim();
		if (pedidoQ) qs.set('pedido', pedidoQ);
		router.replace(`/dashboard/bandeja-pedidos?${qs.toString()}`);
	}, [searchParams, router]);

	const [confirmDialog, setConfirmDialog] = useState<{
		title: string;
		message: string;
		confirmLabel: string;
		tone: 'danger' | 'default';
		onConfirm: () => void | Promise<void>;
	} | null>(null);
	const [confirmBusy, setConfirmBusy] = useState(false);

	const abrirMenuSlot = (e: React.MouseEvent, slot: AgendaSlot) => {
		e.stopPropagation();
		setSlotMenu({ slot, x: e.clientX, y: e.clientY });
	};

	const matriculaMedicoActiva = esMedico ? matriculaPropia : matriculaSel;

	const hayFiltroCatalogo = Boolean(servicioSel || especialidadSel);

	const servicioParam = useMemo(() => {
		if (!servicioSel) return undefined;
		const raw = String(servicioSel).trim();
		const item = catalogoServicios.find(
			(s) =>
				String(s.valor || '').trim() === raw ||
				String(s.descripcion || '').trim().toUpperCase() === raw.toUpperCase(),
		);
		return item ? String(item.valor).trim() : raw;
	}, [servicioSel, catalogoServicios]);

	const opcionesMedicos = useMemo(() => {
		const base =
			medicos.length === 0 && !loadingMedicos
				? [
						{
							value: '',
							label: hayFiltroCatalogo
								? 'Sin profesionales para estos filtros'
								: 'Sin profesionales con agenda configurada',
						},
					]
				: [{ value: '', label: 'Seleccioná un profesional…' }];

		const enLista = medicos.map((m) => {
			const s = statsDia.get(m.matricula);
			const label = s
				? `${m.nombre} · ${s.libres} libres / ${s.total} totales`
				: m.nombre;
			return { value: m.matricula, label };
		});

		return [...base, ...enLista];
	}, [medicos, statsDia, loadingMedicos, hayFiltroCatalogo]);

	// Catálogos servicio / especialidad (módulo personal)
	useEffect(() => {
		if (esMedico || !puedeVer) return;
		let cancel = false;
		setLoadingCatalogos(true);
		Promise.all([personalService.getServicios(), personalService.getEspecialidades()])
			.then(([srv, esp]) => {
				if (cancel) return;
				setCatalogoServicios(srv);
				setCatalogoEspecialidades(esp);
			})
			.catch(() => {
				if (!cancel) {
					setCatalogoServicios([]);
					setCatalogoEspecialidades([]);
				}
			})
			.finally(() => !cancel && setLoadingCatalogos(false));
		return () => {
			cancel = true;
		};
	}, [esMedico, puedeVer]);

	// Carga: profesionales con agenda (independiente de la fecha seleccionada)
	useEffect(() => {
		if (esMedico || !puedeVer) return;
		let cancel = false;
		setLoadingMedicos(true);
		setError(null);
		agendaService
			.getProfesionales({
				servicio: servicioParam || undefined,
				especialidad: especialidadSel !== '' ? Number(especialidadSel) : undefined,
			})
			.then((rows) => {
				if (!cancel) setMedicos(rows);
			})
			.catch((e) => {
				if (!cancel)
					setError(
						e?.response?.data?.mensaje || e?.message || 'Error cargando médicos',
					);
			})
			.finally(() => !cancel && setLoadingMedicos(false));
		return () => {
			cancel = true;
		};
	}, [esMedico, puedeVer, servicioParam, especialidadSel]);

	// Cupos del día (solo actualiza estadísticas, no la lista de médicos)
	useEffect(() => {
		if (esMedico || !puedeVer) return;
		let cancel = false;
		agendaService
			.getDisponibilidad(fechaIso, {
				servicio: servicioParam || undefined,
				especialidad: especialidadSel !== '' ? Number(especialidadSel) : undefined,
			})
			.then((rows) => {
				if (!cancel) setStatsDia(new Map(rows.map((r) => [r.matricula, r])));
			})
			.catch(() => {
				if (!cancel) setStatsDia(new Map());
			});
		return () => {
			cancel = true;
		};
	}, [fechaIso, esMedico, puedeVer, servicioParam, especialidadSel]);

	// Carga: grilla completa (libres + ocupados) del profesional activo
	const cargarSlots = useCallback(async () => {
		const mat = esMedico ? matriculaPropia : matriculaSel;
		if (!mat) {
			setTodosSlots([]);
			setJornadas([]);
			setProfesionalAgenda(null);
			setDiaMotivo(null);
			return;
		}
		setLoadingSlots(true);
		try {
			const r = await agendaService.getSlots(mat, fechaIso, fechaIso);
			if (
				esMedico &&
				r?.matricula != null &&
				Number(r.matricula) > 0 &&
				Number(r.matricula) !== Number(mat)
			) {
				const correcta = Number(r.matricula);
				authService.patchCurrentUser({ matricula: correcta });
				setUser((prev) => ({ ...(prev || {}), matricula: correcta }));
			}
			const dia = r.dias[0];
			setDiaMotivo(dia?.motivo ?? null);
			setTodosSlots(dia?.slots ?? []);
			const j = dia?.jornadas?.length ? dia.jornadas : [];
			setJornadas(j);
			setJornadaSel(0);
			setProfesionalAgenda(r.profesional ?? null);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(err?.response?.data?.mensaje || err?.message || 'Error cargando slots');
			setTodosSlots([]);
			setJornadas([]);
			setDiaMotivo(null);
		} finally {
			setLoadingSlots(false);
		}
	}, [esMedico, matriculaPropia, matriculaSel, fechaIso]);

	useEffect(() => {
		cargarSlots();
	}, [cargarSlots]);

	useEffect(() => {
		if (!esMedico || !matriculaPropia || fechaMedicoLista) return;
		let cancel = false;
		const hoy = new Date();
		const desde = toIso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
		const hasta = toIso(new Date(hoy.getFullYear(), hoy.getMonth() + 4, 0));
		agendaService
			.getDiasConAgenda(matriculaPropia, desde, hasta)
			.then(({ fechas }) => {
				if (cancel) return;
				if (fechas.length > 0) {
					const hoyIso = toIso(hoy);
					const sorted = [...fechas].sort();
					const futuro = sorted.find((f) => f >= hoyIso);
					const elegida = futuro ?? sorted[sorted.length - 1];
					setSelectedDate(new Date(`${elegida}T12:00:00`));
				}
				setFechaMedicoLista(true);
			})
			.catch(() => {
				if (!cancel) setFechaMedicoLista(true);
			});
		return () => {
			cancel = true;
		};
	}, [esMedico, matriculaPropia, fechaMedicoLista]);

	useEffect(() => {
		setFiltroSlots('TODOS');
		setJornadaSel(0);
	}, [matriculaSel, matriculaPropia, fechaIso]);

	const refrescarAgenda = useCallback(() => {
		cargarSlots();
		setCalendarioRefresh((n) => n + 1);
		if (!esMedico) {
			agendaService
				.getDisponibilidad(fechaIso, {
					servicio: servicioParam || undefined,
					especialidad: especialidadSel !== '' ? Number(especialidadSel) : undefined,
				})
				.then((rows) => setStatsDia(new Map(rows.map((r) => [r.matricula, r]))))
				.catch(() => {});
		}
	}, [cargarSlots, esMedico, fechaIso, servicioParam, especialidadSel]);

	const abrirSobreturnoDia = useCallback(() => {
		const sector =
			profesionalAgenda?.sector?.trim() ||
			todosSlots.find((s) => s.sector)?.sector ||
			'';
		const hora = horaWallArgentina(false);
		setModalModo('sobreturno');
		setModalSlot({
			hora,
			sector,
			estado: 'LIBRE',
		});
	}, [profesionalAgenda, todosSlots]);

	const patchSlot = useCallback((idTurno: number, patch: Partial<AgendaSlot>) => {
		setTodosSlots((prev) =>
			prev.map((s) => (s.idTurno === idTurno ? { ...s, ...patch } : s)),
		);
	}, []);

	const cerrarRacModal = useCallback(() => {
		setRacSlot(null);
		refrescarAgenda();
	}, [refrescarAgenda]);

	const handleAccionSlot = async (action: SlotMenuAction, slot: AgendaSlot) => {
		setSlotMenu(null);
		if (action === 'rac-enfermeria') {
			setRacSlot(slot);
			return;
		}
		if (action === 'asignar' || action === 'sobreturno') {
			setModalModo(action === 'sobreturno' ? 'sobreturno' : 'asignar');
			setModalSlot(slot);
			return;
		}
		const mat = matriculaMedicoActiva;
		if (!mat || !slot.idTurno) return;

		if (action === 'cancelar') {
			if (!puedeCancelarTurno || !slot.idTurno) return;
			const idTurno = slot.idTurno;
			setConfirmDialog({
				title: 'Cancelar turno',
				message:
					'¿Seguro que querés cancelar este turno? Una vez cancelado no podrá recuperarse.',
				confirmLabel: 'Cancelar turno',
				tone: 'danger',
				onConfirm: async () => {
					setError(null);
					try {
						await agendaService.cancelarTurno(mat, idTurno);
						setConfirmDialog(null);
						refrescarAgenda();
					} catch (e: unknown) {
						const err = e as {
							response?: { data?: { mensaje?: string } };
							message?: string;
						};
						setConfirmDialog(null);
						setError(
							err?.response?.data?.mensaje || err?.message || 'Error al cancelar',
						);
					}
				},
			});
			return;
		}

		if (action === 'marcar-llegada') {
			setError(null);
			try {
				const resp = await agendaService.marcarLlegada(mat, slot.idTurno);
				patchSlot(slot.idTurno, { horaLlegada: resp.horaLlegada ?? slot.horaLlegada });
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al marcar llegada');
			}
			return;
		}

		if (action === 'marcar-ingreso') {
			setError(null);
			try {
				const resp = await agendaService.marcarIngreso(mat, slot.idTurno);
				patchSlot(slot.idTurno, { horaIngreso: resp.horaIngreso ?? slot.horaIngreso });
				if (puedeAtender && slot.idTurno) {
					setCerrarModoEdicion(false);
					setCerrarSlot({
						...slot,
						horaIngreso: resp.horaIngreso ?? slot.horaIngreso,
					});
				}
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al marcar ingreso');
			}
			return;
		}

		if (action === 'llamar-pantalla') {
			setError(null);
			setSuccessCall(null);
			try {
				const resp = await agendaService.llamarPorPantalla(mat, slot.idTurno);
				setSuccessCall({
					paciente: resp.paciente || slot.pacienteNombre || 'paciente',
					displayPath: resp.displayPath,
					publicadoEnPantalla: resp.publicadoEnPantalla !== false,
					pantallasPublicadas: resp.pantallasPublicadas,
				});
				window.setTimeout(() => setSuccessCall(null), 8000);
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al llamar por pantalla');
			}
			return;
		}

		if (action === 'ver-detalle') {
			if (slot.idTurno) setDetalleTurnoId(slot.idTurno);
			return;
		}

		if (action === 'editar-atencion') {
			if (!puedeAtender || !slot.idTurno) return;
			setError(null);
			setCerrarModoEdicion(true);
			setCerrarSlot(slot);
			return;
		}

		if (action === 'atender' || action === 'cerrar') {
			if (!puedeAtender) return;
			setError(null);
			setCerrarModoEdicion(false);
			setCerrarSlot(slot);
			return;
		}

		if (action === 'borrar') {
			if (!puedeBorrarTurno || !slot.idTurno) return;
			const idTurno = slot.idTurno;
			const esSt = slot.esSobreturno || slot.tipoTurno === 1;
			setConfirmDialog({
				title: esSt ? 'Eliminar sobreturno' : 'Borrar turno',
				message: esSt
					? '¿Eliminar este sobreturno por completo?'
					: '¿Borrar este turno y liberar el cupo para otro paciente?',
				confirmLabel: esSt ? 'Eliminar' : 'Borrar',
				tone: 'danger',
				onConfirm: async () => {
					setError(null);
					try {
						await agendaService.borrarTurno(mat, idTurno);
						setConfirmDialog(null);
						refrescarAgenda();
					} catch (e: unknown) {
						const err = e as {
							response?: { data?: { mensaje?: string } };
							message?: string;
						};
						setConfirmDialog(null);
						setError(err?.response?.data?.mensaje || err?.message || 'Error al borrar');
					}
				},
			});
		}
	};

	const slotsDeJornada = useMemo(() => {
		if (jornadas.length <= 1) return todosSlots;
		return todosSlots.filter((s) => (s.jornadaIndex ?? 0) === jornadaSel);
	}, [todosSlots, jornadas, jornadaSel]);

	const statsSlots = useMemo(() => {
		const total = slotsDeJornada.length;
		const libres = slotsDeJornada.filter(cupoDisponible).length;
		return { total, libres, ocupados: total - libres };
	}, [slotsDeJornada]);

	const slotsFiltrados = useMemo(() => {
		if (filtroSlots === 'LIBRES') return slotsDeJornada.filter(cupoDisponible);
		if (filtroSlots === 'OCUPADOS')
			return slotsDeJornada.filter((s) => !cupoDisponible(s));
		return slotsDeJornada;
	}, [slotsDeJornada, filtroSlots]);

	const servicioLabel = useMemo(() => {
		if (!servicioSel) return undefined;
		return (
			descServicioCatalogo(servicioParam || servicioSel, catalogoServicios) || servicioSel
		);
	}, [servicioSel, servicioParam, catalogoServicios]);

	const especialidadLabel = useMemo(() => {
		if (especialidadSel === '') return undefined;
		return descEspecialidadCatalogo(
			typeof especialidadSel === 'number' ? especialidadSel : Number(especialidadSel),
			catalogoEspecialidades,
		);
	}, [especialidadSel, catalogoEspecialidades]);

	const resumenServicioLabel = useMemo(() => {
		if (servicioLabel) return servicioLabel;
		const prof = profesionalAgenda;
		if (!prof) return undefined;
		return (
			descServicioCatalogo(prof.sector, catalogoServicios) ||
			descServicioCatalogo(prof.valorServicio, catalogoServicios) ||
			undefined
		);
	}, [servicioLabel, profesionalAgenda, catalogoServicios]);

	const resumenEspecialidadLabel = useMemo(() => {
		if (especialidadLabel) return especialidadLabel;
		return descEspecialidadCatalogo(
			profesionalAgenda?.especialidad,
			catalogoEspecialidades,
		);
	}, [especialidadLabel, profesionalAgenda, catalogoEspecialidades]);

	const nombreProfesionalSel = useMemo(() => {
		return (
			medicos.find((m) => m.matricula === matriculaSel)?.nombre ||
			profesionalAgenda?.nombre ||
			undefined
		);
	}, [medicos, matriculaSel, profesionalAgenda?.nombre]);

	const tituloAgendaAdmin = useMemo(() => {
		if (filtroSlots === 'LIBRES') return 'Turnos libres';
		if (filtroSlots === 'OCUPADOS') return 'Turnos ocupados';
		return 'Agenda del día';
	}, [filtroSlots]);

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<p className={styles.warning}>No tenés permiso para ver la agenda de turnos.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.layout}>
				<aside className={styles.aside}>
					<AgendaCalendar
						selected={selectedDate}
						onSelect={setSelectedDate}
						matricula={matriculaMedicoActiva}
						refreshToken={calendarioRefresh}
					/>
					{!esMedico && matriculaSel && !loadingSlots && (
						<AgendaResumenPanel
							fechaLabel={formatFechaLarga(selectedDate)}
							nombreProfesional={nombreProfesionalSel}
							servicioLabel={resumenServicioLabel}
							especialidadLabel={resumenEspecialidadLabel}
							stats={statsSlots}
						/>
					)}
					{esMedico && matriculaPropia && !loadingSlots && (
						<AgendaResumenPanel
							fechaLabel={formatFechaLarga(selectedDate)}
							nombreProfesional={
								`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || undefined
							}
							stats={statsSlots}
						/>
					)}
				</aside>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<div className={styles.cardHeaderTop}>
								<div>
									<h1 className={styles.cardTitle}>Agenda de turnos</h1>
									<p className={styles.cardSubtitle}>
										{esMedico
											? `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Mi agenda'
											: esAdmin
												? 'Administrador — gestión completa de agendas (igual que administrativo)'
												: 'Vista administrativa'}
									</p>
								</div>
							</div>
							<div className={styles.fechaSel}>📅 {formatFechaLarga(selectedDate)}</div>
						</div>

						<div className={styles.cardBody}>
					<AgendaPacienteBusqueda />

					{error && <div className={styles.error}>{error}</div>}
					{successCall && (
						<div
							className={
								successCall.publicadoEnPantalla === false
									? styles.warning
									: styles.success
							}
						>
							<span>
								{successCall.publicadoEnPantalla === false
									? `Llamado registrado (${successCall.paciente}) — sector no visible en ninguna pantalla`
									: (
										<>
											Llamado en pantalla: <strong>{successCall.paciente}</strong>
											{(successCall.pantallasPublicadas ?? 0) > 1 && (
												<> ({successCall.pantallasPublicadas} pantallas)</>
											)}
										</>
									)}
							</span>
							{successCall.displayPath && (
								<a
									className={styles.successLink}
									href={successCall.displayPath}
									target="_blank"
									rel="noopener noreferrer"
								>
									Abrir pantalla del turnero
								</a>
							)}
						</div>
					)}
					{fechaPasada && (
						<div className={styles.warning}>
							No se pueden asignar turnos en fechas anteriores al día de hoy. Elegí
							una fecha actual o futura en el calendario.
						</div>
					)}

					{/* ───────────────── Vista MÉDICO ───────────────── */}
					{esMedico && (
						<>
							{!matriculaPropia && (
								<div className={styles.warning}>
									Tu usuario no tiene matrícula asociada. Cerrá sesión y volvé a entrar.
								</div>
							)}

							<div className={styles.agendaSection}>
								<div
									key={fechaIso}
									className={`${styles.tableWrap} ${!loadingSlots ? styles.tableWrapEnter : ''}`}
								>
									<header className={styles.tableHeader}>
										<div className={styles.tableHeaderTop}>
											<span>Mi agenda del día</span>
											<div className={styles.tableHeaderActions}>
												{slotsFiltrados.length > 0 && (
													<span className={styles.badge}>{slotsFiltrados.length}</span>
												)}
												{!fechaPasada && diaMotivo === 'sin_horario' ? (
													<button
														type='button'
														className={styles.headerActionBtn}
														onClick={abrirSobreturnoDia}
													>
														+ Agregar sobreturno
													</button>
												) : null}
											</div>
										</div>
									</header>
									{jornadas.length > 1 && (
										<div className={styles.jornadaTabs} role='tablist'>
											{jornadas.map((j) => (
												<button
													key={j.index}
													type='button'
													role='tab'
													aria-selected={jornadaSel === j.index}
													className={`${styles.jornadaTab} ${
														jornadaSel === j.index ? styles.jornadaTabActive : ''
													}`}
													onClick={() => setJornadaSel(j.index)}
												>
													{j.titulo || j.label}
												</button>
											))}
										</div>
									)}
									<div className={styles.kpis}>
										<button
											type='button'
											className={`${styles.kpi} ${filtroSlots === 'TODOS' ? styles.kpiActive : ''}`}
											onClick={() => setFiltroSlots('TODOS')}
										>
											<div className={styles.kpiValue}>{statsSlots.total}</div>
											<div className={styles.kpiLabel}>Total</div>
										</button>
										<button
											type='button'
											className={`${styles.kpi} ${filtroSlots === 'LIBRES' ? styles.kpiActive : ''}`}
											onClick={() =>
												setFiltroSlots((f) => (f === 'LIBRES' ? 'TODOS' : 'LIBRES'))
											}
										>
											<div className={styles.kpiValue}>{statsSlots.libres}</div>
											<div className={styles.kpiLabel}>Libres</div>
										</button>
										<button
											type='button'
											className={`${styles.kpi} ${filtroSlots === 'OCUPADOS' ? styles.kpiActive : ''}`}
											onClick={() =>
												setFiltroSlots((f) =>
													f === 'OCUPADOS' ? 'TODOS' : 'OCUPADOS',
												)
											}
										>
											<div className={styles.kpiValue}>{statsSlots.ocupados}</div>
											<div className={styles.kpiLabel}>Ocupados</div>
										</button>
									</div>
									{loadingSlots ? (
										<div className={styles.loading}>
											<span className={styles.spinner} aria-hidden /> Cargando…
										</div>
									) : slotsFiltrados.length === 0 ? (
										<AgendaEmptyState
											icon='📋'
											title={
												diaMotivo === 'sin_horario'
													? 'Sin horario configurado'
													: 'Sin turnos en la agenda'
											}
											description={
												diaMotivo === 'sin_horario'
													? 'Este día no tiene grilla de turnos. Podés agregar un sobreturno igualmente.'
													: 'No hay cupos para esta fecha con el filtro actual.'
											}
											action={
												!fechaPasada &&
												(diaMotivo === 'sin_horario' || filtroSlots === 'TODOS')
													? {
															label: '+ Agregar sobreturno',
															onClick: abrirSobreturnoDia,
														}
													: undefined
											}
										/>
									) : (
										<table className={`${styles.table} ${styles.tableEnter} ${styles.tableWide}`}>
											<AgendaTurnoTablaHead />
											<tbody>
												{slotsFiltrados.map((s) => {
													const key = `${s.hora}-${s.sector}-${s.idTurno ?? 'n'}`;
													const libre = esLibre(s);
													const cancelado = esCancelado(s);
													const puedeMenu = !fechaPasada;
													return (
														<AgendaTurnoTablaRow
															key={key}
															row={s}
															libre={libre}
															cancelado={cancelado}
															trClassName={claseFilaAgenda(styles, s, {
																libre,
																cancelado,
																esSobreturno: s.esSobreturno,
															})}
															onTrClick={(e) => {
																if (puedeMenu) abrirMenuSlot(e, s);
															}}
															trStyle={{
																cursor: puedeMenu ? 'pointer' : 'default',
															}}
															badgeEstado={
																<span className={badge(s.estado, s.esSobreturno)}>
																	{badgeText(s.estado, s.esSobreturno)}
																</span>
															}
														/>
													);
												})}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</>
					)}

					{/* ───────── Vista ADMIN / ADMINISTRATIVO ───────── */}
					{!esMedico && (
						<>
							<div className={styles.filtersBar}>
								<CustomSelect
									label='Servicio'
									name='servicioAgenda'
									value={servicioSel}
									isLoading={loadingCatalogos}
									onChange={(v) => {
										setServicioSel(String(v || ''));
										setMatriculaSel(null);
									}}
									options={[
										{ value: '', label: 'Todos los servicios' },
										...catalogoServicios.map((s) => ({
											value: s.valor,
											label: s.descripcion || s.valor,
										})),
									]}
								/>
								<CustomSelect
									label='Especialidad'
									name='especialidadAgenda'
									value={especialidadSel === '' ? '' : especialidadSel}
									isLoading={loadingCatalogos}
									onChange={(v) => {
										const n = v === '' || v == null ? '' : Number(v);
										setEspecialidadSel(n);
										setMatriculaSel(null);
									}}
									options={[
										{ value: '', label: 'Todas las especialidades' },
										...catalogoEspecialidades.map((e) => ({
											value: e.valor,
											label: e.descripcion || String(e.valor),
										})),
									]}
								/>
								<CustomSelect
									label='Profesional'
									name='medicoAgenda'
									value={matriculaSel ?? ''}
									isLoading={loadingMedicos}
									onChange={(v) => {
										if (v === '' || v == null) setMatriculaSel(null);
										else setMatriculaSel(Number(v));
									}}
									options={opcionesMedicos}
								/>
							</div>

							{matriculaSel && (
								<div className={styles.kpis}>
									<button
										type='button'
										className={`${styles.kpi} ${filtroSlots === 'TODOS' ? styles.kpiActive : ''}`}
										onClick={() => setFiltroSlots('TODOS')}
									>
										<div className={styles.kpiValue}>{statsSlots.total}</div>
										<div className={styles.kpiLabel}>Total</div>
									</button>
									<button
										type='button'
										className={`${styles.kpi} ${filtroSlots === 'LIBRES' ? styles.kpiActive : ''}`}
										onClick={() =>
											setFiltroSlots((f) => (f === 'LIBRES' ? 'TODOS' : 'LIBRES'))
										}
									>
										<div className={styles.kpiValue}>{statsSlots.libres}</div>
										<div className={styles.kpiLabel}>Libres</div>
									</button>
									<button
										type='button'
										className={`${styles.kpi} ${filtroSlots === 'OCUPADOS' ? styles.kpiActive : ''}`}
										onClick={() =>
											setFiltroSlots((f) =>
												f === 'OCUPADOS' ? 'TODOS' : 'OCUPADOS',
											)
										}
									>
										<div className={styles.kpiValue}>{statsSlots.ocupados}</div>
										<div className={styles.kpiLabel}>Ocupados</div>
									</button>
								</div>
							)}

							<div className={styles.agendaSection}>
								<div
									key={
										matriculaSel
											? `${matriculaSel}-${fechaIso}-${filtroSlots}-${jornadaSel}`
											: 'sin-profesional'
									}
									className={`${styles.tableWrap} ${!loadingSlots ? styles.tableWrapEnter : ''}`}
								>
									<header className={styles.tableHeader}>
										<div className={styles.tableHeaderTop}>
											<span>{tituloAgendaAdmin}</span>
											<div className={styles.tableHeaderActions}>
												{matriculaSel && slotsFiltrados.length > 0 && (
													<span className={styles.badge}>{slotsFiltrados.length}</span>
												)}
												{!fechaPasada &&
												matriculaSel &&
												diaMotivo === 'sin_horario' ? (
													<button
														type='button'
														className={styles.headerActionBtn}
														onClick={abrirSobreturnoDia}
													>
														+ Agregar sobreturno
													</button>
												) : null}
											</div>
										</div>
										{jornadas.length > 1 && (
											<div className={styles.jornadaTabs} role='tablist'>
												{jornadas.map((j) => (
													<button
														key={j.index}
														type='button'
														role='tab'
														aria-selected={jornadaSel === j.index}
														className={`${styles.jornadaTab} ${
															jornadaSel === j.index ? styles.jornadaTabActive : ''
														}`}
														onClick={() => setJornadaSel(j.index)}
													>
														{j.titulo}
													</button>
												))}
											</div>
										)}
									</header>
									{!matriculaSel ? (
										<AgendaEmptyState
											icon="👨‍⚕️"
											title="Seleccioná un profesional"
											description="Elegí servicio, especialidad y profesional en los filtros de arriba para ver la agenda del día, asignar turnos y gestionar cupos."
										/>
									) : loadingSlots ? (
										<div className={styles.loading}>
											<span className={styles.spinner} aria-hidden /> Cargando…
										</div>
									) : slotsFiltrados.length === 0 ? (
										<AgendaEmptyState
											compact
											icon='📅'
											title={
												filtroSlots === 'LIBRES'
													? 'Sin turnos libres'
													: filtroSlots === 'OCUPADOS'
														? 'Sin turnos ocupados'
														: diaMotivo === 'sin_horario'
															? 'Sin horario configurado'
															: 'Sin turnos en la agenda'
											}
											description={
												filtroSlots === 'LIBRES'
													? 'No hay cupos libres con el filtro actual. Probá ver «Total» u «Ocupados», o elegí otra fecha.'
													: filtroSlots === 'OCUPADOS'
														? 'No hay turnos ocupados con el filtro actual. Los cupos libres aparecen en «Libres» o «Total».'
														: diaMotivo === 'sin_horario'
															? 'Este profesional no tiene grilla ese día. Podés agregar un sobreturno.'
															: 'Este profesional no tiene turnos generados para la fecha seleccionada.'
											}
											action={
												!fechaPasada &&
												matriculaSel &&
												(diaMotivo === 'sin_horario' || filtroSlots === 'TODOS')
													? {
															label: '+ Agregar sobreturno',
															onClick: abrirSobreturnoDia,
														}
													: undefined
											}
										/>
									) : (
										<table className={`${styles.table} ${styles.tableEnter} ${styles.tableWide}`}>
											<AgendaTurnoTablaHead />
											<tbody>
												{slotsFiltrados.map((s) => {
													const key = `${s.hora}-${s.sector}-${s.idTurno ?? 'n'}`;
													const libre = esLibre(s);
													const cancelado = esCancelado(s);
													const puedeMenu = !fechaPasada;
													return (
														<AgendaTurnoTablaRow
															key={key}
															row={s}
															libre={libre}
															cancelado={cancelado}
															trClassName={claseFilaAgenda(styles, s, {
																libre,
																cancelado,
																esSobreturno: s.esSobreturno,
															})}
															onTrClick={(e) => {
																if (puedeMenu) abrirMenuSlot(e, s);
															}}
															trStyle={{
																cursor: puedeMenu ? 'pointer' : 'default',
															}}
															badgeEstado={
																<span className={badge(s.estado, s.esSobreturno)}>
																	{badgeText(s.estado, s.esSobreturno)}
																</span>
															}
														/>
													);
												})}
											</tbody>
										</table>
									)}
								</div>
							</div>
						</>
					)}
						</div>
					</div>
				</div>
			</div>

			<SlotTurnoMenu
				open={!!slotMenu}
				x={slotMenu?.x ?? 0}
				y={slotMenu?.y ?? 0}
				slot={slotMenu?.slot ?? null}
				puedeBorrar={puedeBorrarTurno}
				puedeRacEnfermeria={puedeRacEnfermeria}
				puedeAtender={puedeAtender}
				onClose={() => setSlotMenu(null)}
				onAction={handleAccionSlot}
			/>

			<ConfirmDialog
				open={!!confirmDialog}
				title={confirmDialog?.title ?? ''}
				message={confirmDialog?.message ?? ''}
				confirmLabel={confirmDialog?.confirmLabel ?? 'Confirmar'}
				tone={confirmDialog?.tone ?? 'default'}
				busy={confirmBusy}
				onCancel={() => {
					if (!confirmBusy) setConfirmDialog(null);
				}}
				onConfirm={async () => {
					if (!confirmDialog) return;
					setConfirmBusy(true);
					try {
						await confirmDialog.onConfirm();
					} finally {
						setConfirmBusy(false);
					}
				}}
			/>

			<RacEnfermeriaModal
				open={!!racSlot}
				slot={racSlot}
				fechaTurno={fechaIso}
				onClose={cerrarRacModal}
			/>

			<AtencionTurnoModal
				open={!!cerrarSlot && !!matriculaMedicoActiva}
				matricula={matriculaMedicoActiva || 0}
				fechaTurno={fechaIso}
				turno={
					cerrarSlot
						? {
								idTurno: cerrarSlot.idTurno ?? 0,
								pacienteNombre: cerrarSlot.pacienteNombre,
								numeroDocumento: cerrarSlot.numeroDocumento,
								sector: cerrarSlot.sector,
								hora: cerrarSlot.hora,
								fecha: fechaIso,
								observaciones: cerrarSlot.observaciones,
								cobertura: cerrarSlot.cobertura,
								horaLlegada: cerrarSlot.horaLlegada,
								horaIngreso: cerrarSlot.horaIngreso,
								horaSalida: cerrarSlot.horaSalida,
								idClasificacionTriage: cerrarSlot.idClasificacionTriage,
								racControles: cerrarSlot.racControles,
								racMedicacion: cerrarSlot.racMedicacion,
							}
						: null
				}
				onClose={() => {
					setCerrarSlot(null);
					setCerrarModoEdicion(false);
				}}
				onCerrado={() => {
					setCerrarSlot(null);
					setCerrarModoEdicion(false);
					refrescarAgenda();
				}}
				modoEdicion={cerrarModoEdicion}
			/>

			<DetalleTurnoModal
				open={detalleTurnoId != null}
				idTurno={detalleTurnoId}
				onClose={() => setDetalleTurnoId(null)}
				onEditar={(id) => {
					const slot =
						todosSlots.find((s) => s.idTurno === id) ||
						cerrarSlot ||
						({
							idTurno: id,
							hora: '',
							sector: '',
							estado: 'ATENDIDO',
						} as AgendaSlot);
					setDetalleTurnoId(null);
					setCerrarModoEdicion(true);
					setCerrarSlot(slot);
				}}
			/>

			<AsignarTurnoModal
				open={!!modalSlot && !!matriculaMedicoActiva && !fechaPasada}
				modo={modalModo}
				matricula={matriculaMedicoActiva || 0}
				fecha={fechaIso}
				slot={modalSlot}
				profesional={profesionalAgenda}
				onClose={() => setModalSlot(null)}
				onAssigned={refrescarAgenda}
			/>
		</div>
	);
}

export default function AgendaPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.page}>
					<div className={styles.loading}>Cargando agenda…</div>
				</div>
			}
		>
			<AgendaPageContent />
		</Suspense>
	);
}
