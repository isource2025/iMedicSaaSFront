'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import estudiosService, { type BandejaConteo } from '@/app/services/estudiosService';
import {
	interconsultasService,
	type InterconsultaRow,
} from '@/app/services/interconsultasService';
import type { PedidoEstudio } from '@/app/types/estudios';
import solicitudesEstudiosService from '@/app/services/solicitudesEstudiosService';
import type { SolicitudEstudio } from '@/app/types/solicitudesEstudios';
import { useSolicitudesMulti } from '@/app/utils/solicitudesMulti';
import CumplirSolicitudModal from '@/app/components/beds/estudios/CumplirSolicitudModal';
import solStyles from '@/app/components/beds/estudios/SolicitudesEstudios.module.css';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { usePermiso } from '@/app/hooks/usePermiso';
import { useSectoresReceptor } from '@/app/hooks/useSectoresReceptor';
import { resolveSectorReceptor } from '@/app/utils/resolveSectorReceptor';
import CumplirEstudioModal from '@/app/components/beds/estudios/CumplirEstudioModal';
import PedidoAdjuntosField from '@/app/components/beds/estudios/PedidoAdjuntosField';
import PacientePedidoHeader from '@/app/components/beds/estudios/PacientePedidoHeader';
import PedidoDetalleModal from '@/app/components/beds/shared/PedidoDetalleModal';
import { buildAtencionField, buildPacienteFields } from '@/app/components/beds/shared/pacientePedidoFields';
import { autorRespuesta } from '@/app/components/beds/shared/pedidoResponsable';
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

function fingerprintSolicitudes(rows: SolicitudEstudio[]) {
	return rows
		.map(
			(s) =>
				`${s.Clave}:${s.Estado}:${s.ItemsCumplidos}/${s.TotalItems}:${s.MatriculaToma || 0}:${s.TomadoPor || ''}`,
		)
		.join('|');
}

function nombreItemSolicitud(it: PedidoEstudio) {
	return (it.PracticaSolicitada || it.NomencladorDescripcion || '').trim() || `Pedido #${it.IdPedido}`;
}

