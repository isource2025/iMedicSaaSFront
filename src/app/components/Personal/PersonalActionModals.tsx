'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import Loader from '@/app/components/Loader/Loader';
import PersonalFirmaTab from '@/app/components/Personal/PersonalFirmaTab';
import PersonalCuentaTab from '@/app/components/Personal/PersonalCuentaTab';
import {
	Personal,
	CatalogoItemTexto,
	EmpresaCatalogoItem,
	PersonalServicioDto,
	PersonalSectorAsignado,
	PersonalServicioAsignado,
	PersonalCodigoFacturacion,
} from '@/app/types/personal';
import { personalService } from '@/app/services/personalService';
import { rolesService, type Rol } from '@/app/services/rolesService';
import styles from './PersonalActionModals.module.css';

export type PersonalExtraKind =
	| 'servicio'
	| 'empresas'
	| 'firma'
	| 'sectores'
	| 'codigosFacturacion'
	| 'rol'
	| 'cuenta';

type Props = {
	open: boolean;
	kind: PersonalExtraKind | null;
	personal: Personal | null;
	onClose: () => void;
	onSaved: () => void | Promise<void>;
};

export default function PersonalActionModals({
	open,
	kind,
	personal,
	onClose,
	onSaved,
}: Props) {
	const id = personal?.Valor ?? null;

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// servicio
	const [servicio, setServicio] = useState<PersonalServicioDto>({
		ValorServicio: null,
		ValorServicioParaFacturar: null,
	});
	const [catServicios, setCatServicios] = useState<CatalogoItemTexto[]>([]);

	// empresas
	const [empAsignadas, setEmpAsignadas] = useState<EmpresaCatalogoItem[]>([]);
	const [empCatalogo, setEmpCatalogo] = useState<EmpresaCatalogoItem[]>([]);
	const [empSel, setEmpSel] = useState('');

	// sectores
	const [secAsignados, setSecAsignados] = useState<PersonalSectorAsignado[]>([]);
	const [secCatalogo, setSecCatalogo] = useState<{ IdSector: string; Descripcion: string }[]>([]);
	const [secSel, setSecSel] = useState('');

	const [srvPedidos, setSrvPedidos] = useState<PersonalServicioAsignado[]>([]);
	const [srvPedidoSel, setSrvPedidoSel] = useState('');

	// códigos facturación (imPersonalCodsFacturacion)
	const [codigos, setCodigos] = useState<PersonalCodigoFacturacion[]>([]);
	const [nuevoAsoc, setNuevoAsoc] = useState('');
	const [nuevoFac, setNuevoFac] = useState('');
	const [facEdits, setFacEdits] = useState<Record<string, string>>({});

	// rol (multi)
	const [roles, setRoles] = useState<Rol[]>([]);
	const [rolesAsignados, setRolesAsignados] = useState<number[]>([]);
	const [rolPrincipal, setRolPrincipal] = useState<string>('');
	const [rolActualLabel, setRolActualLabel] = useState('');

	useEffect(() => {
		if (!open || !id || !kind) return;
		if (kind === 'firma' || kind === 'cuenta') {
			setLoading(false);
			return;
		}
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				if (kind === 'servicio') {
					const [dto, sv, asignados] = await Promise.all([
						personalService.getPersonalServicio(id),
						personalService.getServicios(),
						personalService.getPersonalServiciosPedidos(id),
					]);
					if (!cancelled) {
						setServicio(dto);
						setCatServicios(sv);
						setSrvPedidos(asignados);
						setSrvPedidoSel('');
					}
				} else if (kind === 'empresas') {
					const [asig, cat] = await Promise.all([
						personalService.getPersonalEmpresas(id),
						personalService.getEmpresasCatalogo(),
					]);
					if (!cancelled) {
						setEmpAsignadas(asig);
						setEmpCatalogo(cat);
						setEmpSel('');
					}
				} else if (kind === 'sectores') {
					const [asig, cat] = await Promise.all([
						personalService.getPersonalSectores(id),
						personalService.getSectoresCatalogo(),
					]);
					if (!cancelled) {
						setSecAsignados(asig);
						setSecCatalogo(cat);
						setSecSel('');
					}
				} else if (kind === 'codigosFacturacion') {
					const list = await personalService.getPersonalCodigosFacturacion(id);
					if (!cancelled) {
						setCodigos(list);
						const m: Record<string, string> = {};
						for (const r of list) m[r.CodigoAsociacion] = r.CodigoFacturacion;
						setFacEdits(m);
						setNuevoAsoc('');
						setNuevoFac('');
					}
				} else if (kind === 'rol') {
					const [cat, pack] = await Promise.all([
						rolesService.listar(),
						rolesService.getRolesDePersonal(id),
					]);
					if (!cancelled) {
						setRoles(cat);
						const ids = (pack.roles || []).map((r) => r.IdRol);
						setRolesAsignados(ids);
						const principal =
							pack.principal?.IdRol ??
							pack.roles?.find((r) => r.EsPrincipal)?.IdRol ??
							ids[0] ??
							null;
						setRolPrincipal(principal != null ? String(principal) : '');
						setRolActualLabel(
							pack.roles?.length
								? pack.roles.map((r) => r.Descripcion || r.Nombre).join(', ')
								: 'Sin rol asignado',
						);
					}
				}
			} catch (e: any) {
				if (!cancelled) alert(e?.message || 'Error al cargar');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, id, kind]);

	const title =
		kind === 'servicio'
			? 'Servicio y bandeja de pedidos'
			: kind === 'empresas'
			? 'Empresas asociadas'
			: kind === 'firma'
			? 'Firma digital'
			: kind === 'sectores'
			? 'Sectores'
			: kind === 'codigosFacturacion'
			? 'Códigos de facturación'
			: kind === 'rol'
			? 'Roles del usuario'
			: kind === 'cuenta'
			? 'Cuenta de acceso'
			: '';

	const toggleRol = (idRol: number) => {
		setRolesAsignados((prev) => {
			const has = prev.includes(idRol);
			const next = has ? prev.filter((x) => x !== idRol) : [...prev, idRol];
			setRolPrincipal((p) => {
				const cur = p === '' ? null : Number(p);
				if (has && cur === idRol) {
					return next.length ? String(next[0]) : '';
				}
				if (!has && (p === '' || cur == null)) return String(idRol);
				return p;
			});
			return next;
		});
	};

	const guardarRol = async () => {
		if (!id) return;
		setSaving(true);
		try {
			const principal =
				rolPrincipal === '' ? null : Number(rolPrincipal);
			const pack = await rolesService.asignarRolesAPersonal(
				id,
				rolesAsignados,
				principal,
			);
			setRolActualLabel(
				pack.roles?.length
					? pack.roles.map((r) => r.Descripcion || r.Nombre).join(', ')
					: 'Sin rol asignado',
			);
			await onSaved();
			onClose();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Error al asignar roles';
			alert(msg);
		} finally {
			setSaving(false);
		}
	};

	const guardarServicio = async () => {
		if (!id) return;
		setSaving(true);
		try {
			await personalService.updatePersonalServicio(id, {
				ValorServicio: servicio.ValorServicio || null,
				ValorServicioParaFacturar: servicio.ValorServicioParaFacturar || null,
			});
			await onSaved();
			onClose();
		} catch (e: any) {
			alert(e?.message || 'Error al guardar');
		} finally {
			setSaving(false);
		}
	};

	const agregarEmpresa = async () => {
		if (!id || !empSel) return;
		setSaving(true);
		try {
			const list = await personalService.addPersonalEmpresa(id, Number(empSel));
			setEmpAsignadas(list);
			setEmpSel('');
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const quitarEmpresa = async (idEmpresa: number) => {
		if (!id) return;
		setSaving(true);
		try {
			const list = await personalService.removePersonalEmpresa(id, idEmpresa);
			setEmpAsignadas(list);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const agregarServicioPedido = async () => {
		if (!id || !srvPedidoSel) return;
		setSaving(true);
		try {
			const list = await personalService.addPersonalServicioPedido(id, srvPedidoSel);
			setSrvPedidos(list);
			setSrvPedidoSel('');
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const quitarServicioPedido = async (sid: string) => {
		if (!id) return;
		setSaving(true);
		try {
			const list = await personalService.removePersonalServicioPedido(id, sid);
			setSrvPedidos(list);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const agregarSector = async () => {
		if (!id || !secSel) return;
		setSaving(true);
		try {
			const list = await personalService.addPersonalSector(id, secSel);
			setSecAsignados(list);
			setSecSel('');
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const quitarSector = async (sid: string) => {
		if (!id) return;
		setSaving(true);
		try {
			const list = await personalService.removePersonalSector(id, sid);
			setSecAsignados(list);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const agregarCodigo = async () => {
		if (!id) return;
		setSaving(true);
		try {
			const list = await personalService.addPersonalCodigoFacturacion(id, {
				CodigoAsociacion: nuevoAsoc.trim(),
				CodigoFacturacion: nuevoFac.trim(),
			});
			setCodigos(list);
			const m: Record<string, string> = {};
			for (const r of list) m[r.CodigoAsociacion] = r.CodigoFacturacion;
			setFacEdits(m);
			setNuevoAsoc('');
			setNuevoFac('');
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const guardarCodigoFila = async (ca: string) => {
		if (!id) return;
		const cf = (facEdits[ca] ?? '').trim();
		setSaving(true);
		try {
			const list = await personalService.updatePersonalCodigoFacturacion(id, {
				CodigoAsociacion: ca,
				CodigoFacturacion: cf,
			});
			setCodigos(list);
			const m: Record<string, string> = {};
			for (const r of list) m[r.CodigoAsociacion] = r.CodigoFacturacion;
			setFacEdits(m);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	const eliminarCodigo = async (ca: string) => {
		if (!id || !confirm(`¿Eliminar el código de asociación "${ca}"?`)) return;
		setSaving(true);
		try {
			const list = await personalService.removePersonalCodigoFacturacion(id, ca);
			setCodigos(list);
			const m: Record<string, string> = {};
			for (const r of list) m[r.CodigoAsociacion] = r.CodigoFacturacion;
			setFacEdits(m);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error');
		} finally {
			setSaving(false);
		}
	};

	if (!open || !kind || !personal) return null;

	return (
		<Modal isOpen={open} onClose={onClose} title={title} size='large'>
			<div className={styles.wrap}>
				{kind !== 'cuenta' && (
					<p className={styles.muted}>
						<strong>{personal.ApellidoNombre}</strong> — ID {personal.Valor}
					</p>
				)}
				{loading ? (
					<div style={{ position: 'relative', minHeight: 160 }}>
						<Loader />
					</div>
				) : kind === 'servicio' ? (
					<div className={styles.row}>
						<p className={styles.muted}>
							La bandeja de pedidos usa solo los servicios asignados acá, no los sectores de internación.
						</p>
						<div className={styles.addRow}>
							<div style={{ flex: 1, minWidth: 200 }}>
								<div className={styles.label}>Agregar servicio (bandeja)</div>
								<select
									className={styles.select}
									value={srvPedidoSel}
									onChange={(e) => setSrvPedidoSel(e.target.value)}
								>
									<option value="">— Elegir —</option>
									{catServicios
										.filter((o) => !srvPedidos.some((a) => a.idServicio === o.valor))
										.map((o) => (
											<option key={o.valor} value={o.valor}>
												{o.descripcion}
											</option>
										))}
								</select>
							</div>
							<button
								type="button"
								className={styles.btnPrimary}
								onClick={agregarServicioPedido}
								disabled={saving || !srvPedidoSel}
							>
								Agregar
							</button>
						</div>
						<div className={styles.label}>Servicios de la bandeja</div>
						<div className={styles.list}>
							{srvPedidos.length === 0 ? (
								<span className={styles.muted}>Sin servicios asignados.</span>
							) : (
								srvPedidos.map((s) => (
									<div key={s.idServicio} className={styles.listItem}>
										<span>{s.Descripcion || s.idServicio}</span>
										<button
											type="button"
											className={styles.btnDanger}
											onClick={() => quitarServicioPedido(s.idServicio)}
											disabled={saving}
										>
											Quitar
										</button>
									</div>
								))
							)}
						</div>
						<div>
							<div className={styles.label}>Servicio para facturar (código)</div>
							<input
								className={styles.input}
								value={servicio.ValorServicioParaFacturar ?? ''}
								onChange={(e) =>
									setServicio((s) => ({
										...s,
										ValorServicioParaFacturar: e.target.value || null,
									}))
								}
								placeholder="Código de facturación"
							/>
						</div>
						<div className={styles.actions}>
							<button type="button" className={styles.btn} onClick={onClose} disabled={saving}>
								Cerrar
							</button>
							<button type="button" className={styles.btnPrimary} onClick={guardarServicio} disabled={saving}>
								{saving ? 'Guardando…' : 'Guardar facturación'}
							</button>
						</div>
					</div>
				) : kind === 'empresas' ? (
					<div className={styles.row}>
						<div className={styles.addRow}>
							<div style={{ flex: 1, minWidth: 200 }}>
								<div className={styles.label}>Agregar empresa</div>
								<select
									className={styles.select}
									value={empSel}
									onChange={(e) => setEmpSel(e.target.value)}
								>
									<option value=''>— Elegir —</option>
									{empCatalogo.map((e) => (
										<option key={e.IdEmpresa} value={String(e.IdEmpresa)}>
											{e.Descripcion || `Empresa ${e.IdEmpresa}`}
										</option>
									))}
								</select>
							</div>
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={agregarEmpresa}
								disabled={saving || !empSel}
							>
								Agregar
							</button>
						</div>
						<div className={styles.label}>Asignadas</div>
						<div className={styles.list}>
							{empAsignadas.length === 0 ? (
								<span className={styles.muted}>Ninguna empresa asociada.</span>
							) : (
								empAsignadas.map((e) => (
									<div key={e.IdEmpresa} className={styles.listItem}>
										<span>{e.Descripcion || `ID ${e.IdEmpresa}`}</span>
										<button
											type='button'
											className={styles.btnDanger}
											onClick={() => quitarEmpresa(e.IdEmpresa)}
											disabled={saving}
										>
											Quitar
										</button>
									</div>
								))
							)}
						</div>
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose}>
								Cerrar
							</button>
						</div>
					</div>
				) : kind === 'firma' && id ? (
					<PersonalFirmaTab
						personalId={id}
						active={open && kind === 'firma'}
						variant='modal'
						onSaved={onSaved}
						onClose={onClose}
					/>
				) : kind === 'sectores' ? (
					<div className={styles.row}>
						<div className={styles.addRow}>
							<div style={{ flex: 1, minWidth: 200 }}>
								<div className={styles.label}>Agregar sector</div>
								<select
									className={styles.select}
									value={secSel}
									onChange={(e) => setSecSel(e.target.value)}
								>
									<option value=''>— Elegir —</option>
									{secCatalogo
										.filter((c) => !secAsignados.some((a) => a.idSector === c.IdSector))
										.map((c) => (
											<option key={c.IdSector} value={c.IdSector}>
												{c.Descripcion || c.IdSector}
											</option>
										))}
								</select>
							</div>
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={agregarSector}
								disabled={saving || !secSel}
							>
								Agregar
							</button>
						</div>
						<div className={styles.label}>Asignados</div>
						<div className={styles.list}>
							{secAsignados.length === 0 ? (
								<span className={styles.muted}>Sin sectores.</span>
							) : (
								secAsignados.map((s) => (
									<div key={s.idSector} className={styles.listItem}>
										<span>{s.Descripcion || s.idSector}</span>
										<button
											type='button'
											className={styles.btnDanger}
											onClick={() => quitarSector(s.idSector)}
											disabled={saving}
										>
											Quitar
										</button>
									</div>
								))
							)}
						</div>
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose}>
								Cerrar
							</button>
						</div>
					</div>
				) : kind === 'codigosFacturacion' ? (
					<div className={styles.row}>
						<p className={styles.muted}>
							Códigos en imPersonalCodsFacturacion: asociación (máx. 8 caracteres) y código de facturación
							(máx. 30).
						</p>
						<div className={styles.addRow}>
							<div style={{ flex: '0 0 100px' }}>
								<div className={styles.label}>Asoc.</div>
								<input
									className={styles.input}
									value={nuevoAsoc}
									onChange={(e) => setNuevoAsoc(e.target.value)}
									maxLength={8}
									placeholder='Ej. OS'
								/>
							</div>
							<div style={{ flex: 1, minWidth: 140 }}>
								<div className={styles.label}>Cód. facturación</div>
								<input
									className={styles.input}
									value={nuevoFac}
									onChange={(e) => setNuevoFac(e.target.value)}
									maxLength={30}
								/>
							</div>
							<button
								type='button'
								className={styles.btnPrimary}
								style={{ alignSelf: 'flex-end' }}
								onClick={agregarCodigo}
								disabled={saving || !nuevoAsoc.trim() || !nuevoFac.trim()}
							>
								Agregar
							</button>
						</div>
						<div className={styles.label}>Registros</div>
						<div className={styles.list}>
							{codigos.length === 0 ? (
								<span className={styles.muted}>Sin códigos cargados.</span>
							) : (
								codigos.map((r) => (
									<div key={r.CodigoAsociacion} className={styles.listItem}>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
											<span className={styles.muted}>
												Asoc. <strong>{r.CodigoAsociacion}</strong>
											</span>
											<input
												className={styles.input}
												value={facEdits[r.CodigoAsociacion] ?? ''}
												onChange={(e) =>
													setFacEdits((m) => ({
														...m,
														[r.CodigoAsociacion]: e.target.value,
													}))
												}
												maxLength={30}
											/>
										</div>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
											<button
												type='button'
												className={styles.btnPrimary}
												onClick={() => guardarCodigoFila(r.CodigoAsociacion)}
												disabled={saving}
											>
												Guardar
											</button>
											<button
												type='button'
												className={styles.btnDanger}
												onClick={() => eliminarCodigo(r.CodigoAsociacion)}
												disabled={saving}
											>
												Eliminar
											</button>
										</div>
									</div>
								))
							)}
						</div>
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose}>
								Cerrar
							</button>
						</div>
					</div>
				) : kind === 'rol' ? (
					<div className={styles.row}>
						<p className={styles.muted}>
							Roles actuales: <strong>{rolActualLabel || 'Sin rol asignado'}</strong>
						</p>
						<p className={styles.muted}>
							Podés marcar varios. Los permisos se unen. El principal se usa en el JWT y
							como referencia.
						</p>
						<div>
							<div className={styles.label}>Roles</div>
							<div className={styles.list}>
								{roles.map((r) => {
									const checked = rolesAsignados.includes(r.IdRol);
									return (
										<label key={r.IdRol} className={styles.checkRow}>
											<input
												type='checkbox'
												checked={checked}
												onChange={() => toggleRol(r.IdRol)}
											/>
											<span>
												{r.Descripcion || r.Nombre}
											</span>
										</label>
									);
								})}
							</div>
						</div>
						{rolesAsignados.length > 0 ? (
							<div>
								<div className={styles.label}>Rol principal</div>
								<select
									className={styles.select}
									value={rolPrincipal}
									onChange={(e) => setRolPrincipal(e.target.value)}
								>
									{roles
										.filter((r) => rolesAsignados.includes(r.IdRol))
										.map((r) => (
											<option key={r.IdRol} value={String(r.IdRol)}>
												{r.Descripcion || r.Nombre}
											</option>
										))}
								</select>
							</div>
						) : null}
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose} disabled={saving}>
								Cerrar
							</button>
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={guardarRol}
								disabled={saving}
							>
								{saving ? 'Guardando…' : 'Guardar'}
							</button>
						</div>
					</div>
				) : kind === 'cuenta' ? (
					<PersonalCuentaTab
						personalId={personal.Valor}
						apellidoNombre={personal.ApellidoNombre}
						matriculaProvincial={personal.MatriculaProvincial}
						variant='modal'
						onSaved={onSaved}
						onClose={onClose}
					/>
				) : null}
			</div>
		</Modal>
	);
}
