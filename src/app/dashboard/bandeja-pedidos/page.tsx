'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import estudiosService from '@/app/services/estudiosService';
import {
	interconsultasService,
	type InterconsultaRow,
} from '@/app/services/interconsultasService';
import type { PedidoEstudio, SectorReceptorEstudio } from '@/app/types/estudios';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { useAppContext } from '@/app/contexts/AppContext';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';
import CumplirEstudioModal from '@/app/components/beds/estudios/CumplirEstudioModal';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import styles from './bandejaPedidos.module.css';

const POLL_MS = 3000;

type Tab = 'estudios' | 'interconsultas';

function formatFechaEstudio(row: PedidoEstudio) {
	return [row.FechaPedidoISO || '', row.HoraPedido || ''].filter(Boolean).join(' ');
}

function formatFechaIc(row: InterconsultaRow) {
	return [row.FechaSolicitud, row.HoraSolicitud].filter(Boolean).join(' ');
}

function sexoIcon(sexo?: string | null, desc?: string | null) {
	const s = `${sexo || ''} ${desc || ''}`.trim().toUpperCase();
	if (s.includes('F') && !s.includes('MASC')) return '♀';
	if (s.startsWith('M') || s.includes('MASC')) return '♂';
	return '';
}

function pacienteNombre(r: {
	PacienteNombre?: string | null;
	PacienteSexo?: string | null;
	PacienteSexoDescripcion?: string | null;
}) {
	const sexo = sexoIcon(r.PacienteSexo, r.PacienteSexoDescripcion);
	const nombre = r.PacienteNombre || 'Paciente sin datos';
	return sexo ? `${sexo} ${nombre}` : nombre;
}

function ubicacionLinea(r: { TipoAtencion?: string | null; Ubicacion?: string | null }) {
	if (r.TipoAtencion === 'INTERNADO') {
		return r.Ubicacion ? `Internado · ${r.Ubicacion}` : 'Internado';
	}
	if (r.TipoAtencion === 'AMBULATORIO') return 'Ambulatorio';
	return r.Ubicacion || null;
}

function pacienteSecundario(r: {
	PacienteDocumento?: string | null;
	ObraSocial?: string | null;
}) {
	const doc = r.PacienteDocumento ? `Doc. ${r.PacienteDocumento}` : null;
	const os = r.ObraSocial || null;
	return [doc, os].filter(Boolean).join(' · ');
}

function tituloPracticaEstudio(r: PedidoEstudio) {
	const nombre = r.PracticaSolicitada || `Pedido #${r.IdPedido}`;
	const cod = r.CodigoPractica != null && Number(r.CodigoPractica) > 0 ? String(r.CodigoPractica) : '';
	return cod ? `${cod} · ${nombre}` : nombre;
}

function origenLinea(r: {
	SectorSolicitanteNombre?: string | null;
	SectorSolicitante?: string | null;
	MedicoSolicitanteNombre?: string | null;
}) {
	const serv = r.SectorSolicitanteNombre || r.SectorSolicitante || null;
	const prof = r.MedicoSolicitanteNombre || null;
	if (serv && prof) return `Desde ${serv} · ${prof}`;
	if (serv) return `Desde ${serv}`;
	if (prof) return `Solicitó ${prof}`;
	return null;
}

function OrigenEstudio({
	r,
}: {
	r: {
		SectorSolicitanteNombre?: string | null;
		SectorSolicitante?: string | null;
		MedicoSolicitanteNombre?: string | null;
	};
}) {
	const serv = (r.SectorSolicitanteNombre || r.SectorSolicitante || '').trim();
	const prof = (r.MedicoSolicitanteNombre || '').trim();
	if (!serv && !prof) return null;
	if (prof && serv) {
		return (
			<>
				Solicitante <strong className={styles.cardEmph}>{prof}</strong> desde{' '}
				<strong className={styles.cardEmph}>{serv}</strong>
			</>
		);
	}
	if (prof) {
		return (
			<>
				Solicitante <strong className={styles.cardEmph}>{prof}</strong>
			</>
		);
	}
	return (
		<>
			Desde <strong className={styles.cardEmph}>{serv}</strong>
		</>
	);
}

