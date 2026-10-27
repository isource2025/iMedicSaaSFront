'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { previsualizarPDF } from '@/app/utils/pdfHeader';
import styles from './PdfPreviewOverlay.module.css';

type PdfPreviewApi = {
	/** Genera el PDF y lo muestra a pantalla completa (Escape para cerrar). */
	run: (generar: () => Promise<unknown>) => Promise<void>;
};

const PdfPreviewContext = createContext<PdfPreviewApi | null>(null);

export function usePdfPreviewOptional(): PdfPreviewApi | null {
	return useContext(PdfPreviewContext);
}

export function usePdfPreview(): PdfPreviewApi {
	const ctx = useContext(PdfPreviewContext);
	if (!ctx) throw new Error('usePdfPreview requiere PdfPreviewProvider');
	return ctx;
}

type State =
	| { open: false }
	| { open: true; busy: true; error: '' }
	| { open: true; busy: false; error: string; url: string | null };

export function PdfPreviewProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<State>({ open: false });

	const close = useCallback(() => {
		setState((prev) => {
			if (prev.open && 'url' in prev && prev.url) URL.revokeObjectURL(prev.url);
			return { open: false };
		});
	}, []);

	const run = useCallback(async (generar: () => Promise<unknown>) => {
		setState({ open: true, busy: true, error: '' });
		try {
			const result = await previsualizarPDF(generar);
			if (!result) {
				setState({ open: true, busy: false, error: 'No se pudo generar el PDF', url: null });
				return;
			}
			const url = URL.createObjectURL(result.blob);
			setState({ open: true, busy: false, error: '', url });
		} catch (e: unknown) {
			setState({
				open: true,
				busy: false,
				error: e instanceof Error ? e.message : 'No se pudo generar el PDF',
				url: null,
			});
		}
	}, []);

	useEffect(() => {
		if (!state.open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				close();
			}
		};
		document.addEventListener('keydown', onKey, true);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey, true);
			document.body.style.overflow = prevOverflow;
		};
	}, [state.open, close]);

	const api = useMemo(() => ({ run }), [run]);

	return (
		<PdfPreviewContext.Provider value={api}>
			{children}
			{state.open ? (
				<div className={styles.overlay} role="presentation">
					<div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Previsualización PDF">
						<button type="button" className={styles.closeBtn} onClick={close} aria-label="Cerrar">
							✕
						</button>
						{state.busy ? (
							<div className={styles.centerMsg}>Generando PDF…</div>
						) : state.error ? (
							<div className={styles.centerMsg}>
								<span className={styles.error}>{state.error}</span>
							</div>
						) : state.url ? (
							<iframe title="Previsualización del PDF" className={styles.previewFrame} src={state.url} />
						) : (
							<div className={styles.centerMsg}>Sin vista previa</div>
						)}
					</div>
				</div>
			) : null}
		</PdfPreviewContext.Provider>
	);
}
