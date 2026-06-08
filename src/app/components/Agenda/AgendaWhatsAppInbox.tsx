'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { botConversacionService } from '@/app/services/botConversacionService';
import type {
	BotConversacion,
	BotMensajeChat,
	BotModoControl,
} from '@/app/types/botConversacion';
import styles from './AgendaWhatsAppInbox.module.css';

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

function labelModo(modo: BotModoControl): string {
	if (modo === 'BOT') return 'Bot activo';
	if (modo === 'HUMANO') return 'Agente';
	return 'Bot pausado';
}

function tagModoClass(modo: BotModoControl): string {
	if (modo === 'BOT') return styles.tagBot;
	if (modo === 'HUMANO') return styles.tagHumano;
	return styles.tagPausado;
}

const MSG_API_BOT_404 =
	'El backend no expone /admin/bot/conversaciones (404). En Vercel configurá NEXT_PUBLIC_API_URL=https://imedicwsback-production.up.railway.app/api (el Render congelado no tiene inbox WhatsApp).';

function es404ConversacionesApi(e: unknown): boolean {
	if (typeof e !== 'object' || e === null) return false;
	const ax = e as { response?: { status?: number }; message?: string };
	return ax.response?.status === 404 || /status code 404/i.test(String(ax.message || ''));
}

interface Props {
	puedeEditar?: boolean;
	fullHeight?: boolean;
}

