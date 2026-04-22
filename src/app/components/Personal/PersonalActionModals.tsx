'use client';

import { useEffect, useState, useRef } from 'react';
import Modal from '@/app/components/UI/Modal';
import Loader from '@/app/components/Loader/Loader';
import PersonalFirmaPad, { type PersonalFirmaPadRef } from '@/app/components/Personal/PersonalFirmaPad';
import {
	Personal,
	CatalogoItemTexto,
	EmpresaCatalogoItem,
	PersonalServicioDto,
	PersonalSectorAsignado,
	PersonalCodigoFacturacion,
} from '@/app/types/personal';
import { personalService } from '@/app/services/personalService';
import styles from './PersonalActionModals.module.css';

export type PersonalExtraKind =
	| 'servicio'
	| 'empresas'
	| 'firma'
	| 'sectores'
	| 'codigosFacturacion';

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

	// firma
	const [firma, setFirma] = useState<{
		hasFirma: boolean;
		mime?: string;
		dataUrl?: string;
	} | null>(null);
	const firmaPadRef = useRef<PersonalFirmaPadRef>(null);

	// sectores
	const [secAsignados, setSecAsignados] = useState<PersonalSectorAsignado[]>([]);
	const [secCatalogo, setSecCatalogo] = useState<{ IdSector: string; Descripcion: string }[]>([]);
	const [secSel, setSecSel] = useState('');

	// códigos facturación (imPersonalCodsFacturacion)
	const [codigos, setCodigos] = useState<PersonalCodigoFacturacion[]>([]);
	const [nuevoAsoc, setNuevoAsoc] = useState('');
	const [nuevoFac, setNuevoFac] = useState('');
	const [facEdits, setFacEdits] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!open || !id || !kind) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				if (kind === 'servicio') {
					const [dto, sv] = await Promise.all([
						personalService.getPersonalServicio(id),
						personalService.getServicios(),
					]);
					if (!cancelled) {
						setServicio(dto);
						setCatServicios(sv);
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
				} else if (kind === 'firma') {
					const f = await personalService.getPersonalFirma(id);
					if (!cancelled) {
						setFirma(f);
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
			? 'Servicio del personal'
			: kind === 'empresas'
			? 'Empresas asociadas'
			: kind === 'firma'
			? 'Firma digital'
			: kind === 'sectores'
			? 'Sectores'
			: kind === 'codigosFacturacion'
			? 'Códigos de facturación'
			: '';

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

	const guardarFirmaDibujo = async () => {
		if (!id) return;
		const file = await firmaPadRef.current?.toPngFile();
		if (!file) {
			alert('Dibuje una firma en el lienzo antes de guardar.');
			return;
		}
		setSaving(true);
		try {
			await personalService.uploadPersonalFirma(id, file);
			const f = await personalService.getPersonalFirma(id);
			setFirma(f);
			await onSaved();
		} catch (e: any) {
			alert(e?.message || 'Error al guardar la firma');
		} finally {
			setSaving(false);
		}
	};

	const borrarFirma = async () => {
		if (!id || !confirm('¿Eliminar la firma guardada?')) return;
		setSaving(true);
		try {
			await personalService.deletePersonalFirma(id);
			setFirma({ hasFirma: false });
			firmaPadRef.current?.clearPad();
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
				<p className={styles.muted}>
					<strong>{personal.ApellidoNombre}</strong> — ID {personal.Valor}
				</p>
				{loading ? (
					<div style={{ position: 'relative', minHeight: 160 }}>
						<Loader />
					</div>
				) : kind === 'servicio' ? (
					<div className={styles.row}>
						<div>
							<div className={styles.label}>Servicio asistencial</div>
							<select
								className={styles.select}
								value={servicio.ValorServicio ?? ''}
								onChange={(e) =>
									setServicio((s) => ({ ...s, ValorServicio: e.target.value || null }))
								}
							>
								<option value=''>— Sin asignar —</option>
								{catServicios.map((o) => (
									<option key={o.valor} value={o.valor}>
										{o.descripcion}
									</option>
								))}
							</select>
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
								placeholder='Ej. código en imPersonal.ValorServicioParaFacturar'
							/>
						</div>
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose} disabled={saving}>
								Cerrar
							</button>
							<button type='button' className={styles.btnPrimary} onClick={guardarServicio} disabled={saving}>
								{saving ? 'Guardando…' : 'Guardar'}
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
				) : kind === 'firma' ? (
					<div className={styles.row}>
						{loading ? (
							<div style={{ position: 'relative', minHeight: 200 }}>
								<Loader />
							</div>
						) : (
							<>
								<p className={styles.muted}>
									Edite la firma en el lienzo (grosor y color ajustables). Al guardar se reemplaza la
									imagen en base de datos.
								</p>
								<PersonalFirmaPad
									ref={firmaPadRef}
									active={open && kind === 'firma'}
									initialDataUrl={firma?.hasFirma && firma.dataUrl ? firma.dataUrl : null}
								/>
							</>
						)}
						<div className={styles.actions}>
							<button type='button' className={styles.btn} onClick={onClose} disabled={saving}>
								Cerrar
							</button>
							{firma?.hasFirma ? (
								<button type='button' className={styles.btnDanger} onClick={borrarFirma} disabled={saving}>
									Eliminar firma
								</button>
							) : null}
							<button
								type='button'
								className={styles.btnPrimary}
								onClick={guardarFirmaDibujo}
								disabled={saving || loading}
							>
								{saving ? 'Guardando…' : 'Guardar firma'}
							</button>
						</div>
					</div>
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
				) : null}
			</div>
		</Modal>
	);
}
