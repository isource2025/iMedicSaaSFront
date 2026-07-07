'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePermiso } from '@/app/hooks/usePermiso';
import {
	turnosAdminService,
	type TurnoAdminRow,
	type TurnosAdminFiltros,
} from '@/app/services/turnosAdminService';
import TurnoAdminMenu from '@/app/components/Agenda/TurnoAdminMenu';
import TurnosAdminTabla from '@/app/components/Agenda/TurnosAdminTabla';
import type { TurnoAdminAction } from '@/app/components/Agenda/turnoAdminMenuOpciones';
import { opcionesMenuTurnoAdmin } from '@/app/components/Agenda/turnoAdminMenuOpciones';
import { agendaService } from '@/app/services/agendaService';
import EditarTurnoAdminModal from '@/app/components/Agenda/EditarTurnoAdminModal';
import RacEnfermeriaModal from '@/app/components/Agenda/RacEnfermeriaModal';
import AtencionTurnoModal from '@/app/components/Agenda/AtencionTurnoModal';
import DetalleTurnoModal from '@/app/components/Agenda/DetalleTurnoModal';
import { turnoAdminRowToSlot } from '@/app/components/Agenda/turnoAdminUtils';
import type { AgendaSlot } from '@/app/services/agendaService';
import agendaStyles from '../agenda/agenda.module.css';
import styles from './admin.module.css';

function toIso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}

function defaultFiltros(): TurnosAdminFiltros {
	const hoy = new Date();
	const desde = new Date(hoy);
	desde.setDate(desde.getDate() - 30);
	return {
		fechaDesde: toIso(desde),
		fechaHasta: toIso(hoy),
	};
}

const EMPTY_FILTROS: TurnosAdminFiltros = {
	q: '',
	fechaDesde: '',
	fechaHasta: '',
	status: '',
	tipoTurno: '',
	sector: '',
	profesional: '',
	triage: '',
	idTurno: '',
	idPaciente: '',
	numeroDocumento: '',
};

