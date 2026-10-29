'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NotificacionItem } from '@/app/services/notificacionesService';
import { usePermiso } from '@/app/hooks/usePermiso';
import {
	alertaSinCamaDe,
	descartarAvisosPedido,
	markEntranceShown,
	marcarNotificacionLeida,
	marcarTodasNotificacionesLeidas,
	refreshList,
	refreshSinCama,
	restaurarAvisoSinCama,
	silenciarAvisoSinCama,
	useNotificacionesStore,
} from '@/app/utils/notificacionesStore';
import railStyles from './FloatingActionsRail.module.css';
import styles from './NotificationsFab.module.css';

const OPEN_EVENT = 'imedic:notifications-open';
const BANDEJA_PATH = '/dashboard/bandeja-pedidos';
const CAMAS_PATH = '/dashboard/beds';

function esNotificacionWhatsApp(n: NotificacionItem): boolean {
	const tipo = String(n.TipoNotificacion || '').toUpperCase();
	const ent = String(n.EntidadTipo || '').toUpperCase();
	return tipo === 'WHATSAPP_MENSAJE' || ent === 'BOT_CONVERSACION';
}

function esNotificacionPedido(n: NotificacionItem): boolean {
	const tipo = String(n.TipoNotificacion || '').toUpperCase();
	const ent = String(n.EntidadTipo || '').toUpperCase();
	return (
		tipo === 'PEDIDO_ESTUDIO' ||
		tipo === 'INTERCONSULTA' ||
		ent === 'PEDIDO_ESTUDIO' ||
		ent === 'INTERCONSULTA'
	);
}

function esInterconsultaNotif(n: NotificacionItem): boolean {
	const tipo = String(n.TipoNotificacion || '').toUpperCase();
	const ent = String(n.EntidadTipo || '').toUpperCase();
	const cat = String((n.DatosJSON as { categoria?: string } | null)?.categoria || '').toUpperCase();
	return tipo === 'INTERCONSULTA' || ent === 'INTERCONSULTA' || cat === 'INTERCONSULTA';
}

