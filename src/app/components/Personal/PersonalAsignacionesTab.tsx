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
	const [secCatalogo, setSecCatalogo] = useState<SectorCatalogo[]>([]);
	const [secSel, setSecSel] = useState<Set<string>>(new Set());
	const [qSec, setQSec] = useState('');

	const [srvAsignados, setSrvAsignados] = useState<PersonalServicioAsignado[]>([]);
	const [srvCatalogo, setSrvCatalogo] = useState<CatalogoItemTexto[]>([]);
	const [srvSel, setSrvSel] = useState<Set<string>>(new Set());
	const [qSrv, setQSrv] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError('');
			try {
				const [secRes, srvRes] = await Promise.allSettled([
					personalService.getSectoresCatalogo(),
					personalService.getServiciosNube(),
				]);
				if (cancelled) return;
				const secCat =
					secRes.status === 'fulfilled' ? secRes.value.filter((c) => idValido(c.IdSector)) : [];
				const srvCat =
					srvRes.status === 'fulfilled' ? srvRes.value.filter((c) => idValido(c.valor)) : [];
				setSecCatalogo(secCat);
				setSrvCatalogo(srvCat);
				const faltan = [
					!secCat.length ? 'sectores' : null,
					!srvCat.length ? 'servicios' : null,
				].filter(Boolean);
				if (faltan.length) {
					setError(
						`No hay ${faltan.join(' ni ')} en la nube para esta empresa. Cargalos desde Super Admin (migración del servidor físico a la nube).`,
					);
				}

				if (draft) {
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
				const [secs, srvs] = await Promise.all([
					personalService.getPersonalSectores(personalId),
					personalService.getPersonalServiciosPedidos(personalId),
				]);
				if (cancelled) return;
				const secsOk = secs.filter((s) => idValido(s.idSector));
				const srvsOk = srvs.filter((s) => idValido(s.idServicio));
				setSecAsignados(secsOk);
				setSrvAsignados(srvsOk);
				setSecSel(new Set(secsOk.map((s) => s.idSector)));
				setSrvSel(new Set(srvsOk.map((s) => s.idServicio)));
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar asignaciones');
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

	const srvsFiltrados = useMemo(() => {
		const t = qSrv.trim().toLowerCase();
		if (!t) return srvCatalogo;
		return srvCatalogo.filter((c) => `${c.valor} ${c.descripcion || ''}`.toLowerCase().includes(t));
	}, [srvCatalogo, qSrv]);

	const nombreSector = (id: string, desc?: string | null) =>
		etiquetaCatalogo(
			secCatalogo.map((c) => ({ valor: c.IdSector, descripcion: c.Descripcion })),
			id,
			desc,
		) || id;

	const nombreServicio = (id: string, desc?: string | null) =>
		etiquetaCatalogo(srvCatalogo, id, desc) || id;

	const servicioAnexado = (
		id: string,
		extra?: SectorCatalogo | PersonalSectorAsignado,
	): { text: string; title: string } | null => {
		const cat = secCatalogo.find((c) => c.IdSector === id);
		const code = String(cat?.ValorServicio || extra?.ValorServicio || '').trim();
		const desc = String(cat?.DescripcionServicio || extra?.DescripcionServicio || '').trim();
		if (!code && !desc) return null;
		const title = [desc, code].filter(Boolean).join(' · ');
		return { text: code || desc, title: title || code || desc };
	};

	const fila = (
		id: string,
		name: string,
		pill: { text: string; title: string } | null,
		opts?: { checkbox?: boolean; checked?: boolean; disabled?: boolean; onToggle?: () => void },
	) => {
		const inner = (
			<>
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
				{pill ? (
					<span className={styles.svcPill} title={pill.title}>
						{pill.text}
					</span>
				) : null}
			</>
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

	const setSecDraft = (next: Set<string>) => {
		setSecSel(next);
		if (draft) onDraftChange?.({ sectores: Array.from(next), servicios: Array.from(srvSel) });
	};

	const setSrvDraft = (next: Set<string>) => {
		setSrvSel(next);
		if (draft) onDraftChange?.({ sectores: Array.from(secSel), servicios: Array.from(next) });
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

	const buscadorConAcciones = (
		value: string,
		onChange: (v: string) => void,
		placeholder: string,
		onTodos: () => void,
		onNinguno: () => void,
	) => (
		<div className={styles.addRow}>
			<input
				className={styles.select}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
			<button type="button" className={styles.btnPrimary} disabled={saving} onClick={onTodos}>
				Todos
			</button>
			<button type="button" className={styles.btnDanger} disabled={saving} onClick={onNinguno}>
				Ninguno
			</button>
		</div>
	);

	return (
		<div>
			{loading ? <p className={formStyles.usuarioHint}>Cargando sectores y servicios…</p> : null}
			{error ? <div className={formStyles.alertError}>{error}</div> : null}

			{!editing && !draft ? (
				<div className={formStyles.asignColHead} style={{ marginBottom: '0.75rem' }}>
					<p className={formStyles.usuarioHint} style={{ margin: 0 }}>
						Sectores de internación, login y camas. Servicios destino de la bandeja de pedidos.
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
						<p className={formStyles.usuarioHint}>Login, internación y camas.</p>
					</div>
					{editing ? (
						<>
							{buscadorConAcciones(
								qSec,
								setQSec,
								'Buscar sector o servicio…',
								() => setSecDraft(new Set(secCatalogo.map((c) => c.IdSector))),
								() => setSecDraft(new Set()),
							)}
							<div className={styles.list}>
								{secsFiltrados.length === 0 ? (
									<span className={styles.muted}>
										{secCatalogo.length === 0
											? 'Sin sectores en el catálogo.'
											: 'Ningún sector coincide.'}
									</span>
								) : (
									secsFiltrados.map((c) =>
										fila(c.IdSector, nombreSector(c.IdSector, c.Descripcion), servicioAnexado(c.IdSector, c), {
											checkbox: true,
											checked: secSel.has(c.IdSector),
											disabled: saving,
											onToggle: () => setSecDraft(toggle(secSel, c.IdSector)),
										}),
									)
								)}
							</div>
						</>
					) : (
						<div className={styles.list}>
							{secAsignados.length === 0 ? (
								<span className={styles.muted}>Sin sectores asignados.</span>
							) : (
								secAsignados.map((s) =>
									fila(
										s.idSector,
										nombreSector(s.idSector, s.Descripcion || s.descripcion),
										servicioAnexado(s.idSector, s),
									),
								)
							)}
						</div>
					)}
				</section>

				<section className={formStyles.asignCol}>
					<div>
						<h3 className={formStyles.subsectionTitle}>Servicios</h3>
						<p className={formStyles.usuarioHint}>Destinos de estudios e interconsultas (bandeja de pedidos).</p>
					</div>
					{editing ? (
						<>
							{buscadorConAcciones(
								qSrv,
								setQSrv,
								'Buscar servicio…',
								() => setSrvDraft(new Set(srvCatalogo.map((c) => c.valor))),
								() => setSrvDraft(new Set()),
							)}
							<div className={styles.list}>
								{srvsFiltrados.length === 0 ? (
									<span className={styles.muted}>
										{srvCatalogo.length === 0
											? 'Sin servicios en el catálogo.'
											: 'Ningún servicio coincide.'}
									</span>
								) : (
									srvsFiltrados.map((c) =>
										fila(c.valor, nombreServicio(c.valor, c.descripcion), null, {
											checkbox: true,
											checked: srvSel.has(c.valor),
											disabled: saving,
											onToggle: () => setSrvDraft(toggle(srvSel, c.valor)),
										}),
									)
								)}
							</div>
						</>
					) : (
						<div className={styles.list}>
							{srvAsignados.length === 0 ? (
								<span className={styles.muted}>Sin servicios asignados.</span>
							) : (
								srvAsignados.map((s) =>
									fila(
										s.idServicio,
										nombreServicio(s.idServicio, s.Descripcion || s.descripcion),
										null,
									),
								)
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
					<button
						type="button"
						className={styles.btnPrimary}
						disabled={saving}
						onClick={() => void guardar()}
					>
						{saving ? 'Guardando…' : 'Guardar asignaciones'}
					</button>
				</div>
			) : null}
		</div>
	);
}
