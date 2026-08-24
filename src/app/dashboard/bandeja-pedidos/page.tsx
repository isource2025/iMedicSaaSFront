'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import estudiosService, { type BandejaConteo } from '@/app/services/estudiosService';
import {
	interconsultasService,
	type InterconsultaRow,
} from '@/app/services/interconsultasService';
import type { PedidoEstudio } from '@/app/types/estudios';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';
import CumplirEstudioModal from '@/app/components/beds/estudios/CumplirEstudioModal';
import PedidoAdjuntosField from '@/app/components/beds/estudios/PedidoAdjuntosField';
import PacientePedidoHeader from '@/app/components/beds/estudios/PacientePedidoHeader';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import formStyles from '@/app/components/beds/estudios/PedidoEstudioForms.module.css';
import styles from './bandejaPedidos.module.css';

const POLL_MS = 30_000;

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
	const nombre =
		(r.PracticaSolicitada || r.NomencladorDescripcion || r.NotasObservacion || '').trim() ||
		`Pedido #${r.IdPedido}`;
	const cod = r.CodigoPractica != null && Number(r.CodigoPractica) > 0 ? String(r.CodigoPractica) : '';
	return cod ? `${cod} · ${nombre}` : nombre;
}

function OrigenPedido({
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
			Pedido desde <strong className={styles.cardEmph}>{serv}</strong>
		</>
	);
}

function TituloPracticaEstudio({ r }: { r: PedidoEstudio }) {
	const nombre =
		(r.PracticaSolicitada || r.NomencladorDescripcion || r.NotasObservacion || '').trim() ||
		`Pedido #${r.IdPedido}`;
	const notas = (r.NotasObservacion || '').trim();
	const mostrarNotas = Boolean(notas && notas.toUpperCase() !== nombre.toUpperCase());
	const cod = r.CodigoPractica != null && Number(r.CodigoPractica) > 0 ? String(r.CodigoPractica) : '';
	return (
		<>
			{cod ? (
				<>
					<strong className={styles.practicaCod}>{cod}</strong>
					<span className={styles.practicaSep}> · </span>
					<strong className={styles.practicaNombre}>{nombre}</strong>
				</>
			) : (
				<strong className={styles.practicaNombre}>{nombre}</strong>
			)}
			{mostrarNotas ? <span className={styles.practicaNotas}>{notas}</span> : null}
		</>
	);
}

