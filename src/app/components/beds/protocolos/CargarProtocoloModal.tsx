'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type {
	FuncionRequerida,
	MedicamentoBusqueda,
	MedicamentoPayload,
	PracticaPayload,
	PracticaProtocolo,
	ProfesionalBusqueda,
	ProtocoloClinico,
	TipoProtocolo,
} from '@/app/types/protocolos';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { adjuntosService } from '@/app/services/adjuntosService';
import SubirAdjuntoModal from '../adjuntos/SubirAdjuntoModal';
import SubirAdjuntoButton from '../adjuntos/SubirAdjuntoButton';
import shell from '../shared/PedidoDetalleModal.module.css';
import styles from './CargarProtocoloModal.module.css';

type Props = {
	open: boolean;
	numeroVisita: number;
	sector?: string | null;
	onClose: () => void;
	onCreated: () => void;
	protocoloToEdit?: ProtocoloClinico | null;
};

type Asignacion = {
	funcion: FuncionRequerida;
	profesional: ProfesionalBusqueda | null;
	query: string;
	results: ProfesionalBusqueda[];
	searching?: boolean;
};

/** Una práctica de la cirugía con su propio equipo (una fila de imFacPracticas). */
type PracticaForm = {
	key: string;
	/** Valor de imFacPracticas si ya existe (edición). */
	valorPractica: number | null;
	practica: PracticaProtocolo | null;
	query: string;
	results: PracticaProtocolo[];
	loading: boolean;
	cantidad: string;
	asignaciones: Asignacion[];
	addFuncionCodigo: string;
	/** Facturada / valorizada: se muestra pero no se toca. */
	facturada: boolean;
};

type MedForm = {
	key: string;
	idProducto: number;
	rubro: string;
	descripcion: string;
	presentacion: string | null;
	cantidad: string;
	unidad: string;
};

const FALLBACK_ESP: FuncionRequerida = {
	codigo: 1,
	nombre: 'Especialista',
	unidad: 1,
};

const FUNCIONES_CATALOGO: FuncionRequerida[] = [
	{ codigo: 1, nombre: 'Especialista', unidad: 0 },
	{ codigo: 2, nombre: 'Ayudante 1', unidad: 0 },
	{ codigo: 3, nombre: 'Ayudante 2', unidad: 0 },
	{ codigo: 11, nombre: 'Ayudante 3', unidad: 0 },
	{ codigo: 4, nombre: 'Anestesista', unidad: 0 },
	{ codigo: 5, nombre: 'Instrumentista', unidad: 0 },
	{ codigo: 6, nombre: 'Monitoreo', unidad: 0 },
];

let keySeq = 0;
const nextKey = (p: string) => `${p}-${Date.now().toString(36)}-${(keySeq += 1)}`;

function practicaVacia(): PracticaForm {
	return {
		key: nextKey('prac'),
		valorPractica: null,
		practica: null,
		query: '',
		results: [],
		loading: false,
		cantidad: '1',
		asignaciones: [],
		addFuncionCodigo: '',
		facturada: false,
	};
}

/** Solo 1–999: descarta lo que no sea dígito y los ceros a la izquierda (el 0 no entra). */
function cantidadPractica(v: string) {
	return v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3);
}

/** "YYYY-MM-DDTHH:mm:ss" de pared → valor para <input type="datetime-local">. */
function aDatetimeLocal(v?: string | null) {
	if (!v) return '';
	const s = String(v).trim().replace(' ', 'T');
	return s.length >= 16 ? s.slice(0, 16) : '';
}