export default function AgendaWhatsAppInbox({ puedeEditar = true, fullHeight = false }: Props) {
	const [conversaciones, setConversaciones] = useState<BotConversacion[]>([]);
	const [selId, setSelId] = useState<string | null>(null);
	const [mensajes, setMensajes] = useState<BotMensajeChat[]>([]);
	const [convActiva, setConvActiva] = useState<BotConversacion | null>(null);
	const [busqueda, setBusqueda] = useState('');
	const [soloNoLeidos, setSoloNoLeidos] = useState(false);
	const [textoEnvio, setTextoEnvio] = useState('');
	const [loadingLista, setLoadingLista] = useState(true);
	const [loadingChat, setLoadingChat] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [almacenamiento, setAlmacenamiento] = useState<'sql' | 'memoria' | null>(null);
	const [showSimulador, setShowSimulador] = useState(false);
	const [simTel, setSimTel] = useState('5491123456789');
	const [simNombre, setSimNombre] = useState('');
	const [simMsg, setSimMsg] = useState('Hola, quiero un turno');
	const [simulando, setSimulando] = useState(false);

	const chatEndRef = useRef<HTMLDivElement>(null);
	const ultimoIdRef = useRef<number>(0);

	const convFiltradas = useMemo(() => {
		const q = busqueda.trim().toLowerCase();
		if (!q) return conversaciones;
		return conversaciones.filter(
			(c) =>
				c.telefonoWhatsApp.includes(q) ||
				(c.nombreContacto || '').toLowerCase().includes(q) ||
				(c.dniPaciente || '').includes(q) ||
				(c.ultimoMensaje || '').toLowerCase().includes(q),
		);
	}, [conversaciones, busqueda]);

	const puedeEscribir =
		puedeEditar && convActiva && convActiva.modoControl !== 'BOT';

	const cargarLista = useCallback(async () => {
		try {
			const data = await botConversacionService.listarConversaciones({
				limit: 80,
				soloNoLeidos,
			});
			setConversaciones(data.conversaciones);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(
				es404ConversacionesApi(e) ? MSG_API_BOT_404 : err.message || 'Error cargando conversaciones',
			);
		} finally {
			setLoadingLista(false);
		}
	}, [soloNoLeidos]);

	const cargarChat = useCallback(async (id: string, silencioso = false) => {
		if (!silencioso) setLoadingChat(true);
		try {
			const det = await botConversacionService.obtenerDetalle(id);
			setConvActiva(det.conversacion);
			setMensajes(det.mensajes);
			ultimoIdRef.current = det.mensajes.length
				? Math.max(...det.mensajes.map((m) => m.idMensaje))
				: 0;
			if (det.conversacion.noLeidos > 0) {
				await botConversacionService.marcarLeida(id);
				setConversaciones((prev) =>
					prev.map((c) => (c.idConversacion === id ? { ...c, noLeidos: 0 } : c)),
				);
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
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [mensajes]);

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

	const handleEnviar = async () => {
		if (!selId || !textoEnvio.trim() || !puedeEscribir) return;
		setEnviando(true);
		setError(null);
		try {
			await botConversacionService.enviarMensaje(selId, textoEnvio.trim());
			setTextoEnvio('');
			await cargarChat(selId, true);
			await cargarLista();
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err.message || 'Error al enviar');
		} finally {
			setEnviando(false);
		}
	};

	const handleSimular = async () => {
		if (!simTel.trim() || !simMsg.trim()) return;
		setSimulando(true);
		setError(null);
		try {
			const r = await botConversacionService.simularMensajeEntrante({
				telefono: simTel.trim(),
				mensaje: simMsg.trim(),
				nombreContacto: simNombre.trim() || undefined,
			});
			setSelId(r.conversacion.idConversacion);
			await cargarLista();
			setShowSimulador(false);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(err.message || 'Error al simular');
		} finally {
			setSimulando(false);
		}
	};

	const tituloContacto =
		convActiva?.nombreContacto ||
		(convActiva ? `+${convActiva.telefonoWhatsApp}` : 'Seleccioná un chat');

	return (
		<div className={`${styles.inbox} ${fullHeight ? styles.inboxFull : ''}`}>
			<div className={styles.toolbar}>
				<div className={styles.toolbarLeft}>
					<span className={styles.toolbarTitle}>Conversaciones WhatsApp</span>
					{almacenamiento === 'memoria' && (
						<span className={styles.badgeMemoria} title="Ejecutá create_bot_conversaciones.sql para persistir">
							Modo prueba (memoria)
						</span>
					)}
				</div>
				<div className={styles.toolbarActions}>
					<label className={styles.checkFilter}>
						<input
							type="checkbox"
							checked={soloNoLeidos}
							onChange={(e) => {
								setSoloNoLeidos(e.target.checked);
								setLoadingLista(true);
							}}
						/>
						Solo no leídos
					</label>
					{puedeEditar && (
						<button
							type="button"
							className={styles.btnSimular}
							onClick={() => setShowSimulador((v) => !v)}
						>
							{showSimulador ? 'Cerrar simulador' : 'Simular mensaje'}
						</button>
					)}
				</div>
			</div>

			{showSimulador && puedeEditar && (
				<div className={styles.simulador}>
					<p className={styles.simuladorHint}>
						Probá el inbox sin Meta: simula un mensaje entrante del paciente.
					</p>
					<div className={styles.simuladorGrid}>
						<label>
							Teléfono (WhatsApp)
							<input
								value={simTel}
								onChange={(e) => setSimTel(e.target.value)}
								placeholder="5491123456789"
							/>
						</label>
						<label>
							Nombre (opcional)
							<input
								value={simNombre}
								onChange={(e) => setSimNombre(e.target.value)}
								placeholder="María García"
							/>
						</label>
						<label className={styles.simuladorMsg}>
							Mensaje
							<input
								value={simMsg}
								onChange={(e) => setSimMsg(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSimular()}
							/>
						</label>
						<button
							type="button"
							className={styles.btnPrimary}
							disabled={simulando}
							onClick={handleSimular}
						>
							{simulando ? 'Enviando…' : 'Simular entrante'}
						</button>
					</div>
				</div>
			)}

			{error && <div className={styles.error}>{error}</div>}

			<div className={styles.layout}>
				<aside className={styles.lista}>
					<div className={styles.busquedaWrap}>
						<input
							type="search"
							className={styles.busqueda}
							placeholder="Buscar por teléfono, nombre o DNI…"
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
						/>
					</div>
					<div className={styles.listaScroll}>
						{loadingLista ? (
							<div className={styles.loading}>Cargando…</div>
						) : convFiltradas.length === 0 ? (
							<div className={styles.emptyLista}>
								<p>Sin conversaciones</p>
								{puedeEditar && (
									<button
										type="button"
										className={styles.linkBtn}
										onClick={() => setShowSimulador(true)}
									>
										Simular primer mensaje
									</button>
								)}
							</div>
						) : (
							convFiltradas.map((c) => {
								const activa = selId === c.idConversacion;
								return (
									<button
										key={c.idConversacion}
										type="button"
										className={`${styles.convItem} ${activa ? styles.convItemActive : ''}`}
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
											<span className={`${styles.tag} ${tagModoClass(c.modoControl)}`}>
												{labelModo(c.modoControl)}
											</span>
										</div>
									</button>
								);
							})
						)}
					</div>
				</aside>

				<section className={styles.chat}>
					{!selId ? (
						<div className={styles.chatEmpty}>
							<div className={styles.chatEmptyIcon}>💬</div>
							<h3>Inbox WhatsApp — Agenda</h3>
							<p>
								Pausá el bot, tomá el control y respondé como agente. Al conectar Meta,
								los mensajes entrarán por webhook automáticamente.
							</p>
						</div>
					) : (
						<>
							<header className={styles.chatHeader}>
								<div className={styles.chatHeaderInfo}>
									<h3>{tituloContacto}</h3>
									<span className={styles.chatSub}>
										+{convActiva?.telefonoWhatsApp}
										{convActiva?.dniPaciente && ` · DNI ${convActiva.dniPaciente}`}
										{convActiva?.pasoBot && ` · Paso: ${convActiva.pasoBot}`}
									</span>
								</div>
								<div className={styles.chatControls}>
									<span
										className={`${styles.tag} ${styles.tagHeader} ${tagModoClass(convActiva?.modoControl || 'BOT')}`}
									>
										{labelModo(convActiva?.modoControl || 'BOT')}
										{convActiva?.modoControl === 'HUMANO' &&
											convActiva.nombreAgente &&
											` · ${convActiva.nombreAgente}`}
									</span>
									{puedeEditar && (
										<>
											<button
												type="button"
												className={styles.btnControl}
												disabled={convActiva?.modoControl === 'PAUSADO'}
												onClick={() => handleControl('PAUSADO')}
												title="Detiene respuestas automáticas del bot"
											>
												⏸ Pausar bot
											</button>
											<button
												type="button"
												className={`${styles.btnControl} ${styles.btnControlPrimary}`}
												disabled={convActiva?.modoControl === 'HUMANO'}
												onClick={() => handleControl('HUMANO')}
												title="Tomás el chat; el bot no responde"
											>
												👤 Tomar control
											</button>
											<button
												type="button"
												className={styles.btnControl}
												disabled={convActiva?.modoControl === 'BOT'}
												onClick={() => handleControl('BOT')}
												title="El bot vuelve a atender solo"
											>
												🤖 Devolver al bot
											</button>
										</>
									)}
								</div>
							</header>

							{convActiva?.idPaciente && (
								<div className={styles.contextoPaciente}>
									<span>Paciente identificado</span>
									<strong>ID {convActiva.idPaciente}</strong>
									{convActiva.dniPaciente && (
										<span>DNI {convActiva.dniPaciente}</span>
									)}
								</div>
							)}

							<div className={styles.mensajes}>
								{loadingChat ? (
									<div className={styles.loading}>Cargando mensajes…</div>
								) : (
									mensajes.map((m) => {
										const esOut = m.direccion === 'OUT';
										const esSistema = m.origen === 'SISTEMA';
										return (
											<div
												key={m.idMensaje}
												className={`${styles.bubbleRow} ${esOut ? styles.bubbleRowOut : styles.bubbleRowIn}`}
											>
												<div
													className={`${styles.bubble} ${esOut ? styles.bubbleOut : styles.bubbleIn} ${esSistema ? styles.bubbleSistema : ''}`}
												>
													{!esSistema && m.origen === 'AGENTE' && m.nombreAgente && (
														<span className={styles.bubbleAgente}>{m.nombreAgente}</span>
													)}
													<p>{m.contenido}</p>
													<span className={styles.bubbleTime}>
														{formatHora(m.fechaMensaje)}
														{esOut && m.origen === 'AGENTE' && ' ✓'}
													</span>
												</div>
											</div>
										);
									})
								)}
								<div ref={chatEndRef} />
							</div>

							<footer className={styles.composer}>
								{convActiva?.modoControl === 'BOT' && (
									<p className={styles.composerHint}>
										El bot está activo. Pausalo o tomá el control para escribir.
									</p>
								)}
								<div className={styles.composerRow}>
									<textarea
										className={styles.composerInput}
										placeholder={
											puedeEscribir
												? 'Escribí un mensaje…'
												: 'Pausá el bot o tomá el control para responder'
										}
										value={textoEnvio}
										onChange={(e) => setTextoEnvio(e.target.value)}
										disabled={!puedeEscribir || enviando}
										rows={1}
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