function TituloInterconsulta({ r }: { r: InterconsultaRow }) {
	const titulo = (
		r.PracticaSolicitada ||
		r.TipoPedidoDescripcion ||
		r.Especialidad ||
		'Interconsulta'
	).trim();
	const motivo = (r.Motivo || r.NotasObservacion || '').trim();
	const mostrarMotivo = Boolean(motivo && motivo.toUpperCase() !== titulo.toUpperCase());
	return (
		<>
			<strong className={styles.practicaNombre}>{titulo.slice(0, 140)}</strong>
			{mostrarMotivo ? <span className={styles.practicaNotas}>{motivo.slice(0, 180)}</span> : null}
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
	const matriculaSesion = usuario?.matricula ?? null;

	const tabParam = String(searchParams.get('tab') || '').toLowerCase();
	const [tab, setTab] = useState<Tab>(
		tabParam === 'interconsultas' || tabParam === 'interconsulta' ? 'interconsultas' : 'estudios',
	);

	const { sectores, loading: loadingSectores } = useSectoresReceptor({ soloMios: true });
	const [sector, setSector] = useState('');
	const [qServicio, setQServicio] = useState('');
	const [resumen, setResumen] = useState<BandejaConteo>({
		estudios: 0,
		interconsultas: 0,
		urgentes: 0,
		porServicio: [],
	});
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
	const loadingSectoresRef = useRef(loadingSectores);
	const sectoresLenRef = useRef(sectores.length);
	const filtroRef = useRef({ paciente: '', fechaDesde: '', fechaHasta: '' });
	sectorRef.current = sector;
	tabRef.current = tab;
	loadingSectoresRef.current = loadingSectores;
	sectoresLenRef.current = sectores.length;
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
		const qSector = String(searchParams.get('sector') || '').trim();
		if (qSector) {
			const resolved = resolveSectorReceptor(
				{ idSector: qSector, descripcion: qSector },
				sectores,
			);
			setSector(resolved || qSector);
			return;
		}
		if (sectores.length === 1 && sectores[0]?.valor) {
			setSector(sectores[0].valor);
		}
	}, [searchParams, sectores]);

	const loadResumen = useCallback(async () => {
		try {
			const data = await estudiosService.contarLibres({ soloMios: true });
			setResumen({
				estudios: data.estudios || 0,
				interconsultas: data.interconsultas || 0,
				urgentes: data.urgentes || 0,
				porServicio: data.porServicio || [],
			});
		} catch {
			/* se mantiene el último resumen */
		}
	}, []);

	const load = useCallback(async (opts?: { silent?: boolean }) => {
		const sec = sectorRef.current.trim();
		const currentTab = tabRef.current;
		if (!sec) {
			setEstudios([]);
			setInterconsultas([]);
			setLoading(false);
			void loadResumen();
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
			void loadResumen();
		}
	}, [loadResumen]);

	useEffect(() => {
		if (!cumplirIc) return;
		setAdjuntosIc([]);
		void import('@/app/services/adjuntosService').then(({ adjuntosService }) =>
			adjuntosService
				.getTiposImagenes()
				.then((list) => {
					setTiposAdj(list);
					setTipoAdjIc('');
				})
				.catch(() => setTiposAdj([])),
		);
	}, [cumplirIc]);

	useEffect(() => {
		fpRef.current = '';
		void load({ silent: false });
	}, [sector, tab, load]);

	useEffect(() => {
		void loadResumen();
		const id = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void loadResumen();
			if (sectorRef.current.trim()) void load({ silent: true });
		}, POLL_MS);
		const onVis = () => {
			if (document.visibilityState !== 'visible') return;
			void loadResumen();
			if (sectorRef.current.trim()) void load({ silent: true });
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			window.clearInterval(id);
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [load, loadResumen, sector, tab]);

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
	const vistaPanorama = !sector.trim() && sectores.length > 1;
	const servicioActual = sectores.find((s) => s.valor === sector);
	const baseConteo =
		(resumen.porServicio || []).length > 0
			? resumen.porServicio
			: sectores.map((s) => ({
					valor: s.valor,
					descripcion: s.descripcion || s.valor,
					valorServicio: s.valorServicio || '',
					descripcionServicio: s.descripcionServicio || '',
					estudios: 0,
					interconsultas: 0,
					urgentes: 0,
					total: 0,
				}));
	const pendientesServicios = baseConteo.map((s) => {
		const extra = sectores.find((x) => x.valor === s.valor);
		return {
			...s,
			valorServicio: s.valorServicio || extra?.valorServicio || '',
			descripcionServicio: s.descripcionServicio || extra?.descripcionServicio || '',
			descripcion: s.descripcion || extra?.descripcion || s.valor,
		};
	});
	const qSvc = qServicio.trim().toLowerCase();
	const serviciosVisibles = pendientesServicios.filter(
		(s) =>
			!qSvc ||
			s.descripcion.toLowerCase().includes(qSvc) ||
			s.valor.toLowerCase().includes(qSvc) ||
			String(s.valorServicio || '').toLowerCase().includes(qSvc) ||
			String(s.descripcionServicio || '').toLowerCase().includes(qSvc),
	);
	const serviciosSinPendiente = (resumen.porServicio || []).filter((s) => s.total <= 0).length;
	const totalPendientes = resumen.estudios + resumen.interconsultas;

	const puedeVolver = !vistaPanorama && sectores.length > 1;

	const volverAPanorama = () => {
		setSector('');
		setQServicio('');
	};

	const abrirServicio = (valor: string, nextTab?: Tab) => {
		if (nextTab) setTab(nextTab);
		setSector(valor);
		const main = document.querySelector('main');
		if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
		else window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	useEffect(() => {
		if (!puedeVolver) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (selectedEstudio || selectedIc || cumplirEstudio || cumplirIc) return;
			setSector('');
			setQServicio('');
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [puedeVolver, selectedEstudio, selectedIc, cumplirEstudio, cumplirIc]);

	return (
		<div className={styles.page}>
			{puedeVolver ? (
				<div className={styles.queueContext}>
					<button type="button" className={styles.backBarBtn} onClick={volverAPanorama}>
						<span className={styles.backBarIcon} aria-hidden>
							←
						</span>
						Volver a todos los sectores
					</button>
					<p className={styles.queueWhere}>
						Estás en <strong>{servicioActual?.descripcion || 'este sector'}</strong>
						{servicioActual?.valor ? ` · ${servicioActual.valor}` : ''}
						{servicioActual?.descripcionServicio || servicioActual?.valorServicio
							? ` · ${servicioActual.descripcionServicio || servicioActual.valorServicio}`
							: ''}
					</p>
				</div>
			) : null}

			<header className={styles.hero}>
				<div className={styles.heroText}>
					<p className={styles.eyebrow}>Recepción de pedidos</p>
					<h1 className={styles.title}>
						{vistaPanorama ? 'Bandeja' : servicioActual?.descripcion || 'Bandeja'}
					</h1>
					<p className={styles.subtitle}>
						{vistaPanorama
							? 'Elegí el sector al que querés entrar. Después podés volver acá con un clic.'
							: servicioActual
								? 'Cola de este sector. Un pedido, una persona.'
								: 'Estudios e interconsultas. Un pedido, una persona.'}
					</p>
				</div>
				{vistaPanorama ? null : (
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
				)}
			</header>

			{error ? <div className={styles.error}>{error}</div> : null}

			{vistaPanorama ? (
				<div className={styles.overview}>
					<div className={styles.kpis}>
						<div className={styles.kpi}>
							<span className={styles.kpiValue}>{totalPendientes}</span>
							<span className={styles.kpiLabel}>Pendientes</span>
							<span className={styles.kpiHint}>Libres para aceptar</span>
						</div>
						<div className={`${styles.kpi} ${styles.kpiEst}`}>
							<span className={styles.kpiValue}>{resumen.estudios}</span>
							<span className={styles.kpiLabel}>Estudios</span>
							<span className={styles.kpiHint}>Todos los sectores</span>
						</div>
						<div className={`${styles.kpi} ${styles.kpiIc}`}>
							<span className={styles.kpiValue}>{resumen.interconsultas}</span>
							<span className={styles.kpiLabel}>Interconsultas</span>
							<span className={styles.kpiHint}>Todos los sectores</span>
						</div>
						<div className={`${styles.kpi} ${styles.kpiUrg}`}>
							<span className={styles.kpiValue}>{resumen.urgentes}</span>
							<span className={styles.kpiLabel}>Urgentes</span>
							<span className={styles.kpiHint}>Prioridad clínica</span>
						</div>
					</div>
					<div className={styles.overviewHead}>
						<div>
							<h2 className={styles.overviewTitle}>Por sector</h2>
							<p className={styles.overviewMeta}>
								Tocá una tarjeta para abrir la cola
								{pendientesServicios.filter((s) => s.total > 0).length > 0
									? ` · ${pendientesServicios.filter((s) => s.total > 0).length} con pedidos`
									: ''}
								{serviciosSinPendiente > 0 ? ` · ${serviciosSinPendiente} sin pendientes` : ''}
							</p>
						</div>
						<input
							className={styles.svcSearch}
							type="search"
							placeholder="Buscar sector…"
							value={qServicio}
							onChange={(e) => setQServicio(e.target.value)}
						/>
					</div>
					{loadingSectores && sectores.length === 0 ? (
						<p className={styles.empty}>Cargando sectores…</p>
					) : serviciosVisibles.length === 0 ? (
						<div className={styles.emptyCard}>
							<p className={styles.emptyTitle}>
								{qSvc ? 'Ningún sector coincide' : 'Nada pendiente'}
							</p>
							<p className={styles.emptyHint}>
								{qSvc
									? 'Probá con otro nombre o código.'
									: 'Cuando llegue un pedido libre, aparece acá.'}
							</p>
						</div>
					) : (
						<div className={styles.svcGrid}>
							{serviciosVisibles.map((s) => (
								<button
									key={s.valor}
									type="button"
									className={`${styles.svcCard} ${s.urgentes > 0 ? styles.svcCardUrg : ''}`}
									aria-label={`Abrir cola de ${s.descripcion}`}
									onClick={() =>
										abrirServicio(
											s.valor,
											s.interconsultas > s.estudios ? 'interconsultas' : 'estudios',
										)
									}
								>
									<div className={styles.svcTop}>
										<div>
											<p className={styles.svcName}>{s.descripcion}</p>
											<p className={styles.svcCode}>
												{s.valor}
												{s.descripcionServicio || s.valorServicio
													? ` · ${s.descripcionServicio || s.valorServicio}`
													: ''}
											</p>
										</div>
										<span className={styles.svcTotal}>{s.total}</span>
									</div>
									<div className={styles.svcSplit}>
										<span className={`${styles.svcChip} ${styles.svcChipEst}`}>
											{s.estudios} estudios
										</span>
										<span className={`${styles.svcChip} ${styles.svcChipIc}`}>
											{s.interconsultas} interc.
										</span>
										{s.urgentes > 0 ? (
											<span className={`${styles.svcChip} ${styles.svcChipUrg}`}>
												{s.urgentes} urgentes
											</span>
										) : null}
									</div>
									<span className={styles.svcCta}>
										Abrir cola
										<span aria-hidden> →</span>
									</span>
								</button>
							))}
						</div>
					)}
				</div>
			) : (
			<>

			<div className={styles.toolbar}>
				<label className={styles.field}>
					<span>{sectores.length > 1 ? 'Cambiar sector' : 'Sector'}</span>
					<select
						className={styles.select}
						value={sector}
						onChange={(e) => setSector(e.target.value)}
						disabled={loadingSectores && sectores.length === 0}
					>
						<option value="">
							{loadingSectores && sectores.length === 0
								? 'Cargando…'
								: sectores.length > 1
									? 'Todos los sectores'
									: 'Seleccionar…'}
						</option>
						{sectores.map((s) => (
							<option key={s.valor} value={s.valor}>
								{s.descripcion} ({s.valor})
								{s.descripcionServicio || s.valorServicio
									? ` · ${s.descripcionServicio || s.valorServicio}`
									: ''}
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

			{loadingSectores && sectores.length === 0 ? (
				<p className={styles.empty}>Cargando sectores…</p>
			) : !loading && sectores.length === 0 ? (
				<div className={styles.emptyCard}>
					<p className={styles.emptyTitle}>Sin sectores asignados</p>
					<p className={styles.emptyHint}>
						Tu usuario no tiene sectores asignados. Un administrador puede cargarlos en Personal → Sectores.
					</p>
				</div>
			) : loading ? (
				<p className={styles.empty}>Cargando…</p>
			) : tab === 'estudios' ? (
				rowsEstudio.length === 0 ? (
					<div className={styles.emptyCard}>
						<p className={styles.emptyTitle}>Sin estudios pendientes</p>
						<p className={styles.emptyHint}>Cuando llegue un pedido para este sector, aparece acá.</p>
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
										onClick={() => setSelectedEstudio(r)}
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
											<OrigenPedido r={r} />
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
					<p className={styles.emptyHint}>Cuando llegue una solicitud para este sector, aparece acá.</p>
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
										{r.EstadoUrgencia ? (
											<span className={styles.urgencia}>{r.EstadoUrgencia}</span>
										) : null}
									</div>
									<button
										type="button"
										className={styles.cardTitleBtn}
										onClick={() => setSelectedIc(r)}
									>
										<TituloInterconsulta r={r} />
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
											<OrigenPedido r={r} />
										</p>
									)}
									<p className={styles.cardMeta}>
										{formatFechaIc(r) || 'Sin fecha'}
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

			</>
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
							label: 'Sector origen',
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
					]}
					textBlocks={[
						{ label: 'Pedido', value: selectedEstudio.NotasObservacion },
						{
							label: 'Respuesta',
							value:
								selectedEstudio.TextoResultado ||
								(selectedEstudio.Cumplido ? '(sin texto)' : null),
						},
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
					title={(selectedIc.Motivo || selectedIc.NotasObservacion || 'Interconsulta').slice(0, 120)}
					urgencia={selectedIc.EstadoUrgencia}
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
							label: 'Sector origen',
							value: selectedIc.SectorSolicitanteNombre || selectedIc.SectorSolicitante,
						},
						{ label: 'Profesional', value: selectedIc.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedIc.NombreToma },
						{
							label: 'Destino',
							value: selectedIc.ServicioDescripcion || selectedIc.SectorReceptor,
						},
					]}
					textBlocks={[
						{
							label: 'Pedido',
							value: selectedIc.Motivo || selectedIc.NotasObservacion,
						},
						{
							label: 'Respuesta',
							value: selectedIc.Respuesta || (selectedIc.Cumplido ? '(sin texto)' : null),
						},
					]}
					onClose={() => setSelectedIc(null)}
				/>
			) : null}

			{cumplirIc ? (
				<div className={styles.modalOverlay} onClick={() => setCumplirIc(null)}>
					<div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
						<h3 className={styles.modalTitle}>
							Completar ·{' '}
							{(cumplirIc.PracticaSolicitada ||
								cumplirIc.TipoPedidoDescripcion ||
								cumplirIc.Especialidad ||
								'Interconsulta'
							).trim()}
						</h3>
						<PacientePedidoHeader
							nombre={cumplirIc.PacienteNombre}
							documento={cumplirIc.PacienteDocumento}
							sexo={cumplirIc.PacienteSexo}
							sexoDescripcion={cumplirIc.PacienteSexoDescripcion}
							tipoAtencion={cumplirIc.TipoAtencion}
							ubicacion={cumplirIc.Ubicacion}
							idVisita={cumplirIc.IdVisita}
							obraSocial={cumplirIc.ObraSocial}
						/>
						<div className={formStyles.solicitudBox}>
							<strong className={formStyles.solicitudDe}>
								{cumplirIc.MedicoSolicitanteNombre
									? `Solicitud de ${cumplirIc.MedicoSolicitanteNombre}`
									: 'Solicitud del profesional'}
							</strong>
							<span className={formStyles.solicitudMeta}>
								{[
									(cumplirIc.SectorSolicitanteNombre || cumplirIc.SectorSolicitante)
										? `desde ${cumplirIc.SectorSolicitanteNombre || cumplirIc.SectorSolicitante}`
										: '',
									formatFechaIc(cumplirIc),
								]
									.filter(Boolean)
									.join(' · ')}
							</span>
							{(cumplirIc.Motivo || cumplirIc.NotasObservacion || '').trim() ? (
								<blockquote className={formStyles.solicitudQuote}>
									{(cumplirIc.Motivo || cumplirIc.NotasObservacion || '').trim()}
								</blockquote>
							) : (
								<p className={formStyles.solicitudEmpty}>No dejó un motivo en el pedido.</p>
							)}
						</div>
						<label className={formStyles.label}>
							Tu respuesta / resultado
							<textarea
								className={styles.textarea}
								rows={6}
								value={respuestaIc}
								onChange={(e) => setRespuestaIc(e.target.value)}
								placeholder="Redacte la respuesta de la interconsulta…"
							/>
						</label>
						<PedidoAdjuntosField
							tipos={tiposAdj}
							tipoImagen={tipoAdjIc}
							onTipoChange={setTipoAdjIc}
							archivos={adjuntosIc}
							onArchivosChange={setAdjuntosIc}
							disabled={busyId === icId(cumplirIc)}
							idVisita={cumplirIc.IdVisita}
						/>
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