/** Ahora en hora local del navegador como "YYYY-MM-DDTHH:mm". */
function ahoraDatetimeLocal() {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function etiquetaProfesional(p: ProfesionalBusqueda) {
	return p.matricula != null ? `Mat. ${p.matricula}` : `Id ${p.valorPersonal}`;
}

export default function CargarProtocoloModal({
	open,
	numeroVisita,
	sector,
	onClose,
	onCreated,
	protocoloToEdit = null,
}: Props) {
	const usuario = useUsuarioActual();
	const isEdit = !!protocoloToEdit;

	const [tipos, setTipos] = useState<TipoProtocolo[]>([]);
	const [tipoProtocolo, setTipoProtocolo] = useState('');
	const [fechaHoraInicio, setFechaHoraInicio] = useState('');
	const [fechaHoraFin, setFechaHoraFin] = useState('');
	const [practicas, setPracticas] = useState<PracticaForm[]>([]);
	const [meds, setMeds] = useState<MedForm[]>([]);
	const [medQuery, setMedQuery] = useState('');
	const [medResults, setMedResults] = useState<MedicamentoBusqueda[]>([]);
	const [medSearching, setMedSearching] = useState(false);
	const [texto, setTexto] = useState('');
	const [tecnica, setTecnica] = useState('');
	const [diagnosticoPre, setDiagnosticoPre] = useState('');
	const [diagnosticoPos, setDiagnosticoPos] = useState('');
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [subirOpen, setSubirOpen] = useState(false);
	const [tipoAdjunto, setTipoAdjunto] = useState('');
	const [tiposAdjunto, setTiposAdjunto] = useState<{ TipoImagen: string; DescTipoImagen: string }[]>(
		[],
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const timers = useRef<Record<string, number>>({});
	const bodyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (error) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
	}, [error]);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setMedQuery('');
		setMedResults([]);
		if (protocoloToEdit) {
			setTipoProtocolo(protocoloToEdit.tipoProtocolo || '');
			setFechaHoraInicio(aDatetimeLocal(protocoloToEdit.fechaHoraInicio));
			setFechaHoraFin(aDatetimeLocal(protocoloToEdit.fechaHoraFin) || ahoraDatetimeLocal());
			setPracticas(
				(protocoloToEdit.practicas || []).map((prac) => ({
					key: nextKey('prac'),
					valorPractica: prac.valorPractica,
					practica: {
						idPractica: prac.codigoPractica,
						tipoPractica: prac.tipoPractica,
						descripcion: prac.descripcion,
						funcionesRequeridas: [],
					},
					query: prac.descripcion || '',
					results: [],
					loading: false,
					cantidad: String(prac.cantidad || 1),
					addFuncionCodigo: '',
					facturada: !!prac.facturada,
					asignaciones: (prac.profesionales || []).map((p) => ({
						funcion: { codigo: p.funcion, nombre: p.funcionNombre, unidad: 0 },
						profesional: {
							valorPersonal: p.valorPersonal,
							matricula: p.matricula ?? null,
							apellidoNombre: p.apellidoNombre || `Id ${p.valorPersonal}`,
						},
						query: '',
						results: [],
					})),
				})),
			);
			setMeds(
				(protocoloToEdit.medicamentos || []).map((m) => ({
					key: nextKey('med'),
					idProducto: m.idProducto,
					rubro: m.rubro || 'Medicamento',
					descripcion: m.descripcion,
					presentacion: m.presentacion,
					cantidad: m.cantidad != null ? String(m.cantidad) : '',
					unidad: m.unidad || '',
				})),
			);
			setTexto(protocoloToEdit.texto || '');
			setTecnica(protocoloToEdit.tecnica || '');
			setDiagnosticoPre(protocoloToEdit.diagnosticoPre || '');
			setDiagnosticoPos(protocoloToEdit.diagnosticoPos || '');
		} else {
			setTipoProtocolo('');
			setFechaHoraInicio('');
			setFechaHoraFin(ahoraDatetimeLocal());
			setPracticas([practicaVacia()]);
			setMeds([]);
			setTexto('');
			setTecnica('');
			setDiagnosticoPre('');
			setDiagnosticoPos('');
		}
		setPendingFiles([]);
		setTipoAdjunto('');
		void adjuntosService
			.getTiposImagenes()
			.then((rows) => setTiposAdjunto(rows || []))
			.catch(() => setTiposAdjunto([]));
		void protocolosService
			.listarTipos()
			.then((rows) => setTipos(rows.filter((t) => t.tipoProtocolo || t.descripcion)))
			.catch(() => setTipos([]));
	}, [open, protocoloToEdit]);

	// Búsqueda de medicamentos (una sola caja, agrega filas).
	useEffect(() => {
		const t = medQuery.trim();
		if (t.length < 2) {
			setMedResults([]);
			setMedSearching(false);
			return;
		}
		let cancel = false;
		setMedSearching(true);
		const h = window.setTimeout(async () => {
			try {
				const rows = await protocolosService.buscarMedicamentos(t, 25);
				if (!cancel) setMedResults(rows);
			} catch {
				if (!cancel) setMedResults([]);
			} finally {
				if (!cancel) setMedSearching(false);
			}
		}, 280);
		return () => {
			cancel = true;
			window.clearTimeout(h);
		};
	}, [medQuery]);

	const practicasPendientes = useMemo(
		() => practicas.filter((p) => !p.practica).length,
		[practicas],
	);
	const rolesPendientes = useMemo(
		() =>
			practicas.flatMap((p, i) =>
				p.asignaciones
					.filter((a) => !a.profesional)
					.map((a) => `${a.funcion.nombre} (práctica ${i + 1})`),
			),
		[practicas],
	);

	if (!open) return null;

	const updPractica = (key: string, fn: (p: PracticaForm) => PracticaForm) =>
		setPracticas((prev) => prev.map((p) => (p.key === key ? fn(p) : p)));

	// ---- Tipo de protocolo: proforma + medicamentos por defecto
	const onTipoChange = async (tipo: string) => {
		setTipoProtocolo(tipo);
		if (!tipo) return;
		const def = tipos.find((t) => t.tipoProtocolo === tipo);
		try {
			if (def?.tieneProForma && !texto.trim()) {
				const pf = await protocolosService.obtenerProForma(tipo);
				if (pf.proForma) setTexto(pf.proForma);
			}
			const defaults = await protocolosService.medicamentosPorDefecto(tipo);
			if (defaults.length) {
				setMeds((prev) => {
					const ya = new Set(prev.map((m) => m.idProducto));
					const nuevos = defaults
						.filter((d) => !ya.has(d.idProducto))
						.map((d) => ({
							key: nextKey('med'),
							idProducto: d.idProducto,
							rubro: d.rubro,
							descripcion: d.descripcion,
							presentacion: d.presentacion,
							cantidad: d.cantidad != null ? String(d.cantidad) : '',
							unidad: d.unidad || '',
						}));
					return [...prev, ...nuevos];
				});
			}
		} catch {
			/* la proforma / defaults son una ayuda, no bloquean */
		}
	};

	// ---- Prácticas
	const onPracticaQuery = (key: string, query: string) => {
		updPractica(key, (p) => ({ ...p, query, practica: null, results: [], loading: false }));
		const t = query.trim();
		const tk = `prac:${key}`;
		if (timers.current[tk]) window.clearTimeout(timers.current[tk]);
		if (t.length < 2) return;
		updPractica(key, (p) => ({ ...p, loading: true }));
		timers.current[tk] = window.setTimeout(() => {
			void protocolosService
				.buscarPracticas(t, 25)
				.then((rows) =>
					updPractica(key, (p) =>
						p.query.trim() === t ? { ...p, results: rows, loading: false } : { ...p, loading: false },
					),
				)
				.catch(() => updPractica(key, (p) => ({ ...p, results: [], loading: false })));
		}, 280);
	};

	const seleccionarPractica = (key: string, prac: PracticaProtocolo) => {
		const req = prac.funcionesRequeridas?.length > 0 ? prac.funcionesRequeridas : [FALLBACK_ESP];
		updPractica(key, (p) => ({
			...p,
			practica: prac,
			query: prac.descripcion || '',
			results: [],
			loading: false,
			// Si ya tenía equipo (cambio de código), se conserva; si no, los roles requeridos.
			asignaciones: p.asignaciones.length
				? p.asignaciones
				: req.map((funcion) => ({ funcion, profesional: null, query: '', results: [] })),
		}));
		setError(null);
	};

	const agregarPractica = () => setPracticas((prev) => [...prev, practicaVacia()]);

	const quitarPractica = (key: string) => {
		setPracticas((prev) => prev.filter((p) => p.key !== key || p.facturada));
	};

	const copiarEquipoAnterior = (idx: number) => {
		if (idx <= 0) return;
		const origen = practicas[idx - 1];
		if (!origen) return;
		const copia = origen.asignaciones
			.filter((a) => a.profesional)
			.map((a) => ({ ...a, query: '', results: [], searching: false }));
		if (!copia.length) {
			setError(`La práctica ${idx} todavía no tiene equipo para copiar. Asignalo primero.`);
			return;
		}
		setError(null);
		setPracticas((prev) =>
			prev.map((p, i) => (i === idx ? { ...p, asignaciones: copia } : p)),
		);
	};

	// ---- Equipo por práctica
	const updAsignacion = (key: string, idx: number, fn: (a: Asignacion) => Asignacion) =>
		updPractica(key, (p) => ({
			...p,
			asignaciones: p.asignaciones.map((a, i) => (i === idx ? fn(a) : a)),
		}));

	const onProfQuery = (key: string, idx: number, query: string) => {
		updAsignacion(key, idx, (a) => ({ ...a, query, profesional: null, results: [], searching: false }));
		const t = query.trim();
		const tk = `prof:${key}:${idx}`;
		if (timers.current[tk]) window.clearTimeout(timers.current[tk]);
		if (t.length < 2) return;
		updAsignacion(key, idx, (a) => ({ ...a, searching: true }));
		timers.current[tk] = window.setTimeout(() => {
			void protocolosService
				.buscarProfesionales(t, 20)
				.then((rows) =>
					updAsignacion(key, idx, (a) =>
						a.query.trim() === t ? { ...a, results: rows, searching: false } : { ...a, searching: false },
					),
				)
				.catch(() => updAsignacion(key, idx, (a) => ({ ...a, searching: false, results: [] })));
		}, 250);
	};

	const agregarFuncion = (key: string) => {
		updPractica(key, (p) => {
			const codigo = Number(p.addFuncionCodigo);
			const f = FUNCIONES_CATALOGO.find((x) => x.codigo === codigo);
			if (!f) return p;
			return {
				...p,
				addFuncionCodigo: '',
				asignaciones: [
					...p.asignaciones,
					{ funcion: { ...f }, profesional: null, query: '', results: [] },
				],
			};
		});
	};

	const quitarAsignacion = (key: string, idx: number) =>
		updPractica(key, (p) => ({ ...p, asignaciones: p.asignaciones.filter((_, i) => i !== idx) }));

	// ---- Medicamentos
	const agregarMed = (m: MedicamentoBusqueda) => {
		setMeds((prev) =>
			prev.some((x) => x.idProducto === m.idProducto)
				? prev
				: [
						...prev,
						{
							key: nextKey('med'),
							idProducto: m.idProducto,
							rubro: m.rubro,
							descripcion: m.nombre,
							presentacion: m.presentacion,
							cantidad: '1',
							unidad: m.unidad || '',
						},
					],
		);
		setMedQuery('');
		setMedResults([]);
	};
	const updMed = (key: string, patch: Partial<MedForm>) =>
		setMeds((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
	const quitarMed = (key: string) => setMeds((prev) => prev.filter((m) => m.key !== key));

	// ---- Guardar
	const submit = async () => {
		const nro = (pred: (p: PracticaForm) => boolean) =>
			practicas
				.map((p, i) => (pred(p) ? i + 1 : 0))
				.filter(Boolean)
				.join(', ');
		if (!fechaHoraFin) {
			setError('Falta la fecha y hora de fin. Es la fecha con la que se facturan las prácticas.');
			return;
		}
		if (fechaHoraInicio && fechaHoraInicio > fechaHoraFin) {
			setError('El inicio es posterior al fin. Corregí alguna de las dos fechas.');
			return;
		}
		if (!practicas.length) {
			setError(
				isEdit
					? 'El protocolo debe tener al menos una práctica. Agregá una, o para descartarlo entero, borrá el protocolo.'
					: 'Tiene que haber al menos una práctica. Agregá una, o si no corresponde, cancelá la carga.',
			);
			return;
		}
		if (practicasPendientes > 0) {
			setError(
				`Práctica ${nro((p) => !p.practica)} sin código. Buscala y elegila de la lista, o quitala.`,
			);
			return;
		}
		const sinEquipo = nro((p) => !p.facturada && !p.asignaciones.length);
		if (sinEquipo) {
			setError(`Práctica ${sinEquipo} sin equipo. Asigná al menos un profesional.`);
			return;
		}
		if (rolesPendientes.length) {
			setError(`Falta asignar: ${rolesPendientes.join(', ')}. Buscá al profesional o quitá el rol.`);
			return;
		}
		const malaCantidad = nro((p) => !(Number(p.cantidad) >= 1 && Number(p.cantidad) <= 999));
		if (malaCantidad) {
			setError(`Práctica ${malaCantidad}: la cantidad debe ser un número entre 1 y 999.`);
			return;
		}
		if (!texto.trim()) {
			setError('Falta la descripción del protocolo. Escribí el texto clínico.');
			return;
		}
		if (pendingFiles.length > 0 && !tipoAdjunto.trim()) {
			setError('Elegí el tipo de estudio de los adjuntos.');
			return;
		}
		setSubmitting(true);
		setError(null);

		const practicasPayload: PracticaPayload[] = practicas.map((p) => ({
			...(p.valorPractica ? { valorPractica: p.valorPractica } : {}),
			idPractica: p.practica!.idPractica,
			tipoPractica: p.practica!.tipoPractica,
			cantidad: Number(p.cantidad) || 1,
			profesionales: p.asignaciones
				.filter((a) => a.profesional)
				.map((a) => ({ valorPersonal: a.profesional!.valorPersonal, funcion: a.funcion.codigo })),
		}));
		const medsPayload: MedicamentoPayload[] = meds.map((m) => ({
			idProducto: m.idProducto,
			rubro: m.rubro,
			cantidad: m.cantidad.trim() === '' ? null : Number(m.cantidad),
			unidad: m.unidad.trim() || null,
			descripcion: m.descripcion,
		}));

		try {
			let idProtocolo: number | null = null;
			if (isEdit && protocoloToEdit) {
				await protocolosService.actualizar(protocoloToEdit.idProtocolo, {
					texto: texto.trim(),
					tecnica: tecnica.trim(),
					diagnosticoPre: diagnosticoPre.trim(),
					diagnosticoPos: diagnosticoPos.trim(),
					fechaHoraInicio: fechaHoraInicio || null,
					fechaHoraFin,
					sector: sector || undefined,
					practicas: practicasPayload,
					medicamentos: medsPayload,
				});
				idProtocolo = protocoloToEdit.idProtocolo;
			} else {
				const created = await protocolosService.crear({
					numeroVisita,
					tipoProtocolo: tipoProtocolo || undefined,
					texto: texto.trim(),
					tecnica: tecnica.trim() || undefined,
					diagnosticoPre: diagnosticoPre.trim() || undefined,
					diagnosticoPos: diagnosticoPos.trim() || undefined,
					fechaHoraInicio: fechaHoraInicio || null,
					fechaHoraFin,
					sector: sector || undefined,
					idOperador: usuario?.valorPersonal ?? undefined,
					practicas: practicasPayload,
					medicamentos: medsPayload,
				});
				idProtocolo = created?.idProtocolo ?? null;
			}
			if (pendingFiles.length > 0 && idProtocolo != null) {
				try {
					await adjuntosService.subirArchivos(numeroVisita, pendingFiles, tipoAdjunto, 'PROTOCOLO');
				} catch (upErr) {
					console.warn('[CargarProtocolo] adjuntos:', upErr);
				}
			}
			onCreated();
			onClose();
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: isEdit
						? 'No se pudieron guardar los cambios. Intentá de nuevo.'
						: 'No se pudo guardar el protocolo. Intentá de nuevo.',
			);
		} finally {
			setSubmitting(false);
		}
	};

	const renderEquipo = (p: PracticaForm) => (
		<div className={styles.equipoList}>
			{p.asignaciones.map((a, idx) => {
				const ok = Boolean(a.profesional);
				return (
					<article
						key={`${a.funcion.codigo}-${idx}`}
						className={`${styles.roleCard} ${ok ? styles.roleCardOk : ''}`}
					>
						<div className={styles.roleTop}>
							<div className={styles.roleTitle}>
								<span className={ok ? styles.statusDotOk : styles.statusDotPending} />
								<strong>{a.funcion.nombre}</strong>
							</div>
							{!p.facturada && (
								<button
									type="button"
									className={styles.ghostBtn}
									onClick={() => quitarAsignacion(p.key, idx)}
								>
									Quitar
								</button>
							)}
						</div>

						{a.profesional ? (
							<div className={styles.selectedCardCompact}>
								<div>
									<strong>{a.profesional.apellidoNombre}</strong>
									<span>{etiquetaProfesional(a.profesional)}</span>
								</div>
								{!p.facturada && (
									<button
										type="button"
										className={styles.linkBtn}
										onClick={() =>
											updAsignacion(p.key, idx, (x) => ({
												...x,
												profesional: null,
												query: '',
												results: [],
											}))
										}
									>
										Cambiar
									</button>
								)}
							</div>
						) : (
							<div className={styles.searchWrap}>
								<input
									className={styles.input}
									value={a.query}
									onChange={(e) => onProfQuery(p.key, idx, e.target.value)}
									placeholder="Nombre o matrícula…"
									autoComplete="off"
								/>
								{a.searching ? <p className={styles.hint}>Buscando…</p> : null}
								{a.results.length > 0 ? (
									<ul className={styles.results}>
										{a.results.map((prof) => (
											<li key={prof.valorPersonal}>
												<button
													type="button"
													onClick={() =>
														updAsignacion(p.key, idx, (x) => ({
															...x,
															profesional: prof,
															query: '',
															results: [],
														}))
													}
												>
													<span className={styles.resultTitle}>{prof.apellidoNombre}</span>
													<span className={styles.resultMeta}>{etiquetaProfesional(prof)}</span>
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>
						)}
					</article>
				);
			})}
			{!p.facturada && (
				<div className={styles.addRoleRow}>
					<select
						className={styles.input}
						value={p.addFuncionCodigo}
						onChange={(e) => updPractica(p.key, (x) => ({ ...x, addFuncionCodigo: e.target.value }))}
						aria-label="Agregar función a demanda"
					>
						<option value="">Agregar rol…</option>
						{FUNCIONES_CATALOGO.map((f) => (
							<option key={f.codigo} value={f.codigo}>
								{f.nombre}
							</option>
						))}
					</select>
					<button
						type="button"
						className={styles.secondaryBtn}
						onClick={() => agregarFuncion(p.key)}
						disabled={!p.addFuncionCodigo}
					>
						Agregar
					</button>
				</div>
			)}
		</div>
	);

	return (
		<div className={shell.modalOverlay} onClick={onClose}>
			<div className={`${shell.modalContent} ${styles.shell}`} onClick={(e) => e.stopPropagation()}>
				<header className={styles.header}>
					<div className="modal-title">
						<p className={styles.eyebrow}>Visita #{numeroVisita}</p>
						<h3>
							{isEdit
								? `Editar protocolo ${protocoloToEdit?.numeroProtocolo || protocoloToEdit?.idProtocolo || ''}`
								: 'Cargar protocolo'}
						</h3>
					</div>
					<button type="button" className={shell.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</header>

				<div className={styles.body} ref={bodyRef}>
					{error ? (
						<div className={styles.error} role="alert">
							{error}
						</div>
					) : null}

					{/* 1. Procedimiento */}
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>1</span>
							<div>
								<h4>Procedimiento</h4>
								<p>Tipo de protocolo (opcional) y fecha/hora. La fecha de fin es la de las prácticas.</p>
							</div>
						</div>
						<div className={styles.grid3}>
							<label className={styles.field}>
								<span>Tipo de protocolo</span>
								<select
									className={styles.input}
									value={tipoProtocolo}
									onChange={(e) => void onTipoChange(e.target.value)}
									disabled={isEdit}
									title={isEdit ? 'El tipo no se puede cambiar' : undefined}
								>
									<option value="">Sin tipo</option>
									{tipos.map((t) => (
										<option key={t.tipoProtocolo || '__kit'} value={t.tipoProtocolo}>
											{t.descripcion || t.tipoProtocolo}
											{t.tipoProtocolo ? ` (${t.tipoProtocolo})` : ''}
										</option>
									))}
								</select>
							</label>
							<label className={styles.field}>
								<span>Inicio</span>
								<input
									type="datetime-local"
									className={styles.input}
									value={fechaHoraInicio}
									onChange={(e) => setFechaHoraInicio(e.target.value)}
									max={fechaHoraFin || undefined}
								/>
							</label>
							<label className={styles.field}>
								<span>
									Fin <em>*</em>
								</span>
								<input
									type="datetime-local"
									className={styles.input}
									value={fechaHoraFin}
									onChange={(e) => setFechaHoraFin(e.target.value)}
									required
								/>
							</label>
						</div>
						{isEdit ? (
							<p className={styles.notice}>
								El tipo de protocolo no se puede cambiar. Si es incorrecto, borrá el protocolo y crealo
								de nuevo con el tipo correcto.
							</p>
						) : null}
					</section>

					{/* 2. Prácticas */}
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>2</span>
							<div>
								<h4>Prácticas y equipo</h4>
								<p>
									Una fila por práctica realizada en la cirugía, cada una con su equipo.
									{rolesPendientes.length ? (
										<span className={styles.warnBadge}> Faltan: {rolesPendientes.join(', ')}</span>
									) : practicas.length && practicasPendientes === 0 ? (
										<span className={styles.okBadge}> Equipos completos</span>
									) : null}
								</p>
							</div>
						</div>

						{practicas.some((p) => p.facturada) ? (
							<p className={styles.notice}>
								Las prácticas que ya pasaron a facturación no se pueden cambiar ni quitar. Para
								corregirlas, pedí a facturación que las libere. Sí podés agregar prácticas nuevas.
							</p>
						) : null}

						<div className={styles.practicasList}>
							{practicas.map((p, idx) => (
								<article
									key={p.key}
									className={`${styles.practicaCard} ${p.facturada ? styles.practicaCardLocked : ''}`}
								>
									<div className={styles.practicaTop}>
										<div className={styles.practicaTitle}>
											<span className={styles.practicaIdx}>{idx + 1}</span>
											<strong>Práctica {idx + 1}</strong>
											{p.facturada ? (
												<span className={styles.lockedChip}>En facturación · solo lectura</span>
											) : null}
										</div>
										<div className={styles.practicaActions}>
											{!p.facturada && idx > 0 && (
												<button
													type="button"
													className={styles.ghostBtn}
													onClick={() => copiarEquipoAnterior(idx)}
													title="Copiar el equipo de la práctica anterior"
												>
													Copiar equipo anterior
												</button>
											)}
											{!p.facturada && (
												<button
													type="button"
													className={styles.ghostBtn}
													onClick={() => quitarPractica(p.key)}
												>
													Quitar
												</button>
											)}
										</div>
									</div>

									{p.practica ? (
										<div className={styles.selectedCard}>
											<div className={styles.selectedMain}>
												<strong>{p.practica.descripcion}</strong>
												<span className={styles.metaChips}>
													<span className={styles.chip}>{p.practica.idPractica}</span>
													<span className={styles.chip}>{p.practica.tipoPractica}</span>
													{p.practica.funcionesRequeridas?.length ? (
														<span className={styles.chip}>
															{p.practica.funcionesRequeridas.length} roles
														</span>
													) : null}
												</span>
											</div>
											<div className={styles.cantidadBox}>
												<label className={styles.field}>
													<span>Cantidad</span>
													<input
														type="text"
														inputMode="numeric"
														maxLength={3}
														className={styles.input}
														value={p.cantidad}
														disabled={p.facturada}
														onChange={(e) =>
															updPractica(p.key, (x) => ({ ...x, cantidad: cantidadPractica(e.target.value) }))
														}
														onBlur={() =>
															updPractica(p.key, (x) => (x.cantidad ? x : { ...x, cantidad: '1' }))
														}
													/>
												</label>
												{!p.facturada && (
													<button
														type="button"
														className={styles.linkBtn}
														onClick={() =>
															updPractica(p.key, (x) => ({ ...x, practica: null, query: '', results: [] }))
														}
													>
														Cambiar código
													</button>
												)}
											</div>
										</div>
									) : (
										<div className={styles.searchWrap}>
											<input
												className={styles.input}
												value={p.query}
												onChange={(e) => onPracticaQuery(p.key, e.target.value)}
												placeholder="Código o descripción de la práctica…"
												autoComplete="off"
												autoFocus={idx === practicas.length - 1}
											/>
											{p.loading ? <p className={styles.hint}>Buscando…</p> : null}
											{p.results.length > 0 ? (
												<ul className={styles.results}>
													{p.results.map((r) => (
														<li key={`${r.tipoPractica}-${r.idPractica}`}>
															<button type="button" onClick={() => seleccionarPractica(p.key, r)}>
																<span className={styles.resultTitle}>{r.descripcion}</span>
																<span className={styles.resultMeta}>
																	{r.idPractica} · {r.tipoPractica}
																	{r.funcionesRequeridas.length
																		? ` · ${r.funcionesRequeridas.length} roles`
																		: ''}
																</span>
															</button>
														</li>
													))}
												</ul>
											) : null}
											{!p.loading && p.query.trim().length >= 2 && p.results.length === 0 ? (
												<p className={styles.hint}>Sin resultados para “{p.query.trim()}”.</p>
											) : null}
										</div>
									)}

									{p.practica ? (
										<div className={styles.equipoBlock}>
											<p className={styles.equipoLabel}>Equipo de esta práctica</p>
											{renderEquipo(p)}
										</div>
									) : null}
								</article>
							))}
						</div>

						{!practicas.length ? <p className={styles.hint}>Sin prácticas cargadas.</p> : null}
						<button type="button" className={styles.addPracticaBtn} onClick={agregarPractica}>
							{practicas.length ? '+ Agregar otra práctica' : '+ Agregar práctica'}
						</button>
					</section>

					{/* 3. Medicamentos */}
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>3</span>
							<div>
								<h4>Medicamentos y descartables</h4>
								<p>Opcional. Al elegir un tipo de protocolo se precargan los habituales.</p>
							</div>
						</div>

						<div className={styles.searchWrap}>
							<input
								className={styles.input}
								value={medQuery}
								onChange={(e) => setMedQuery(e.target.value)}
								placeholder="Buscar en vademécum por nombre, droga o troquel…"
								autoComplete="off"
							/>
							{medSearching ? <p className={styles.hint}>Buscando…</p> : null}
							{medResults.length > 0 ? (
								<ul className={styles.results}>
									{medResults.map((m) => (
										<li key={m.idProducto}>
											<button type="button" onClick={() => agregarMed(m)}>
												<span className={styles.resultTitle}>{m.nombre}</span>
												<span className={styles.resultMeta}>
													{m.rubro}
													{m.presentacion ? ` · ${m.presentacion}` : ''} · {m.idProducto}
												</span>
											</button>
										</li>
									))}
								</ul>
							) : null}
						</div>

						{meds.length > 0 ? (
							<ul className={styles.medList}>
								{meds.map((m) => (
									<li key={m.key} className={styles.medItem}>
										<div className={styles.medMain}>
											<strong>{m.descripcion}</strong>
											<span>
												{m.rubro}
												{m.presentacion ? ` · ${m.presentacion}` : ''}
											</span>
										</div>
										<input
											type="number"
											min={0}
											className={`${styles.input} ${styles.medCant}`}
											value={m.cantidad}
											onChange={(e) => updMed(m.key, { cantidad: e.target.value })}
											placeholder="Cant."
											aria-label="Cantidad"
										/>
										<input
											className={`${styles.input} ${styles.medUnidad}`}
											value={m.unidad}
											onChange={(e) => updMed(m.key, { unidad: e.target.value })}
											placeholder="Unidad"
											maxLength={20}
											aria-label="Unidad"
										/>
										<button
											type="button"
											className={styles.adjRemove}
											onClick={() => quitarMed(m.key)}
											aria-label={`Quitar ${m.descripcion}`}
										>
											×
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className={styles.hint}>Sin medicamentos cargados.</p>
						)}
					</section>

					{/* 4. Datos clínicos */}
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>4</span>
							<div>
								<h4>Datos clínicos</h4>
								<p>Diagnósticos, técnica y texto del protocolo.</p>
							</div>
						</div>

						<div className={styles.grid2}>
							<label className={styles.field}>
								<span>Diagnóstico pre</span>
								<input
									className={styles.input}
									value={diagnosticoPre}
									onChange={(e) => setDiagnosticoPre(e.target.value)}
									maxLength={250}
									placeholder="Opcional"
								/>
							</label>
							<label className={styles.field}>
								<span>Diagnóstico pos</span>
								<input
									className={styles.input}
									value={diagnosticoPos}
									onChange={(e) => setDiagnosticoPos(e.target.value)}
									maxLength={250}
									placeholder="Opcional"
								/>
							</label>
						</div>

						<label className={styles.field}>
							<span>Técnica</span>
							<input
								className={styles.input}
								value={tecnica}
								onChange={(e) => setTecnica(e.target.value)}
								maxLength={120}
								placeholder="Opcional"
							/>
						</label>

						<label className={styles.field}>
							<span>
								Descripción del protocolo <em>*</em>
							</span>
							<textarea
								className={styles.textarea}
								value={texto}
								onChange={(e) => setTexto(e.target.value)}
								rows={6}
								placeholder="Texto clínico del protocolo…"
							/>
						</label>
					</section>

					{/* 5. Adjuntos */}
					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>5</span>
							<div>
								<h4>Adjuntos</h4>
								<p>
									{isEdit
										? 'Opcional. Se suman a los adjuntos de la visita al guardar.'
										: 'Opcional. Se suben al guardar el protocolo.'}
								</p>
							</div>
						</div>

						<div className={styles.adjRow}>
							<p className={styles.hint}>
								{pendingFiles.length > 0
									? `${pendingFiles.length} archivo(s) listos para subir · Tipo: ${
											tiposAdjunto.find((t) => t.TipoImagen === tipoAdjunto)?.DescTipoImagen ||
											tipoAdjunto
										}`
									: 'Sin archivos seleccionados'}
							</p>
							<SubirAdjuntoButton onClick={() => setSubirOpen(true)} disabled={submitting} />
						</div>
						{pendingFiles.length > 0 ? (
							<ul className={styles.adjList}>
								{pendingFiles.map((f, i) => (
									<li key={`${f.name}-${f.size}-${i}`} className={styles.adjItem}>
										<span className={styles.adjName}>{f.name}</span>
										<span className={styles.adjSize}>{(f.size / 1024).toFixed(0)} KB</span>
										<button
											type="button"
											className={styles.adjRemove}
											onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
											disabled={submitting}
											aria-label={`Quitar ${f.name}`}
										>
											×
										</button>
									</li>
								))}
							</ul>
						) : null}
						<SubirAdjuntoModal
							isOpen={subirOpen}
							onClose={() => setSubirOpen(false)}
							titleMeta={`Visita #${numeroVisita}`}
							tiposImagen={tiposAdjunto}
							tipoInicial={tipoAdjunto}
							confirmLabel={(n) => `Agregar ${n} archivo(s)`}
							onConfirm={(files, tipo) => {
								setTipoAdjunto(tipo);
								setPendingFiles((prev) => [...prev, ...files]);
							}}
						/>
					</section>
				</div>

				<footer className={styles.footer}>
					<button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={submitting}>
						Cancelar
					</button>
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={() => void submit()}
						disabled={submitting}
					>
						{submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar protocolo'}
					</button>
				</footer>
			</div>
		</div>
	);
}
