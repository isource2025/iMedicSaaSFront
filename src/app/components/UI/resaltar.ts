/**
 * Resalta un elemento en pantalla (scroll + pulse).
 * Utilitario de UI — no depende del Asistente/Soporte.
 * Marcá el target con data-resaltar="id" y llamá resaltarCampo(id).
 */

export type ResaltarOpts = {
	/** Contorno; default pantone 314c del sistema */
	color?: string;
	/** Color del pulso (rgba); default acorde a pantone */
	glow?: string;
	iterations?: number;
	outlineMs?: number;
};

const DEFAULTS: Required<ResaltarOpts> = {
	color: '#0083a9',
	glow: 'rgba(0, 131, 169, 0.85)',
	iterations: 4,
	outlineMs: 4000,
};

/** Aplica scroll + outline + animación de pulso a un nodo concreto. */
export function resaltarElemento(el: HTMLElement, opts: ResaltarOpts = {}): void {
	const { color, glow, iterations, outlineMs } = { ...DEFAULTS, ...opts };
	el.scrollIntoView({ block: 'center', behavior: 'smooth' });
	try {
		el.animate(
			[
				{ boxShadow: `0 0 0 0 ${glow}` },
				{ boxShadow: `0 0 0 8px rgba(0, 0, 0, 0)` },
			],
			{ duration: 900, iterations },
		);
	} catch {
		/* Web Animations no disponible */
	}
	const previoOutline = el.style.outline;
	const previoOffset = el.style.outlineOffset;
	el.style.outline = `2px solid ${color}`;
	el.style.outlineOffset = '2px';
	window.setTimeout(() => {
		el.style.outline = previoOutline;
		el.style.outlineOffset = previoOffset;
	}, outlineMs);
	if (typeof el.focus === 'function') {
		try {
			el.focus({ preventScroll: true });
		} catch {
			/* no focuseable */
		}
	}
}

/**
 * Busca `[data-resaltar="id"]` y lo resalta.
 * @returns true si encontró el nodo
 */
export function resaltarCampo(id: string, opts?: ResaltarOpts): boolean {
	if (typeof document === 'undefined' || !id) return false;
	const safe =
		typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/"/g, '');
	const el = document.querySelector<HTMLElement>(`[data-resaltar="${safe}"]`);
	if (!el) return false;
	resaltarElemento(el, opts);
	return true;
}

/** Igual que resaltarCampo, con reintentos cortos (útil tras cambiar de pestaña / abrir modal). */
export function resaltarCampoLuego(id: string, opts?: ResaltarOpts): void {
	if (typeof window === 'undefined') return;
	const intentar = (quedan: number) => {
		if (resaltarCampo(id, opts) || quedan <= 0) return;
		window.setTimeout(() => intentar(quedan - 1), 60);
	};
	window.requestAnimationFrame(() => intentar(8));
}
