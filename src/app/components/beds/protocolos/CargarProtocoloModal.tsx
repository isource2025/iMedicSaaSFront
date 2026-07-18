'use client';

import { useEffect, useMemo, useState } from 'react';
import protocolosService from '@/app/services/protocolosService';
import type {
	FuncionRequerida,
	PracticaProtocolo,
	ProfesionalBusqueda,
	TipoProtocolo,
} from '@/app/types/protocolos';
import { useUsuarioActual } from '@/app/hooks/useUsuarioActual';
import styles from '../shared/PedidoDetalleModal.module.css';
import formStyles from '../estudios/PedidoEstudioForms.module.css';
import localStyles from './ProtocolosSection.module.css';

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
};

const FALLBACK_ESP: FuncionRequerida = {
	codigo: 1,
	nombre: 'Especialista',
	unidad: 1,
};

export default function CargarProtocoloModal({
	open,
	numeroVisita,
	sector,
	onClose,
	onCreated,
}: Props) {
	const usuario = useUsuarioActual();
	const [tipos, setTipos] = useState<TipoProtocolo[]>([]);
	const [tipoProtocolo, setTipoProtocolo] = useState('');
	const [practicaQuery, setPracticaQuery] = useState('');
	const [practicas, setPracticas] = useState<PracticaProtocolo[]>([]);
	const [practica, setPractica] = useState<PracticaProtocolo | null>(null);
	const [loadingPracticas, setLoadingPracticas] = useState(false);
	const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
	const [texto, setTexto] = useState('');
	const [tecnica, setTecnica] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTipoProtocolo('');
		setPracticaQuery('');
		setPracticas([]);
		setPractica(null);
		setAsignaciones([]);
		setTexto('');
		setTecnica('');
		setError(null);
		void protocolosService.listarTipos().then(setTipos).catch(() => setTipos([]));
	}, [open]);

	useEffect(() => {
		const t = practicaQuery.trim();
		if (t.length < 2 || practica) {
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

	useEffect(() => {
		if (!practica) {
			setAsignaciones([]);
			return;
		}
		const req =
			practica.funcionesRequeridas?.length > 0
				? practica.funcionesRequeridas
				: [FALLBACK_ESP];
		setAsignaciones(
			req.map((funcion) => ({
				funcion,
				profesional: null,
				query: '',
				results: [],
			})),
		);
	}, [practica]);

	useEffect(() => {
		if (!tipoProtocolo) return;
		let cancel = false;
		void protocolosService
			.obtenerProForma(tipoProtocolo)
			.then((r) => {
				if (!cancel && r.proForma) {
					setTexto((prev) => (prev.trim() ? prev : r.proForma));
				}
			})
			.catch(() => undefined);
		return () => {
			cancel = true;
		};
	}, [tipoProtocolo]);

	const rolesPendientes = useMemo(
		() => asignaciones.filter((a) => !a.profesional).map((a) => a.funcion.nombre),
		[asignaciones],
	);

	if (!open) return null;

	const onProfQuery = (idx: number, query: string) => {
		setAsignaciones((prev) =>
			prev.map((a, i) => (i === idx ? { ...a, query, profesional: null, results: [] } : a)),
		);
		const t = query.trim();
		if (t.length < 2) return;
		window.setTimeout(() => {
			void protocolosService
				.buscarProfesionales(t, 15)
				.then((rows) => {
					setAsignaciones((prev) =>
						prev.map((a, i) =>
							i === idx && a.query.trim() === t ? { ...a, results: rows } : a,
						),
					);
				})
				.catch(() => undefined);
		}, 250);
	};

	const submit = async () => {
		if (!practica) {
			setError('Seleccione la práctica del procedimiento');
			return;
		}
		if (!texto.trim()) {
			setError('La descripción del protocolo es obligatoria');
			return;
		}
		if (rolesPendientes.length) {
			setError(`Complete el equipo: ${rolesPendientes.join(', ')}`);
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await protocolosService.crear({
				numeroVisita,
				tipoProtocolo: tipoProtocolo || undefined,
				texto: texto.trim(),
				tecnica: tecnica.trim() || undefined,
				idPractica: practica.idPractica,
				tipoPractica: practica.tipoPractica,
				sector: sector || undefined,
				idOperador: usuario?.valorPersonal || undefined,
				profesionales: asignaciones.map((a) => ({
					valorPersonal: a.profesional!.valorPersonal,
					funcion: a.funcion.codigo,
				})),
			});
			onCreated();
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div
				className={`${styles.modalContent} ${localStyles.modalWide}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.modalHeader}>
					<h3>Cargar protocolo</h3>
					<button type="button" className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
						×
					</button>
				</div>

				{error && <div className={formStyles.error}>{error}</div>}

				<label className={formStyles.label}>
					Tipo de protocolo
					<select
						className={formStyles.input}
						value={tipoProtocolo}
						onChange={(e) => setTipoProtocolo(e.target.value)}
					>
						<option value="">Sin tipo / genérico</option>
						{tipos.map((t) => (
							<option key={t.tipoProtocolo || t.descripcion} value={t.tipoProtocolo}>
								{t.descripcion}
								{t.tipoProtocolo ? ` (${t.tipoProtocolo})` : ''}
							</option>
						))}
					</select>
				</label>

				<label className={formStyles.label}>
					Práctica / procedimiento
					{practica ? (
						<div className={formStyles.selectedTipo}>
							<span>
								{practica.descripcion}
								<span> · {practica.idPractica} · {practica.tipoPractica}</span>
							</span>
							<button
								type="button"
								onClick={() => {
									setPractica(null);
									setPracticaQuery('');
								}}
							>
								Cambiar
							</button>
						</div>
					) : (
						<>
							<input
								className={formStyles.input}
								value={practicaQuery}
								onChange={(e) => setPracticaQuery(e.target.value)}
								placeholder="Buscar por código o descripción…"
								autoComplete="off"
							/>
							{loadingPracticas && <p className={formStyles.hint}>Buscando…</p>}
							{practicas.length > 0 && (
								<ul className={formStyles.results}>
									{practicas.map((p) => (
										<li key={`${p.tipoPractica}-${p.idPractica}`}>
											<button type="button" onClick={() => setPractica(p)}>
												<span>{p.descripcion}</span>
												<span>
													{p.idPractica} · {p.tipoPractica}
													{p.funcionesRequeridas.length
														? ` · ${p.funcionesRequeridas.length} roles`
														: ''}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</>
					)}
				</label>

				{asignaciones.length > 0 && (
					<div className={localStyles.equipoBlock}>
						<p className={formStyles.hint}>
							Equipo del procedimiento (roles según nomenclador). Quien carga queda registrado
							como operador de la sesión.
						</p>
						{asignaciones.map((a, idx) => (
							<div key={`${a.funcion.codigo}-${idx}`} className={localStyles.roleRow}>
								<label className={formStyles.label}>
									{a.funcion.nombre}
									{a.profesional ? (
										<div className={formStyles.selectedTipo}>
											<span>
												{a.profesional.apellidoNombre}
												{a.profesional.matricula != null
													? ` · Mat. ${a.profesional.matricula}`
													: ''}
											</span>
											<button
												type="button"
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
										<>
											<input
												className={formStyles.input}
												value={a.query}
												onChange={(e) => onProfQuery(idx, e.target.value)}
												placeholder="Buscar profesional…"
												autoComplete="off"
											/>
											{a.results.length > 0 && (
												<ul className={formStyles.results}>
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
																<span>{p.apellidoNombre}</span>
																<span>
																	{p.matricula != null ? `Mat. ${p.matricula}` : p.valorPersonal}
																</span>
															</button>
														</li>
													))}
												</ul>
											)}
										</>
									)}
								</label>
							</div>
						))}
					</div>
				)}

				<label className={formStyles.label}>
					Técnica (opcional)
					<input
						className={formStyles.input}
						value={tecnica}
						onChange={(e) => setTecnica(e.target.value)}
						maxLength={120}
					/>
				</label>

				<label className={formStyles.label}>
					Descripción del protocolo
					<textarea
						className={formStyles.textarea}
						value={texto}
						onChange={(e) => setTexto(e.target.value)}
						rows={8}
						placeholder="Texto clínico del protocolo…"
					/>
				</label>

				<div className={formStyles.actions}>
					<button type="button" className={formStyles.btnSecondary} onClick={onClose} disabled={submitting}>
						Cancelar
					</button>
					<button
						type="button"
						className={formStyles.btnPrimary}
						onClick={() => void submit()}
						disabled={submitting}
					>
						{submitting ? 'Guardando…' : 'Guardar protocolo'}
					</button>
				</div>
			</div>
		</div>
	);
}