function TituloPracticaEstudio({ r }: { r: PedidoEstudio }) {
	const nombre = r.PracticaSolicitada || `Pedido #${r.IdPedido}`;
	const cod = r.CodigoPractica != null && Number(r.CodigoPractica) > 0 ? String(r.CodigoPractica) : '';
	if (!cod) return <>{nombre}</>;
	return (
		<>
			<strong className={styles.practicaCod}>{cod}</strong>
			<span className={styles.practicaSep}> · </span>
			<strong className={styles.practicaNombre}>{nombre}</strong>
		</>
	);
}

function fingerprintEstudios(rows: PedidoEstudio[]) {
	return rows
		.map((r) => `${r.IdPedido}:${r.Tomado ? 1 : 0}:${r.MatriculaToma || 0}:${r.NombreToma || ''}`)
		.join('|');
}

function fingerprintIc(rows: InterconsultaRow[]) {
	return rows
		.map((r) => {
			const id = r.IdPedido || r.IdInterconsulta;
			return `${id}:${r.Tomado ? 1 : 0}:${r.MatriculaToma || 0}:${r.NombreToma || ''}`;
		})
		.join('|');
}

function BandejaPedidosContent() {
	const searchParams = useSearchParams();
	const usuario = useUsuarioActual();
	const { sectorSeleccionado } = useAppContext();
	const matriculaSesion = usuario?.matricula ?? null;

	const tabParam = String(searchParams.get('tab') || '').toLowerCase();
	const [tab, setTab] = useState<Tab>(
		tabParam === 'interconsultas' || tabParam === 'interconsulta' ? 'interconsultas' : 'estudios',
	);

	const [sectores, setSectores] = useState<SectorReceptorEstudio[]>([]);
	const [sector, setSector] = useState('');
	const [estudios, setEstudios] = useState<PedidoEstudio[]>([]);
	const [interconsultas, setInterconsultas] = useState<InterconsultaRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);

	const [selectedEstudio, setSelectedEstudio] = useState<PedidoEstudio | null>(null);
	const [cumplirEstudio, setCumplirEstudio] = useState<PedidoEstudio | null>(null);
	const [selectedIc, setSelectedIc] = useState<InterconsultaRow | null>(null);
	const [cumplirIc, setCumplirIc] = useState<InterconsultaRow | null>(null);
	const [respuestaIc, setRespuestaIc] = useState('');
	const [filtroPaciente, setFiltroPaciente] = useState('');
	const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
	const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
	const [adjuntosIc, setAdjuntosIc] = useState<File[]>([]);
	const [tiposAdj, setTiposAdj] = useState<{ TipoImagen: string; DescTipoImagen: string }[]>([]);
	const [tipoAdjIc, setTipoAdjIc] = useState('');

	const fpRef = useRef('');
	const sectorRef = useRef(sector);
	const tabRef = useRef(tab);
	const filtroRef = useRef({ paciente: '', fechaDesde: '', fechaHasta: '' });
	sectorRef.current = sector;
	tabRef.current = tab;
	filtroRef.current = {
		paciente: filtroPaciente,
		fechaDesde: filtroFechaDesde,
		fechaHasta: filtroFechaHasta,
	};

	useEffect(() => {
		const t = String(searchParams.get('tab') || '').toLowerCase();
		if (t === 'interconsultas' || t === 'interconsulta') setTab('interconsultas');
		if (t === 'estudios' || t === 'estudio') setTab('estudios');
	}, [searchParams]);

	useEffect(() => {
		void estudiosService.listarSectoresReceptor({ soloMios: true }).then((list) => {
			setSectores(list);
			const qSector = String(searchParams.get('sector') || '').trim();
			const resolved = resolveSectorReceptor(
				qSector
					? { idSector: qSector, descripcion: sectorSeleccionado?.descripcion }
					: sectorSeleccionado,
				list,
			);
			if (resolved) setSector(resolved);
			else if (list[0]?.valor) setSector(list[0].valor);
			else setSector('');
		});
	}, [searchParams, sectorSeleccionado]);

	const load = useCallback(async (opts?: { silent?: boolean }) => {
		const sec = sectorRef.current.trim();
		const currentTab = tabRef.current;
		if (!sec) {
			setEstudios([]);
			setInterconsultas([]);
			setLoading(false);
			return;
		}
		const silent = Boolean(opts?.silent);
		if (!silent) setLoading(true);
		setError(null);
		try {
			const filtros = {
				paciente: filtroRef.current.paciente.trim() || undefined,
				fechaDesde: filtroRef.current.fechaDesde.trim() || undefined,
				fechaHasta: filtroRef.current.fechaHasta.trim() || undefined,
			};
			if (currentTab === 'estudios') {
				const rows = await estudiosService.listarPendientes(sec, filtros);
				const fp = fingerprintEstudios(rows);
				if (fp !== fpRef.current || !silent) {
					fpRef.current = fp;
					setEstudios(rows);
				}
			} else {
				const rows = await interconsultasService.listarPendientes(sec, filtros);
				const fp = fingerprintIc(rows);
				if (fp !== fpRef.current || !silent) {
					fpRef.current = fp;
					setInterconsultas(rows);
				}
			}
		} catch (e) {
			if (!silent) {
				setError(e instanceof Error ? e.message : 'Error al cargar la bandeja');
				setEstudios([]);
				setInterconsultas([]);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!cumplirIc) return;
		setAdjuntosIc([]);
		void import('@/app/services/adjuntosService').then(({ adjuntosService }) =>
			adjuntosService
				.getTiposImagenes()
				.then((list) => {
					setTiposAdj(list);
					setTipoAdjIc((prev) => prev || list[0]?.TipoImagen || '');
				})
				.catch(() => setTiposAdj([])),
		);
	}, [cumplirIc]);

	useEffect(() => {
		fpRef.current = '';
		void load({ silent: false });
	}, [sector, tab, load]);

	useEffect(() => {
		if (!sector.trim()) return;
		const id = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void load({ silent: true });
		}, POLL_MS);
		const onVis = () => {
			if (document.visibilityState === 'visible') void load({ silent: true });
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			window.clearInterval(id);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [sector, tab, load]);

	const esMioEstudio = (r: PedidoEstudio) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const esMioIc = (r: InterconsultaRow) =>
		matriculaSesion != null &&
		r.MatriculaToma != null &&
		Number(r.MatriculaToma) === Number(matriculaSesion);

	const icId = (r: InterconsultaRow) => Number(r.IdPedido || r.IdInterconsulta) || 0;

	const aceptarEstudio = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		setError(null);
		try {
			await estudiosService.tomar(r.IdPedido);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo aceptar (puede que otro ya lo tomó)');
			await load({ silent: true });
		} finally {
			setBusyId(null);
		}
	};

	const liberarEstudio = async (r: PedidoEstudio) => {
		setBusyId(r.IdPedido);
		try {
			await estudiosService.liberar(r.IdPedido);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const aceptarIc = async (r: InterconsultaRow) => {
		const id = icId(r);
		setBusyId(id);
		setError(null);
		try {
			await interconsultasService.tomar(id);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo aceptar (puede que otro ya lo tomó)');
			await load({ silent: true });
		} finally {
			setBusyId(null);
		}
	};

	const liberarIc = async (r: InterconsultaRow) => {
		const id = icId(r);
		setBusyId(id);
		try {
			await interconsultasService.liberar(id);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

	const confirmarCumplirIc = async () => {
		if (!cumplirIc || !respuestaIc.trim()) return;
		if (adjuntosIc.length > 0 && !tipoAdjIc.trim()) {
			setError('Seleccioná el tipo de documento para los adjuntos');
			return;
		}
		const id = icId(cumplirIc);
		setBusyId(id);
		try {
			await interconsultasService.cumplir(id, respuestaIc.trim());
			if (adjuntosIc.length > 0 && cumplirIc.IdVisita > 0) {
				const { adjuntosService } = await import('@/app/services/adjuntosService');
				await adjuntosService.subirArchivos(cumplirIc.IdVisita, adjuntosIc, tipoAdjIc.trim());
			}
			setCumplirIc(null);
			setRespuestaIc('');
			setAdjuntosIc([]);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo cumplir');
		} finally {
			setBusyId(null);
		}
	};

	const rowsEstudio = estudios;
	const rowsIc = interconsultas;
	const libres =
		tab === 'estudios'
			? rowsEstudio.filter((r) => !r.Tomado).length
			: rowsIc.filter((r) => !r.Tomado).length;
	const mios =
		tab === 'estudios'
			? rowsEstudio.filter((r) => esMioEstudio(r)).length
			: rowsIc.filter((r) => esMioIc(r)).length;
	const total = tab === 'estudios' ? rowsEstudio.length : rowsIc.length;

	return (
		<div className={styles.page}>
			<header className={styles.hero}>
				<div className={styles.heroText}>
					<p className={styles.eyebrow}>Recepción de pedidos</p>
					<h1 className={styles.title}>Bandeja</h1>
					<p className={styles.subtitle}>
						Estudios e interconsultas de tu servicio. Un pedido, una persona.
					</p>
				</div>
				<div className={styles.stats}>
					<div className={`${styles.stat} ${styles.statLibre}`}>
						<span className={styles.statValue}>{libres}</span>
						<span className={styles.statLabel}>Libres</span>
					</div>
					<div className={`${styles.stat} ${styles.statMio}`}>
						<span className={styles.statValue}>{mios}</span>
						<span className={styles.statLabel}>Tuyos</span>
					</div>
					<div className={styles.stat}>
						<span className={styles.statValue}>{total}</span>
						<span className={styles.statLabel}>Total</span>
					</div>
				</div>
			</header>

			<div className={styles.toolbar}>
				<label className={styles.field}>
					<span>Servicio</span>
					<select
						className={styles.select}
						value={sector}
						onChange={(e) => setSector(e.target.value)}
					>
						<option value="">Seleccionar…</option>
						{sectores.map((s) => (
							<option key={s.valor} value={s.valor}>
								{s.descripcion} ({s.valor})
							</option>
						))}
					</select>
				</label>
				<label className={styles.field}>
					<span>Paciente</span>
					<input
						className={styles.select}
						type="search"
						placeholder="Nombre o documento…"
						value={filtroPaciente}
						onChange={(e) => setFiltroPaciente(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								fpRef.current = '';
								void load({ silent: false });
							}
						}}
					/>
				</label>
				<label className={styles.field}>
					<span>Desde</span>
					<input
						className={styles.select}
						type="date"
						value={filtroFechaDesde}
						onChange={(e) => setFiltroFechaDesde(e.target.value)}
					/>
				</label>
				<label className={styles.field}>
					<span>Hasta</span>
					<input
						className={styles.select}
						type="date"
						value={filtroFechaHasta}
						onChange={(e) => setFiltroFechaHasta(e.target.value)}
					/>
				</label>
				<div className={styles.tabs} role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'estudios'}
						className={`${styles.tab} ${tab === 'estudios' ? styles.tabActive : ''}`}
						onClick={() => setTab('estudios')}
					>
						Estudios
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === 'interconsultas'}
						className={`${styles.tab} ${tab === 'interconsultas' ? styles.tabActive : ''}`}
						onClick={() => setTab('interconsultas')}
					>
						Interconsultas
					</button>
				</div>
				<button
					type="button"
					className={styles.refreshBtn}
					onClick={() => {
						fpRef.current = '';
						void load({ silent: false });
					}}
					disabled={loading}
				>
					Buscar
				</button>
				<button
					type="button"
					className={styles.clearBtn}
					disabled={loading || (!filtroPaciente && !filtroFechaDesde && !filtroFechaHasta)}
					onClick={() => {
						setFiltroPaciente('');
						setFiltroFechaDesde('');
						setFiltroFechaHasta('');
						filtroRef.current = { paciente: '', fechaDesde: '', fechaHasta: '' };
						fpRef.current = '';
						void load({ silent: false });
					}}
				>
					Limpiar filtros
				</button>
			</div>

			{error ? <div className={styles.error}>{error}</div> : null}

			{!loading && sectores.length === 0 ? (
				<div className={styles.emptyCard}>
					<p className={styles.emptyTitle}>Sin servicios asignados</p>
					<p className={styles.emptyHint}>
						Tu usuario no tiene sectores vinculados a servicios de pedidos. Pedí a un administrador que te asigne el sector correspondiente.
					</p>
				</div>
			) : loading ? (
				<p className={styles.empty}>Cargando…</p>
			) : tab === 'estudios' ? (
				rowsEstudio.length === 0 ? (
					<div className={styles.emptyCard}>
						<p className={styles.emptyTitle}>Sin estudios pendientes</p>
						<p className={styles.emptyHint}>Cuando llegue un pedido para este servicio, aparece acá.</p>
					</div>
				) : (
					<ul className={styles.cardList}>
						{rowsEstudio.map((r) => (
							<li
								key={r.IdPedido}
								className={`${styles.card} ${r.Tomado && !esMioEstudio(r) ? styles.cardTaken : ''} ${esMioEstudio(r) ? styles.cardMine : ''} ${!r.Tomado ? styles.cardLibre : ''}`}
							>
								<div className={styles.cardMain}>
									<div className={styles.cardTop}>
										{!r.Tomado ? (
											<span className={styles.badgeLibre}>Libre</span>
										) : esMioEstudio(r) ? (
											<span className={styles.badgeMio}>Aceptado por vos</span>
										) : (
											<span className={styles.badgeOtro}>
												Aceptado · {r.NombreToma || 'otro'}
											</span>
										)}
										{r.EstadoUrgencia ? (
											<span className={styles.urgencia}>{r.EstadoUrgencia}</span>
										) : null}
									</div>
									<button
										type="button"
										className={styles.cardTitleBtn}
										onClick={() =>
											void estudiosService
												.obtenerPorId(r.IdPedido)
												.then((d) => setSelectedEstudio(d || r))
										}
									>
										<TituloPracticaEstudio r={r} />
									</button>
									<p className={styles.cardPatient}>{pacienteNombre(r)}</p>
									{ubicacionLinea(r) ? (
										<p className={styles.cardLocation}>{ubicacionLinea(r)}</p>
									) : null}
									{pacienteSecundario(r) ? (
										<p className={styles.cardMeta}>{pacienteSecundario(r)}</p>
									) : null}
									{(r.MedicoSolicitanteNombre ||
										r.SectorSolicitanteNombre ||
										r.SectorSolicitante) && (
										<p className={styles.cardOrigen}>
											<OrigenEstudio r={r} />
										</p>
									)}
									<p className={styles.cardMeta}>
										{formatFechaEstudio(r) || 'Sin fecha'}
										{` · Visita ${r.IdVisita}`}
									</p>
								</div>
								<div className={styles.cardActions}>
									{!r.Tomado ? (
										<button
											type="button"
											className={styles.btnPrimary}
											disabled={busyId === r.IdPedido}
											onClick={() => void aceptarEstudio(r)}
										>
											Aceptar
										</button>
									) : null}
									{r.Tomado && esMioEstudio(r) ? (
										<>
											<button
												type="button"
												className={styles.btnPrimary}
												disabled={busyId === r.IdPedido}
												onClick={() => setCumplirEstudio(r)}
											>
												Completar
											</button>
											<button
												type="button"
												className={styles.btnSecondary}
												disabled={busyId === r.IdPedido}
												onClick={() => void liberarEstudio(r)}
											>
												Liberar
											</button>
										</>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)
			) : rowsIc.length === 0 ? (
				<div className={styles.emptyCard}>
					<p className={styles.emptyTitle}>Sin interconsultas pendientes</p>
					<p className={styles.emptyHint}>Cuando llegue una solicitud para este servicio, aparece acá.</p>
				</div>
			) : (
				<ul className={styles.cardList}>
					{rowsIc.map((r) => {
						const id = icId(r);
						return (
							<li
								key={id}
								className={`${styles.card} ${r.Tomado && !esMioIc(r) ? styles.cardTaken : ''} ${esMioIc(r) ? styles.cardMine : ''} ${!r.Tomado ? styles.cardLibre : ''}`}
							>
								<div className={styles.cardMain}>
									<div className={styles.cardTop}>
										{!r.Tomado ? (
											<span className={styles.badgeLibre}>Libre</span>
										) : esMioIc(r) ? (
											<span className={styles.badgeMio}>Aceptado por vos</span>
										) : (
											<span className={styles.badgeOtro}>
												Aceptado · {r.NombreToma || 'otro'}
											</span>
										)}
									</div>
									<button
										type="button"
										className={styles.cardTitleBtn}
										onClick={() => setSelectedIc(r)}
									>
										{(r.Motivo || r.NotasObservacion || 'Interconsulta').slice(0, 140)}
									</button>
									<p className={styles.cardPatient}>{pacienteNombre(r)}</p>
									{ubicacionLinea(r) ? (
										<p className={styles.cardLocation}>{ubicacionLinea(r)}</p>
									) : null}
									{pacienteSecundario(r) ? (
										<p className={styles.cardMeta}>{pacienteSecundario(r)}</p>
									) : null}
									<p className={styles.cardMeta}>
										{formatFechaIc(r) || 'Sin fecha'}
										{origenLinea(r) ? ` · ${origenLinea(r)}` : ''}
										{` · Visita ${r.IdVisita || '—'}`}
									</p>
								</div>
								<div className={styles.cardActions}>
									{!r.Tomado ? (
										<button
											type="button"
											className={styles.btnPrimary}
											disabled={busyId === id}
											onClick={() => void aceptarIc(r)}
										>
											Aceptar
										</button>
									) : null}
									{r.Tomado && esMioIc(r) ? (
										<>
											<button
												type="button"
												className={styles.btnPrimary}
												disabled={busyId === id}
												onClick={() => {
													setCumplirIc(r);
													setRespuestaIc('');
												}}
											>
												Responder
											</button>
											<button
												type="button"
												className={styles.btnSecondary}
												disabled={busyId === id}
												onClick={() => void liberarIc(r)}
											>
												Liberar
											</button>
										</>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			)}

			{selectedEstudio ? (
				<PedidoDetalleModal
					title={tituloPracticaEstudio(selectedEstudio)}
					urgencia={selectedEstudio.EstadoUrgencia}
					fields={[
						{ label: 'Código práctica', value: selectedEstudio.CodigoPractica },
						{ label: 'Paciente', value: selectedEstudio.PacienteNombre },
						{ label: 'Documento', value: selectedEstudio.PacienteDocumento },
						{
							label: 'Sexo',
							value:
								selectedEstudio.PacienteSexoDescripcion || selectedEstudio.PacienteSexo,
						},
						{ label: 'Obra social', value: selectedEstudio.ObraSocial },
						{
							label: 'Atención',
							value:
								selectedEstudio.TipoAtencion === 'INTERNADO'
									? `Internado${selectedEstudio.Ubicacion ? ` · ${selectedEstudio.Ubicacion}` : ''}`
									: selectedEstudio.TipoAtencion === 'AMBULATORIO'
										? 'Ambulatorio'
										: selectedEstudio.TipoAtencion,
						},
						{ label: 'Visita', value: selectedEstudio.IdVisita },
						{ label: 'Fecha', value: formatFechaEstudio(selectedEstudio) },
						{
							label: 'Servicio origen',
							value:
								selectedEstudio.SectorSolicitanteNombre ||
								selectedEstudio.SectorSolicitante,
						},
						{ label: 'Profesional', value: selectedEstudio.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedEstudio.NombreToma },
						{
							label: 'Destino',
							value: selectedEstudio.ServicioDescripcion || selectedEstudio.SectorReceptor,
						},
						{ label: 'Notas', value: selectedEstudio.NotasObservacion, full: true },
					]}
					onClose={() => setSelectedEstudio(null)}
				/>
			) : null}

			<CumplirEstudioModal
				open={!!cumplirEstudio}
				pedido={cumplirEstudio}
				sectorServicio={sector || undefined}
				onClose={() => setCumplirEstudio(null)}
				onCumplido={() => void load({ silent: true })}
			/>

			{selectedIc ? (
				<PedidoDetalleModal
					title="Interconsulta"
					fields={[
						{ label: 'Paciente', value: selectedIc.PacienteNombre },
						{ label: 'Documento', value: selectedIc.PacienteDocumento },
						{
							label: 'Sexo',
							value: selectedIc.PacienteSexoDescripcion || selectedIc.PacienteSexo,
						},
						{ label: 'Obra social', value: selectedIc.ObraSocial },
						{
							label: 'Atención',
							value:
								selectedIc.TipoAtencion === 'INTERNADO'
									? `Internado${selectedIc.Ubicacion ? ` · ${selectedIc.Ubicacion}` : ''}`
									: selectedIc.TipoAtencion === 'AMBULATORIO'
										? 'Ambulatorio'
										: selectedIc.TipoAtencion,
						},
						{ label: 'Visita', value: selectedIc.IdVisita },
						{ label: 'Fecha', value: formatFechaIc(selectedIc) },
						{
							label: 'Servicio origen',
							value: selectedIc.SectorSolicitanteNombre || selectedIc.SectorSolicitante,
						},
						{ label: 'Profesional', value: selectedIc.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedIc.NombreToma },
						{
							label: 'Motivo',
							value: selectedIc.Motivo || selectedIc.NotasObservacion,
							full: true,
						},
					]}
					onClose={() => setSelectedIc(null)}
				/>
			) : null}

			{cumplirIc ? (
				<div className={styles.modalOverlay} onClick={() => setCumplirIc(null)}>
					<div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>Completar interconsulta</h3>
						<p className={styles.cardPatient}>{pacienteNombre(cumplirIc)}</p>
						{ubicacionLinea(cumplirIc) ? (
							<p className={styles.cardLocation}>{ubicacionLinea(cumplirIc)}</p>
						) : null}
						{pacienteSecundario(cumplirIc) ? (
							<p className={styles.cardMeta}>{pacienteSecundario(cumplirIc)}</p>
						) : null}
						<textarea
							className={styles.textarea}
							rows={6}
							value={respuestaIc}
							onChange={(e) => setRespuestaIc(e.target.value)}
							placeholder="Respuesta / resultado…"
						/>
						<label className={styles.field} style={{ display: 'block', marginTop: '0.75rem' }}>
							<span>Adjuntar archivo (documentos del paciente)</span>
							{tiposAdj.length > 0 ? (
								<select
									className={styles.select}
									value={tipoAdjIc}
									onChange={(e) => setTipoAdjIc(e.target.value)}
									style={{ marginTop: '0.35rem', marginBottom: '0.35rem' }}
								>
									{tiposAdj.map((t) => (
										<option key={t.TipoImagen} value={t.TipoImagen}>
											{t.DescTipoImagen || t.TipoImagen}
										</option>
									))}
								</select>
							) : null}
							<input
								type="file"
								multiple
								onChange={(e) => setAdjuntosIc(Array.from(e.target.files || []))}
							/>
						</label>
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.btnSecondary}
								onClick={() => {
									setCumplirIc(null);
									setAdjuntosIc([]);
								}}
							>
								Cancelar
							</button>
							<button
								type="button"
								className={styles.btnPrimary}
								disabled={!respuestaIc.trim() || busyId === icId(cumplirIc)}
								onClick={() => void confirmarCumplirIc()}
							>
								Completar
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export default function BandejaPedidosPage() {
	return (
		<Suspense
			fallback={
				<div className={styles.page}>
					<p className={styles.empty}>Cargando bandeja…</p>
				</div>
			}
		>
			<BandejaPedidosContent />
		</Suspense>
	);
}
