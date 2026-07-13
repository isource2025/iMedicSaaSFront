'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TurneroConfig } from '@/app/types/turnero';
import styles from './TurneroDisplay.module.css';

/** Aspecto típico de YouTube/Vimeo / la mayoría del material institucional. */
const DEFAULT_ASPECT = 16 / 9;

function extractYoutubeId(url: string): string | null {
	const u = url.trim();
	if (!u) return null;
	const m =
		u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/) ||
		u.match(/^([a-zA-Z0-9_-]{11})$/);
	return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
	const m = url.trim().match(/vimeo\.com\/(?:video\/)?(\d+)/);
	return m ? m[1] : null;
}

type YTPlayer = {
	playVideo: () => void;
	pauseVideo: () => void;
	setVolume: (n: number) => void;
	mute: () => void;
	unMute: () => void;
	destroy: () => void;
};

type YTNamespace = {
	Player: new (
		el: HTMLElement | string,
		opts: {
			videoId?: string;
			playerVars?: Record<string, string | number>;
			events?: { onReady?: (ev: { target: YTPlayer }) => void };
		},
	) => YTPlayer;
};

type VimeoPlayer = {
	setVolume: (n: number) => Promise<number>;
	play: () => Promise<void>;
	destroy: () => void;
};

declare global {
	interface Window {
		YT?: YTNamespace;
		onYouTubeIframeAPIReady?: () => void;
		Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer };
	}
}

let ytApiPromise: Promise<void> | null = null;
let vimeoApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve();
	if (window.YT?.Player) return Promise.resolve();
	if (!ytApiPromise) {
		ytApiPromise = new Promise((resolve) => {
			const prev = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				prev?.();
				resolve();
			};
			if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
				const tag = document.createElement('script');
				tag.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(tag);
			}
		});
	}
	return ytApiPromise;
}

function loadVimeoApi(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve();
	if (window.Vimeo?.Player) return Promise.resolve();
	if (!vimeoApiPromise) {
		vimeoApiPromise = new Promise((resolve, reject) => {
			const tag = document.createElement('script');
			tag.src = 'https://player.vimeo.com/api/player.js';
			tag.onload = () => resolve();
			tag.onerror = () => reject(new Error('Vimeo API'));
			document.head.appendChild(tag);
		});
	}
	return vimeoApiPromise;
}

/**
 * Equivalente a object-fit: cover para iframes (YouTube/Vimeo no lo respetan).
 * Agranda el player respecto al panel y recorta bordes sin letterboxing negro.
 */
function coverSize(
	paneW: number,
	paneH: number,
	aspect: number,
): { width: number; height: number } {
	if (paneW <= 0 || paneH <= 0 || aspect <= 0) {
		return { width: paneW || 0, height: paneH || 0 };
	}
	const paneAspect = paneW / paneH;
	if (paneAspect > aspect) {
		// Panel más ancho → ancho 100%, altura sobra y se recorta
		return { width: paneW, height: paneW / aspect };
	}
	// Panel más alto/angosto → alto 100%, ancho sobra y se recorta
	return { width: paneH * aspect, height: paneH };
}

interface Props {
	video: TurneroConfig['video'];
	mediaUnlocked: boolean;
	/** Durante anuncio de llamado (sonido + voz). */
	atenuado: boolean;
}

