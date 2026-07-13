'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TurneroDisplay from './TurneroDisplay';
import { TurneroCallQueue } from './TurneroCallQueue';
import type { TurneroConfig, TurneroDisplayState, TurneroLlamado } from '@/app/types/turnero';
import { sectorVisibleEnPantalla } from '@/app/types/turnero';
import { turneroService } from '@/app/services/turneroService';
import styles from './TurneroDisplay.module.css';

interface Props {
	token: string;
	/** Forzar modo kiosk vía ?kiosk=1 en la URL (sin guardar en config). */
	forceKiosk?: boolean;
}

function mergeLlamado(state: TurneroDisplayState, llamado: TurneroLlamado): TurneroDisplayState {
	const exists = state.llamados.some((l) => l.idLlamado === llamado.idLlamado);
	const llamados = exists
		? state.llamados.map((l) => (l.idLlamado === llamado.idLlamado ? llamado : l))
		: [llamado, ...state.llamados];
	const max = state.config.display?.maxLlamadosLista || 8;
	return {
		...state,
		ultimoLlamado: llamado,
		llamados: llamados.slice(0, max),
	};
}

export default function TurneroLiveDisplay({ token, forceKiosk = false }: Props) {
	const [state, setState] = useState<TurneroDisplayState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [highlightKey, setHighlightKey] = useState(0);
	const [audioReady, setAudioReady] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
	const [videoAtenuado, setVideoAtenuado] = useState(false);
	const [toolbarVisible, setToolbarVisible] = useState(false);
	const [hideCursor, setHideCursor] = useState(false);
	const queueRef = useRef<TurneroCallQueue | null>(null);
	const configRef = useRef<TurneroConfig | null>(null);
	const pendingLlamadosRef = useRef<TurneroLlamado[]>([]);
	const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastLlamadoIdRef = useRef<number | null>(null);

	const kioskMode = forceKiosk || !!state?.config.display.modoKiosk;

	const needsAudio =
		state?.config.audio.sonidoActivo || state?.config.audio.vozActiva;

	const procesarLlamado = useCallback((llamado: TurneroLlamado) => {
		const cfg = configRef.current;
		if (cfg && !sectorVisibleEnPantalla(llamado.sector, cfg)) return;

		setState((prev) => {
			if (!prev) return prev;
			const next = mergeLlamado(prev, llamado);
			configRef.current = next.config;
			return next;
		});
		setHighlightKey((k) => k + 1);
		const cfgAudio = configRef.current;
		if (!cfgAudio || !queueRef.current) return;
		if (!audioReady && (cfgAudio.audio.sonidoActivo || cfgAudio.audio.vozActiva)) {
			pendingLlamadosRef.current.push(llamado);
			return;
		}
		queueRef.current.enqueue(llamado, cfgAudio.audio);
	}, [audioReady]);

	const activarAudio = async () => {
		try {
			const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (Ctx) {
				const ctx = new Ctx();
				if (ctx.state === 'suspended') await ctx.resume();
				await ctx.close();
			}
		} catch {
			/* ignore */
		}
		setAudioReady(true);
		const cfg = configRef.current;
		if (cfg?.display?.autoFullscreen || cfg?.display?.modoKiosk || forceKiosk) {
			try {
				await document.documentElement.requestFullscreen();
			} catch {
				/* ignore */
			}
		}
		const cfgAudio = configRef.current;
		if (cfgAudio && queueRef.current && pendingLlamadosRef.current.length) {
			for (const ll of pendingLlamadosRef.current) {
				queueRef.current.enqueue(ll, cfgAudio.audio);
			}
			pendingLlamadosRef.current = [];
		}
	};

	const toggleFullscreen = async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			} else {
				await document.exitFullscreen();
			}
		} catch {
			/* ignore */
		}
	};

	const cargar = useCallback(async () => {
		const data = await turneroService.fetchDisplay(token);
		setState(data);
		configRef.current = data.config;
		if (data.ultimoLlamado?.idLlamado && lastLlamadoIdRef.current == null) {
			lastLlamadoIdRef.current = data.ultimoLlamado.idLlamado;
		}
		setError(null);
		if (typeof document !== 'undefined' && data.empresa?.nombre) {
			document.title = `Turnero — ${data.empresa.nombre}`;
		}
	}, [token]);

	useEffect(() => {
		queueRef.current = new TurneroCallQueue({
			onAnnouncementStart: () => setVideoAtenuado(true),
			onAnnouncementEnd: () => setVideoAtenuado(false),
		});
		return () => queueRef.current?.dispose();
	}, []);

	useEffect(() => {
		const onFs = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFs);
		return () => document.removeEventListener('fullscreenchange', onFs);
	}, []);

	useEffect(() => {
		let cancelled = false;
		cargar().catch((e: unknown) => {
			if (!cancelled) {
				setError(e instanceof Error ? e.message : 'Error al cargar pantalla');
			}
		});
		return () => {
			cancelled = true;
		};
	}, [cargar]);

	useEffect(() => {
		if (!token) return;
		const url = turneroService.getDisplayEventsUrl(token);
		setSseStatus('connecting');
		const es = new EventSource(url);

		es.onopen = () => setSseStatus('connected');
		es.addEventListener('llamado', (ev) => {
			try {
				const payload = JSON.parse((ev as MessageEvent).data) as { llamado: TurneroLlamado };
				const llamado = payload.llamado;
				if (!llamado) return;
				lastLlamadoIdRef.current = llamado.idLlamado;
				procesarLlamado(llamado);
			} catch {
				/* ignore malformed */
			}
		});

		es.addEventListener('config', (ev) => {
			try {
				const payload = JSON.parse((ev as MessageEvent).data) as { config: TurneroConfig };
				if (!payload.config) return;
				configRef.current = payload.config;
				setState((prev) => (prev ? { ...prev, config: payload.config } : prev));
			} catch {
				/* ignore */
			}
		});

		es.onerror = () => setSseStatus('error');

		return () => es.close();
	}, [token, procesarLlamado]);

	/** Si SSE falla, consultar cada 8s por nuevos llamados (audio + pantalla). */
	useEffect(() => {
		if (!token || sseStatus !== 'error') return;
		const poll = setInterval(() => {
			void (async () => {
				try {
					const data = await turneroService.fetchDisplay(token);
					const ultimo = data.ultimoLlamado;
					if (ultimo?.idLlamado && ultimo.idLlamado !== lastLlamadoIdRef.current) {
						lastLlamadoIdRef.current = ultimo.idLlamado;
						procesarLlamado(ultimo);
					}
					setState(data);
					configRef.current = data.config;
				} catch {
					/* ignore */
				}
			})();
		}, 8000);
		return () => clearInterval(poll);
	}, [token, sseStatus, procesarLlamado]);

	useEffect(() => {
		if (!token) return;
		const interval = setInterval(() => {
			cargar().catch(() => {});
		}, 60_000);
		return () => clearInterval(interval);
	}, [token, cargar]);

	useEffect(() => {
		if (!audioReady || state?.config.display.mantenerPantallaEncendida === false) return;
		let wakeLock: WakeLockSentinel | null = null;
		const requestWake = async () => {
			try {
				if ('wakeLock' in navigator) {
					wakeLock = await navigator.wakeLock.request('screen');
				}
			} catch {
				/* no soportado o denegado */
			}
		};
		void requestWake();
		const onVis = () => {
			if (document.visibilityState === 'visible') void requestWake();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			document.removeEventListener('visibilitychange', onVis);
			void wakeLock?.release();
		};
	}, [audioReady, state?.config.display.mantenerPantallaEncendida]);

	useEffect(() => {
		if (!kioskMode) {
			setHideCursor(false);
			setToolbarVisible(true);
			return;
		}
		setToolbarVisible(false);
		const resetCursor = () => {
			setHideCursor(false);
			if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
			cursorTimerRef.current = setTimeout(() => setHideCursor(true), 5000);
		};
		const onMove = (e: MouseEvent) => {
			resetCursor();
			setToolbarVisible(e.clientY < 56);
		};
		resetCursor();
		document.addEventListener('mousemove', onMove);
		return () => {
			document.removeEventListener('mousemove', onMove);
			if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
		};
	}, [kioskMode]);

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	if (!state) {
		return <div className={styles.loading}>Cargando pantalla de turnos…</div>;
	}

	return (
		<div className={hideCursor && kioskMode ? styles.kioskHideCursor : undefined}>
			<div
				className={`${styles.toolbar} ${kioskMode ? styles.toolbarKiosk : ''} ${
					kioskMode && !toolbarVisible ? styles.toolbarHidden : ''
				}`}
			>
				<span
					className={`${styles.statusDot} ${
						sseStatus === 'connected'
							? styles.statusOk
							: sseStatus === 'error'
								? styles.statusErr
								: styles.statusWait
					}`}
					title={
						sseStatus === 'connected'
							? 'Conectado en vivo'
							: sseStatus === 'error'
								? 'Reconectando…'
								: 'Conectando…'
					}
				/>
				<button type="button" className={styles.toolbarBtn} onClick={() => void toggleFullscreen()}>
					{isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
				</button>
			</div>

			<TurneroDisplay
				state={state}
				highlightKey={highlightKey}
				mediaUnlocked={audioReady}
				videoAtenuado={videoAtenuado}
			/>

			{needsAudio && !audioReady && (
				<div className={styles.audioGate}>
					<div className={styles.audioGateCard}>
						<h2 className={styles.audioGateTitle}>Activar audio</h2>
						<p className={styles.audioGateText}>
							El navegador requiere un toque para reproducir sonidos, voz y audio del video. Tocá el
							botón para habilitar el turnero en esta pantalla.
						</p>
						<button type="button" className={styles.audioGateBtn} onClick={() => void activarAudio()}>
							Activar sonido y voz
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
