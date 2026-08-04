'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './ToastProvider.module.css';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ToastInput = {
	message: string;
	title?: string;
	variant?: ToastVariant;
	/** ms; default 4000 */
	duration?: number;
	actionLabel?: string;
	onAction?: () => void;
};

type ToastItem = ToastInput & {
	id: number;
	variant: ToastVariant;
};

type ToastApi = {
	toast: (message: string | ToastInput, opts?: Omit<ToastInput, 'message'>) => number;
	success: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => number;
	info: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => number;
	warning: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => number;
	error: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => number;
	dismiss: (id?: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let idSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ToastItem[]>([]);
	const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => {
			timers.current.forEach((t) => clearTimeout(t));
			timers.current.clear();
		};
	}, []);

	const dismiss = useCallback((id?: number) => {
		if (id == null) {
			timers.current.forEach((t) => clearTimeout(t));
			timers.current.clear();
			setItems([]);
			return;
		}
		const t = timers.current.get(id);
		if (t) {
			clearTimeout(t);
			timers.current.delete(id);
		}
		setItems((prev) => prev.filter((x) => x.id !== id));
	}, []);

	const push = useCallback(
		(input: ToastInput) => {
			const id = idSeq++;
			const item: ToastItem = {
				id,
				message: input.message,
				title: input.title,
				variant: input.variant || 'info',
				duration: input.duration ?? 4000,
				actionLabel: input.actionLabel,
				onAction: input.onAction,
			};
			setItems((prev) => [...prev.slice(-4), item]);
			const ms = item.duration;
			if (ms && ms > 0) {
				const t = setTimeout(() => dismiss(id), ms);
				timers.current.set(id, t);
			}
			return id;
		},
		[dismiss],
	);

	const toast = useCallback(
		(message: string | ToastInput, opts?: Omit<ToastInput, 'message'>) => {
			if (typeof message === 'string') {
				return push({ message, ...opts });
			}
			return push(message);
		},
		[push],
	);

	const api = useMemo<ToastApi>(
		() => ({
			toast,
			success: (message, opts) => push({ message, variant: 'success', ...opts }),
			info: (message, opts) => push({ message, variant: 'info', ...opts }),
			warning: (message, opts) => push({ message, variant: 'warning', ...opts }),
			error: (message, opts) => push({ message, variant: 'error', ...opts }),
			dismiss,
		}),
		[toast, push, dismiss],
	);

	const host =
		mounted && typeof document !== 'undefined'
			? createPortal(
					<div className={styles.host} aria-live="polite" aria-relevant="additions">
						{items.map((item) => (
							<div
								key={item.id}
								className={`${styles.toast} ${styles[item.variant]}`}
								role="status"
							>
								<span className={styles.dot} aria-hidden />
								<div className={styles.body}>
									{item.title ? <strong className={styles.title}>{item.title}</strong> : null}
									<span className={styles.message}>{item.message}</span>
								</div>
								{item.actionLabel && item.onAction ? (
									<button
										type="button"
										className={styles.action}
										onClick={() => {
											item.onAction?.();
											dismiss(item.id);
										}}
									>
										{item.actionLabel}
									</button>
								) : null}
								<button
									type="button"
									className={styles.close}
									aria-label="Cerrar"
									onClick={() => dismiss(item.id)}
								>
									×
								</button>
							</div>
						))}
					</div>,
					document.body,
				)
			: null;

	return (
		<ToastContext.Provider value={api}>
			{children}
			{host}
		</ToastContext.Provider>
	);
}

export function useToast(): ToastApi {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		// Fallback safe no-op outside provider (SSR / tests)
		const noop = () => 0;
		return {
			toast: noop,
			success: noop,
			info: noop,
			warning: noop,
			error: noop,
			dismiss: () => undefined,
		};
	}
	return ctx;
}
