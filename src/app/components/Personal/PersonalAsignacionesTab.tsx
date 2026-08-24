'use client';

import { useEffect, useMemo, useState } from 'react';
import { personalService } from '@/app/services/personalService';
import type {
	CatalogoItemTexto,
	PersonalSectorAsignado,
	PersonalServicioAsignado,
} from '@/app/types/personal';
import { etiquetaCatalogo } from '@/app/utils/etiquetaCatalogo';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId?: number;
	draft?: boolean;
	draftSectores?: string[];
	draftServicios?: string[];
	onDraftChange?: (next: { sectores: string[]; servicios: string[] }) => void;
	onSaved?: () => void | Promise<void>;
};

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

export default function PersonalAsignacionesTab({
	personalId,
	draft = false,
	draftSectores = [],
	draftServicios = [],
	onDraftChange,
	onSaved,
}: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editing, setEditing] = useState(draft);
	const [error, setError] = useState('');

	const [secAsignados, setSecAsignados] = useState<PersonalSectorAsignado[]>([]);
	const [srvAsignados, setSrvAsignados] = useState<PersonalServicioAsignado[]>([]);
	const [secCatalogo, setSecCatalogo] = useState<{ IdSector: string; Descripcion: string }[]>([]);
	const [catServicios, setCatServicios] = useState<CatalogoItemTexto[]>([]);
	const [secSel, setSecSel] = useState<Set<string>>(new Set());
	const [srvSel, setSrvSel] = useState<Set<string>>(new Set());
	const [qSec, setQSec] = useState('');
	const [qSrv, setQSrv] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError('');
			try {
				if (draft) {
					const settled = await Promise.allSettled([
						personalService.getSectoresCatalogo(),
						personalService.getServicios(),
					]);
					if (cancelled) return;
					const val = <T,>(i: number, fallback: T): T =>
						settled[i].status === 'fulfilled'
							? (settled[i] as PromiseFulfilledResult<T>).value
							: fallback;
					const secCat = val<{ IdSector: string; Descripcion: string }[]>(0, []).filter((c) =>
						idValido(c.IdSector),
					);
					const srvCat = val<CatalogoItemTexto[]>(1, []).filter((c) => idValido(c.valor));
					setSecCatalogo(secCat);
					setCatServicios(srvCat);
					setSecAsignados([]);
					setSrvAsignados([]);
					setSecSel(new Set(draftSectores.filter(idValido)));
					setSrvSel(new Set(draftServicios.filter(idValido)));
					setEditing(true);
					return;
				}
				if (!personalId) {
					setError('Personal inválido');
					return;
				}
				const settled = await Promise.allSettled([
					personalService.getPersonalSectores(personalId),
					personalService.getSectoresCatalogo(),
					personalService.getPersonalServiciosPedidos(personalId),
					personalService.getServicios(),
				]);
				if (cancelled) return;
				const val = <T,>(i: number, fallback: T): T =>
					settled[i].status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<T>).value : fallback;
				const secs = val<PersonalSectorAsignado[]>(0, []).filter((s) => idValido(s.idSector));
				const secCat = val<{ IdSector: string; Descripcion: string }[]>(1, []).filter((c) =>
					idValido(c.IdSector),
				);
				const srvs = val<PersonalServicioAsignado[]>(2, []).filter((s) => idValido(s.idServicio));
				const srvCat = val<CatalogoItemTexto[]>(3, []).filter((c) => idValido(c.valor));
				setSecAsignados(secs);
				setSrvAsignados(srvs);
				setSecCatalogo(secCat);
				setCatServicios(srvCat);
				setSecSel(new Set(secs.map((s) => s.idSector)));
				setSrvSel(new Set(srvs.map((s) => s.idServicio)));
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar asignaciones');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// draftSectores/Servicios solo inicializan el alta; no rehidratar en cada click.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [personalId, draft]);

	const secsFiltrados = useMemo(() => {
		const t = qSec.trim().toLowerCase();
		if (!t) return secCatalogo;
		return secCatalogo.filter(
			(c) =>
				c.IdSector.toLowerCase().includes(t) || (c.Descripcion || '').toLowerCase().includes(t),
		);
	}, [secCatalogo, qSec]);

	const srvsFiltrados = useMemo(() => {
		const t = qSrv.trim().toLowerCase();
		if (!t) return catServicios;
		return catServicios.filter(
			(c) =>
				(c.descripcion || '').toLowerCase().includes(t) || c.valor.toLowerCase().includes(t),
		);
	}, [catServicios, qSrv]);

	const labelSector = (id: string, desc?: string | null) =>
		etiquetaCatalogo(
			secCatalogo.map((c) => ({ valor: c.IdSector, descripcion: c.Descripcion })),
			id,
			desc,
		) || '—';

	const labelServicio = (id: string, desc?: string | null) =>
		etiquetaCatalogo(catServicios, id, desc) || '—';

	const abrirEdicion = () => {
		setSecSel(new Set(secAsignados.map((s) => s.idSector)));
		setSrvSel(new Set(srvAsignados.map((s) => s.idServicio)));
		setQSec('');
		setQSrv('');
		setEditing(true);
	};

	const cancelarEdicion = () => {
		setSecSel(new Set(secAsignados.map((s) => s.idSector)));
		setSrvSel(new Set(srvAsignados.map((s) => s.idServicio)));
		setEditing(false);
		setError('');
	};

	const emitDraft = (sec: Set<string>, srv: Set<string>) => {
		if (!draft) return;
		onDraftChange?.({ sectores: Array.from(sec), servicios: Array.from(srv) });
	};

	const setSecDraft = (next: Set<string>) => {
		setSecSel(next);
		emitDraft(next, srvSel);
	};

	const setSrvDraft = (next: Set<string>) => {
		setSrvSel(next);
		emitDraft(secSel, next);
	};

	const guardar = async () => {
		if (!personalId) return;
		setSaving(true);
		setError('');
		try {
			const data = await personalService.replacePersonalAsignaciones(personalId as number, {
				sectores: Array.from(secSel),
				servicios: Array.from(srvSel),
			});
			setSecAsignados(data.sectores || []);
			setSrvAsignados(data.servicios || []);
			setEditing(false);
			await onSaved?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			{loading ? <p className={formStyles.usuarioHint}>Cargando asignaciones…</p> : null}
			{error ? <div className={formStyles.alertError}>{error}</div> : null}

			{!editing && !draft ? (
				<div className={formStyles.asignColHead} style={{ marginBottom: '0.75rem' }}>
					<p className={formStyles.usuarioHint} style={{ margin: 0 }}>
						Sectores y servicios asignados a esta persona.
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

			<div className={formStyles.asignGrid}>
			<section className={formStyles.asignCol}>
				<div>
					<h3 className={formStyles.subsectionTitle}>Sectores</h3>
					<p className={formStyles.usuarioHint}>Internación, login y camas.</p>
				</div>
				{editing ? (
					<>
						<div className={styles.addRow}>
							<input
								className={styles.select}
								placeholder="Buscar…"
								value={qSec}
								onChange={(e) => setQSec(e.target.value)}
							/>
							<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => setSecDraft(new Set(secCatalogo.map((c) => c.IdSector)))}>
								Todos
							</button>
							<button type="button" className={styles.btnDanger} disabled={saving} onClick={() => setSecDraft(new Set())}>
								Ninguno
							</button>
						</div>
						<div className={styles.list}>
							{secsFiltrados.length === 0 ? (
								<span className={styles.muted}>Sin sectores en el catálogo.</span>
							) : (
								secsFiltrados.map((c) => (
									<label key={c.IdSector} className={styles.listItem}>
										<input
											type="checkbox"
											checked={secSel.has(c.IdSector)}
											disabled={saving}
											onChange={() => setSecDraft(toggle(secSel, c.IdSector))}
										/>
										<span>{labelSector(c.IdSector, c.Descripcion)}</span>
									</label>
								))
							)}
						</div>
					</>
				) : (
					<div className={styles.list}>
						{secAsignados.length === 0 ? (
							<span className={styles.muted}>Sin sectores asignados.</span>
						) : (
							secAsignados.map((s) => (
								<div key={s.idSector} className={styles.listItem}>
									<span>{labelSector(s.idSector, s.Descripcion || s.descripcion)}</span>
								</div>
							))
						)}
					</div>
				)}
			</section>

			<section className={formStyles.asignCol}>
				<div>
					<h3 className={formStyles.subsectionTitle}>Servicios de pedidos</h3>
					<p className={formStyles.usuarioHint}>Bandeja de estudios e interconsultas.</p>
				</div>
				{editing ? (
					<>
						<div className={styles.addRow}>
							<input
								className={styles.select}
								placeholder="Buscar…"
								value={qSrv}
								onChange={(e) => setQSrv(e.target.value)}
							/>
							<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => setSrvDraft(new Set(catServicios.map((c) => c.valor)))}>
								Todos
							</button>
							<button type="button" className={styles.btnDanger} disabled={saving} onClick={() => setSrvDraft(new Set())}>
								Ninguno
							</button>
						</div>
						<div className={styles.list}>
							{srvsFiltrados.length === 0 ? (
								<span className={styles.muted}>Sin servicios en el catálogo.</span>
							) : (
								srvsFiltrados.map((o) => (
									<label key={o.valor} className={styles.listItem}>
										<input
											type="checkbox"
											checked={srvSel.has(o.valor)}
											disabled={saving}
											onChange={() => setSrvDraft(toggle(srvSel, o.valor))}
										/>
										<span>{labelServicio(o.valor, o.descripcion)}</span>
									</label>
								))
							)}
						</div>
					</>
				) : (
					<div className={styles.list}>
						{srvAsignados.length === 0 ? (
							<span className={styles.muted}>Sin servicios asignados.</span>
						) : (
							srvAsignados.map((s) => (
								<div key={s.idServicio} className={styles.listItem}>
									<span>{labelServicio(s.idServicio, s.Descripcion || s.descripcion)}</span>
								</div>
							))
						)}
					</div>
				)}
			</section>
			</div>

			{editing && !draft ? (
				<div className={styles.actions}>
					<button type="button" className={styles.btn} disabled={saving} onClick={cancelarEdicion}>
						Cancelar
					</button>
					<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void guardar()}>
						{saving ? 'Guardando…' : 'Guardar asignaciones'}
					</button>
				</div>
			) : null}
		</div>
	);
}
