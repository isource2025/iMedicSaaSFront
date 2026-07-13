'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TurneroDisplay, { buildPreviewState } from './TurneroDisplay';
import { TurneroCallQueue } from './TurneroCallQueue';
import {
	TEMAS_RAPIDOS,
	aplicarCambioFondo,
	coloresDePlantilla,
	normalizarColores,
	textoContraste,
} from './turneroTheme';
import { turneroService } from '@/app/services/turneroService';
import { getSectoresCatalogo } from '@/app/services/personalService';
import {
	DEFAULT_TURNERO_CONFIG,
	PLANTILLAS_TURNERO,
	type TurneroAdminState,
	type TurneroConfig,
	type TurneroPantallaResumen,
	type TurneroPlantilla,
} from '@/app/types/turnero';
import NuevaPantallaModal, { type NuevaPantallaPayload } from './NuevaPantallaModal';
import styles from './TurneroConfigPanel.module.css';

function normalizeLoadedConfig(c: TurneroConfig): TurneroConfig {
	const legacySilenciar = (c.video as { silenciarConVoz?: boolean } | undefined)?.silenciarConVoz;
	return {
		...c,
		colores: normalizarColores(c.colores),
		video: {
			...DEFAULT_TURNERO_CONFIG.video,
			...c.video,
			conSonido: c.video?.conSonido !== false,
			atenuarAlLlamar:
				legacySilenciar === true ? true : c.video?.atenuarAlLlamar !== false,
			volumenDuranteLlamado:
				legacySilenciar === true
					? 0
					: (() => {
							const v = Number(c.video?.volumenDuranteLlamado);
							if (!Number.isFinite(v) || v === 0.1) return 0.05;
							return Math.max(0, Math.min(1, v));
						})(),
			loop: c.video?.loop !== false,
		},
		display: {
			...DEFAULT_TURNERO_CONFIG.display,
			...c.display,
			mostrarLlamados: c.display?.mostrarLlamados !== false,
			mostrarMedicosHoy: c.display?.mostrarMedicosHoy !== false,
			sectoresFiltrados: Array.isArray(c.display?.sectoresFiltrados)
				? c.display.sectoresFiltrados
				: [],
		},
	};
}

function deepMergeConfig(base: TurneroConfig, patch: Partial<TurneroConfig>): TurneroConfig {
	return {
		...base,
		...patch,
		colores: { ...base.colores, ...(patch.colores || {}) },
		tipografia: { ...base.tipografia, ...(patch.tipografia || {}) },
		audio: { ...base.audio, ...(patch.audio || {}) },
		video: { ...base.video, ...(patch.video || {}) },
		display: { ...base.display, ...(patch.display || {}) },
	};
}