export default function TurnosAdminPage() {
	const { loaded, puede, puedeSubmodulo, rol } = usePermiso();
	const puedeVer =
		puede('TURNOS.ADMIN.VER') ||
		puedeSubmodulo('TURNOS', 'ADMIN') ||
		puede('TURNOS.AGENDA.VER');
	const puedeEditar =
		puede('TURNOS.ADMIN.EDITAR') ||
		puede('TURNOS.AGENDA.EDITAR') ||
		puedeSubmodulo('TURNOS', 'ADMIN');
	const puedeEliminar =
		puede('TURNOS.ADMIN.ELIMINAR') ||
		puede('TURNOS.AGENDA.ELIMINAR') ||
		puedeSubmodulo('TURNOS', 'ADMIN');
	const rolNombre = String(rol?.nombre ?? '')
		.trim()
		.toUpperCase();
	const puedeRac =
		rolNombre === 'ADMIN' ||
		rolNombre === 'ENFERMERO' ||
		puede('TURNOS.AGENDA.EDITAR') ||
		puede('TURNOS.ADMIN.EDITAR');

	const [draft, setDraft] = useState<TurnosAdminFiltros>(() => defaultFiltros());
	const [applied, setApplied] = useState<TurnosAdminFiltros>(() => defaultFiltros());
	const [page, setPage] = useState(1);
	const [limit] = useState(25);
	const [rows, setRows] = useState<TurnoAdminRow[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [turnoEditar, setTurnoEditar] = useState<TurnoAdminRow | null>(null);
	const [turnoCerrar, setTurnoCerrar] = useState<TurnoAdminRow | null>(null);
	const [racSlot, setRacSlot] = useState<AgendaSlot | null>(null);
	const [racFecha, setRacFecha] = useState<string>('');
	const [detalleTurnoId, setDetalleTurnoId] = useState<number | null>(null);
	const [turnoMenu, setTurnoMenu] = useState<{
		row: TurnoAdminRow;
		x: number;
		y: number;
	} | null>(null);

	const permisosMenu = useMemo(
		() => ({
			puedeEditar,
			puedeEliminar,
			puedeRac,
		}),
		[puedeEditar, puedeEliminar, puedeRac],
	);

	const abrirMenuTurno = (e: React.MouseEvent, row: TurnoAdminRow) => {
		const opts = opcionesMenuTurnoAdmin(row, permisosMenu);
		if (opts.length === 0) return;
		e.stopPropagation();
		setTurnoMenu({ row, x: e.clientX, y: e.clientY });
	};

	const cargar = useCallback(async () => {
		if (!puedeVer) return;
		setLoading(true);
		setError(null);
		try {
			const res = await turnosAdminService.listar(applied, page, limit);
			setRows(res.data);
			setTotal(res.pagination.total);
			setTotalPages(res.pagination.totalPages);
		} catch (e: unknown) {
			const msg =
				e && typeof e === 'object' && 'message' in e
					? String((e as { message: string }).message)
					: 'No se pudo cargar el listado de turnos';
			setError(msg);
			setRows([]);
			setTotal(0);
			setTotalPages(1);
		} finally {
			setLoading(false);
		}
	}, [applied, page, limit, puedeVer]);

	useEffect(() => {
		if (loaded && puedeVer) cargar();
	}, [loaded, puedeVer, cargar]);

	const setField = (key: keyof TurnosAdminFiltros, value: string) => {
		setDraft((prev) => ({ ...prev, [key]: value }));
	};

	const aplicarFiltros = () => {
		setApplied({ ...draft });
		setPage(1);
	};

	const limpiarFiltros = () => {
		const vacio = { ...EMPTY_FILTROS };
		setDraft(vacio);
		setApplied(vacio);
		setPage(1);
	};

	const handleAccionTurno = async (action: TurnoAdminAction, row: TurnoAdminRow) => {
		setTurnoMenu(null);
		if (action === 'editar') {
			setTurnoEditar(row);
			return;
		}
		if (action === 'rac') {
			setRacSlot(turnoAdminRowToSlot(row));
			setRacFecha(row.fecha || '');
			return;
		}
		if (action === 'detalle') {
			setDetalleTurnoId(row.idTurno);
			return;
		}
		if (!row.profesional) return;

		if (action === 'cancelar') {
			const ok = window.confirm(
				'¿Cancelar este turno? Una vez cancelado no podrá recuperarse.',
			);
			if (!ok) return;
			setError(null);
			try {
				await agendaService.cancelarTurno(row.profesional, row.idTurno);
				cargar();
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al cancelar');
			}
			return;
		}

		if (action === 'cerrar') {
			setError(null);
			setTurnoCerrar(row);
			return;
		}

		if (action === 'borrar') {
			const esSt = row.tipoTurno === 1 || row.tipoTurnoLabel === 'SOBRETURNO';
			const ok = window.confirm(
				esSt
					? '¿Eliminar este sobreturno por completo?'
					: '¿Borrar este turno y liberar el cupo?',
			);
			if (!ok) return;
			setError(null);
			try {
				await agendaService.borrarTurno(row.profesional, row.idTurno);
				cargar();
			} catch (e: unknown) {
				const err = e as { response?: { data?: { mensaje?: string } }; message?: string };
				setError(err?.response?.data?.mensaje || err?.message || 'Error al borrar');
			}
		}
	};

	const cerrarRac = () => {
		setRacSlot(null);
		setRacFecha('');
		cargar();
	};

	const rangoLabel = useMemo(() => {
		const desde = applied.fechaDesde || '—';
		const hasta = applied.fechaHasta || '—';
		if (!applied.fechaDesde && !applied.fechaHasta) return 'Sin filtro de fechas';
		return `${desde} → ${hasta}`;
	}, [applied.fechaDesde, applied.fechaHasta]);

	if (!loaded) {
		return <div className={styles.page}><p className={styles.loading}>Cargando…</p></div>;
	}

	if (!puedeVer) {
		return (
			<div className={styles.page}>
				<p className={styles.error}>No tiene permiso para ver el administrador de turnos.</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={`${styles.mainCard} ${agendaStyles.tableWrapEnter}`}>
				<div className={styles.cardHeader}>
					<h1 className={styles.cardTitle}>Administrador de turnos</h1>
				</div>

				<div className={styles.filtersSection}>
				<div className={styles.filtersGrid}>
					<div className={`${styles.field} ${styles.fieldWide}`}>
						<label htmlFor="ta-q">Búsqueda</label>
						<input
							id="ta-q"
							type="search"
							placeholder="Paciente, DNI, ID turno, observaciones, profesional…"
							value={draft.q ?? ''}
							onChange={(e) => setField('q', e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-desde">Fecha desde</label>
						<input
							id="ta-desde"
							type="date"
							value={draft.fechaDesde ?? ''}
							onChange={(e) => setField('fechaDesde', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-hasta">Fecha hasta</label>
						<input
							id="ta-hasta"
							type="date"
							value={draft.fechaHasta ?? ''}
							onChange={(e) => setField('fechaHasta', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-status">Estado</label>
						<select
							id="ta-status"
							value={draft.status ?? ''}
							onChange={(e) => setField('status', e.target.value)}
						>
							<option value="">Todos</option>
							<option value="0">Ocupado</option>
							<option value="1">Cancelado</option>
							<option value="3">Atendido</option>
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-tipo">Tipo</label>
						<select
							id="ta-tipo"
							value={draft.tipoTurno ?? ''}
							onChange={(e) => setField('tipoTurno', e.target.value)}
						>
							<option value="">Todos</option>
							<option value="0">Grilla</option>
							<option value="1">Sobreturno</option>
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-sector">Sector</label>
						<input
							id="ta-sector"
							type="text"
							maxLength={4}
							placeholder="Ej. CONS"
							value={draft.sector ?? ''}
							onChange={(e) => setField('sector', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-prof">Matrícula profesional</label>
						<input
							id="ta-prof"
							type="number"
							placeholder="Matrícula"
							value={draft.profesional ?? ''}
							onChange={(e) => setField('profesional', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-triage">Triage</label>
						<select
							id="ta-triage"
							value={draft.triage ?? ''}
							onChange={(e) => setField('triage', e.target.value)}
						>
							<option value="">Todos</option>
							<option value="0">Sin clasificar</option>
							<option value="1">1</option>
							<option value="2">2</option>
							<option value="3">3</option>
							<option value="4">4</option>
							<option value="5">5</option>
						</select>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-id">ID turno</label>
						<input
							id="ta-id"
							type="number"
							value={draft.idTurno ?? ''}
							onChange={(e) => setField('idTurno', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-pac">ID paciente</label>
						<input
							id="ta-pac"
							type="number"
							value={draft.idPaciente ?? ''}
							onChange={(e) => setField('idPaciente', e.target.value)}
						/>
					</div>
					<div className={styles.field}>
						<label htmlFor="ta-dni">DNI</label>
						<input
							id="ta-dni"
							type="number"
							value={draft.numeroDocumento ?? ''}
							onChange={(e) => setField('numeroDocumento', e.target.value)}
						/>
					</div>
				</div>
				<div className={styles.filterActions}>
					<button type="button" className={styles.btnPrimary} onClick={aplicarFiltros}>
						Buscar
					</button>
					<button type="button" className={styles.btnSecondary} onClick={limpiarFiltros}>
						Limpiar filtros
					</button>
				</div>
			</div>

			<div className={styles.tableSection}>
				<div className={styles.tableMeta}>
					<span>
						{rangoLabel} · {total.toLocaleString('es-AR')} turno{total !== 1 ? 's' : ''}
					</span>
					<span>
						Página {page} de {totalPages}
					</span>
				</div>

				{loading ? (
					<p className={styles.loading}>Cargando turnos…</p>
				) : error ? (
					<p className={styles.error}>{error}</p>
				) : rows.length === 0 ? (
					<p className={styles.empty}>No hay turnos con los filtros seleccionados.</p>
				) : (
					<div className={styles.tableScroll}>
						<TurnosAdminTabla
							rows={rows}
							permisos={permisosMenu}
							onRowClick={abrirMenuTurno}
						/>
					</div>
				)}

				<TurnoAdminMenu
					open={!!turnoMenu}
					x={turnoMenu?.x ?? 0}
					y={turnoMenu?.y ?? 0}
					row={turnoMenu?.row ?? null}
					puedeEditar={puedeEditar}
					puedeEliminar={puedeEliminar}
					puedeRac={puedeRac}
					onClose={() => setTurnoMenu(null)}
					onAction={handleAccionTurno}
				/>

				<EditarTurnoAdminModal
					open={Boolean(turnoEditar)}
					turno={turnoEditar}
					onClose={() => setTurnoEditar(null)}
					onSaved={cargar}
				/>

				<AtencionTurnoModal
					open={Boolean(turnoCerrar)}
					matricula={turnoCerrar?.profesional ?? 0}
					fechaTurno={turnoCerrar?.fecha || ''}
					turno={
						turnoCerrar
							? {
									idTurno: turnoCerrar.idTurno,
									pacienteNombre: turnoCerrar.pacienteNombre,
									numeroDocumento: turnoCerrar.numeroDocumento,
									sector: turnoCerrar.sector,
									hora: turnoCerrar.hora,
									fecha: turnoCerrar.fecha,
									observaciones: turnoCerrar.observaciones,
									horaLlegada: turnoCerrar.horallegada,
									horaIngreso: turnoCerrar.horaIngreso,
									horaSalida: turnoCerrar.horaSalida,
								}
							: null
					}
					onClose={() => setTurnoCerrar(null)}
					onCerrado={() => {
						setTurnoCerrar(null);
						cargar();
					}}
				/>

				<DetalleTurnoModal
					open={detalleTurnoId != null}
					idTurno={detalleTurnoId}
					onClose={() => setDetalleTurnoId(null)}
				/>

				<RacEnfermeriaModal
					open={Boolean(racSlot)}
					slot={racSlot}
					fechaTurno={racFecha}
					onClose={cerrarRac}
				/>

				{!loading && !error && totalPages > 1 ? (
					<div className={styles.pagination}>
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							Anterior
						</button>
						<span>
							Página {page} de {totalPages}
						</span>
						<button
							type="button"
							disabled={page >= totalPages}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						>
							Siguiente
						</button>
					</div>
				) : null}
				</div>
			</div>
		</div>
	);
}
