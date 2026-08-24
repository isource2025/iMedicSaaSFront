'use client';

import { useEffect, useMemo, useState } from 'react';
import { personalService } from '@/app/services/personalService';
import type { PersonalSectorAsignado } from '@/app/types/personal';
import { etiquetaCatalogo } from '@/app/utils/etiquetaCatalogo';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type SectorCatalogo = {
	IdSector: string;
	Descripcion: string;
	ValorServicio?: string;
	DescripcionServicio?: string;
};

type Props = {
	personalId?: number;
	draft?: boolean;
	draftSectores?: string[];
	onDraftChange?: (next: { sectores: string[] }) => void;
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
	onDraftChange,
	onSaved,
}: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editing, setEditing] = useState(draft);
	const [error, setError] = useState('');

	const [secAsignados, setSecAsignados] = useState<PersonalSectorAsignado[]>([]);
	const [secCatalogo, setSecCatalogo] = useState<SectorCatalogo[]>([]);
	const [secSel, setSecSel] = useState<Set<string>>(new Set());
	const [qSec, setQSec] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError('');
			try {
				const secCat = (await personalService.getSectoresCatalogo()).filter((c) =>
					idValido(c.IdSector),
				);
				if (cancelled) return;
				setSecCatalogo(secCat);

				if (draft) {
					setSecAsignados([]);
					setSecSel(new Set(draftSectores.filter(idValido)));
					setEditing(true);
					return;
				}
				if (!personalId) {
					setError('Personal inválido');
					return;
				}
				const secs = (await personalService.getPersonalSectores(personalId)).filter((s) =>
					idValido(s.idSector),
				);
				if (cancelled) return;
				setSecAsignados(secs);
				setSecSel(new Set(secs.map((s) => s.idSector)));
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar sectores');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [personalId, draft]);

	const secsFiltrados = useMemo(() => {
		const t = qSec.trim().toLowerCase();
		if (!t) return secCatalogo;
		return secCatalogo.filter((c) => {
			const blob = `${c.IdSector} ${c.Descripcion || ''} ${c.ValorServicio || ''} ${c.DescripcionServicio || ''}`.toLowerCase();
			return blob.includes(t);
		});
	}, [secCatalogo, qSec]);

	const labelSector = (id: string, desc?: string | null, extra?: SectorCatalogo | PersonalSectorAsignado) => {
		const nombre = etiquetaCatalogo(
			secCatalogo.map((c) => ({ valor: c.IdSector, descripcion: c.Descripcion })),
			id,
			desc,
		) || id;
		const cat = secCatalogo.find((c) => c.IdSector === id);
		const svc =
			cat?.DescripcionServicio ||
			cat?.ValorServicio ||
			(extra as SectorCatalogo | undefined)?.DescripcionServicio ||
			(extra as SectorCatalogo | undefined)?.ValorServicio ||
			'';
		return svc && String(svc).trim().toUpperCase() !== String(nombre).trim().toUpperCase()
			? `${nombre} · ${svc}`
			: nombre;
	};

	const abrirEdicion = () => {
		setSecSel(new Set(secAsignados.map((s) => s.idSector)));
		setQSec('');
		setEditing(true);
	};

	const cancelarEdicion = () => {
		setSecSel(new Set(secAsignados.map((s) => s.idSector)));
		setEditing(false);
		setError('');
	};

	const setSecDraft = (next: Set<string>) => {
		setSecSel(next);
		if (draft) onDraftChange?.({ sectores: Array.from(next) });
	};

	const guardar = async () => {
		if (!personalId) return;
		setSaving(true);
		setError('');
		try {
			const data = await personalService.replacePersonalAsignaciones(personalId as number, {
				sectores: Array.from(secSel),
			});
			setSecAsignados(data.sectores || []);
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
			{loading ? <p className={formStyles.usuarioHint}>Cargando sectores…</p> : null}
			{error ? <div className={formStyles.alertError}>{error}</div> : null}

			{!editing && !draft ? (
				<div className={formStyles.asignColHead} style={{ marginBottom: '0.75rem' }}>
					<p className={formStyles.usuarioHint} style={{ margin: 0 }}>
						Sectores de internación, login, camas y bandeja. El servicio sale de cada sector.
					</p>
					<button type="button" className={styles.btnPrimary} onClick={abrirEdicion}>
						Editar / asignar
					</button>
				</div>
			) : null}
			{draft ? (
				<p className={formStyles.usuarioHint}>
					Opcional. Si no elige ninguno, el personal se crea igual. Se guardan al confirmar el alta.
					El servicio de cada sector queda anexado (ValorServicio).
				</p>
			) : null}

			<section className={formStyles.asignCol}>
				<div>
					<h3 className={formStyles.subsectionTitle}>Sectores</h3>
					<p className={formStyles.usuarioHint}>
						Login, internación y bandeja de pedidos. El servicio va con el sector.
					</p>
				</div>
				{editing ? (
					<>
						<div className={styles.addRow}>
							<input
								className={styles.select}
								placeholder="Buscar sector o servicio…"
								value={qSec}
								onChange={(e) => setQSec(e.target.value)}
							/>
							<button
								type="button"
								className={styles.btnPrimary}
								disabled={saving}
								onClick={() => setSecDraft(new Set(secCatalogo.map((c) => c.IdSector)))}
							>
								Todos
							</button>
							<button
								type="button"
								className={styles.btnDanger}
								disabled={saving}
								onClick={() => setSecDraft(new Set())}
							>
								Ninguno
							</button>
						</div>
						<div className={styles.list}>
							{secsFiltrados.length === 0 ? (
								<span className={styles.muted}>
									{secCatalogo.length === 0
										? 'Sin sectores en el catálogo.'
										: 'Ningún sector coincide.'}
								</span>
							) : (
								secsFiltrados.map((c) => (
									<label key={c.IdSector} className={styles.listItem}>
										<input
											type="checkbox"
											checked={secSel.has(c.IdSector)}
											disabled={saving}
											onChange={() => setSecDraft(toggle(secSel, c.IdSector))}
										/>
										<span>{labelSector(c.IdSector, c.Descripcion, c)}</span>
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
									<span>{labelSector(s.idSector, s.Descripcion || s.descripcion, s)}</span>
								</div>
							))
						)}
					</div>
				)}
			</section>

			{editing && !draft ? (
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
						{saving ? 'Guardando…' : 'Guardar sectores'}
					</button>
				</div>
			) : null}
		</div>
	);
}