export default function TurneroVideoPlayer({ video, mediaUnlocked, atenuado }: Props) {
	const paneRef = useRef<HTMLDivElement>(null);
	const hostRef = useRef<HTMLDivElement>(null);
	const htmlVideoRef = useRef<HTMLVideoElement>(null);
	const ytPlayerRef = useRef<YTPlayer | null>(null);
	const vimeoPlayerRef = useRef<VimeoPlayer | null>(null);
	const vimeoIframeRef = useRef<HTMLIFrameElement | null>(null);

	const [paneSize, setPaneSize] = useState({ w: 0, h: 0 });
	const [mediaAspect, setMediaAspect] = useState(DEFAULT_ASPECT);

	const conSonido = video.conSonido !== false;
	const atenuarAlLlamar = video.atenuarAlLlamar !== false;
	const volDurante = Math.min(
		1,
		Math.max(0.01, Number(video.volumenDuranteLlamado) || 0.05),
	);
	const volNormal = 1;
	const volActual =
		atenuado && atenuarAlLlamar && conSonido ? volDurante : volNormal;
	const ytVol = Math.round(volActual * 100);
	const debeMutear = !conSonido || (!mediaUnlocked && conSonido);
	const enLoop = video.loop !== false;

	const url = video.url?.trim() || '';
	const youtubeId = video.fuente === 'youtube' ? extractYoutubeId(url) : null;
	const vimeoId = video.fuente === 'vimeo' ? extractVimeoId(url) : null;
	const needsCoverScale = video.fuente === 'youtube' || video.fuente === 'vimeo';

	useLayoutEffect(() => {
		const el = paneRef.current;
		if (!el) return;
		const measure = () => {
			const r = el.getBoundingClientRect();
			setPaneSize({ w: Math.round(r.width), h: Math.round(r.height) });
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [video.fuente, url]);

	const cover = coverSize(paneSize.w, paneSize.h, mediaAspect);
	const coverStyle: React.CSSProperties | undefined = needsCoverScale
		? {
				width: cover.width || '100%',
				height: cover.height || '100%',
				left: '50%',
				top: '50%',
				transform: 'translate(-50%, -50%)',
			}
		: undefined;

	// YouTube IFrame API
	useEffect(() => {
		if (video.fuente !== 'youtube' || !youtubeId || !hostRef.current) return;
		let cancelled = false;
		setMediaAspect(DEFAULT_ASPECT);

		void loadYouTubeApi().then(() => {
			if (cancelled || !hostRef.current || !window.YT?.Player) return;
			ytPlayerRef.current?.destroy();
			hostRef.current.innerHTML = '';
			const el = document.createElement('div');
			hostRef.current.appendChild(el);

			ytPlayerRef.current = new window.YT.Player(el, {
				videoId: youtubeId,
				playerVars: {
					autoplay: 1,
					mute: debeMutear ? 1 : 0,
					controls: 0,
					...(enLoop ? { loop: 1, playlist: youtubeId } : {}),
					rel: 0,
					modestbranding: 1,
					playsinline: 1,
					iv_load_policy: 3,
				},
				events: {
					onReady: (ev) => {
						ev.target.playVideo();
						if (debeMutear) ev.target.mute();
						else {
							ev.target.unMute();
							ev.target.setVolume(ytVol);
						}
					},
				},
			});
		});

		return () => {
			cancelled = true;
			ytPlayerRef.current?.destroy();
			ytPlayerRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [video.fuente, youtubeId, mediaUnlocked, conSonido, enLoop]);

	useEffect(() => {
		const p = ytPlayerRef.current;
		if (!p) return;
		if (debeMutear) {
			p.mute();
			return;
		}
		p.unMute();
		p.setVolume(ytVol);
	}, [debeMutear, ytVol, atenuado]);

	// Vimeo Player API
	useEffect(() => {
		if (video.fuente !== 'vimeo' || !vimeoId || !vimeoIframeRef.current) return;
		let cancelled = false;
		setMediaAspect(DEFAULT_ASPECT);

		void loadVimeoApi()
			.then(() => {
				if (cancelled || !vimeoIframeRef.current || !window.Vimeo?.Player) return;
				vimeoPlayerRef.current?.destroy();
				const player = new window.Vimeo.Player(vimeoIframeRef.current);
				vimeoPlayerRef.current = player;
				void player.play();
				if (debeMutear) void player.setVolume(0);
				else void player.setVolume(ytVol);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			vimeoPlayerRef.current?.destroy();
			vimeoPlayerRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [video.fuente, vimeoId, mediaUnlocked, conSonido, enLoop]);

	useEffect(() => {
		const p = vimeoPlayerRef.current;
		if (!p) return;
		if (debeMutear) void p.setVolume(0);
		else void p.setVolume(ytVol);
	}, [debeMutear, ytVol, atenuado]);

	// HTML5 video
	useEffect(() => {
		const v = htmlVideoRef.current;
		if (!v) return;
		v.muted = debeMutear;
		if (!debeMutear) v.volume = volActual;
	}, [debeMutear, volActual]);

	if (!video.activo || !url) return null;

	if (video.fuente === 'youtube' && youtubeId) {
		return (
			<div ref={paneRef} className={styles.videoPaneInner}>
				<div ref={hostRef} className={styles.ytHost} style={coverStyle} />
			</div>
		);
	}

	if (video.fuente === 'vimeo' && vimeoId) {
		return (
			<div ref={paneRef} className={styles.videoPaneInner}>
				<iframe
					ref={vimeoIframeRef}
					className={styles.embedCover}
					style={coverStyle}
					title="Video institucional"
					src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=${debeMutear ? 1 : 0}${enLoop ? '&loop=1' : ''}&background=0`}
					allow="autoplay; fullscreen"
				/>
			</div>
		);
	}

	return (
		<div ref={paneRef} className={styles.videoPaneInner}>
			<video
				ref={htmlVideoRef}
				className={styles.htmlVideoCover}
				src={url}
				autoPlay
				muted={debeMutear}
				loop={enLoop}
				playsInline
				onLoadedMetadata={(e) => {
					const el = e.currentTarget;
					if (el.videoWidth > 0 && el.videoHeight > 0) {
						setMediaAspect(el.videoWidth / el.videoHeight);
					}
				}}
			/>
		</div>
	);
}
