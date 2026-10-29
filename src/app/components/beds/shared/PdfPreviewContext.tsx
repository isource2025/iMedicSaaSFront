'use client';

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import PdfPreviewDialog from '@/app/components/pdf/PdfPreviewDialog';
import { previsualizarPDF } from '@/app/utils/pdfHeader';

type PdfPreviewApi = {
	/** Genera el PDF y lo muestra en un modal (Escape para cerrar). */
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
	| { open: true; busy: true; error: ''; url: null; fileName: string }
	| { open: true; busy: false; error: string; url: string | null; fileName: string };

function revokeUrl(s: State) {
	if (s.open && s.url) URL.revokeObjectURL(s.url);
}

export function PdfPreviewProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<State>({ open: false });

	const close = useCallback(() => {
		setState((prev) => {
			revokeUrl(prev);
			return { open: false };
		});
	}, []);

	const run = useCallback(async (generar: () => Promise<unknown>) => {
		setState((prev) => {
			revokeUrl(prev);
			return { open: true, busy: true, error: '', url: null, fileName: '' };
		});
		try {
			const result = await previsualizarPDF(generar);
			if (!result) {
				setState({ open: true, busy: false, error: 'No se pudo generar el PDF', url: null, fileName: '' });
				return;
			}
			const url = URL.createObjectURL(result.blob);
			setState({ open: true, busy: false, error: '', url, fileName: result.fileName });
		} catch (e: unknown) {
			setState({
				open: true,
				busy: false,
				error: e instanceof Error ? e.message : 'No se pudo generar el PDF',
				url: null,
				fileName: '',
			});
		}
	}, []);

	const api = useMemo(() => ({ run }), [run]);

	return (
		<PdfPreviewContext.Provider value={api}>
			{children}
			<PdfPreviewDialog
				open={state.open}
				onClose={close}
				busy={state.open && state.busy}
				error={state.open ? state.error : ''}
				url={state.open ? state.url : null}
				fileName={state.open ? state.fileName : 'documento.pdf'}
			/>
		</PdfPreviewContext.Provider>
	);
}
