'use client';

import { useEffect, useMemo, useState } from 'react';
import Loader from '@/app/components/Loader/Loader';
import { personalService } from '@/app/services/personalService';
import type {
	CatalogoItemTexto,
	PersonalSectorAsignado,
	PersonalServicioAsignado,
} from '@/app/types/personal';
import formStyles from './PersonalForm.module.css';
import styles from './PersonalActionModals.module.css';

type Props = {
	personalId: number;
	onSaved?: () => void | Promise<void>;
};

function toggle(set: Set<string>, id: string) {
	const next = new Set(set);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	return next;
}

export default function PersonalAsignacionesTab({ personalId, onSaved }: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

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
				const [secs, secCat, srvs, srvCat] = await Promise.all([
					personalService.getPersonalSectores(personalId),
					personalService.getSectoresCatalogo(),
					personalService.getPersonalServiciosPedidos(personalId),
					personalService.getServicios(),
				]);
				if (cancelled) return;
				setSecCatalogo(secCat);
				setCatServicios(srvCat);
				setSecSel(new Set(secs.map((s: PersonalSectorAsignado) => s.idSector)));
				setSrvSel(new Set(srvs.map((s: PersonalServicioAsignado) => s.idServicio)));
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar asignaciones');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [personalId]);

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
			(c) => c.valor.toLowerCase().includes(t) || (c.descripcion || '').toLowerCase().includes(t),
		);
	}, [catServicios, qSrv]);

	const guardar = async () => {
		setSaving(true);
		setError('');
		try {
			await personalService.replacePersonalAsignaciones(personalId, {
				sectores: Array.from(secSel),
				servicios: Array.from(srvSel),
			});
			await onSaved?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div style={{ position: 'relative', minHeight: 160 }}>
				<Loader />
			</div>
		);
	}

	return (
		<div className={formStyles.asignGrid}>
			{error ? <div className={formStyles.alertError} style={{ gridColumn: '1 / -1' }}>{error}</div> : null}

			<section className={formStyles.asignCol}>
				<h3 className={formStyles.subsectionTitle}>Sectores</h3>
				<p className={formStyles.usuarioHint}>Internación, login y camas. No define la bandeja de pedidos.</p>
				<div className={styles.addRow}>
					<input
						className={styles.select}
						placeholder="Buscar…"
						value={qSec}
						onChange={(e) => setQSec(e.target.value)}
					/>
					<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => setSecSel(new Set(secCatalogo.map((c) => c.IdSector)))}>
						Todos
					</button>
					<button type="button" className={styles.btnDanger} disabled={saving} onClick={() => setSecSel(new Set())}>
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
									onChange={() => setSecSel((prev) => toggle(prev, c.IdSector))}
								/>
								<span>{c.Descripcion || c.IdSector}</span>
							</label>
						))
					)}
				</div>
			</section>

			<section className={formStyles.asignCol}>
				<h3 className={formStyles.subsectionTitle}>Servicios de pedidos</h3>
				<p className={formStyles.usuarioHint}>Bandeja de estudios e interconsultas. Podés marcar varios y guardar.</p>
				<div className={styles.addRow}>
					<input
						className={styles.select}
						placeholder="Buscar…"
						value={qSrv}
						onChange={(e) => setQSrv(e.target.value)}
					/>
					<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => setSrvSel(new Set(catServicios.map((c) => c.valor)))}>
						Todos
					</button>
					<button type="button" className={styles.btnDanger} disabled={saving} onClick={() => setSrvSel(new Set())}>
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
									onChange={() => setSrvSel((prev) => toggle(prev, o.valor))}
								/>
								<span>{o.descripcion}</span>
							</label>
						))
					)}
				</div>
			</section>

			<div style={{ gridColumn: '1 / -1' }}>
				<button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void guardar()}>
					{saving ? 'Guardando…' : 'Guardar asignaciones'}
				</button>
			</div>
		</div>
	);
}
