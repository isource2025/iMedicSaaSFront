import type { TurneroAudioConfig, TurneroLlamado } from '@/app/types/turnero';
import { buildVozTexto } from '@/app/types/turnero';

type QueueItem = {
	llamado: TurneroLlamado;
	config: TurneroAudioConfig;
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioCtx) audioCtx = new AudioContext();
	return audioCtx;
}

/** Campana sintética cuando no hay archivo de sonido configurado. */
async function playChime(): Promise<void> {
	const ctx = getAudioContext();
	if (ctx.state === 'suspended') await ctx.resume();

	const now = ctx.currentTime;
	const gain = ctx.createGain();
	gain.connect(ctx.destination);
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

	const osc1 = ctx.createOscillator();
	osc1.type = 'sine';
	osc1.frequency.setValueAtTime(880, now);
	osc1.connect(gain);
	osc1.start(now);
	osc1.stop(now + 0.55);

	const osc2 = ctx.createOscillator();
	osc2.type = 'sine';
	osc2.frequency.setValueAtTime(1174.66, now + 0.12);
	osc2.connect(gain);
	osc2.start(now + 0.12);
	osc2.stop(now + 0.55);

	await new Promise<void>((resolve) => {
		setTimeout(resolve, 580);
	});
}

async function playSoundUrl(url: string): Promise<void> {
	return new Promise((resolve) => {
		const audio = new Audio(url);
		audio.onended = () => resolve();
		audio.onerror = () => resolve();
		void audio.play().catch(() => resolve());
	});
}

function speakText(text: string, config: TurneroAudioConfig): Promise<void> {
	return new Promise((resolve) => {
		if (typeof window === 'undefined' || !window.speechSynthesis) {
			resolve();
			return;
		}
		const utter = new SpeechSynthesisUtterance(text);
		utter.lang = config.vozLang || 'es-AR';
		utter.rate = config.vozRate || 0.95;
		utter.onend = () => resolve();
		utter.onerror = () => resolve();
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utter);
	});
}

export type CallQueueHooks = {
	onAnnouncementStart?: () => void;
	onAnnouncementEnd?: () => void;
};

export class TurneroCallQueue {
	private queue: QueueItem[] = [];
	private processing = false;
	private lastProcessedId = 0;
	private hooks: CallQueueHooks;

	constructor(hooks: CallQueueHooks = {}) {
		this.hooks = hooks;
	}

	enqueue(llamado: TurneroLlamado, config: TurneroAudioConfig) {
		if (!llamado?.idLlamado || llamado.idLlamado <= this.lastProcessedId) return;
		if (this.queue.some((q) => q.llamado.idLlamado === llamado.idLlamado)) return;
		this.queue.push({ llamado, config });
		void this.drain();
	}

	/** Para vista previa en configuración. */
	async previewAudio(config: TurneroAudioConfig) {
		const mock: TurneroLlamado = {
			idLlamado: -1,
			idTurno: 0,
			paciente: 'Juan Pérez',
			consultorio: '3',
			profesional: 'Dra. García',
			sector: 'AMB',
			horaTurno: '10:30',
			llamadoEn: null,
		};
		await this.runSequence(mock, config);
	}

	private async drain() {
		if (this.processing) return;
		this.processing = true;
		while (this.queue.length > 0) {
			const item = this.queue.shift();
			if (!item) break;
			await this.runSequence(item.llamado, item.config);
			this.lastProcessedId = Math.max(this.lastProcessedId, item.llamado.idLlamado);
			const pause = item.config.pausaEntreLlamadosMs ?? 1500;
			if (pause > 0) await new Promise((r) => setTimeout(r, pause));
		}
		this.processing = false;
	}

	private async runSequence(llamado: TurneroLlamado, config: TurneroAudioConfig) {
		const hasAnnouncement = config.sonidoActivo || config.vozActiva;
		try {
			if (hasAnnouncement) this.hooks.onAnnouncementStart?.();
			if (config.sonidoActivo) {
				if (config.sonidoUrl?.trim()) {
					await playSoundUrl(config.sonidoUrl.trim());
				} else {
					await playChime();
				}
			}
			if (config.vozActiva) {
				const texto = buildVozTexto(config.vozTexto, llamado);
				await speakText(texto, config);
			}
		} finally {
			if (hasAnnouncement) this.hooks.onAnnouncementEnd?.();
		}
	}

	dispose() {
		this.queue = [];
		if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
	}
}
