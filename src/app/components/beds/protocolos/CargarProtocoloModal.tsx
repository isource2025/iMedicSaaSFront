'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type {
	FuncionRequerida,
	PracticaProtocolo,
	ProfesionalBusqueda,
} from '@/app/types/protocolos';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import { adjuntosService } from '@/app/services/adjuntosService';
import shell from '../shared/PedidoDetalleModal.module.css';
import styles from './CargarProtocoloModal.module.css';

type Props = {
	open: boolean;
	numeroVisita: number;
	sector?: string | null;
	onClose: () => void;
	onCreated: () => void;
};

type Asignacion = {
	funcion: FuncionRequerida;
	profesional: ProfesionalBusqueda | null;
	query: string;
	results: ProfesionalBusqueda[];
	searching?: boolean;
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

export default function CargarProtocoloModal({
	open,
	numeroVisita,
	sector,
	onClose,
	onCreated,
}: Props) {
	const usuario = useUsuarioActual();
	const [practicaQuery, setPracticaQuery] = useState('');
	const [practicas, setPracticas] = useState<PracticaProtocolo[]>([]);
	const [practica, setPractica] = useState<PracticaProtocolo | null>(null);
	const [loadingPracticas, setLoadingPracticas] = useState(false);
	const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
	const [texto, setTexto] = useState('');
	const [tecnica, setTecnica] = useState('');
	const [diagnosticoPre, setDiagnosticoPre] = useState('');
	const [diagnosticoPos, setDiagnosticoPos] = useState('');
	const [addFuncionCodigo, setAddFuncionCodigo] = useState('');
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [tipoAdjunto, setTipoAdjunto] = useState('');
	const [tiposAdjunto, setTiposAdjunto] = useState<{ TipoImagen: string; DescTipoImagen: string }[]>(
		[],
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const profTimers = useRef<Record<number, number>>({});

	useEffect(() => {
		if (!open) return;
		setPracticaQuery('');
		setPracticas([]);
		setPractica(null);
		setAsignaciones([]);
		setTexto('');
		setTecnica('');
		setDiagnosticoPre('');
		setDiagnosticoPos('');
		setAddFuncionCodigo('');
		setPendingFiles([]);
		setTipoAdjunto('');
		setError(null);
		void adjuntosService
			.getTiposImagenes()
			.then((rows) => setTiposAdjunto(rows || []))
			.catch(() => setTiposAdjunto([]));
	}, [open]);

	useEffect(() => {
		const t = practicaQuery.trim();
		if (practica || t.length < 2) {
			setPracticas([]);
			return;
		}
		let cancel = false;
		setLoadingPracticas(true);
		const h = setTimeout(async () => {
			try {
				const rows = await protocolosService.buscarPracticas(t, 25);
				if (!cancel) setPracticas(rows);
			} catch {
				if (!cancel) setPracticas([]);
			} finally {
				if (!cancel) setLoadingPracticas(false);
			}
		}, 280);
		return () => {
			cancel = true;
			clearTimeout(h);
		};
	}, [practicaQuery, practica]);

	const seleccionarPractica = (p: PracticaProtocolo) => {
		setPractica(p);
		setPracticaQuery(p.descripcion || '');
		setPracticas([]);
		const req = p.funcionesRequeridas?.length > 0 ? p.funcionesRequeridas : [FALLBACK_ESP];
		setAsignaciones(
			req.map((funcion) => ({
				funcion,
				profesional: null,
				query: '',
				results: [],
			})),
		);
		setError(null);
	};

	const rolesPendientes = useMemo(
		() => asignaciones.filter((a) => !a.profesional).map((a) => a.funcion.nombre),
		[asignaciones],
	);

	const equipoCompleto = practica != null && asignaciones.length > 0 && rolesPendientes.length === 0;

	if (!open) return null;

	const onProfQuery = (idx: number, query: string) => {
		setAsignaciones((prev) =>
			prev.map((a, i) =>
				i === idx ? { ...a, query, profesional: null, results: [], searching: false } : a,
			),
		);
		const t = query.trim();
		if (profTimers.current[idx]) window.clearTimeout(profTimers.current[idx]);
		if (t.length < 2) return;
		setAsignaciones((prev) => prev.map((a, i) => (i === idx ? { ...a, searching: true } : a)));
		profTimers.current[idx] = window.setTimeout(() => {
			void protocolosService
				.buscarProfesionales(t, 20)
				.then((rows) => {
					setAsignaciones((prev) =>
						prev.map((a, i) =>
							i === idx && a.query.trim() === t
								? { ...a, results: rows, searching: false }
								: i === idx
									? { ...a, searching: false }
									: a,
						),
					);
				})
				.catch(() => {
					setAsignaciones((prev) =>
						prev.map((a, i) => (i === idx ? { ...a, searching: false, results: [] } : a)),
					);
				});
		}, 250);
	};

	const agregarFuncion = () => {
		const codigo = Number(addFuncionCodigo);
		const f = FUNCIONES_CATALOGO.find((x) => x.codigo === codigo);
		if (!f) return;
		setAsignaciones((prev) => [
			...prev,
			{ funcion: { ...f }, profesional: null, query: '', results: [] },
		]);
		setAddFuncionCodigo('');
	};

	const quitarAsignacion = (idx: number) => {
		setAsignaciones((prev) => prev.filter((_, i) => i !== idx));
	};

	const submit = async () => {
		if (!practica) {
			setError('Seleccioná la práctica / procedimiento');
			return;
		}
		if (!texto.trim()) {
			setError('La descripción del protocolo es obligatoria');
			return;
		}
		if (rolesPendientes.length) {
			setError(`Completá el equipo: ${rolesPendientes.join(', ')}`);
			return;
		}
		if (pendingFiles.length > 0 && !tipoAdjunto.trim()) {
			setError('Seleccioná el tipo de estudio para los adjuntos');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const created = await protocolosService.crear({
				numeroVisita,
				texto: texto.trim(),
				tecnica: tecnica.trim() || undefined,
				diagnosticoPre: diagnosticoPre.trim() || undefined,
				diagnosticoPos: diagnosticoPos.trim() || undefined,
				idPractica: practica.idPractica,
				tipoPractica: practica.tipoPractica,
				sector: sector || undefined,
				idOperador: usuario?.valorPersonal ?? undefined,
				profesionales: asignaciones
					.filter((a) => a.profesional)
					.map((a) => ({
						valorPersonal: a.profesional!.valorPersonal,
						funcion: a.funcion.codigo,
					})),
			});
			if (pendingFiles.length > 0 && created?.idProtocolo != null) {
				try {
					await adjuntosService.subirArchivos(numeroVisita, pendingFiles, tipoAdjunto);
				} catch (upErr) {
					console.warn('[CargarProtocolo] adjuntos:', upErr);
				}
			}
			onCreated();
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudo guardar el protocolo');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={shell.modalOverlay} onClick={onClose}>
			<div className={`${shell.modalContent} ${styles.shell}`} onClick={(e) => e.stopPropagation()}>
				<header className={styles.header}>
					<div>
						<p className={styles.eyebrow}>Visita #{numeroVisita}</p>
						<h3>Cargar protocolo</h3>
					</div>
					<button type="button" className={shell.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</header>

				<div className={styles.body}>
					{error ? <div className={styles.error}>{error}</div> : null}

					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>1</span>
							<div>
								<h4>Práctica / procedimiento</h4>
								<p>Buscá por código o descripción y elegí una opción.</p>
							</div>
						</div>

						{practica ? (
							<div className={styles.selectedCard}>
								<div className={styles.selectedMain}>
									<strong>{practica.descripcion}</strong>
									<span className={styles.metaChips}>
										<span className={styles.chip}>{practica.idPractica}</span>
										<span className={styles.chip}>{practica.tipoPractica}</span>
										{practica.funcionesRequeridas?.length ? (
											<span className={styles.chip}>
												{practica.funcionesRequeridas.length} roles
											</span>
										) : null}
									</span>
								</div>
								<button
									type="button"
									className={styles.linkBtn}
									onClick={() => {
										setPractica(null);
										setPracticaQuery('');
										setAsignaciones([]);
										setPracticas([]);
									}}
								>
									Cambiar
								</button>
							</div>
						) : (
							<div className={styles.searchWrap}>
								<input
									className={styles.input}
									value={practicaQuery}
									onChange={(e) => setPracticaQuery(e.target.value)}
									placeholder="Ej. 269532 o dinámica de tránsito…"
									autoComplete="off"
									autoFocus
								/>
								{loadingPracticas ? <p className={styles.hint}>Buscando…</p> : null}
								{practicas.length > 0 ? (
									<ul className={styles.results}>
										{practicas.map((p) => (
											<li key={`${p.tipoPractica}-${p.idPractica}`}>
												<button type="button" onClick={() => seleccionarPractica(p)}>
													<span className={styles.resultTitle}>{p.descripcion}</span>
													<span className={styles.resultMeta}>
														{p.idPractica} · {p.tipoPractica}
														{p.funcionesRequeridas.length
															? ` · ${p.funcionesRequeridas.length} roles`
															: ''}
													</span>
												</button>
											</li>
										))}
									</ul>
								) : null}
								{!loadingPracticas && practicaQuery.trim().length >= 2 && practicas.length === 0 ? (
									<p className={styles.hint}>Sin resultados para “{practicaQuery.trim()}”.</p>
								) : null}
							</div>
						)}
					</section>

					{practica ? (
						<section className={styles.section}>
							<div className={styles.sectionHead}>
								<span className={styles.step}>2</span>
								<div>
									<h4>Equipo del procedimiento</h4>
									<p>
										Asigná profesionales por apellido/nombre o matrícula.
										{equipoCompleto ? (
											<span className={styles.okBadge}> Completo</span>
										) : rolesPendientes.length ? (
											<span className={styles.warnBadge}>
												{' '}
												Faltan: {rolesPendientes.join(', ')}
											</span>
										) : null}
									</p>
								</div>
							</div>

							<div className={styles.equipoList}>
								{asignaciones.map((a, idx) => {
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
												<button
													type="button"
													className={styles.ghostBtn}
													onClick={() => quitarAsignacion(idx)}
												>
													Quitar
												</button>
											</div>

											{a.profesional ? (
												<div className={styles.selectedCardCompact}>
													<div>
														<strong>{a.profesional.apellidoNombre}</strong>
														<span>
															{a.profesional.matricula != null
																? `Mat. ${a.profesional.matricula}`
																: `Id ${a.profesional.valorPersonal}`}
														</span>
													</div>
													<button
														type="button"
														className={styles.linkBtn}
														onClick={() =>
															setAsignaciones((prev) =>
																prev.map((x, i) =>
																	i === idx
																		? {
																				...x,
																				profesional: null,
																				query: '',
																				results: [],
																			}
																		: x,
																),
															)
														}
													>
														Cambiar
													</button>
												</div>
											) : (
												<div className={styles.searchWrap}>
													<input
														className={styles.input}
														value={a.query}
														onChange={(e) => onProfQuery(idx, e.target.value)}
														placeholder="Nombre o matrícula…"
														autoComplete="off"
													/>
													{a.searching ? <p className={styles.hint}>Buscando…</p> : null}
													{a.results.length > 0 ? (
														<ul className={styles.results}>
															{a.results.map((p) => (
																<li key={p.valorPersonal}>
																	<button
																		type="button"
																		onClick={() =>
																			setAsignaciones((prev) =>
																				prev.map((x, i) =>
																					i === idx
																						? {
																								...x,
																								profesional: p,
																								query: '',
																								results: [],
																							}
																						: x,
																				),
																			)
																		}
																	>
																		<span className={styles.resultTitle}>{p.apellidoNombre}</span>
																		<span className={styles.resultMeta}>
																			{p.matricula != null
																				? `Mat. ${p.matricula}`
																				: `Id ${p.valorPersonal}`}
																		</span>
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
							</div>

							<div className={styles.addRoleRow}>
								<select
									className={styles.input}
									value={addFuncionCodigo}
									onChange={(e) => setAddFuncionCodigo(e.target.value)}
									aria-label="Agregar función a demanda"
								>
									<option value="">Agregar rol a demanda…</option>
									{FUNCIONES_CATALOGO.map((f) => (
										<option key={f.codigo} value={f.codigo}>
											{f.nombre}
										</option>
									))}
								</select>
								<button
									type="button"
									className={styles.secondaryBtn}
									onClick={agregarFuncion}
									disabled={!addFuncionCodigo}
								>
									Agregar
								</button>
							</div>
						</section>
					) : null}

					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>{practica ? '3' : '2'}</span>
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

					<section className={styles.section}>
						<div className={styles.sectionHead}>
							<span className={styles.step}>{practica ? '4' : '3'}</span>
							<div>
								<h4>Adjuntos</h4>
								<p>Opcional. Se suben al guardar el protocolo.</p>
							</div>
						</div>

						<div className={styles.grid2}>
							<label className={styles.field}>
								<span>Tipo de estudio</span>
								<select
									className={styles.input}
									value={tipoAdjunto}
									onChange={(e) => setTipoAdjunto(e.target.value)}
								>
									<option value="">Seleccione…</option>
									{tiposAdjunto.map((t) => (
										<option key={t.TipoImagen} value={t.TipoImagen}>
											{t.DescTipoImagen || t.TipoImagen}
										</option>
									))}
								</select>
							</label>
							<label className={styles.field}>
								<span>Archivos</span>
								<input
									type="file"
									multiple
									className={styles.fileInput}
									onChange={(e) =>
										setPendingFiles(e.target.files ? Array.from(e.target.files) : [])
									}
								/>
							</label>
						</div>
						{pendingFiles.length > 0 ? (
							<p className={styles.hint}>{pendingFiles.length} archivo(s) listos para subir</p>
						) : null}
					</section>
				</div>

				<footer className={styles.footer}>
					<button
						type="button"
						className={styles.secondaryBtn}
						onClick={onClose}
						disabled={submitting}
					>
						Cancelar
					</button>
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={() => void submit()}
						disabled={submitting}
					>
						{submitting ? 'Guardando…' : 'Guardar protocolo'}
					</button>
				</footer>
			</div>
		</div>
	);
}
