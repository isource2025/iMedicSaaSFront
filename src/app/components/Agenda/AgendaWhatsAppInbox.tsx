'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { botConversacionService } from '@/app/services/botConversacionService';
import type {
	BotConversacion,
	BotMensajeChat,
	BotModoControl,
} from '@/app/types/botConversacion';
import AgendaEmptyState from '@/app/components/Agenda/AgendaEmptyState';
import { emitInboxUnreadChanged } from '@/app/hooks/useWhatsAppInboxUnread';
import styles from './AgendaWhatsAppInbox.module.css';
import agendaStyles from '@/app/dashboard/turnos/agenda/agenda.module.css';

const MSG_SQL_REQUERIDO =
	'Las conversaciones deben persistir en SQL Server (imBotConfig + imBotChat). Ejecutá scripts/sql/setup_bot_minimal.sql en la BD tenant o: node scripts/ejecutar_setup_bot.js';

type FiltroLista = 'TODOS' | 'NO_LEIDOS' | 'BOT' | 'HUMANO';

function formatHora(fecha: string | null | undefined): string {
	if (!fecha) return '';
	const d = new Date(fecha);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaRelativa(fecha: string | null | undefined): string {
	if (!fecha) return '';
	const d = new Date(fecha);
	if (Number.isNaN(d.getTime())) return '';
	const hoy = new Date();
	const ayer = new Date();
	ayer.setDate(hoy.getDate() - 1);
	if (d.toDateString() === hoy.toDateString()) return formatHora(fecha);
	if (d.toDateString() === ayer.toDateString()) return 'Ayer';
	return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatDiaMensaje(fecha: string): string {
	const d = new Date(fecha);
	if (Number.isNaN(d.getTime())) return '';
	const hoy = new Date();
	const ayer = new Date();
	ayer.setDate(hoy.getDate() - 1);
	if (d.toDateString() === hoy.toDateString()) return 'Hoy';
	if (d.toDateString() === ayer.toDateString()) return 'Ayer';
	return d
		.toLocaleDateString('es-AR', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		})
		.replace(/^\w/, (c) => c.toUpperCase());
}

const MSG_API_BOT_404 =
	'El backend no expone /admin/bot/conversaciones (404). En Vercel configurá NEXT_PUBLIC_API_URL=https://imedicwsback-production.up.railway.app/api (el Render congelado no tiene inbox WhatsApp).';

function es404ConversacionesApi(e: unknown): boolean {
	if (typeof e !== 'object' || e === null) return false;
	const ax = e as { response?: { status?: number }; message?: string };
	return ax.response?.status === 404 || /status code 404/i.test(String(ax.message || ''));
}

function agruparMensajesPorDia(mensajes: BotMensajeChat[]) {
	const grupos: { dia: string; items: BotMensajeChat[] }[] = [];
	let diaActual = '';
	for (const m of mensajes) {
		const dia = formatDiaMensaje(m.fechaMensaje);
		if (dia !== diaActual) {
			diaActual = dia;
			grupos.push({ dia, items: [m] });
		} else {
			grupos[grupos.length - 1].items.push(m);
		}
	}
	return grupos;
}

interface Props {
	puedeEditar?: boolean;
	fullHeight?: boolean;
	onEstadoChange?: (data: {
		conversaciones: BotConversacion[];
		activa: BotConversacion | null;
		almacenamiento: 'sql' | 'memoria' | null;
		loadingLista: boolean;
	}) => void;
}

export default function AgendaWhatsAppInbox({
	puedeEditar = true,
	fullHeight = false,
	onEstadoChange,
}: Props) {
	const [conversaciones, setConversaciones] = useState<BotConversacion[]>([]);
	const [selId, setSelId] = useState<string | null>(null);
	const [mensajes, setMensajes] = useState<BotMensajeChat[]>([]);
	const [convActiva, setConvActiva] = useState<BotConversacion | null>(null);
	const [busqueda, setBusqueda] = useState('');
	const [filtroLista, setFiltroLista] = useState<FiltroLista>('TODOS');
	const [textoEnvio, setTextoEnvio] = useState('');
	const [loadingLista, setLoadingLista] = useState(true);
	const [loadingChat, setLoadingChat] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [almacenamiento, setAlmacenamiento] = useState<'sql' | 'memoria' | null>(null);
	const [togglingBot, setTogglingBot] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	const mensajesRef = useRef<HTMLDivElement>(null);
	const ultimoIdRef = useRef<number>(0);
	const debeScrollRef = useRef(true);

	const convFiltradas = useMemo(() => {
		let list = conversaciones;
		if (filtroLista === 'NO_LEIDOS') list = list.filter((c) => c.noLeidos > 0);
		if (filtroLista === 'BOT') list = list.filter((c) => c.modoControl === 'BOT');
		if (filtroLista === 'HUMANO') list = list.filter((c) => c.modoControl === 'HUMANO');

		const q = busqueda.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(c) =>
				c.telefonoWhatsApp.includes(q) ||
				(c.nombreContacto || '').toLowerCase().includes(q) ||
				(c.dniPaciente || '').includes(q) ||
				(c.ultimoMensaje || '').toLowerCase().includes(q) ||
				(c.pasoBot || '').toLowerCase().includes(q),
		);
	}, [conversaciones, busqueda, filtroLista]);

	const mensajesAgrupados = useMemo(() => agruparMensajesPorDia(mensajes), [mensajes]);

	const botActivo = convActiva?.modoControl === 'BOT';

	const puedeEscribir = puedeEditar && convActiva && !botActivo;

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 900);
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	useEffect(() => {
		onEstadoChange?.({
			conversaciones,
			activa: convActiva,
			almacenamiento,
			loadingLista,
		});
	}, [conversaciones, convActiva, almacenamiento, loadingLista, onEstadoChange]);

	const cargarLista = useCallback(async () => {
		try {
			const data = await botConversacionService.listarConversaciones({ limit: 80 });
			setConversaciones(data.conversaciones);
			setAlmacenamiento(data.almacenamiento);
			if (data.almacenamiento !== 'sql') {
				setError(MSG_SQL_REQUERIDO);
			}
			emitInboxUnreadChanged();
		} catch (e: unknown) {
			const err = e as { message?: string; response?: { status?: number; data?: { codigo?: string } } };
			const sinSql =
				err.response?.status === 503 ||
				err.response?.data?.codigo === 'BOT_CONVERSACIONES_SIN_SQL';
			setError(
				es404ConversacionesApi(e)
					? MSG_API_BOT_404
					: sinSql
						? MSG_SQL_REQUERIDO
						: err.message || 'Error cargando conversaciones',
			);
		} finally {
			setLoadingLista(false);
		}
	}, []);

	const cargarChat = useCallback(async (id: string, silencioso = false) => {
		if (!silencioso) setLoadingChat(true);
		try {
			const det = await botConversacionService.obtenerDetalle(id);
			setConvActiva(det.conversacion);
			setMensajes(det.mensajes);
			ultimoIdRef.current = det.mensajes.length
				? Math.max(...det.mensajes.map((m) => m.idMensaje))
				: 0;
			debeScrollRef.current = true;
			if (det.conversacion.noLeidos > 0) {
				await botConversacionService.marcarLeida(id);
				setConversaciones((prev) =>
					prev.map((c) => (c.idConversacion === id ? { ...c, noLeidos: 0 } : c)),
				);
				emitInboxUnreadChanged();
			}
		} catch (e: unknown) {
			const err = e as { message?: string };
			if (!silencioso) setError(err.message || 'Error cargando chat');
		} finally {
			if (!silencioso) setLoadingChat(false);
		}
	}, []);

	const pollMensajes = useCallback(async () => {
		if (!selId) return;
		try {
			const nuevos = await botConversacionService.listarMensajes(
				selId,
				ultimoIdRef.current || undefined,
			);
			if (nuevos.length) {
				debeScrollRef.current = true;
				setMensajes((prev) => [...prev, ...nuevos]);
				ultimoIdRef.current = Math.max(...nuevos.map((m) => m.idMensaje));
			}
			const det = await botConversacionService.obtenerDetalle(selId);
			setConvActiva(det.conversacion);
		} catch {
			/* polling silencioso */
		}
	}, [selId]);

	useEffect(() => {
		botConversacionService
			.getEstadoAlmacen()
			.then((s) => setAlmacenamiento(s.almacenamiento))
			.catch(() => {});
		cargarLista();
	}, [cargarLista]);

	useEffect(() => {
		const t = setInterval(() => {
			cargarLista();
			pollMensajes();
		}, 4000);
		return () => clearInterval(t);
	}, [cargarLista, pollMensajes]);

	useEffect(() => {
		if (selId) cargarChat(selId);
		else {
			setConvActiva(null);
			setMensajes([]);
		}
	}, [selId, cargarChat]);

	useEffect(() => {
		if (!debeScrollRef.current) return;
		const el = mensajesRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
		debeScrollRef.current = false;
	}, [mensajes, loadingChat]);

	const handleControl = async (modo: BotModoControl) => {
		if (!selId || !puedeEditar) return;
		setError(null);
		try {
			const conv = await botConversacionService.cambiarControl(selId, modo);
			setConvActiva(conv);
			setConversaciones((prev) =>
				prev.map((c) => (c.idConversacion === selId ? conv : c)),
			);
			await cargarChat(selId, true);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err.message || 'Error al cambiar control');
		}
	};

	const handleToggleBot = async () => {
		if (!selId || !puedeEditar || togglingBot) return;
		setTogglingBot(true);
		setError(null);
		try {
			await handleControl(botActivo ? 'HUMANO' : 'BOT');
		} finally {
			setTogglingBot(false);
		}
	};

	const handleEnviar = async () => {
		if (!selId || !textoEnvio.trim() || !puedeEscribir) return;
		setEnviando(true);
		setError(null);
		try {
			await botConversacionService.enviarMensaje(selId, textoEnvio.trim());
			setTextoEnvio('');
			debeScrollRef.current = true;
			await cargarChat(selId, true);
			await cargarLista();
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err.message || 'Error al enviar');
		} finally {
			setEnviando(false);
		}
	};

	const tituloContacto =
		convActiva?.nombreContacto ||
		(convActiva ? `+${convActiva.telefonoWhatsApp}` : 'Seleccioná un chat');

	const filtros: { id: FiltroLista; label: string }[] = [
		{ id: 'TODOS', label: 'Todas' },
		{ id: 'NO_LEIDOS', label: 'No leídas' },
		{ id: 'BOT', label: 'Bot activo' },
		{ id: 'HUMANO', label: 'Agente' },
	];

	const layoutMobileClass =
		isMobile && selId
			? styles.layoutMobileChat
			: isMobile
				? styles.layoutMobileList
				: '';

	return (
		<div className={`${styles.inbox} ${fullHeight ? styles.inboxFull : ''}`}>
			{error && <div className={styles.error}>{error}</div>}

			<div className={`${styles.layout} ${layoutMobileClass}`}>
				<aside className={styles.lista}>
					<div className={styles.listaHeader}>
						<span className={styles.listaTitle}>
							Chats
							{convFiltradas.length > 0 && (
								<span className={styles.listaCount}>{convFiltradas.length}</span>
							)}
						</span>
					</div>
					<div className={styles.busquedaWrap}>
						<input
							type="search"
							className={styles.busqueda}
							placeholder="Buscar teléfono, nombre, DNI o paso…"
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
						/>
					</div>
					<div className={styles.listaFiltros}>
						{filtros.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`${styles.filterChip} ${filtroLista === f.id ? styles.filterChipActive : ''}`}
								onClick={() => setFiltroLista(f.id)}
							>
								{f.label}
							</button>
						))}
					</div>
					<div className={styles.listaScroll}>
						{loadingLista ? (
							<div className={agendaStyles.loading}>
								<span className={agendaStyles.spinner} />
								Cargando conversaciones…
							</div>
						) : convFiltradas.length === 0 ? (
							<AgendaEmptyState
								compact
								icon="💬"
								title={
									filtroLista !== 'TODOS' || busqueda
										? 'Sin resultados'
										: 'Sin conversaciones'
								}
								description={
									filtroLista !== 'TODOS' || busqueda
										? 'Probá otro filtro o limpiá la búsqueda.'
										: 'Cuando lleguen mensajes de WhatsApp aparecerán acá.'
								}
							/>
						) : (
							convFiltradas.map((c) => {
								const activa = selId === c.idConversacion;
								const botOff = c.modoControl !== 'BOT';
								return (
									<button
										key={c.idConversacion}
										type="button"
										className={`${styles.convItem} ${activa ? styles.convItemActive : ''} ${botOff ? styles.convItemBotOff : ''} ${c.noLeidos > 0 ? styles.convItemUnread : ''}`}
										onClick={() => setSelId(c.idConversacion)}
									>
										<div className={styles.convAvatar}>
											{(c.nombreContacto || c.telefonoWhatsApp).charAt(0).toUpperCase()}
										</div>
										<div className={styles.convBody}>
											<div className={styles.convTop}>
												<span className={styles.convNombre}>
													{c.nombreContacto || `+${c.telefonoWhatsApp}`}
												</span>
												<span className={styles.convHora}>
													{formatFechaRelativa(c.fechaUltimoMensaje)}
												</span>
											</div>
											<div className={styles.convBottom}>
												<span className={styles.convPreview}>
													{c.ultimoMensaje || 'Sin mensajes'}
												</span>
												{c.noLeidos > 0 && (
													<span className={styles.badgeUnread}>{c.noLeidos}</span>
												)}
											</div>
											{c.pasoBot && !botOff && (
												<div className={styles.convMeta}>
													<span className={styles.pasoTag}>{c.pasoBot}</span>
												</div>
											)}
											{botOff && (
												<div className={styles.convMeta}>
													<span className={styles.convAgenteLabel}>Agente al mando</span>
												</div>
											)}
										</div>
									</button>
								);
							})
						)}
					</div>
				</aside>

				<section className={styles.chat}>
					{!selId ? (
						<AgendaEmptyState
							icon="💬"
							title="Seleccioná una conversación"
							description="Elegí un chat de la lista para ver el historial, pausar el bot o responder como agente."
						/>
					) : (
						<>
							<header
								className={`${styles.chatHeader} ${!botActivo ? styles.chatHeaderAgente : ''}`}
							>
								<div className={styles.chatHeaderInfo}>
									<div className={styles.chatHeaderTitleRow}>
										{isMobile && (
											<button
												type="button"
												className={styles.btnBack}
												onClick={() => setSelId(null)}
												aria-label="Volver a la lista de chats"
											>
												←
											</button>
										)}
										<div className={styles.chatHeaderNames}>
											<h3>{tituloContacto}</h3>
											{convActiva?.telefonoWhatsApp && (
												<span className={styles.chatTel}>
													+{convActiva.telefonoWhatsApp}
												</span>
											)}
										</div>
									</div>
									{!botActivo && convActiva?.nombreAgente && (
										<span className={styles.chatAgente}>
											Atendido por {convActiva.nombreAgente}
										</span>
									)}
								</div>
								{puedeEditar && (
									<div
										className={styles.botToggle}
										title={botActivo ? 'Desactivar bot y tomar control' : 'Activar bot'}
									>
										<span className={styles.botToggleLabel}>Bot</span>
										<button
											type="button"
											role="switch"
											aria-checked={botActivo}
											aria-label={botActivo ? 'Desactivar bot' : 'Activar bot'}
											className={`${styles.botSwitch} ${botActivo ? styles.botSwitchOn : styles.botSwitchOff}`}
											disabled={togglingBot}
											onClick={handleToggleBot}
										>
											<span className={styles.botSwitchThumb} />
										</button>
										<span className={styles.botToggleState}>
											{botActivo ? 'Activo' : 'Off · vos respondés'}
										</span>
									</div>
								)}
							</header>

							{convActiva?.idPaciente && (
								<div className={styles.contextoPaciente}>
									<span>Paciente identificado</span>
									<strong>ID {convActiva.idPaciente}</strong>
								</div>
							)}

							<div className={styles.chatBody}>
								<div ref={mensajesRef} className={styles.mensajes}>
									{loadingChat ? (
										<div className={agendaStyles.loading}>
											<span className={agendaStyles.spinner} />
											Cargando mensajes…
										</div>
									) : mensajes.length === 0 ? (
										<AgendaEmptyState
											compact
											icon="📩"
											title="Sin mensajes"
											description="Todavía no hay mensajes en esta conversación."
										/>
									) : (
										mensajesAgrupados.map((grupo) => (
											<div key={grupo.dia} className={styles.diaGrupo}>
												<div className={styles.diaSeparador}>
													<span>{grupo.dia}</span>
												</div>
												{grupo.items.map((m) => {
													const esOut = m.direccion === 'OUT';
													const esSistema = m.origen === 'SISTEMA';
													return (
														<div
															key={m.idMensaje}
															className={`${styles.bubbleRow} ${esOut ? styles.bubbleRowOut : styles.bubbleRowIn}`}
														>
															<div
																className={`${styles.bubble} ${esOut ? styles.bubbleOut : styles.bubbleIn} ${esSistema ? styles.bubbleSistema : ''} ${m.origen === 'BOT' ? styles.bubbleBot : ''}`}
															>
																{!esSistema && m.origen === 'AGENTE' && m.nombreAgente && (
																	<span className={styles.bubbleAgente}>
																		{m.nombreAgente}
																	</span>
																)}
																{!esSistema && m.origen === 'BOT' && (
																	<span className={styles.bubbleBotLabel}>Bot</span>
																)}
																{m.esAudio && (
																	<span className={styles.bubbleAudioTag}>
																		🎤 Audio transcripto
																	</span>
																)}
																<p>{m.contenido}</p>
																<span className={styles.bubbleTime}>
																	{formatHora(m.fechaMensaje)}
																	{esOut && m.origen === 'AGENTE' && ' ✓'}
																</span>
															</div>
														</div>
													);
												})}
											</div>
										))
									)}
								</div>
							</div>

							<footer className={styles.composer}>
								{botActivo && (
									<p className={styles.composerHint}>
										Desactivá el bot para tomar el control y escribir.
									</p>
								)}
								<div className={styles.composerRow}>
									<textarea
										className={styles.composerInput}
										placeholder={
											puedeEscribir
												? 'Escribí un mensaje… (Enter para enviar)'
												: 'Desactivá el bot para responder'
										}
										value={textoEnvio}
										onChange={(e) => setTextoEnvio(e.target.value)}
										disabled={!puedeEscribir || enviando}
										rows={2}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault();
												handleEnviar();
											}
										}}
									/>
									<button
										type="button"
										className={styles.btnSend}
										disabled={!puedeEscribir || enviando || !textoEnvio.trim()}
										onClick={handleEnviar}
										aria-label="Enviar mensaje"
									>
										{enviando ? '…' : '➤'}
									</button>
								</div>
							</footer>
						</>
					)}
				</section>
			</div>
		</div>
	);
}
