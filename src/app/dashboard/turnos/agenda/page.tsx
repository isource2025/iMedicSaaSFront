'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	agendaService,
	type AgendaJornada,
	type AgendaProfesionalMeta,
	type AgendaSlot,
	type MedicoDisponible,
	type TurnoAsignado,
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
import CerrarTurnoModal from '@/app/components/Agenda/CerrarTurnoModal';
import {
	AgendaTurnoTablaHead,
	AgendaTurnoTablaRow,
} from '@/app/components/Agenda/AgendaTurnoTabla';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { personalService } from '@/app/services/personalService';
import { esFechaPasada } from '@/app/utils/agendaFecha';
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

export default function AgendaPage() {
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
	const puedeRacEnfermeria = esAdmin || esEnfermero;
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
		setUser(
			authService.getCurrentUser() as {
				matricula?: number | null;
				nombre?: string;
				apellido?: string;
			} | null,
		);
	}, []);

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
	const [turnosMedico, setTurnosMedico] = useState<TurnoAsignado[]>([]);
	const [loadingTurnos, setLoadingTurnos] = useState(false);

	const [error, setError] = useState<string | null>(null);

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

	// Carga: todos los slots del médico (libres + ocupados)
	const cargarSlots = useCallback(async () => {
		if (esMedico || !matriculaSel) {
			setTodosSlots([]);
			setJornadas([]);
			setProfesionalAgenda(null);
			return;
		}
		setLoadingSlots(true);
		try {
			const r = await agendaService.getSlots(matriculaSel, fechaIso, fechaIso);
			const dia = r.dias[0];
			const slots = dia && !dia.bloqueado ? dia.slots : [];
			const j = dia?.jornadas?.length ? dia.jornadas : [];
			setTodosSlots(slots);
			setJornadas(j);
			setJornadaSel(0);
			setProfesionalAgenda(r.profesional ?? null);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(err?.response?.data?.mensaje || err?.message || 'Error cargando slots');
			setTodosSlots([]);
			setJornadas([]);
		} finally {
			setLoadingSlots(false);
		}
	}, [esMedico, matriculaSel, fechaIso]);

	useEffect(() => {
		cargarSlots();
	}, [cargarSlots]);

	useEffect(() => {
		setFiltroSlots('TODOS');
		setJornadaSel(0);
	}, [matriculaSel, fechaIso]);

	const cargarTurnosMedico = useCallback(async () => {
		if (!esMedico || !matriculaPropia) {
			setTurnosMedico([]);
			return;
		}
		setLoadingTurnos(true);
		setError(null);
		try {
			const rows = await agendaService.getTurnos(matriculaPropia, fechaIso, fechaIso);
			setTurnosMedico(rows.filter((t) => t.idPaciente && t.idPaciente > 0));
		} catch (e: unknown) {
			const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
			setError(err?.response?.data?.mensaje || err?.message || 'Error cargando turnos');
			setTurnosMedico([]);
		} finally {
			setLoadingTurnos(false);
		}
	}, [esMedico, matriculaPropia, fechaIso]);

	useEffect(() => {
		cargarTurnosMedico();
	}, [cargarTurnosMedico]);

	const refrescarAgenda = useCallback(() => {
		cargarSlots();
		cargarTurnosMedico();
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
	}, [
		cargarSlots,
		cargarTurnosMedico,
		esMedico,
		fechaIso,
		servicioParam,
		especialidadSel,
	]);

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
			if (!puedeCancelarTurno) return;
			const ok = window.confirm(
				'¿Cancelar este turno? Una vez cancelado no podrá recuperarse.',
			);
			if (!ok) return;
			setError(null);
			try {
				await agendaService.cancelarTurno(mat, slot.idTurno);
				refrescarAgenda();
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al cancelar');
			}
			return;
		}

		if (action === 'cerrar') {
			if (!puedeCancelarTurno) return;
			if (esEnfermero) {
				setError('Sólo médico o administrativo pueden cerrar turnos');
				return;
			}
			setError(null);
			setCerrarSlot(slot);
			return;
		}

		if (action === 'borrar') {
			if (!puedeBorrarTurno) return;
			const esSt = slot.esSobreturno || slot.tipoTurno === 1;
			const ok = window.confirm(
				esSt
					? '¿Eliminar este sobreturno por completo?'
					: '¿Borrar este turno y liberar el cupo para otro paciente?',
			);
			if (!ok) return;
			setError(null);
			try {
				await agendaService.borrarTurno(mat, slot.idTurno);
				refrescarAgenda();
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al borrar');
			}
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
					{esMedico && matriculaPropia && !loadingTurnos && (
						<AgendaResumenPanel
							fechaLabel={formatFechaLarga(selectedDate)}
							nombreProfesional={
								`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || undefined
							}
							stats={{
								total: turnosMedico.length,
								libres: 0,
								ocupados: turnosMedico.length,
							}}
						/>
					)}
				</aside>
				<div className={styles.main}>
					<div className={styles.mainCard}>
						<div className={styles.cardHeader}>
							<h1 className={styles.cardTitle}>Agenda de turnos</h1>
							<p className={styles.cardSubtitle}>
								{esMedico
									? `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Mi agenda'
									: esAdmin
										? 'Administrador — gestión completa de agendas (igual que administrativo)'
										: 'Vista administrativa'}
							</p>
							<div className={styles.fechaSel}>📅 {formatFechaLarga(selectedDate)}</div>
						</div>

						<div className={styles.cardBody}>
					<AgendaPacienteBusqueda />

					{error && <div className={styles.error}>{error}</div>}
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
									className={`${styles.tableWrap} ${!loadingTurnos ? styles.tableWrapEnter : ''}`}
								>
									<header>
										<span>Mis turnos asignados</span>
										{turnosMedico.length > 0 && (
											<span className={styles.badge}>{turnosMedico.length}</span>
										)}
									</header>
									{loadingTurnos ? (
										<div className={styles.loading}>
											<span className={styles.spinner} aria-hidden /> Cargando…
										</div>
									) : turnosMedico.length === 0 ? (
										<AgendaEmptyState
											icon="📋"
											title="Sin turnos asignados"
											description="No tenés pacientes agendados para esta fecha. Elegí otra fecha en el calendario o consultá con administración si esperabas turnos."
										/>
									) : (
										<table className={`${styles.table} ${styles.tableEnter} ${styles.tableWide}`}>
										<AgendaTurnoTablaHead />
										<tbody>
											{turnosMedico.map((t) => (
												<AgendaTurnoTablaRow
													key={t.idTurno}
													row={t}
													libre={false}
													cancelado={t.estado === 'CANCELADO'}
													badgeEstado={
														<span className={badge(t.estado, t.esSobreturno)}>
															{t.esSobreturno && t.estado !== 'LIBRE'
																? 'SOBRETURNO'
																: t.estado}
														</span>
													}
												/>
											))}
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
											{matriculaSel && slotsFiltrados.length > 0 && (
												<span className={styles.badge}>{slotsFiltrados.length}</span>
											)}
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
											icon="📅"
											title={
												filtroSlots === 'LIBRES'
													? 'Sin turnos libres'
													: filtroSlots === 'OCUPADOS'
														? 'Sin turnos ocupados'
														: 'Sin turnos en la agenda'
											}
											description={
												filtroSlots === 'LIBRES'
													? 'No hay cupos libres con el filtro actual. Probá ver «Total» u «Ocupados», o elegí otra fecha.'
													: filtroSlots === 'OCUPADOS'
														? 'No hay turnos ocupados con el filtro actual. Los cupos libres aparecen en «Libres» o «Total».'
														: 'Este profesional no tiene turnos generados para la fecha seleccionada.'
											}
										/>
									) : (
										<table className={`${styles.table} ${styles.tableEnter} ${styles.tableWide}`}>
											<AgendaTurnoTablaHead conMenu />
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
															trClassName={
																libre
																	? styles.rowLibre
																	: cancelado
																		? styles.rowCancelado
																		: s.esSobreturno
																			? styles.rowSobreturno
																			: styles.rowOcupado
															}
															onTrClick={(e) => {
																if (puedeMenu) abrirMenuSlot(e, s);
															}}
															trStyle={{
																cursor: puedeMenu ? 'pointer' : 'default',
															}}
															badgeEstado={
																<span className={badge(s.estado, s.esSobreturno)}>
																	{s.esSobreturno && s.estado !== 'LIBRE'
																		? 'SOBRETURNO'
																		: s.estado}
																</span>
															}
															menuCelda={
																puedeMenu ? (
																	<span aria-hidden title='Opciones'>
																		⋯
																	</span>
																) : (
																	<span
																		className={styles.sinPaciente}
																		title='Fecha pasada'
																	>
																		—
																	</span>
																)
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
				onClose={() => setSlotMenu(null)}
				onAction={handleAccionSlot}
			/>

			<RacEnfermeriaModal
				open={!!racSlot}
				slot={racSlot}
				fechaTurno={fechaIso}
				onClose={cerrarRacModal}
			/>

			<CerrarTurnoModal
				open={!!cerrarSlot && !!matriculaMedicoActiva}
				matricula={matriculaMedicoActiva || 0}
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
							}
						: null
				}
				onClose={() => setCerrarSlot(null)}
				onCerrado={() => {
					setCerrarSlot(null);
					refrescarAgenda();
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
