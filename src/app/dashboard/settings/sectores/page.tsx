'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sectoresService, type Sector } from '@/app/services/sectoresService';
import styles from '../catalog.module.css';

export default function SectoresSettingsPage() {
	const [rows, setRows] = useState<Sector[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [q, setQ] = useState('');
	const [valor, setValor] = useState('');
	const [descripcion, setDescripcion] = useState('');
	const [ambInt, setAmbInt] = useState('A');
	const [editing, setEditing] = useState<string | null>(null);
	const [editDesc, setEditDesc] = useState('');
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const data = await sectoresService.getSectores();
			setRows(data);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'No se pudieron cargar los sectores');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const filtered = useMemo(() => {
		const t = q.trim().toLowerCase();
		if (!t) return rows;
		return rows.filter(
			(r) =>
				String(r.IdSector || '')
					.toLowerCase()
					.includes(t) ||
				String(r.Descripcion || '')
					.toLowerCase()
					.includes(t),
		);
	}, [rows, q]);

	const onCreate = async () => {
		setBusy(true);
		setError('');
		try {
			await sectoresService.crearSector({ valor, descripcion, ambInt });
			setValor('');
			setDescripcion('');
			setAmbInt('A');
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al crear');
		} finally {
			setBusy(false);
		}
	};

	const onSaveEdit = async (id: string) => {
		setBusy(true);
		setError('');
		try {
			await sectoresService.actualizarSector(id, { descripcion: editDesc });
			setEditing(null);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al actualizar');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1>Sectores</h1>
					<p>Alta y edición de sectores del hospital (imSectores).</p>
				</div>
				<input
					className={styles.search}
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Buscar código o descripción…"
				/>
			</header>

			{error ? <p className={styles.error}>{error}</p> : null}

			<section className={styles.formCard}>
				<h2>Nuevo sector</h2>
				<div className={styles.formRow}>
					<input
						className={styles.input}
						value={valor}
						onChange={(e) => setValor(e.target.value)}
						placeholder="Código (ej. UTI)"
						maxLength={10}
					/>
					<input
						className={styles.input}
						value={descripcion}
						onChange={(e) => setDescripcion(e.target.value)}
						placeholder="Descripción"
					/>
					<select className={styles.input} value={ambInt} onChange={(e) => setAmbInt(e.target.value)}>
						<option value="A">Ambulatorio (A)</option>
						<option value="I">Internación (I)</option>
						<option value="T">Ambos (T)</option>
					</select>
					<button
						type="button"
						className={styles.btnPrimary}
						disabled={busy || !valor.trim() || !descripcion.trim()}
						onClick={() => void onCreate()}
					>
						Agregar
					</button>
				</div>
			</section>

			{loading ? (
				<p className={styles.muted}>Cargando…</p>
			) : (
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Código</th>
							<th>Descripción</th>
							<th>Amb/Int</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr key={r.IdSector}>
								<td>
									<code>{r.IdSector}</code>
								</td>
								<td>
									{editing === r.IdSector ? (
										<input
											className={styles.input}
											value={editDesc}
											onChange={(e) => setEditDesc(e.target.value)}
										/>
									) : (
										r.Descripcion
									)}
								</td>
								<td>{r.AmbInt || '—'}</td>
								<td className={styles.actions}>
									{editing === r.IdSector ? (
										<>
											<button
												type="button"
												className={styles.btnPrimary}
												disabled={busy}
												onClick={() => void onSaveEdit(r.IdSector)}
											>
												Guardar
											</button>
											<button
												type="button"
												className={styles.btnGhost}
												onClick={() => setEditing(null)}
											>
												Cancelar
											</button>
										</>
									) : (
										<button
											type="button"
											className={styles.btnGhost}
											onClick={() => {
												setEditing(r.IdSector);
												setEditDesc(r.Descripcion || '');
											}}
										>
											Editar
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