export default function NotificationsFab({ stack = false }: { stack?: boolean }) {
	const router = useRouter();
	const { puede, loaded: permisosLoaded } = usePermiso();
	const notif = useNotificacionesStore();
	const {
		userId,
		count,
		items,
		itemsLoaded,
		loadingList,
		listError,
		estudios: bandejaEstudios,
		interconsultas: bandejaIc,
		sinCama,
	} = notif;
	const bandejaLibres = bandejaEstudios + bandejaIc;
	const puedeVerSinCama = permisosLoaded && puede('INTERNACION.MOVIMIENTOS.VER');
	const [open, setOpen] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	/** Se decide una sola vez por montaje: solo anima la primera aparición de la sesión. */
	const animateEntranceRef = useRef<boolean | null>(null);

	const firstLoadDone = (notif.countLoaded && notif.bandejaLoaded) || notif.firstLoadTimedOut;
	const visible = Boolean(userId) && firstLoadDone;
	if (visible && animateEntranceRef.current === null) {
		animateEntranceRef.current = !notif.entranceShown;
	}

	useEffect(() => {
		if (visible) markEntranceShown();
	}, [visible]);

	useEffect(() => {
		if (!open || !userId) return;
		void refreshList();
		if (puedeVerSinCama) void refreshSinCama();
	}, [open, userId, puedeVerSinCama]);

	const closePanel = useCallback(() => {
		setOpen(false);
		void descartarAvisosPedido();
	}, []);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			const el = panelRef.current;
			if (el && !el.contains(e.target as Node)) {
				const fab = document.getElementById('notifications-fab-trigger');
				if (fab && fab.contains(e.target as Node)) return;
				closePanel();
			}
		};
		document.addEventListener('mousedown', onDoc);
		return () => document.removeEventListener('mousedown', onDoc);
	}, [open, closePanel]);

	useEffect(() => {
		const onOpenEvent = () => {
			if (!userId) return;
			setOpen(true);
		};
		window.addEventListener(OPEN_EVENT, onOpenEvent);
		return () => window.removeEventListener(OPEN_EVENT, onOpenEvent);
	}, [userId]);

	const handleOpen = () => {
		if (!userId) return;
		if (open) {
			closePanel();
			return;
		}
		setOpen(true);
	};

	const irBandeja = (tab?: 'estudios' | 'interconsultas') => {
		closePanel();
		const qs = tab ? `?tab=${tab}` : '';
		router.push(`${BANDEJA_PATH}${qs}`);
	};

	const irCamas = () => {
		closePanel();
		router.push(CAMAS_PATH);
	};

	const abrirNotificacion = async (n: NotificacionItem) => {
		if (!userId) return;
		void marcarNotificacionLeida(n);
		if (esNotificacionWhatsApp(n)) {
			closePanel();
			router.push('/dashboard/turnos/chats');
			return;
		}
		if (esNotificacionPedido(n)) {
			closePanel();
			const datos = (n.DatosJSON || {}) as {
				idSectorReceptor?: string;
				idPedido?: number;
			};
			const qs = new URLSearchParams();
			qs.set('tab', esInterconsultaNotif(n) ? 'interconsultas' : 'estudios');
			const sector = String(datos.idSectorReceptor || '').trim();
			if (sector) qs.set('sector', sector);
			if (datos.idPedido) qs.set('pedido', String(datos.idPedido));
			router.push(`${BANDEJA_PATH}?${qs.toString()}`);
		}
	};

	const marcarUna = async (n: NotificacionItem) => {
		await abrirNotificacion(n);
	};

	const marcarTodas = async () => {
		if (!userId) return;
		try {
			await marcarTodasNotificacionesLeidas();
			setOpen(false);
		} catch {
			/* noop */
		}
	};

	if (!visible) {
		return null;
	}

	const hasUnread = count > 0;
	const hasPedidos = bandejaLibres > 0;
	const sinCamaAlerta = puedeVerSinCama ? alertaSinCamaDe(notif) : 0;
	const hasSinCama = sinCamaAlerta > 0;
	const sinCamaSilenciada = puedeVerSinCama && sinCama > 0 && !hasSinCama;
	const extrasAlert = bandejaLibres + sinCamaAlerta;
	const snoozeHasta =
		notif.sinCamaSnoozeUntil != null
			? new Date(notif.sinCamaSnoozeUntil).toLocaleString('es-AR', {
					dateStyle: 'short',
					timeStyle: 'short',
				})
			: '';
	const fabHighlight = hasUnread || hasPedidos || hasSinCama;
	const badgeTotal = hasUnread ? count : extrasAlert;
	const fabClass = stack
		? `${railStyles.item} ${styles.railItem} ${hasUnread ? styles.railAlert : hasPedidos || hasSinCama ? styles.railPedidos : ''} ${
				open ? railStyles.itemActive : ''
			}`
		: `${styles.fab} ${hasUnread ? styles.fabAlert : hasPedidos || hasSinCama ? styles.fabPedidos : styles.fabIdle}`;

	return (
		<div className={`${styles.wrap} ${stack ? styles.wrapInStack : ''}`} ref={panelRef}>
			<div className={animateEntranceRef.current ? styles.fabEntrance : undefined}>
				<button
					id="notifications-fab-trigger"
					type="button"
					className={fabClass}
					onClick={handleOpen}
					aria-expanded={open}
					data-fab-alert={fabHighlight ? 'true' : undefined}
					aria-label={`Notificaciones${fabHighlight ? `, ${badgeTotal} sin leer` : ''}`}
					title="Notificaciones"
				>
					<svg
						className={`${styles.fabIcon} ${fabHighlight ? styles.fabIconAlert : ''}`}
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden
					>
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
						<path d="M13.73 21a2 2 0 0 1-3.46 0" />
					</svg>
					{fabHighlight ? (
						<span
							className={`${styles.badge} ${!hasUnread && (hasPedidos || hasSinCama) ? styles.badgePedidos : ''}`}
							aria-hidden
						>
							{badgeTotal > 99 ? '99+' : badgeTotal}
						</span>
					) : null}
				</button>
			</div>

			{open ? (
				<div className={styles.panel} role="dialog" aria-label="Lista de notificaciones">
					<div className={styles.panelHeader}>
						<span className={styles.panelTitle}>Notificaciones</span>
						{hasUnread ? (
							<button type="button" className={styles.linkBtn} onClick={() => void marcarTodas()}>
								Marcar todas leídas
							</button>
						) : null}
					</div>

					{hasSinCama ? (
						<div className={`${styles.sinCamaCard} ${styles.sinCamaCardActive}`}>
							<button type="button" className={styles.sinCamaMain} onClick={irCamas}>
								<div className={styles.bandejaCardTop}>
									<span className={styles.sinCamaTag}>Internación</span>
									<span className={styles.bandejaCount}>{sinCama > 99 ? '99+' : sinCama}</span>
								</div>
								<p className={styles.sinCamaTitle}>Pacientes sin cama</p>
								<p className={styles.sinCamaHint}>
									{`${sinCama} internado${sinCama === 1 ? '' : 's'} pendiente${sinCama === 1 ? '' : 's'} de ubicar`}
								</p>
							</button>
							<div className={styles.sinCamaActions}>
								<button
									type="button"
									className={styles.snoozeBtn}
									onClick={() => silenciarAvisoSinCama()}
									title="Ocultar este aviso durante 24 horas"
								>
									Ocultar 24 h
								</button>
							</div>
						</div>
					) : null}

					{sinCamaSilenciada ? (
						<div className={styles.snoozedBar}>
							<p className={styles.snoozedText}>
								Aviso de internación oculto hasta {snoozeHasta}
							</p>
							<button type="button" className={styles.linkBtn} onClick={() => restaurarAvisoSinCama()}>
								Mostrar
							</button>
						</div>
					) : null}

					{hasPedidos ? (
						<button
							type="button"
							className={`${styles.bandejaCard} ${styles.bandejaCardActive}`}
							onClick={() => irBandeja()}
						>
						<div className={styles.bandejaCardTop}>
							<span className={styles.bandejaTag}>Pedidos</span>
							<span className={styles.bandejaCount}>{bandejaLibres > 99 ? '99+' : bandejaLibres}</span>
						</div>
						<p className={styles.bandejaTitle}>Bandeja de pedidos</p>
						<p className={styles.bandejaHint}>
							{`${bandejaLibres} libre${bandejaLibres === 1 ? '' : 's'} para aceptar`}
						</p>
						<div className={styles.bandejaSplit}>
							<span>
								<strong>{bandejaEstudios}</strong> estudio{bandejaEstudios === 1 ? '' : 's'}
							</span>
							<span>
								<strong>{bandejaIc}</strong> interconsulta{bandejaIc === 1 ? '' : 's'}
							</span>
						</div>
						<div className={styles.bandejaLinks}>
							<span
								role="link"
								tabIndex={0}
								className={styles.bandejaSubLink}
								onClick={(e) => {
									e.stopPropagation();
									irBandeja('estudios');
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										irBandeja('estudios');
									}
								}}
							>
								Estudios
							</span>
							<span
								role="link"
								tabIndex={0}
								className={styles.bandejaSubLink}
								onClick={(e) => {
									e.stopPropagation();
									irBandeja('interconsultas');
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										irBandeja('interconsultas');
									}
								}}
							>
								Interconsultas
							</span>
						</div>
						</button>
					) : null}

					<div className={styles.panelBody}>
						{loadingList && !itemsLoaded ? (
							<p className={styles.muted}>Cargando…</p>
						) : listError && !itemsLoaded ? (
							<p className={styles.muted}>{listError}</p>
						) : items.length === 0 ? (
							<p className={styles.muted}>
								{hasPedidos || hasSinCama
									? 'Los avisos de arriba ya resumen lo pendiente. Todavía no hay avisos individuales.'
									: 'No hay notificaciones'}
							</p>
						) : (
							<ul className={styles.list}>
								{items.map((n) => {
									const leida = n.Leida === 1 || n.Leida === true;
									return (
										<li
											key={n.IdNotificacion}
											className={`${styles.item} ${!leida ? styles.itemUnread : ''}`}
										>
											<button
												type="button"
												className={styles.itemOpen}
												onClick={() => void abrirNotificacion(n)}
											>
												{esNotificacionWhatsApp(n) ? (
													<span className={styles.itemTag}>WhatsApp</span>
												) : esInterconsultaNotif(n) ? (
													<span className={`${styles.itemTag} ${styles.itemTagPedido}`}>
														Interconsulta
													</span>
												) : esNotificacionPedido(n) ? (
													<span className={`${styles.itemTag} ${styles.itemTagPedido}`}>
														Estudio
													</span>
												) : null}
												<p className={styles.itemText}>
													{n.DescNotificacion || n.TipoNotificacion || 'Aviso'}
												</p>
											</button>
											{n.FechaCarga ? (
												<time className={styles.itemTime} dateTime={n.FechaCarga}>
													{new Date(n.FechaCarga).toLocaleString('es-AR', {
														dateStyle: 'short',
														timeStyle: 'short',
													})}
												</time>
											) : null}
											{!leida ? (
												<button
													type="button"
													className={styles.itemAction}
													onClick={() => void marcarUna(n)}
												>
													{esNotificacionWhatsApp(n)
														? 'Ver chat'
														: esNotificacionPedido(n)
															? 'Ver pedido'
															: 'Marcar leída'}
												</button>
											) : null}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
