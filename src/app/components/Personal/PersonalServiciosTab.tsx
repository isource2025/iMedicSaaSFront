'use client';

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import { personalService } from '@/app/services/personalService';
import type { CatalogoItemTexto, PersonalServicioAsignado } from '@/app/types/personal';
import { etiquetaCatalogo } from '@/app/utils/etiquetaCatalogo';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId?: number;
	draft?: boolean;
	draftServicios?: string[];
	onDraftChange?: (next: { servicios: string[] }) => void;
	hideActions?: boolean;
	onDirtyChange?: (dirty: boolean) => void;
	onSaved?: () => void | Promise<void>;
};

export type PersonalServiciosTabHandle = {
	guardar: () => Promise<boolean>;
	isDirty: () => boolean;
};

function sortedKey(ids: Iterable<string>) {
	return Array.from(ids).map(String).sort().join('|');
}

function idValido(id: string | undefined | null) {
	const v = String(id ?? '').trim();
	return v.length > 0 && v !== '0';
}

function toggle(set: Set<string>, id: string) {
	const next = new Set(set);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	return next;
}

const PersonalServiciosTab = forwardRef<PersonalServiciosTabHandle, Props>(
	function PersonalServiciosTab(
		{
			personalId,
			draft = false,
			draftServicios = [],
			onDraftChange,
			hideActions = false,
			onDirtyChange,
			onSaved,
		},
		ref,
	) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editing, setEditing] = useState(draft || hideActions);
	const [error, setError] = useState('');
	const baselineRef = useRef('');

	const [asignados, setAsignados] = useState<PersonalServicioAsignado[]>([]);
	const [catalogo, setCatalogo] = useState<CatalogoItemTexto[]>([]);
	const [sel, setSel] = useState<Set<string>>(new Set());
	const [q, setQ] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError('');
			try {
				const cat = (await personalService.getServicios()).filter((c) => idValido(c.valor));
				if (cancelled) return;
				setCatalogo(cat);
				if (!cat.length) {
					setError(
						'No hay servicios en el catálogo. Revisá Tablas maestras (Internación → Tablas → Servicios).',
					);
				}

				if (draft) {
					setAsignados([]);
					const ids = draftServicios.filter(idValido);
					setSel(new Set(ids));
					baselineRef.current = sortedKey(ids);
					setEditing(true);
					onDirtyChange?.(false);
					return;
				}
				if (!personalId) {
					setError('Personal inválido');
					return;
				}
				const list = (await personalService.getPersonalServiciosPedidos(personalId)).filter((s) =>
					idValido(s.idServicio),
				);
				if (cancelled) return;
				setAsignados(list);
				const ids = list.map((s) => s.idServicio);
				setSel(new Set(ids));
				baselineRef.current = sortedKey(ids);
				if (hideActions) setEditing(true);
				onDirtyChange?.(false);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar servicios');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [personalId, draft, hideActions]);

	const filtrados = useMemo(() => {
		const t = q.trim().toLowerCase();
		if (!t) return catalogo;
		return catalogo.filter((c) => {
			const blob = `${c.valor} ${c.descripcion || ''}`.toLowerCase();
			return blob.includes(t);
		});
	}, [catalogo, q]);

	const nombreServicio = (id: string, desc?: string | null) =>
		etiquetaCatalogo(catalogo, id, desc) || id;

	const fila = (
		id: string,
		desc?: string | null,
		opts?: { checkbox?: boolean; checked?: boolean; disabled?: boolean; onToggle?: () => void },
	) => {
		const name = nombreServicio(id, desc);
		const inner = (
			<span className={styles.listItemLeft}>
				{opts?.checkbox ? (
					<input
						type="checkbox"
						checked={Boolean(opts.checked)}
						disabled={opts.disabled}
						onChange={() => opts.onToggle?.()}
					/>
				) : null}
				<span className={styles.listItemName}>{name}</span>
			</span>
		);
		if (opts?.checkbox) {
			return (
				<label key={id} className={styles.listItem}>
					{inner}
				</label>
			);
		}
		return (
			<div key={id} className={styles.listItem}>
				{inner}
			</div>
		);
	};

	const abrirEdicion = () => {
		setSel(new Set(asignados.map((s) => s.idServicio)));
		setQ('');
		setEditing(true);
	};

	const isDirty = () => Boolean(baselineRef.current) && sortedKey(sel) !== baselineRef.current;

	useEffect(() => {
		if (loading) return;
		onDirtyChange?.(isDirty());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sel, loading]);

	const cancelarEdicion = () => {
		setSel(new Set(asignados.map((s) => s.idServicio)));
		if (!hideActions) setEditing(false);
		setError('');
		onDirtyChange?.(false);
	};

	const setDraft = (next: Set<string>) => {
		setSel(next);
		if (draft) onDraftChange?.({ servicios: Array.from(next) });
	};

	const guardar = async (): Promise<boolean> => {
		if (!personalId) return false;
		setSaving(true);
		setError('');
		try {
			const data = await personalService.replacePersonalAsignaciones(personalId as number, {
				servicios: Array.from(sel),
			});
			const list = (data.servicios || []).filter((s) => idValido(s.idServicio));
			setAsignados(list);
			const ids = list.map((s) => s.idServicio);
			setSel(new Set(ids));
			baselineRef.current = sortedKey(ids);
			if (!hideActions) setEditing(false);
			onDirtyChange?.(false);
			await onSaved?.();
			return true;
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
			return false;
		} finally {
			setSaving(false);
		}
	};

	useImperativeHandle(ref, () => ({
		guardar,
		isDirty,
	}));

	return (
		<div>
			{loading ? <p className={formStyles.usuarioHint}>Cargando servicios…</p> : null}
			{error ? <div className={formStyles.alertError}>{error}</div> : null}

			{!editing && !draft && !hideActions ? (
				<div className={formStyles.asignColHead} style={{ marginBottom: '0.75rem' }}>
					<p className={formStyles.usuarioHint} style={{ margin: 0 }}>
						Servicios destino de la bandeja de pedidos (estudios e interconsultas).
					</p>
					<button type="button" className={styles.btnPrimary} onClick={abrirEdicion}>
						Editar / asignar
					</button>
				</div>
			) : null}
			{draft ? (
				<p className={formStyles.usuarioHint}>
					Opcional. Si no elige ninguno, el personal se crea igual. Se guardan al confirmar el alta.
				</p>
			) : null}

			<section className={formStyles.asignCol}>
				<div>
					<h3 className={formStyles.subsectionTitle}>Servicios</h3>
					<p className={formStyles.usuarioHint}>
						Define a qué servicios atiende este personal en la bandeja de pedidos.
					</p>
				</div>
				{editing ? (
					<>
						<div className={styles.addRow}>
							<input
								className={styles.select}
								placeholder="Buscar servicio…"
								value={q}
								onChange={(e) => setQ(e.target.value)}
							/>
							<button
								type="button"
								className={styles.btnPrimary}
								disabled={saving}
								onClick={() => setDraft(new Set(catalogo.map((c) => c.valor)))}
							>
								Todos
							</button>
							<button
								type="button"
								className={styles.btnDanger}
								disabled={saving}
								onClick={() => setDraft(new Set())}
							>
								Ninguno
							</button>
						</div>
						<div className={styles.list}>
							{filtrados.length === 0 ? (
								<span className={styles.muted}>
									{catalogo.length === 0
										? 'Sin servicios en el catálogo.'
										: 'Ningún servicio coincide.'}
								</span>
							) : (
								filtrados.map((c) =>
									fila(c.valor, c.descripcion, {
										checkbox: true,
										checked: sel.has(c.valor),
										disabled: saving,
										onToggle: () => setDraft(toggle(sel, c.valor)),
									}),
								)
							)}
						</div>
					</>
				) : (
					<div className={styles.list}>
						{asignados.length === 0 ? (
							<span className={styles.muted}>Sin servicios asignados.</span>
						) : (
							asignados.map((s) => fila(s.idServicio, s.Descripcion || s.descripcion))
						)}
					</div>
				)}
			</section>

			{hideActions && !draft ? (
				<p className={formStyles.usuarioHint}>
					Servicios destino de la bandeja de pedidos (estudios e interconsultas).
				</p>
			) : null}

			{editing && !draft && !hideActions ? (
				<div className={styles.actions}>
					<button type="button" className={styles.btn} disabled={saving} onClick={cancelarEdicion}>
						Cancelar
					</button>
					<button
						type="button"
						className={styles.btnPrimary}
						disabled={saving}
						onClick={() => void guardar()}
					>
						{saving ? 'Guardando…' : 'Guardar servicios'}
					</button>
				</div>
			) : null}
		</div>
	);
});

PersonalServiciosTab.displayName = 'PersonalServiciosTab';

export default PersonalServiciosTab;
