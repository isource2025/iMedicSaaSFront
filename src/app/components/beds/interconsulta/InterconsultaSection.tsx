'use client';

import { useCallback, useEffect, useState } from 'react';
import { interconsultasService, InterconsultaRow } from '@/app/services/interconsultasService';
import { usePermiso } from '@/app/hooks/usePermiso';
import Loader from '../../Loader/Loader';
import styles from './InterconsultaSection.module.css';

type Props = {
	numeroVisita: number | null;
};

export default function InterconsultaSection({ numeroVisita }: Props) {
	const { puede } = usePermiso();
	const [rows, setRows] = useState<InterconsultaRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [especialidad, setEspecialidad] = useState('');
	const [motivo, setMotivo] = useState('');
	const [saving, setSaving] = useState(false);

	const canCreate = puede('INTERNACION.INTERCONSULTAS.CREAR');

	const load = useCallback(async () => {
		if (!numeroVisita) return;
		setLoading(true);
		setError(null);
		try {
			const data = await interconsultasService.listarPorVisita(numeroVisita);
			setRows(data);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al cargar');
		} finally {
			setLoading(false);
		}
	}, [numeroVisita]);

	useEffect(() => {
		load();
	}, [load]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!numeroVisita || !motivo.trim()) return;
		const now = new Date();
		const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
		setSaving(true);
		try {
			await interconsultasService.crear({
				IdVisita: numeroVisita,
				FechaSolicitud: fecha,
				HoraSolicitud: hora,
				Especialidad: especialidad.trim(),
				Motivo: motivo.trim(),
			});
			setMotivo('');
			setEspecialidad('');
			setShowForm(false);
			await load();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	if (!numeroVisita) {
		return <div className={styles.empty}>No hay visita seleccionada</div>;
	}

	return (
		<div className={styles.wrap}>
			<div className={styles.header}>
				<h2 className={styles.title}>Interconsultas</h2>
				{canCreate && (
					<button type="button" className={styles.primaryBtn} onClick={() => setShowForm((v) => !v)}>
						{showForm ? 'Cancelar' : 'Nueva solicitud'}
					</button>
				)}
			</div>

			{showForm && canCreate && (
				<form className={styles.form} onSubmit={handleSubmit}>
					<label>
						Especialidad solicitada
						<input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} placeholder="Ej. Cardiología" />
					</label>
					<label>
						Motivo / consulta
						<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} required />
					</label>
					<button type="submit" className={styles.primaryBtn} disabled={saving}>
						{saving ? 'Guardando…' : 'Registrar interconsulta'}
					</button>
				</form>
			)}

			{error && <div className={styles.error}>{error}</div>}
			{loading ? (
				<div style={{ position: 'relative', minHeight: 200 }}><Loader /></div>
			) : rows.length === 0 ? (
				<div className={styles.empty}>No hay interconsultas registradas para esta internación.</div>
			) : (
				<div className={styles.list}>
					{rows.map((r) => (
						<article key={r.IdInterconsulta} className={styles.card}>
							<div className={styles.cardHead}>
								<strong>{r.Especialidad || 'Sin especialidad'}</strong>
								<span className={styles.badge}>{r.Estado}</span>
							</div>
							<p className={styles.meta}>
								{r.FechaSolicitud} {r.HoraSolicitud || ''}
								{r.MedicoSolicitanteNombre ? ` · ${r.MedicoSolicitanteNombre}` : ''}
							</p>
							<p className={styles.motivo}>{r.Motivo}</p>
							{r.Respuesta && <p className={styles.respuesta}>Respuesta: {r.Respuesta}</p>}
						</article>
					))}
				</div>
			)}
		</div>
	);
}