export default function TurneroConfigPanel() {
	const [pantallas, setPantallas] = useState<TurneroPantallaResumen[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [admin, setAdmin] = useState<TurneroAdminState | null>(null);
	const [config, setConfig] = useState<TurneroConfig>(DEFAULT_TURNERO_CONFIG);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [okMsg, setOkMsg] = useState<string | null>(null);
	const [sectores, setSectores] = useState<{ IdSector: string; Descripcion: string }[]>([]);
	const [modalNuevaPantalla, setModalNuevaPantalla] = useState(false);
	const previewQueue = useRef(new TurneroCallQueue());
	const savedSnapshotRef = useRef('');

	const snapshotState = (a: TurneroAdminState | null, c: TurneroConfig) =>
		JSON.stringify({ nombre: a?.nombre ?? '', config: c });

	const isDirty = savedSnapshotRef.current !== snapshotState(admin, config);

	const markSaved = (a: TurneroAdminState, c: TurneroConfig) => {
		savedSnapshotRef.current = snapshotState(a, c);
	};

	const displayUrl = useMemo(() => {
		if (!admin?.publicToken) return '';
		return turneroService.getDisplayPageUrl(admin.publicToken);
	}, [admin?.publicToken]);

	const previewState = useMemo(() => buildPreviewState(config), [config]);

	const cargarPantalla = useCallback(async (idPantalla: number) => {
		setLoading(true);
		setError(null);
		try {
			const data = await turneroService.getAdminConfig(idPantalla);
			setAdmin(data);
			setConfig(normalizeLoadedConfig(data.config));
			setSelectedId(data.idPantalla);
			markSaved(data, data.config);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, []);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const lista = await turneroService.listPantallas();
			setPantallas(lista);
			const id = selectedId && lista.some((p) => p.idPantalla === selectedId)
				? selectedId
				: lista[0]?.idPantalla;
			if (id) {
				const data = await turneroService.getAdminConfig(id);
				setAdmin(data);
				setConfig(normalizeLoadedConfig(data.config));
				setSelectedId(data.idPantalla);
				markSaved(data, data.config);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [selectedId]);

	useEffect(() => {
		void cargar();
		getSectoresCatalogo()
			.then(setSectores)
			.catch(() => setSectores([]));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const confirmarSiDirty = () => {
		if (!isDirty) return true;
		return window.confirm('Hay cambios sin guardar. ¿Descartarlos y continuar?');
	};

	const seleccionarPantalla = (id: number) => {
		if (id === selectedId) return;
		if (!confirmarSiDirty()) return;
		void cargarPantalla(id);
	};

	const patchConfig = (patch: Partial<TurneroConfig>) => {
		setConfig((prev) => deepMergeConfig(prev, patch));
		setOkMsg(null);
	};

	const patchColores = (patch: Partial<typeof config.colores>) => {
		patchConfig({ colores: normalizarColores({ ...config.colores, ...patch }) });
	};

	const aplicarTemaRapido = (temaId: string) => {
		const tema = TEMAS_RAPIDOS.find((t) => t.id === temaId);
		if (!tema) return;
		patchConfig({ colores: { ...tema.colores } });
	};

	const toggleSector = (id: string) => {
		const cur = config.display.sectoresFiltrados || [];
		const next = cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id];
		patchConfig({ display: { ...config.display, sectoresFiltrados: next } });
	};

	const guardar = async () => {
		setSaving(true);
		setError(null);
		setOkMsg(null);
		try {
			const data = await turneroService.saveAdminConfig({
				idPantalla: admin?.idPantalla,
				nombre: admin?.nombre,
				config,
			});
			setAdmin(data);
			setConfig(normalizeLoadedConfig(data.config));
			markSaved(data, data.config);
			const lista = await turneroService.listPantallas();
			setPantallas(lista);
			setOkMsg('Configuración guardada.');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const copiarUrl = async () => {
		if (!displayUrl) return;
		try {
			await navigator.clipboard.writeText(displayUrl);
			setOkMsg('URL copiada al portapapeles.');
		} catch {
			setError('No se pudo copiar la URL');
		}
	};

	const regenerarToken = async () => {
		if (!window.confirm('¿Regenerar el token? Las TVs con la URL anterior dejarán de funcionar.')) return;
		setSaving(true);
		setError(null);
		try {
			const data = await turneroService.regenerarToken(admin?.idPantalla);
			setAdmin(data);
			setConfig(normalizeLoadedConfig(data.config));
			const lista = await turneroService.listPantallas();
			setPantallas(lista);
			setOkMsg('Token regenerado. Actualizá la URL en la TV.');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al regenerar');
		} finally {
			setSaving(false);
		}
	};

	const abrirModalNuevaPantalla = () => {
		if (!confirmarSiDirty()) return;
		setModalNuevaPantalla(true);
	};

	const crearNuevaPantalla = async (payload: NuevaPantallaPayload) => {
		setSaving(true);
		setError(null);
		try {
			const data = await turneroService.createPantalla({
				nombre: payload.nombre,
				copiarDesdeIdPantalla: payload.copiarDesdeIdPantalla,
			});
			const lista = await turneroService.listPantallas();
			setPantallas(lista);
			const cfg = normalizeLoadedConfig(data.config);
			setAdmin(data);
			setConfig(cfg);
			setSelectedId(data.idPantalla);
			markSaved(data, cfg);
			setModalNuevaPantalla(false);
			setOkMsg(
				payload.copiarDesdeIdPantalla
					? `Pantalla "${data.nombre}" creada con el formato copiado. Configurá el sector y guardá.`
					: `Pantalla "${data.nombre}" creada. Configurá el filtro de sectores y guardá.`,
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al crear pantalla');
		} finally {
			setSaving(false);
		}
	};

	const eliminarPantalla = async () => {
		if (!admin?.idPantalla || pantallas.length <= 1) return;
		if (
			!window.confirm(
				`¿Eliminar la pantalla "${admin.nombre}"? La URL dejará de funcionar.`,
			)
		)
			return;
		setSaving(true);
		setError(null);
		try {
			await turneroService.deletePantalla(admin.idPantalla);
			const lista = await turneroService.listPantallas();
			setPantallas(lista);
			const next = lista[0];
			if (next) {
				const data = await turneroService.getAdminConfig(next.idPantalla);
				setAdmin(data);
				setConfig(normalizeLoadedConfig(data.config));
				setSelectedId(data.idPantalla);
				markSaved(data, data.config);
			}
			setOkMsg('Pantalla eliminada.');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al eliminar');
		} finally {
			setSaving(false);
		}
	};

	const probarAudio = () => {
		void previewQueue.current.previewAudio(config.audio);
	};

	if (loading) {
		return <p>Cargando configuración del turnero…</p>;
	}

	return (
		<>
			<div className={styles.panel}>
			<div className={styles.formCol}>
				{error && <p className={styles.msgErr}>{error}</p>}
				{okMsg && <p className={styles.msgOk}>{okMsg}</p>}

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Pantallas</h3>
					<div className={styles.pantallaTabs}>
						{pantallas.map((p) => (
							<button
								key={p.idPantalla}
								type="button"
								className={`${styles.pantallaTab} ${selectedId === p.idPantalla ? styles.pantallaTabActive : ''}`}
								onClick={() => seleccionarPantalla(p.idPantalla)}
								disabled={loading || saving}
								title={p.sectoresResumen}
							>
								{p.nombre}
							</button>
						))}
						<button
							type="button"
							className={`${styles.pantallaTab} ${styles.pantallaTabAdd}`}
							onClick={() => abrirModalNuevaPantalla()}
							disabled={saving}
						>
							+ Nueva
						</button>
					</div>
					<div className={styles.field}>
						<label>Nombre de esta pantalla</label>
						<input
							type="text"
							value={admin?.nombre || ''}
							maxLength={100}
							onChange={(e) =>
								setAdmin((prev) => (prev ? { ...prev, nombre: e.target.value } : prev))
							}
						/>
					</div>
					{pantallas.length > 1 && (
						<button
							type="button"
							className={`${styles.btn} ${styles.btnDanger}`}
							onClick={() => void eliminarPantalla()}
							disabled={saving}
						>
							Eliminar esta pantalla
						</button>
					)}
					<p className={styles.hint}>
						Cada pantalla tiene su propia URL. Usá filtros de sector para mostrar solo los llamados
						de un área (ej. pediatría, guardia).
					</p>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>URL de la pantalla (TV)</h3>
					<div className={styles.urlBox}>
						<input className={styles.urlInput} readOnly value={displayUrl} />
						<div className={styles.btnRow}>
							<button type="button" className={styles.btn} onClick={() => void copiarUrl()}>
								Copiar URL
							</button>
							<button
								type="button"
								className={`${styles.btn} ${styles.btnDanger}`}
								onClick={() => void regenerarToken()}
								disabled={saving}
							>
								Regenerar token
							</button>
							{displayUrl && (
								<a
									className={styles.btn}
									href={displayUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									Abrir pantalla
								</a>
							)}
						</div>
					</div>
					<p className={styles.hint}>
						Configurá la TV para abrir esta URL en pantalla completa. El token protege el acceso por
						clínica. Para TV dedicada sin controles: activá <strong>Modo kiosk</strong> abajo o usá{' '}
						<code className={styles.inlineCode}>{displayUrl}?kiosk=1</code>
					</p>
					{displayUrl && (
						<div className={styles.qrBox}>
							<img
								className={styles.qrImg}
								src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(displayUrl)}`}
								width={140}
								height={140}
								alt="QR para abrir la pantalla del turnero"
							/>
							<p className={styles.qrHint}>Escaneá desde el celular para abrir en la TV vía cast/navegador</p>
						</div>
					)}
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Plantilla</h3>
					<p className={styles.hint}>
						Al elegir una plantilla se aplican sus colores por defecto (fondo, paciente, etiquetas,
						texto y acento). Después podés retocarlos abajo.
					</p>
					<div className={styles.plantillaGrid}>
						{PLANTILLAS_TURNERO.map((p) => {
							const cols = coloresDePlantilla(p.id);
							return (
								<button
									key={p.id}
									type="button"
									className={`${styles.plantillaBtn} ${config.plantilla === p.id ? styles.plantillaBtnActive : ''}`}
									onClick={() =>
										patchConfig({
											plantilla: p.id as TurneroPlantilla,
											colores: coloresDePlantilla(p.id),
										})
									}
								>
									<span
										className={styles.plantillaSwatch}
										style={{
											background: `linear-gradient(135deg, ${cols.fondo} 0%, ${cols.fondo} 40%, ${cols.destacado} 40%, ${cols.destacado} 70%, ${cols.primario} 70%)`,
										}}
										aria-hidden
									/>
									<strong>{p.label}</strong>
									<span>{p.desc}</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Apariencia y colores</h3>
					<p className={styles.hint}>
						Elegí un tema rápido o personalizá los colores principales. Las tarjetas y bordes se
						ajustan solos al fondo.
					</p>
					<div className={styles.temaGrid}>
						{TEMAS_RAPIDOS.map((t) => (
							<button
								key={t.id}
								type="button"
								className={styles.temaChip}
								onClick={() => aplicarTemaRapido(t.id)}
								title={t.label}
							>
								<span
									className={styles.temaSwatch}
									style={{
										background: `linear-gradient(135deg, ${t.colores.fondo} 50%, ${t.colores.destacado} 50%)`,
									}}
								/>
								{t.label}
							</button>
						))}
					</div>

					<div className={styles.colorGroup}>
						<div className={styles.colorField}>
							<label>Fondo de pantalla</label>
							<div className={styles.colorInputRow}>
								<input
									type="color"
									value={config.colores.fondo}
									onChange={(e) =>
										patchColores(aplicarCambioFondo(config.colores, e.target.value))
									}
								/>
								<span>Fondo general</span>
							</div>
						</div>
						<div className={styles.colorField}>
							<label>Nombre del paciente</label>
							<div className={styles.colorInputRow}>
								<input
									type="color"
									value={config.colores.destacado}
									onChange={(e) => patchColores({ destacado: e.target.value })}
								/>
								<span>Llamado principal</span>
							</div>
						</div>
						<div className={styles.colorField}>
							<label>Etiquetas y detalles</label>
							<div className={styles.colorInputRow}>
								<input
									type="color"
									value={config.colores.acento}
									onChange={(e) => patchColores({ acento: e.target.value })}
								/>
								<span>Hora, consultorio, subtítulos</span>
							</div>
						</div>
						<div className={styles.colorField}>
							<label>Acento de marca</label>
							<div className={styles.colorInputRow}>
								<input
									type="color"
									value={config.colores.primario}
									onChange={(e) => patchColores({ primario: e.target.value })}
								/>
								<span>Tarjetas, bordes activos, moderna</span>
							</div>
						</div>
						<div className={styles.colorField}>
							<label>Texto general</label>
							<div className={styles.colorInputRow}>
								<input
									type="color"
									value={config.colores.texto}
									onChange={(e) => patchColores({ texto: e.target.value })}
								/>
								<button
									type="button"
									className={styles.btnMini}
									onClick={() => patchColores({ texto: textoContraste(config.colores.fondo) })}
								>
									Auto contraste
								</button>
							</div>
						</div>
					</div>

					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.colores.autoTarjetas !== false}
							onChange={(e) =>
								patchColores({
									autoTarjetas: e.target.checked,
									superficie: undefined,
									borde: undefined,
								})
							}
						/>
						Ajustar tarjetas y bordes automáticamente según el fondo
					</label>

					{config.colores.autoTarjetas === false && (
						<div className={styles.colorGroup}>
							<div className={styles.colorField}>
								<label>Fondo de tarjetas</label>
								<div className={styles.colorInputRow}>
									<input
										type="color"
										value={config.colores.superficie || config.colores.fondo}
										onChange={(e) => patchColores({ superficie: e.target.value })}
									/>
								</div>
							</div>
							<div className={styles.colorField}>
								<label>Color de bordes</label>
								<div className={styles.colorInputRow}>
									<input
										type="color"
										value={config.colores.borde || config.colores.acento}
										onChange={(e) => patchColores({ borde: e.target.value })}
									/>
								</div>
							</div>
						</div>
					)}

					<div className={styles.field}>
						<label>Escala tipográfica</label>
						<input
							type="number"
							min={0.8}
							max={1.4}
							step={0.05}
							value={config.tipografia.escala}
							onChange={(e) =>
								patchConfig({
									tipografia: { ...config.tipografia, escala: Number(e.target.value) || 1 },
								})
							}
						/>
					</div>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Sonido y voz</h3>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.audio.sonidoActivo}
							onChange={(e) =>
								patchConfig({ audio: { ...config.audio, sonidoActivo: e.target.checked } })
							}
						/>
						Activar sonido al llamar
					</label>
					<div className={styles.field}>
						<label>URL de sonido (opcional)</label>
						<input
							type="url"
							placeholder="Vacío = campana integrada"
							value={config.audio.sonidoUrl}
							onChange={(e) =>
								patchConfig({ audio: { ...config.audio, sonidoUrl: e.target.value } })
							}
						/>
					</div>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.audio.vozActiva}
							onChange={(e) =>
								patchConfig({ audio: { ...config.audio, vozActiva: e.target.checked } })
							}
						/>
						Activar lectura por voz (después del sonido)
					</label>
					<div className={styles.field}>
						<label>Texto de voz</label>
						<textarea
							value={config.audio.vozTexto}
							onChange={(e) =>
								patchConfig({ audio: { ...config.audio, vozTexto: e.target.value } })
							}
						/>
						<p className={styles.hint}>
							Placeholders: {'{paciente}'}, {'{consultorio}'}, {'{profesional}'}, {'{hora}'}
						</p>
					</div>
					<div className={styles.row2}>
						<div className={styles.field}>
							<label>Idioma voz</label>
							<select
								value={config.audio.vozLang}
								onChange={(e) =>
									patchConfig({ audio: { ...config.audio, vozLang: e.target.value } })
								}
							>
								<option value="es-AR">Español (AR)</option>
								<option value="es-ES">Español (ES)</option>
							</select>
						</div>
						<div className={styles.field}>
							<label>Pausa entre llamados (ms)</label>
							<input
								type="number"
								min={0}
								max={10000}
								step={100}
								value={config.audio.pausaEntreLlamadosMs}
								onChange={(e) =>
									patchConfig({
										audio: {
											...config.audio,
											pausaEntreLlamadosMs: Number(e.target.value) || 0,
										},
									})
								}
							/>
						</div>
					</div>
					<button type="button" className={styles.btn} onClick={probarAudio}>
						Probar sonido + voz
					</button>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Video</h3>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.video.activo}
							onChange={(e) =>
								patchConfig({ video: { ...config.video, activo: e.target.checked } })
							}
						/>
						Mostrar video en la pantalla
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.video.conSonido !== false}
							onChange={(e) =>
								patchConfig({ video: { ...config.video, conSonido: e.target.checked } })
							}
						/>
						Reproducir sonido del video
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.video.atenuarAlLlamar !== false}
							onChange={(e) =>
								patchConfig({ video: { ...config.video, atenuarAlLlamar: e.target.checked } })
							}
						/>
						Bajar volumen del video al llamar (95%)
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.video.loop !== false}
							onChange={(e) =>
								patchConfig({ video: { ...config.video, loop: e.target.checked } })
							}
						/>
						Repetir video en bucle (loop)
					</label>
					<p className={styles.hint}>
						En la TV, activá el audio de la pantalla una vez (botón &quot;Activar sonido y voz&quot;).
						YouTube puede requerir interacción del usuario antes de reproducir con sonido.
					</p>
					<div className={styles.row2}>
						<div className={styles.field}>
							<label>Fuente</label>
							<select
								value={config.video.fuente}
								onChange={(e) =>
									patchConfig({
										video: {
											...config.video,
											fuente: e.target.value as TurneroConfig['video']['fuente'],
										},
									})
								}
							>
								<option value="youtube">YouTube</option>
								<option value="vimeo">Vimeo</option>
								<option value="url">Archivo / URL directa</option>
							</select>
						</div>
						<div className={styles.field}>
							<label>Posición</label>
							<select
								value={config.video.posicion}
								onChange={(e) =>
									patchConfig({
										video: {
											...config.video,
											posicion: e.target.value as 'izquierda' | 'derecha',
										},
									})
								}
							>
								<option value="izquierda">Izquierda</option>
								<option value="derecha">Derecha</option>
							</select>
						</div>
					</div>
					<div className={styles.field}>
						<label>URL del video</label>
						<input
							type="url"
							placeholder="https://www.youtube.com/watch?v=..."
							value={config.video.url}
							onChange={(e) =>
								patchConfig({ video: { ...config.video, url: e.target.value } })
							}
						/>
					</div>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>Visualización</h3>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.tituloInstitucion}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, tituloInstitucion: e.target.checked },
								})
							}
						/>
						Mostrar nombre de la institución
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.mostrarConsultorio}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, mostrarConsultorio: e.target.checked },
								})
							}
						/>
						Mostrar consultorio
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.mostrarLlamados !== false}
							onChange={(e) => {
								const on = e.target.checked;
								patchConfig({
									display: {
										...config.display,
										mostrarLlamados: on,
										// Pantalla solo cartelera: mantener médicos visibles
										mostrarMedicosHoy: on
											? config.display.mostrarMedicosHoy
											: true,
									},
								});
							}}
						/>
						Mostrar llamados de pacientes
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.mostrarProfesional}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, mostrarProfesional: e.target.checked },
								})
							}
						/>
						Mostrar profesional
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.mostrarMedicosHoy}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, mostrarMedicosHoy: e.target.checked },
								})
							}
						/>
						Mostrar médicos que atienden hoy
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.mantenerPantallaEncendida !== false}
							onChange={(e) =>
								patchConfig({
									display: {
										...config.display,
										mantenerPantallaEncendida: e.target.checked,
									},
								})
							}
						/>
						Mantener pantalla encendida (Wake Lock)
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.autoFullscreen}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, autoFullscreen: e.target.checked },
								})
							}
						/>
						Entrar en pantalla completa al activar audio
					</label>
					<label className={styles.checkRow}>
						<input
							type="checkbox"
							checked={config.display.modoKiosk}
							onChange={(e) =>
								patchConfig({
									display: { ...config.display, modoKiosk: e.target.checked },
								})
							}
						/>
						Modo kiosk (oculta controles y cursor en la TV)
					</label>
					{sectores.length > 0 && (
						<div className={styles.field}>
							<label>Filtrar por sector (vacío = todos)</label>
							<div className={styles.sectorGrid}>
								{sectores.map((s) => (
									<label key={s.IdSector} className={styles.checkRow}>
										<input
											type="checkbox"
											checked={(config.display.sectoresFiltrados || []).includes(
												s.IdSector,
											)}
											onChange={() => toggleSector(s.IdSector)}
										/>
										{s.Descripcion || s.IdSector}
									</label>
								))}
							</div>
						</div>
					)}
					<div className={styles.field}>
						<label>Máx. llamados en lista</label>
						<input
							type="number"
							min={3}
							max={20}
							value={config.display.maxLlamadosLista}
							onChange={(e) =>
								patchConfig({
									display: {
										...config.display,
										maxLlamadosLista: Number(e.target.value) || 8,
									},
								})
							}
						/>
					</div>
				</div>

				<div className={styles.btnRow}>
					<button
						type="button"
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={() => void guardar()}
						disabled={saving}
					>
						{saving ? 'Guardando…' : isDirty ? 'Guardar cambios' : 'Guardar configuración'}
					</button>
					{isDirty && !saving && (
						<span className={styles.dirtyHint}>Tenés cambios sin guardar</span>
					)}
				</div>
			</div>

			<div className={styles.previewCol}>
				<div className={styles.previewSticky}>
					<p className={styles.previewLabel}>Vista previa en vivo</p>
					<div className={styles.previewFrame}>
						<TurneroDisplay state={previewState} preview />
					</div>
				</div>
			</div>
		</div>

			<NuevaPantallaModal
				open={modalNuevaPantalla}
				pantallas={pantallas}
				pantallaActualId={selectedId}
				saving={saving}
				onClose={() => setModalNuevaPantalla(false)}
				onConfirm={crearNuevaPantalla}
			/>
		</>
	);
}