function TituloSolicitud({ s }: { s: SolicitudEstudio }) {
	if (s.Items.length === 1) return <TituloPracticaEstudio r={s.Items[0]} />;
	const notas = (s.NotasObservacion || '').trim();
	return (
		<>
			<strong className={styles.practicaNombre}>{s.TotalItems} estudios</strong>
			{s.Estado === 'PARCIAL' ? (
				<span className={solStyles.progreso} style={{ marginLeft: '0.5rem' }}>
					{s.ItemsCumplidos}/{s.TotalItems} informados
				</span>
			) : null}
			{notas ? <span className={styles.practicaNotas}>{notas}</span> : null}
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
	const { puede } = usePermiso();
	const matriculaSesion = usuario?.matricula ?? null;
	const puedeInterconsultas =
		puede('INTERNACION.INTERCONSULTAS.VER') || puede('TURNOS.AGENDA.VER');

	const tabParam = String(searchParams.get('tab') || '').toLowerCase();
	const [tab, setTab] = useState<Tab>(
		puedeInterconsultas && (tabParam === 'interconsultas' || tabParam === 'interconsulta')
			? 'interconsultas'
			: 'estudios',
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
	const [multi, setMulti] = useSolicitudesMulti();
	const multiRef = useRef(multi);
	multiRef.current = multi;
	const [solicitudes, setSolicitudes] = useState<SolicitudEstudio[]>([]);
	const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudEstudio | null>(null);
	const [cumplirSolicitud, setCumplirSolicitud] = useState<SolicitudEstudio | null>(null);
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
		if (!puedeInterconsultas && tab !== 'estudios') setTab('estudios');
	}, [puedeInterconsultas, tab]);

	useEffect(() => {
		const t = String(searchParams.get('tab') || '').toLowerCase();
		if (puedeInterconsultas && (t === 'interconsultas' || t === 'interconsulta')) {
			setTab('interconsultas');
		}
		if (t === 'estudios' || t === 'estudio') setTab('estudios');
	}, [searchParams, puedeInterconsultas]);

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
			const data = multiRef.current
				? await solicitudesEstudiosService.contarLibresBandeja({ soloMios: true })
				: await estudiosService.contarLibres({ soloMios: true });
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
		const silent = Boolean(opts?.silent);
		setError(null);
		// Sin servicio elegido no hay cola que mostrar (panorama o servicios aún cargando) y el backend la rechaza
		if (!sec) {
			fpRef.current = '';
			setEstudios([]);
			setSolicitudes([]);
			setInterconsultas([]);
			setLoading(false);
			void loadResumen();
			return;
		}
		if (!silent) setLoading(true);
		try {
			const filtros = {
				paciente: filtroRef.current.paciente.trim() || undefined,
				fechaDesde: filtroRef.current.fechaDesde.trim() || undefined,
				fechaHasta: filtroRef.current.fechaHasta.trim() || undefined,
			};
			if (currentTab === 'estudios' && multiRef.current) {
				const rows = await solicitudesEstudiosService.listarPendientes(sec, filtros);
				const fp = fingerprintSolicitudes(rows);
				if (fp !== fpRef.current || !silent) {
					fpRef.current = fp;
					setSolicitudes(rows);
				}
			} else if (currentTab === 'estudios') {
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
				setSolicitudes([]);
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
	}, [sector, tab, load, multi]);

	useEffect(() => {
		void loadResumen();
		const id = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void loadResumen();
			void load({ silent: true });
		}, POLL_MS);
		const onVis = () => {
			if (document.visibilityState !== 'visible') return;
			void loadResumen();
			void load({ silent: true });
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

	const esMiaSolicitud = (s: SolicitudEstudio) =>
		matriculaSesion != null &&
		s.MatriculaToma != null &&
		Number(s.MatriculaToma) === Number(matriculaSesion);

	const aceptarSolicitud = async (s: SolicitudEstudio) => {
		setBusyId(s.Clave);
		setError(null);
		try {
			await solicitudesEstudiosService.tomar(s.Clave);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo aceptar (puede que otro ya la tomó)');
			await load({ silent: true });
		} finally {
			setBusyId(null);
		}
	};

	const liberarSolicitud = async (s: SolicitudEstudio) => {
		setBusyId(s.Clave);
		setError(null);
		try {
			await solicitudesEstudiosService.liberar(s.Clave);
			await load({ silent: true });
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo liberar');
		} finally {
			setBusyId(null);
		}
	};

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
				await adjuntosService.subirArchivos(cumplirIc.IdVisita, adjuntosIc, tipoAdjIc.trim(), 'ESTUDIO');
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
	const enSolicitudes = tab === 'estudios' && multi;
	const libres = enSolicitudes
		? solicitudes.filter((s) => s.MatriculaToma == null).length
		: tab === 'estudios'
			? rowsEstudio.filter((r) => !r.Tomado).length
			: rowsIc.filter((r) => !r.Tomado).length;
	const mios = enSolicitudes
		? solicitudes.filter((s) => esMiaSolicitud(s)).length
		: tab === 'estudios'
			? rowsEstudio.filter((r) => esMioEstudio(r)).length
			: rowsIc.filter((r) => esMioIc(r)).length;
	const total = enSolicitudes
		? solicitudes.length
		: tab === 'estudios'
			? rowsEstudio.length
			: rowsIc.length;
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
			if (selectedEstudio || selectedIc || cumplirEstudio || cumplirIc || selectedSolicitud || cumplirSolicitud) return;
			setSector('');
			setQServicio('');
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [puedeVolver, selectedEstudio, selectedIc, cumplirEstudio, cumplirIc, selectedSolicitud, cumplirSolicitud]);

	return (
		<div className={styles.page}>
			{puedeVolver ? (
				<div className={styles.queueContext}>
					<button type="button" className={styles.backBarBtn} onClick={volverAPanorama}>
						<span className={styles.backBarIcon} aria-hidden>
							←
						</span>
						Volver a todos los servicios
					</button>
					<p className={styles.queueWhere}>
						Estás en <strong>{servicioActual?.descripcion || 'este servicio'}</strong>
						{servicioActual?.valor ? ` · ${servicioActual.valor}` : ''}
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
							? 'Elegí el servicio al que querés entrar. Después podés volver acá con un clic.'
							: servicioActual
								? 'Cola de este servicio. Un pedido, una persona.'
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
							<span className={styles.kpiHint}>Todos los servicios</span>
						</div>
						<div className={`${styles.kpi} ${styles.kpiIc}`}>
							<span className={styles.kpiValue}>{resumen.interconsultas}</span>
							<span className={styles.kpiLabel}>Interconsultas</span>
							<span className={styles.kpiHint}>Todos los servicios</span>
						</div>
						<div className={`${styles.kpi} ${styles.kpiUrg}`}>
							<span className={styles.kpiValue}>{resumen.urgentes}</span>
							<span className={styles.kpiLabel}>Urgentes</span>
							<span className={styles.kpiHint}>Prioridad clínica</span>
						</div>
					</div>
					<div className={styles.overviewHead}>
						<div>
							<h2 className={styles.overviewTitle}>Por servicio</h2>
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
							placeholder="Buscar servicio…"
							value={qServicio}
							onChange={(e) => setQServicio(e.target.value)}
						/>
					</div>
					{loadingSectores && sectores.length === 0 ? (
						<p className={styles.empty}>Cargando servicios…</p>
					) : serviciosVisibles.length === 0 ? (
						<div className={styles.emptyCard}>
							<p className={styles.emptyTitle}>
								{qSvc ? 'Ningún servicio coincide' : 'Nada pendiente'}
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
					<span>{sectores.length > 1 ? 'Cambiar servicio' : 'Servicio'}</span>
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
									? 'Todos los servicios'
									: 'Seleccionar…'}
						</option>
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
					{puedeInterconsultas ? (
						<button
							type="button"
							role="tab"
							aria-selected={tab === 'interconsultas'}
							className={`${styles.tab} ${tab === 'interconsultas' ? styles.tabActive : ''}`}
							onClick={() => setTab('interconsultas')}
						>
							Interconsultas
						</button>
					) : null}
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
				<p className={styles.empty}>Cargando servicios…</p>
			) : !loading && sectores.length === 0 ? (
				<div className={styles.emptyCard}>
					<p className={styles.emptyTitle}>Sin servicios asignados</p>
					<p className={styles.emptyHint}>
						Tu usuario no tiene servicios destino. Un administrador puede cargarlos en Personal → Servicios.
					</p>
				</div>
			) : loading ? (
				<p className={styles.empty}>Cargando…</p>
			) : enSolicitudes ? (
				solicitudes.length === 0 ? (
					<div className={styles.emptyCard}>
						<p className={styles.emptyTitle}>Sin estudios pendientes</p>
						<p className={styles.emptyHint}>Cuando llegue una solicitud para este servicio, aparece acá.</p>
					</div>
				) : (
					<ul className={styles.cardList}>
						{solicitudes.map((s) => {
							const libre = s.MatriculaToma == null;
							const mia = esMiaSolicitud(s);
							const pendientes = s.Items.filter((i) => !(i.Cumplido || Number(i.IdProtocolo) > 0));
							const primero = s.Items[0];
							return (
								<li
									key={s.Clave}
									className={`${styles.card} ${!libre && !mia ? styles.cardTaken : ''} ${mia ? styles.cardMine : ''} ${libre ? styles.cardLibre : ''}`}
								>
									<div className={styles.cardMain}>
										<div className={styles.cardTop}>
											{libre ? (
												<span className={styles.badgeLibre}>Libre</span>
											) : mia ? (
												<span className={styles.badgeMio}>Aceptado por vos</span>
											) : (
												<span className={styles.badgeOtro}>
													Aceptado · {s.TomadoPor || 'otro'}
												</span>
											)}
											{s.EstadoUrgencia ? (
												<span className={styles.urgencia}>{s.EstadoUrgencia}</span>
											) : null}
										</div>
										<button
											type="button"
											className={styles.cardTitleBtn}
											onClick={() => setSelectedSolicitud(s)}
										>
											<TituloSolicitud s={s} />
										</button>
										{s.Items.length > 1 ? (
											<ul className={solStyles.practicasLista}>
												{s.Items.map((it) => {
													const hecho = Boolean(it.Cumplido || Number(it.IdProtocolo) > 0);
													return (
														<li
															key={it.IdPedido}
															className={`${solStyles.practicaLinea} ${hecho ? solStyles.practicaLineaHecha : ''}`}
														>
															{it.CodigoPractica ? (
																<span className={solStyles.practicaLineaCod}>{it.CodigoPractica}</span>
															) : null}
															<span>{nombreItemSolicitud(it)}</span>
														</li>
													);
												})}
											</ul>
										) : null}
										<p className={styles.cardPatient}>{pacienteNombre(primero)}</p>
										{ubicacionLinea(primero) ? (
											<p className={styles.cardLocation}>{ubicacionLinea(primero)}</p>
										) : null}
										{pacienteSecundario(primero) ? (
											<p className={styles.cardMeta}>{pacienteSecundario(primero)}</p>
										) : null}
										{(s.MedicoSolicitanteNombre || s.SectorSolicitanteNombre || s.SectorSolicitante) && (
											<p className={styles.cardOrigen}>
												<OrigenPedido r={s} />
											</p>
										)}
										<p className={styles.cardMeta}>
											{[s.FechaPedidoISO || '', s.HoraPedido || ''].filter(Boolean).join(' ') || 'Sin fecha'}
											{` · Visita ${s.IdVisita}`}
										</p>
									</div>
									<div className={styles.cardActions}>
										{libre ? (
											<button
												type="button"
												className={styles.btnPrimary}
												disabled={busyId === s.Clave}
												onClick={() => void aceptarSolicitud(s)}
											>
												Aceptar{pendientes.length > 1 ? ` (${pendientes.length})` : ''}
											</button>
										) : null}
										{mia ? (
											<>
												<button
													type="button"
													className={styles.btnPrimary}
													disabled={busyId === s.Clave}
													onClick={() => setCumplirSolicitud(s)}
												>
													Completar
												</button>
												<button
													type="button"
													className={styles.btnSecondary}
													disabled={busyId === s.Clave}
													onClick={() => void liberarSolicitud(s)}
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
				)
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
						...buildPacienteFields(selectedEstudio),
						{ label: 'Visita', value: selectedEstudio.IdVisita },
						{ label: 'Código práctica', value: selectedEstudio.CodigoPractica },
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
							label: 'Realizado por',
							value: selectedEstudio.Cumplido ? autorRespuesta(selectedEstudio) : null,
						},
						{
							label: 'Servicio destino',
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
							autor: selectedEstudio.Cumplido ? autorRespuesta(selectedEstudio) : null,
							fecha: selectedEstudio.FechaResultado,
						},
					]}
					onClose={() => setSelectedEstudio(null)}
				/>
			) : null}

			<div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.72rem', opacity: 0.55 }}>
				<button
					type="button"
					style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
					onClick={() => {
						fpRef.current = '';
						setMulti(!multi);
					}}
					title="Vista de prueba: una tarjeta por solicitud, con todos sus estudios"
				>
					{multi ? '← Volver a la vista de siempre' : 'Vista agrupada de estudios (beta)'}
				</button>
			</div>

			{selectedSolicitud ? (
				<PedidoDetalleModal
					title={
						selectedSolicitud.Items.length > 1
							? `${selectedSolicitud.TotalItems} estudios`
							: tituloPracticaEstudio(selectedSolicitud.Items[0])
					}
					urgencia={selectedSolicitud.EstadoUrgencia || undefined}
					fields={[
						...buildPacienteFields(selectedSolicitud),
						{ label: 'Visita', value: selectedSolicitud.IdVisita },
						{
							label: 'Fecha',
							value: [selectedSolicitud.FechaPedidoISO || '', selectedSolicitud.HoraPedido || '']
								.filter(Boolean)
								.join(' '),
						},
						{
							label: 'Sector origen',
							value: selectedSolicitud.SectorSolicitanteNombre || selectedSolicitud.SectorSolicitante,
						},
						{ label: 'Profesional', value: selectedSolicitud.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedSolicitud.TomadoPor },
						{
							label: 'Servicio destino',
							value: selectedSolicitud.ServicioDescripcion || selectedSolicitud.SectorReceptor,
						},
					]}
					textBlocks={[
						{
							label: `Estudios (${selectedSolicitud.TotalItems})`,
							value: selectedSolicitud.Items.map(
								(it) =>
									`• ${nombreItemSolicitud(it)}${it.CodigoPractica ? ` (${it.CodigoPractica})` : ''}${
										it.Cumplido || Number(it.IdProtocolo) > 0 ? ' — informado' : ''
									}`,
							).join('\n'),
						},
						{ label: 'Pedido', value: selectedSolicitud.NotasObservacion },
					]}
					onClose={() => setSelectedSolicitud(null)}
				/>
			) : null}

			<CumplirSolicitudModal
				open={!!cumplirSolicitud}
				solicitud={cumplirSolicitud}
				sectorServicio={sector || undefined}
				onClose={() => setCumplirSolicitud(null)}
				onCumplido={() => void load({ silent: true })}
			/>

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
						buildAtencionField(selectedIc),
						{ label: 'Visita', value: selectedIc.IdVisita },
						{ label: 'Fecha', value: formatFechaIc(selectedIc) },
						{
							label: 'Sector origen',
							value: selectedIc.SectorSolicitanteNombre || selectedIc.SectorSolicitante,
						},
						{ label: 'Profesional', value: selectedIc.MedicoSolicitanteNombre },
						{ label: 'Aceptado por', value: selectedIc.NombreToma },
						{
							label: 'Respondido por',
							value: selectedIc.Cumplido ? autorRespuesta(selectedIc) : null,
						},
						{
							label: 'Servicio destino',
							value: selectedIc.ServicioDescripcion || selectedIc.SectorReceptor,
						},
					]}
					textBlocks={[
						{
							label: 'Pedido',
							value: selectedIc.Motivo || selectedIc.NotasObservacion,
							autor: selectedIc.MedicoSolicitanteNombre,
							fecha: formatFechaIc(selectedIc),
						},
						{
							label: 'Respuesta',
							value: selectedIc.Respuesta || (selectedIc.Cumplido ? '(sin texto)' : null),
							autor: selectedIc.Cumplido ? autorRespuesta(selectedIc) : null,
							fecha: selectedIc.FechaRespuesta,
						},
					]}
					onClose={() => setSelectedIc(null)}
				/>
			) : null}

			{cumplirIc ? (
				<div className={styles.modalOverlay} onClick={() => setCumplirIc(null)}>
					<div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
						<h3 className={`${styles.modalTitle} modal-title`}>
							Completar ·{' '}
							{(cumplirIc.PracticaSolicitada ||
								cumplirIc.TipoPedidoDescripcion ||
								cumplirIc.Especialidad ||
								'Interconsulta'
							).trim()}
						</h3>
						<PacientePedidoHeader paciente={cumplirIc} idVisita={cumplirIc.IdVisita} />
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
