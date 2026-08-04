'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Save, Pencil } from 'lucide-react';
import { almacenService } from '@/app/services/almacenService';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import type {
	AlmacenConfigCompleta,
	AlmacenDeposito,
	AlmacenRubro,
} from '@/app/types/almacen';
import styles from '@/app/dashboard/almacen/almacen.module.css';

type Props = {
	canEdit: boolean;
	onError: (msg: string | null) => void;
};

export default function AlmacenConfigPanel({ canEdit, onError }: Props) {
	const [cfg, setCfg] = useState<AlmacenConfigCompleta | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [sectorAdd, setSectorAdd] = useState('');
	const [sectorDep, setSectorDep] = useState('');
	const [rubroForm, setRubroForm] = useState({ idRubro: 0, codigo: '', nombre: '', activo: true });
	const [depForm, setDepForm] = useState({
		idDeposito: 0,
		codigo: '',
		nombre: '',
		esPrincipal: false,
		activo: true,
	});

	const load = useCallback(async () => {
		setLoading(true);
		onError(null);
		try {
			const data = await almacenService.getConfig();
			setCfg(data);
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al cargar configuración');
		} finally {
			setLoading(false);
		}
	}, [onError]);

	useEffect(() => {
		void load();
	}, [load]);

	const disponibles = (cfg?.sectoresHospital || []).filter(
		(h) => !(cfg?.sectoresConfig || []).some((c) => String(c.IdSector) === String(h.IdSector)),
	);

	const addSector = async () => {
		if (!sectorAdd || !canEdit) return;
		setSaving(true);
		onError(null);
		try {
			await almacenService.guardarConfigSector({
				idSector: sectorAdd,
				idDeposito: sectorDep ? Number(sectorDep) : null,
				puedeSolicitar: true,
				activo: true,
			});
			setSectorAdd('');
			setSectorDep('');
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al agregar sector');
		} finally {
			setSaving(false);
		}
	};

	const updateSectorDep = async (idSector: string, idDeposito: string) => {
		if (!canEdit) return;
		setSaving(true);
		try {
			await almacenService.guardarConfigSector({
				idSector,
				idDeposito: idDeposito ? Number(idDeposito) : null,
				activo: true,
				puedeSolicitar: true,
			});
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al actualizar sector');
		} finally {
			setSaving(false);
		}
	};

	const removeSector = async (idConfig: number) => {
		if (!canEdit) return;
		if (!window.confirm('¿Quitar este sector de orígenes de almacén?')) return;
		setSaving(true);
		try {
			await almacenService.eliminarConfigSector(idConfig);
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al quitar sector');
		} finally {
			setSaving(false);
		}
	};

	const saveRubro = async () => {
		if (!canEdit || !rubroForm.codigo.trim() || !rubroForm.nombre.trim()) return;
		setSaving(true);
		try {
			await almacenService.guardarRubro({
				idRubro: rubroForm.idRubro || undefined,
				codigo: rubroForm.codigo.trim(),
				nombre: rubroForm.nombre.trim(),
				activo: rubroForm.activo,
			});
			setRubroForm({ idRubro: 0, codigo: '', nombre: '', activo: true });
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al guardar rubro');
		} finally {
			setSaving(false);
		}
	};

	const editRubro = (r: AlmacenRubro) => {
		setRubroForm({
			idRubro: r.IdRubro,
			codigo: r.Codigo,
			nombre: r.Nombre,
			activo: !!(r.Activo === 1 || r.Activo === true),
		});
	};

	const delRubro = async (r: AlmacenRubro) => {
		if (!canEdit) return;
		if (!window.confirm(`¿Eliminar rubro ${r.Nombre}?`)) return;
		setSaving(true);
		try {
			await almacenService.eliminarRubro(r.IdRubro);
			if (rubroForm.idRubro === r.IdRubro) {
				setRubroForm({ idRubro: 0, codigo: '', nombre: '', activo: true });
			}
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al eliminar rubro');
		} finally {
			setSaving(false);
		}
	};

	const saveDep = async () => {
		if (!canEdit || !depForm.codigo.trim() || !depForm.nombre.trim()) return;
		setSaving(true);
		try {
			await almacenService.guardarDeposito({
				idDeposito: depForm.idDeposito || undefined,
				codigo: depForm.codigo.trim(),
				nombre: depForm.nombre.trim(),
				esPrincipal: depForm.esPrincipal,
				activo: depForm.activo,
			});
			setDepForm({ idDeposito: 0, codigo: '', nombre: '', esPrincipal: false, activo: true });
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al guardar depósito');
		} finally {
			setSaving(false);
		}
	};

	const editDep = (d: AlmacenDeposito) => {
		setDepForm({
			idDeposito: d.IdDeposito,
			codigo: d.Codigo,
			nombre: d.Nombre,
			esPrincipal: !!(d.EsPrincipal === 1 || d.EsPrincipal === true),
			activo: !!(d.Activo === 1 || d.Activo === true),
		});
	};

	const delDep = async (d: AlmacenDeposito) => {
		if (!canEdit) return;
		if (!window.confirm(`¿Eliminar o desactivar depósito ${d.Nombre}?`)) return;
		setSaving(true);
		try {
			await almacenService.eliminarDeposito(d.IdDeposito);
			if (depForm.idDeposito === d.IdDeposito) {
				setDepForm({ idDeposito: 0, codigo: '', nombre: '', esPrincipal: false, activo: true });
			}
			await load();
		} catch (e: unknown) {
			onError(e instanceof Error ? e.message : 'Error al eliminar depósito');
		} finally {
			setSaving(false);
		}
	};

	if (loading && !cfg) {
		return (
			<div className={styles.loading}>
				<div className={styles.spinner} />
				Cargando configuración…
			</div>
		);
	}

	const depositos: AlmacenDeposito[] = cfg?.depositos || [];

	return (
		<div className={styles.configPanel}>
			<div className={styles.configHead}>
				<div>
					<h3 className={styles.configTitle}>Configuración de Almacén</h3>
					<p className={styles.configSub}>
						CRUD de depósitos, sectores orígenes y rubros. Todo se guarda en la base del hospital.
					</p>
				</div>
				<button
					type="button"
					className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
					onClick={() => void load()}
				>
					<RefreshCw size={14} /> Actualizar
				</button>
			</div>

			{/* Depósitos — primero: el usuario pide crear depósitos */}
			<section className={styles.configSection}>
				<h4>Depósitos</h4>
				<p className={styles.fieldHint}>
					Almacén principal e intermedios (farmacia, etc.). Acá se crean, editan y eliminan.
				</p>
				{canEdit && (
					<div className={styles.configAddRow}>
						<input
							placeholder="Código"
							value={depForm.codigo}
							onChange={(e) => setDepForm({ ...depForm, codigo: e.target.value })}
						/>
						<input
							placeholder="Nombre"
							value={depForm.nombre}
							onChange={(e) => setDepForm({ ...depForm, nombre: e.target.value })}
							style={{ minWidth: 180 }}
						/>
						<label className={styles.stockMinCheck}>
							<input
								type="checkbox"
								checked={depForm.esPrincipal}
								onChange={(e) => setDepForm({ ...depForm, esPrincipal: e.target.checked })}
							/>
							Principal
						</label>
						<label className={styles.stockMinCheck}>
							<input
								type="checkbox"
								checked={depForm.activo}
								onChange={(e) => setDepForm({ ...depForm, activo: e.target.checked })}
							/>
							Activo
						</label>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
							disabled={saving}
							onClick={() => void saveDep()}
						>
							<Save size={14} /> {depForm.idDeposito ? 'Actualizar' : 'Crear'} depósito
						</button>
						{depForm.idDeposito ? (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
								onClick={() =>
									setDepForm({ idDeposito: 0, codigo: '', nombre: '', esPrincipal: false, activo: true })
								}
							>
								Cancelar edición
							</button>
						) : null}
					</div>
				)}
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Código</th>
								<th>Nombre</th>
								<th>Principal</th>
								<th>Activo</th>
								{canEdit && <th></th>}
							</tr>
						</thead>
						<tbody>
							{depositos.length === 0 ? (
								<tr>
									<td colSpan={canEdit ? 5 : 4} className={styles.empty}>
										Sin depósitos. Creá al menos uno y marcá el principal.
									</td>
								</tr>
							) : (
								depositos.map((d) => (
									<tr key={d.IdDeposito}>
										<td className={styles.codeCell}>{d.Codigo}</td>
										<td>{d.Nombre}</td>
										<td>{d.EsPrincipal ? 'Sí' : 'No'}</td>
										<td>{d.Activo ? 'Sí' : 'No'}</td>
										{canEdit && (
											<td>
												<div className={styles.rowActions}>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
														onClick={() => editDep(d)}
													>
														<Pencil size={12} /> Editar
													</button>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
														onClick={() => void delDep(d)}
													>
														<Trash2 size={12} />
													</button>
												</div>
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* Sectores */}
			<section className={styles.configSection}>
				<h4>Sectores origen (quién pide a Almacén)</h4>
				<p className={styles.fieldHint}>
					Vinculá un depósito si el sector controla stock propio.
				</p>
				{canEdit && (
					<div className={styles.configAddRow}>
						<div className={styles.alSelectField}>
							<CustomSelect
								label="Sector"
								name="sectorAdd"
								value={sectorAdd}
								isLoading={loading}
								onChange={(v) => setSectorAdd(String(v || ''))}
								options={[
									{ value: '', label: 'Elegir sector' },
									...disponibles.map((s) => ({
										value: String(s.IdSector),
										label: s.Nombre,
									})),
								]}
							/>
						</div>
						<div className={styles.alSelectField}>
							<CustomSelect
								label="Depósito (opcional)"
								name="sectorDep"
								value={sectorDep}
								isLoading={loading}
								onChange={(v) => setSectorDep(String(v || ''))}
								options={[
									{ value: '', label: 'Sin depósito vinculado' },
									...depositos
										.filter((d) => d.Activo)
										.map((d) => ({
											value: String(d.IdDeposito),
											label: `${d.Nombre} (${d.Codigo})`,
										})),
								]}
							/>
						</div>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
							disabled={!sectorAdd || saving}
							onClick={() => void addSector()}
						>
							<Plus size={14} /> Agregar
						</button>
					</div>
				)}
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Sector</th>
								<th>Id</th>
								<th>Depósito stock</th>
								{canEdit && <th></th>}
							</tr>
						</thead>
						<tbody>
							{(cfg?.sectoresConfig || []).length === 0 ? (
								<tr>
									<td colSpan={canEdit ? 4 : 3} className={styles.empty}>
										Ningún sector habilitado. Mientras, cada usuario pide con sus sectores de personal.
									</td>
								</tr>
							) : (
								(cfg?.sectoresConfig || []).map((c) => (
									<tr key={c.IdConfig}>
										<td>
											<strong>{c.Nombre}</strong>
										</td>
										<td className={styles.codeCell}>{c.IdSector}</td>
										<td>
											{canEdit ? (
												<div className={styles.alSelectField}>
													<CustomSelect
														label="Depósito stock"
														name={`sectorDepRow-${c.IdConfig}`}
														value={c.IdDeposito != null ? String(c.IdDeposito) : ''}
														isLoading={saving}
														onChange={(v) => void updateSectorDep(c.IdSector, String(v || ''))}
														options={[
															{ value: '', label: '—' },
															...depositos.map((d) => ({
																value: String(d.IdDeposito),
																label: d.Nombre,
															})),
														]}
													/>
												</div>
											) : (
												c.DepositoNombre || '—'
											)}
										</td>
										{canEdit && (
											<td>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
													onClick={() => void removeSector(c.IdConfig)}
												>
													<Trash2 size={12} />
												</button>
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* Rubros */}
			<section className={styles.configSection}>
				<h4>Rubros</h4>
				{canEdit && (
					<div className={styles.configAddRow}>
						<input
							placeholder="Código"
							value={rubroForm.codigo}
							onChange={(e) => setRubroForm({ ...rubroForm, codigo: e.target.value })}
						/>
						<input
							placeholder="Nombre"
							value={rubroForm.nombre}
							onChange={(e) => setRubroForm({ ...rubroForm, nombre: e.target.value })}
						/>
						<label className={styles.stockMinCheck}>
							<input
								type="checkbox"
								checked={rubroForm.activo}
								onChange={(e) => setRubroForm({ ...rubroForm, activo: e.target.checked })}
							/>
							Activo
						</label>
						<button
							type="button"
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
							disabled={saving}
							onClick={() => void saveRubro()}
						>
							{rubroForm.idRubro ? (
								<>
									<Save size={14} /> Actualizar
								</>
							) : (
								<>
									<Plus size={14} /> Agregar
								</>
							)}
						</button>
						{rubroForm.idRubro ? (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
								onClick={() => setRubroForm({ idRubro: 0, codigo: '', nombre: '', activo: true })}
							>
								Cancelar
							</button>
						) : null}
					</div>
				)}
				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Código</th>
								<th>Nombre</th>
								<th>Activo</th>
								{canEdit && <th></th>}
							</tr>
						</thead>
						<tbody>
							{(cfg?.rubros || []).length === 0 ? (
								<tr>
									<td colSpan={canEdit ? 4 : 3} className={styles.empty}>
										Sin rubros. Agregá al menos uno para las solicitudes.
									</td>
								</tr>
							) : (
								(cfg?.rubros || []).map((r) => (
									<tr key={r.IdRubro}>
										<td className={styles.codeCell}>{r.Codigo}</td>
										<td>{r.Nombre}</td>
										<td>{r.Activo ? 'Sí' : 'No'}</td>
										{canEdit && (
											<td>
												<div className={styles.rowActions}>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
														onClick={() => editRubro(r)}
													>
														<Pencil size={12} />
													</button>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
														onClick={() => void delRubro(r)}
													>
														<Trash2 size={12} />
													</button>
												</div>
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
