'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Phone, Plus, Trash2, Truck, UserRound, XCircle } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { useToast } from '@/app/components/UI/ToastProvider';
import { resaltarCampoLuego } from '@/app/components/UI/resaltar';
import { almacenStockService } from '@/app/services/almacenStockService';
import { mensajeDeError } from '@/app/utils/apiError';
import type {
	ProveedorContacto,
	ProveedorDetalle,
	ProveedorProducto,
	ProveedoresCatalogos,
	ProveedorTelefono,
} from '@/app/types/almacenStock';
import { Avatar, Kpi, KpiGrid, Pill, Segmented, fmtFecha, fmtMoney, fmtNum } from '../AlmacenVisual';
import styles from '../stock.module.css';

type Tab = 'datos' | 'domicilio' | 'telefonos' | 'contactos' | 'productos' | 'obs' | 'actividad';

type Form = {
	Descripcion: string;
	NombreFantasia: string;
	IdStatus: number;
	IdTipoProv: number | '';
	IdTipoProvCateg: number | '';
	Cuit: string;
	IdTipoIva: number | '';
	Email: string;
	Calle: string;
	CalleNro: string;
	Piso: string;
	Depto: string;
	IdCodPostal: string;
	IdPais: number | '';
	IdProvincia: number | '';
	IdLocalidad: number | '';
	EntreCalles: string;
	ChequesOrden: string;
	IdBanco: number | '';
	NroCuenta: string;
	Descuento: string;
};

const vacio = (): Form => ({
	Descripcion: '',
	NombreFantasia: '',
	IdStatus: 1,
	IdTipoProv: '',
	IdTipoProvCateg: '',
	Cuit: '',
	IdTipoIva: '',
	Email: '',
	Calle: '',
	CalleNro: '',
	Piso: '',
	Depto: '',
	IdCodPostal: '',
	IdPais: '',
	IdProvincia: '',
	IdLocalidad: '',
	EntreCalles: '',
	ChequesOrden: '',
	IdBanco: '',
	NroCuenta: '',
	Descuento: '',
});

export const COLOR_ESTADO_PROV: Record<number, string> = { 1: '#16a34a', 2: '#d97706', 3: '#dc2626' };
export const LABEL_ESTADO_PROV: Record<number, string> = { 1: 'Activo', 2: 'Suspendido', 3: 'Baja' };

export function cuitValido(cuit: string) {
	const s = cuit.replace(/\D/g, '');
	if (s.length !== 11) return false;
	const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
	const suma = pesos.reduce((a, p, i) => a + p * Number(s[i]), 0);
	let dv = 11 - (suma % 11);
	if (dv === 11) dv = 0;
	if (dv === 10) dv = 9;
	return dv === Number(s[10]);
}

function fmtCuitInput(v: string) {
	const s = v.replace(/\D/g, '').slice(0, 11);
	if (s.length <= 2) return s;
	if (s.length <= 10) return `${s.slice(0, 2)}-${s.slice(2)}`;
	return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
}

const opt = <T extends Record<string, unknown>>(rows: T[] | undefined, id: keyof T) =>
	(rows || []).map((r) => ({ value: r[id] as number, label: String(r.Descripcion ?? r[id]) }));

const idOrNull = (v: number | '') => (v === '' ? null : v);

export default function ProveedorModal({
	idProveedor,
	isOpen,
	onClose,
	onGuardado,
	catalogos,
	puedeEditar,
}: {
	/** null = alta */
	idProveedor: number | null;
	isOpen: boolean;
	onClose: () => void;
	onGuardado: () => void;
	catalogos: ProveedoresCatalogos | null;
	puedeEditar: boolean;
}) {
	const toast = useToast();
	const [tab, setTab] = useState<Tab>('datos');
	const [form, setForm] = useState<Form>(vacio());
	const [telefonos, setTelefonos] = useState<ProveedorTelefono[]>([]);
	const [contactos, setContactos] = useState<ProveedorContacto[]>([]);
	const [productos, setProductos] = useState<ProveedorProducto[]>([]);
	const [nuevaObs, setNuevaObs] = useState('');
	const [detalle, setDetalle] = useState<ProveedorDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [guardando, setGuardando] = useState(false);
	const [prodOpts, setProdOpts] = useState<{ value: number; label: string; nombre: string; unidad?: string | null }[]>([]);
	const [buscandoProd, setBuscandoProd] = useState(false);

	const soloLectura = !puedeEditar;

	useEffect(() => {
		if (!isOpen) return;
		setTab('datos');
		setNuevaObs('');
		if (idProveedor == null) {
			setDetalle(null);
			setForm(vacio());
			setTelefonos([]);
			setContactos([]);
			setProductos([]);
			return;
		}
		let vivo = true;
		setCargando(true);
		almacenStockService
			.obtenerProveedor(idProveedor)
			.then((d) => {
				if (!vivo) return;
				setDetalle(d);
				setForm({
					Descripcion: d.Descripcion || '',
					NombreFantasia: d.NombreFantasia || '',
					IdStatus: d.IdStatus || 1,
					IdTipoProv: d.IdTipoProv ?? '',
					IdTipoProvCateg: d.IdTipoProvCateg ?? '',
					Cuit: d.CuitFmt || d.Cuit || '',
					IdTipoIva: d.IdTipoIva ?? '',
					Email: d.Email || '',
					Calle: d.Calle || '',
					CalleNro: d.CalleNro ? String(d.CalleNro) : '',
					Piso: d.Piso || '',
					Depto: d.Depto || '',
					IdCodPostal: d.IdCodPostal || '',
					IdPais: d.IdPais || '',
					IdProvincia: d.IdProvincia || '',
					IdLocalidad: d.IdLocalidad || '',
					EntreCalles: d.EntreCalles || '',
					ChequesOrden: d.ChequesOrden || '',
					IdBanco: d.IdBanco ?? '',
					NroCuenta: d.NroCuenta || '',
					Descuento: d.Descuento ? String(d.Descuento) : '',
				});
				setTelefonos(d.telefonos);
				setContactos(d.contactos);
				setProductos(d.productos);
			})
			.catch((e) => {
				toast.error(mensajeDeError(e, 'No se pudo abrir el proveedor'));
				onClose();
			})
			.finally(() => vivo && setCargando(false));
		return () => {
			vivo = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, idProveedor]);

	const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

	const provincias = useMemo(
		() => (catalogos?.provincias || []).filter((p) => form.IdPais === '' || !p.IdPais || p.IdPais === form.IdPais),
		[catalogos, form.IdPais],
	);
	const localidades = useMemo(
		() => (form.IdProvincia === '' ? [] : (catalogos?.localidades || []).filter((l) => l.IdProvincia === form.IdProvincia)),
		[catalogos, form.IdProvincia],
	);

	const cuitDigitos = form.Cuit.replace(/\D/g, '');
	const cuitOk = cuitDigitos.length === 11 && cuitValido(cuitDigitos);

	const buscarProductos = async (q: string) => {
		if (q.trim().length < 2) return;
		setBuscandoProd(true);
		try {
			const r = await almacenStockService.listarProductos({ search: q, campo: 'toda', estado: 'activos', pageSize: 25 });
			setProdOpts(
				r.items.map((p) => ({
					value: p.IdProducto,
					label: `${p.IdProducto} — ${p.Descripcion || ''}`,
					nombre: p.Descripcion || '',
					unidad: p.IdUnidad,
				})),
			);
		} catch {
			setProdOpts([]);
		} finally {
			setBuscandoProd(false);
		}
	};

	const guardar = async () => {
		if (!form.Descripcion.trim()) {
			setTab('datos');
			resaltarCampoLuego('prov-razon');
			return toast.error('La razón social es obligatoria');
		}
		if (cuitDigitos && !cuitOk) {
			setTab('datos');
			return toast.error('El CUIT no es válido');
		}
		setGuardando(true);
		try {
			const body = {
				Descripcion: form.Descripcion,
				NombreFantasia: form.NombreFantasia,
				IdStatus: form.IdStatus,
				IdTipoProv: idOrNull(form.IdTipoProv),
				IdTipoProvCateg: idOrNull(form.IdTipoProvCateg),
				Cuit: cuitDigitos,
				IdTipoIva: idOrNull(form.IdTipoIva),
				Email: form.Email,
				Calle: form.Calle,
				CalleNro: form.CalleNro ? Number(form.CalleNro) : null,
				Piso: form.Piso,
				Depto: form.Depto,
				IdCodPostal: form.IdCodPostal,
				IdPais: idOrNull(form.IdPais),
				IdProvincia: idOrNull(form.IdProvincia),
				IdLocalidad: idOrNull(form.IdLocalidad),
				EntreCalles: form.EntreCalles,
				ChequesOrden: form.ChequesOrden,
				IdBanco: idOrNull(form.IdBanco),
				NroCuenta: form.NroCuenta,
				Descuento: form.Descuento ? Number(form.Descuento) : 0,
				telefonos: telefonos.filter((t) => t.Numero.trim()),
				contactos: contactos.filter((c) => c.Contacto.trim()),
				productos,
				NuevaObservacion: nuevaObs.trim() || undefined,
			};
			if (idProveedor == null) {
				const d = await almacenStockService.crearProveedor(body);
				toast.success(`Proveedor #${d.IdProveedor} creado`);
			} else {
				await almacenStockService.actualizarProveedor(idProveedor, body);
				toast.success('Proveedor actualizado');
			}
			onGuardado();
			onClose();
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar'));
		} finally {
			setGuardando(false);
		}
	};

	const titulo = idProveedor == null ? 'Nuevo proveedor' : `Proveedor #${idProveedor}`;
	const estadoColor = COLOR_ESTADO_PROV[form.IdStatus] || '#64748b';

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={titulo} size="xlarge">
			{cargando ? (
				<div className={styles.empty}>Cargando proveedor…</div>
			) : (
				<div className={styles.provModal}>
					<div className={styles.provHero}>
						<Avatar nombre={form.Descripcion || 'Nuevo'} size={56} />
						<div className={styles.provHeroBody}>
							<h2>{form.Descripcion || 'Nuevo proveedor'}</h2>
							<div className={styles.fichaChips}>
								<Pill color={estadoColor}>{LABEL_ESTADO_PROV[form.IdStatus] || '—'}</Pill>
								{cuitOk ? <span className={styles.fichaChip}>CUIT {fmtCuitInput(cuitDigitos)}</span> : null}
								{detalle?.TipoNombre ? <span className={styles.fichaChip}>{detalle.TipoNombre}</span> : null}
								{detalle?.FechaAlta ? <span className={styles.fichaChip}>Alta {fmtFecha(detalle.FechaAlta)}</span> : null}
							</div>
						</div>
						{detalle ? (
							<div className={styles.fichaPrecios}>
								<div>
									<span>Remitos</span>
									<strong>{fmtNum(detalle.Remitos, 0)}</strong>
								</div>
								<div>
									<span>Productos</span>
									<strong>{fmtNum(productos.length, 0)}</strong>
								</div>
								<div>
									<span>Importe</span>
									<strong>{fmtMoney(detalle.ImporteRemitos)}</strong>
								</div>
							</div>
						) : null}
					</div>

					<Segmented<Tab>
						value={tab}
						onChange={setTab}
						opciones={[
							{ value: 'datos', label: 'Datos' },
							{ value: 'domicilio', label: 'Domicilio y pago' },
							{ value: 'telefonos', label: 'Teléfonos', count: telefonos.length || null },
							{ value: 'contactos', label: 'Contactos', count: contactos.length || null },
							{ value: 'productos', label: 'Productos', count: productos.length || null },
							{ value: 'obs', label: 'Observaciones', count: detalle?.observaciones.length || null },
							...(detalle ? [{ value: 'actividad' as Tab, label: 'Actividad' }] : []),
						]}
					/>

					<fieldset className={styles.provFieldset} disabled={soloLectura}>
						{tab === 'datos' ? (
							<div className={styles.stockForm}>
								<div className={styles.formGrid}>
									<div className={styles.field} data-resaltar="prov-razon">
										<label>Razón social *</label>
										<input value={form.Descripcion} maxLength={70} onChange={(e) => set('Descripcion', e.target.value)} />
									</div>
									<div className={styles.field}>
										<label>Nombre de fantasía</label>
										<input value={form.NombreFantasia} maxLength={40} onChange={(e) => set('NombreFantasia', e.target.value)} />
									</div>
								</div>
								<div className={styles.formGrid3}>
									<div className={styles.field}>
										<label>CUIT</label>
										<div className={styles.cuitInput}>
											<input
												value={form.Cuit}
												placeholder="30-12345678-9"
												onChange={(e) => set('Cuit', fmtCuitInput(e.target.value))}
											/>
											{cuitDigitos ? (
												cuitOk ? (
													<CheckCircle2 size={16} className={styles.importeEntrada} aria-label="CUIT válido" />
												) : (
													<XCircle size={16} className={styles.importeSalida} aria-label="CUIT inválido" />
												)
											) : null}
										</div>
									</div>
									<CustomSelect
										label="Condición IVA"
										name="prov-iva"
										value={form.IdTipoIva}
										compact
										options={opt(catalogos?.tiposIva, 'IdTipoIva')}
										onChange={(v) => set('IdTipoIva', v === '' || v == null ? '' : Number(v))}
									/>
									<div className={styles.field}>
										<label>Email</label>
										<input type="email" value={form.Email} maxLength={100} onChange={(e) => set('Email', e.target.value)} />
									</div>
								</div>
								<div className={styles.formGrid3}>
									<CustomSelect
										label="Tipo de proveedor"
										name="prov-tipo"
										value={form.IdTipoProv}
										compact
										options={opt(catalogos?.tipos, 'IdTipoProv')}
										onChange={(v) => set('IdTipoProv', v === '' || v == null ? '' : Number(v))}
									/>
									<CustomSelect
										label="Categoría"
										name="prov-categ"
										value={form.IdTipoProvCateg}
										compact
										options={opt(catalogos?.categorias, 'IdTipoProvCateg')}
										onChange={(v) => set('IdTipoProvCateg', v === '' || v == null ? '' : Number(v))}
									/>
									<div className={styles.field}>
										<label>Estado</label>
										<div className={styles.estadoPicker}>
											{[1, 2, 3].map((s) => (
												<button
													key={s}
													type="button"
													className={form.IdStatus === s ? styles.estadoPickerOn : undefined}
													style={form.IdStatus === s ? { borderColor: COLOR_ESTADO_PROV[s], color: COLOR_ESTADO_PROV[s] } : undefined}
													onClick={() => set('IdStatus', s)}
												>
													{LABEL_ESTADO_PROV[s]}
												</button>
											))}
										</div>
									</div>
								</div>
							</div>
						) : null}

						{tab === 'domicilio' ? (
							<div className={styles.stockForm}>
								<div className={styles.provDomRow}>
									<div className={`${styles.field} ${styles.prodGrow}`}>
										<label>Calle</label>
										<input value={form.Calle} maxLength={50} onChange={(e) => set('Calle', e.target.value)} />
									</div>
									<div className={`${styles.field} ${styles.prodCodeSm}`}>
										<label>Número</label>
										<input type="number" value={form.CalleNro} onChange={(e) => set('CalleNro', e.target.value)} />
									</div>
									<div className={`${styles.field} ${styles.provMini4}`}>
										<label>Piso</label>
										<input value={form.Piso} maxLength={3} onChange={(e) => set('Piso', e.target.value)} />
									</div>
									<div className={`${styles.field} ${styles.provMini4}`}>
										<label>Depto</label>
										<input value={form.Depto} maxLength={4} onChange={(e) => set('Depto', e.target.value)} />
									</div>
									<div className={`${styles.field} ${styles.prodCodeSm}`}>
										<label>C.P.</label>
										<input value={form.IdCodPostal} maxLength={8} onChange={(e) => set('IdCodPostal', e.target.value)} />
									</div>
								</div>
								<div className={styles.formGrid3}>
									<CustomSelect
										label="País"
										name="prov-pais"
										value={form.IdPais}
										compact
										options={opt(catalogos?.paises, 'IdPais')}
										onChange={(v) => setForm((f) => ({ ...f, IdPais: v === '' || v == null ? '' : Number(v), IdProvincia: '', IdLocalidad: '' }))}
									/>
									<CustomSelect
										label="Provincia"
										name="prov-provincia"
										value={form.IdProvincia}
										compact
										options={opt(provincias, 'IdProvincia')}
										onChange={(v) => setForm((f) => ({ ...f, IdProvincia: v === '' || v == null ? '' : Number(v), IdLocalidad: '' }))}
									/>
									<CustomSelect
										label="Localidad"
										name="prov-localidad"
										value={form.IdLocalidad}
										compact
										options={opt(localidades, 'IdLocalidad')}
										onChange={(v) => set('IdLocalidad', v === '' || v == null ? '' : Number(v))}
									/>
								</div>
								<div className={styles.field}>
									<label>Entre calles</label>
									<input value={form.EntreCalles} maxLength={40} onChange={(e) => set('EntreCalles', e.target.value)} />
								</div>
								<p className={styles.prodSubhead}>Pago</p>
								<div className={styles.formGrid4}>
									<CustomSelect
										label="Banco"
										name="prov-banco"
										value={form.IdBanco}
										compact
										options={opt(catalogos?.bancos, 'IdBanco')}
										onChange={(v) => set('IdBanco', v === '' || v == null ? '' : Number(v))}
									/>
									<div className={styles.field}>
										<label>Nro. de cuenta</label>
										<input value={form.NroCuenta} maxLength={20} onChange={(e) => set('NroCuenta', e.target.value)} />
									</div>
									<div className={styles.field}>
										<label>Cheques a la orden de</label>
										<input value={form.ChequesOrden} maxLength={80} onChange={(e) => set('ChequesOrden', e.target.value)} />
									</div>
									<div className={styles.field}>
										<label>Descuento %</label>
										<input type="number" min={0} max={100} step="0.01" value={form.Descuento} onChange={(e) => set('Descuento', e.target.value)} />
									</div>
								</div>
							</div>
						) : null}

						{tab === 'telefonos' ? (
							<div className={styles.stockForm}>
								{telefonos.map((t, i) => (
									<div key={i} className={styles.hijoRow}>
										<Phone size={16} className={styles.muted} />
										<select
											className={styles.select}
											value={t.Tipo || 'T'}
											onChange={(e) => setTelefonos((l) => l.map((x, j) => (j === i ? { ...x, Tipo: e.target.value } : x)))}
										>
											<option value="T">Teléfono</option>
											<option value="C">Celular</option>
											<option value="F">Fax</option>
										</select>
										<input
											className={styles.input}
											placeholder="Número"
											maxLength={17}
											value={t.Numero}
											onChange={(e) => setTelefonos((l) => l.map((x, j) => (j === i ? { ...x, Numero: e.target.value } : x)))}
										/>
										<input
											className={`${styles.input} ${styles.hijoGrow}`}
											placeholder="Observaciones"
											maxLength={75}
											value={t.Observaciones || ''}
											onChange={(e) => setTelefonos((l) => l.map((x, j) => (j === i ? { ...x, Observaciones: e.target.value } : x)))}
										/>
										<button type="button" className={styles.actionDelete} onClick={() => setTelefonos((l) => l.filter((_, j) => j !== i))} aria-label="Quitar teléfono">
											<Trash2 size={15} />
										</button>
									</div>
								))}
								{!telefonos.length ? <div className={styles.empty}>Sin teléfonos cargados.</div> : null}
								<button type="button" className={styles.btnGhost} onClick={() => setTelefonos((l) => [...l, { Tipo: 'T', Numero: '', Observaciones: '' }])}>
									<Plus size={15} /> Agregar teléfono
								</button>
							</div>
						) : null}

						{tab === 'contactos' ? (
							<div className={styles.stockForm}>
								{contactos.map((c, i) => (
									<div key={i} className={styles.contactoCard}>
										<Avatar nombre={c.Contacto || '?'} size={38} />
										<div className={styles.contactoCampos}>
											<input
												className={styles.input}
												placeholder="Nombre"
												maxLength={30}
												value={c.Contacto}
												onChange={(e) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, Contacto: e.target.value } : x)))}
											/>
											<input
												className={styles.input}
												placeholder="Cargo"
												maxLength={30}
												value={c.Cargo || ''}
												onChange={(e) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, Cargo: e.target.value } : x)))}
											/>
											<input
												className={styles.input}
												placeholder="Interno"
												maxLength={10}
												value={c.Interno || ''}
												onChange={(e) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, Interno: e.target.value } : x)))}
											/>
											<input
												className={styles.input}
												placeholder="Email"
												maxLength={60}
												value={c.Email || ''}
												onChange={(e) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, Email: e.target.value } : x)))}
											/>
											<input
												className={`${styles.input} ${styles.contactoComent}`}
												placeholder="Comentarios"
												value={c.Comentarios || ''}
												onChange={(e) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, Comentarios: e.target.value } : x)))}
											/>
										</div>
										<button type="button" className={styles.actionDelete} onClick={() => setContactos((l) => l.filter((_, j) => j !== i))} aria-label="Quitar contacto">
											<Trash2 size={15} />
										</button>
									</div>
								))}
								{!contactos.length ? <div className={styles.empty}>Sin contactos cargados.</div> : null}
								<button type="button" className={styles.btnGhost} onClick={() => setContactos((l) => [...l, { Contacto: '' }])}>
									<UserRound size={15} /> Agregar contacto
								</button>
							</div>
						) : null}

						{tab === 'productos' ? (
							<div className={styles.stockForm}>
								{!soloLectura ? (
									<CustomSelect
										label="Agregar producto"
										name="prov-prod-add"
										value=""
										isLoading={buscandoProd}
										options={prodOpts.filter((o) => !productos.some((p) => p.IdProducto === o.value))}
										onSearchChange={(t) => void buscarProductos(t)}
										onChange={(v) => {
											const o = prodOpts.find((x) => x.value === Number(v));
											if (!o) return;
											setProductos((l) => [...l, { IdProducto: o.value, ProductoNombre: o.nombre, IdUnidad: o.unidad, CodProveedor: '', PrecioRef: null }]);
										}}
									/>
								) : null}
								{productos.length ? (
									<div className={styles.tableWrap} style={{ maxHeight: '45vh' }}>
										<table className={styles.table}>
											<thead>
												<tr>
													<th>Producto</th>
													<th>Cód. proveedor</th>
													<th>Precio ref.</th>
													<th>Plazo (días)</th>
													<th />
												</tr>
											</thead>
											<tbody>
												{productos.map((p, i) => (
													<tr key={p.IdProducto}>
														<td>
															<div className={styles.celdaTitulo}>{p.ProductoNombre}</div>
															<div className={styles.muted}>
																#{p.IdProducto}
																{p.IdUnidad ? ` · ${p.IdUnidad}` : ''}
																{p.FechaRef ? ` · precio al ${fmtFecha(p.FechaRef)}` : ''}
															</div>
														</td>
														<td>
															<input
																className={styles.input}
																maxLength={20}
																value={p.CodProveedor || ''}
																onChange={(e) => setProductos((l) => l.map((x, j) => (j === i ? { ...x, CodProveedor: e.target.value } : x)))}
															/>
														</td>
														<td>
															<input
																className={styles.input}
																type="number"
																step="0.01"
																value={p.PrecioRef ?? ''}
																onChange={(e) =>
																	setProductos((l) =>
																		l.map((x, j) => (j === i ? { ...x, PrecioRef: e.target.value === '' ? null : Number(e.target.value) } : x)),
																	)
																}
															/>
														</td>
														<td>
															<input
																className={styles.input}
																type="number"
																min={0}
																value={p.PlazoEntrega ?? ''}
																onChange={(e) =>
																	setProductos((l) =>
																		l.map((x, j) => (j === i ? { ...x, PlazoEntrega: e.target.value === '' ? null : Number(e.target.value) } : x)),
																	)
																}
															/>
														</td>
														<td className={styles.colActions}>
															<button
																type="button"
																className={styles.actionDelete}
																onClick={() => setProductos((l) => l.filter((_, j) => j !== i))}
																aria-label="Quitar producto"
															>
																<Trash2 size={15} />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className={styles.empty}>
										<Truck size={26} />
										<div>Este proveedor no tiene productos asignados.</div>
									</div>
								)}
							</div>
						) : null}

						{tab === 'obs' ? (
							<div className={styles.stockForm}>
								{!soloLectura ? (
									<div className={styles.field}>
										<label>Nueva observación (se agrega al guardar)</label>
										<textarea rows={3} value={nuevaObs} maxLength={2000} onChange={(e) => setNuevaObs(e.target.value)} />
									</div>
								) : null}
								<ul className={styles.timeline}>
									{(detalle?.observaciones || []).map((o) => (
										<li key={`${o.Fecha}-${o.Nro}`}>
											<span className={styles.timelineDot}>
												<MessageSquare size={12} />
											</span>
											<div>
												<span className={styles.muted}>{fmtFecha(o.Fecha)}</span>
												<p>{o.Comentarios || '—'}</p>
											</div>
										</li>
									))}
								</ul>
								{!detalle?.observaciones.length ? <div className={styles.empty}>Sin observaciones.</div> : null}
							</div>
						) : null}
					</fieldset>

					{tab === 'actividad' && detalle ? (
						<div className={styles.stockForm}>
							<KpiGrid>
								<Kpi label="Remitos" value={fmtNum(detalle.Remitos, 0)} hint={detalle.UltimoRemito ? `último ${fmtFecha(detalle.UltimoRemito)}` : 'sin remitos'} icon={<Truck size={22} />} />
								<Kpi label="Importe total" value={fmtMoney(detalle.ImporteRemitos)} hint="remitos no anulados" icon={<Truck size={22} />} tono="ok" />
								<Kpi label="Productos" value={fmtNum(detalle.productos.length, 0)} hint="asignados" icon={<Truck size={22} />} tono="violet" />
							</KpiGrid>
							{detalle.ultimosRemitos.length ? (
								<table className={styles.table}>
									<thead>
										<tr>
											<th>Fecha</th>
											<th>Comprobante</th>
											<th>Depósito</th>
											<th style={{ textAlign: 'right' }}>Importe</th>
										</tr>
									</thead>
									<tbody>
										{detalle.ultimosRemitos.map((r) => (
											<tr key={r.IdTransaccion} className={r.IdStatus === 0 ? styles.filaAnulada : undefined}>
												<td className={styles.mono}>{fmtFecha(r.Fecha)}</td>
												<td className={styles.mono}>{r.Comprobante}</td>
												<td>{r.DepositoNombre || '—'}</td>
												<td className={styles.mono} style={{ textAlign: 'right' }}>
													{fmtMoney(r.Importe)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className={styles.empty}>Sin remitos.</div>
							)}
						</div>
					) : null}
				</div>
			)}
			<div className={styles.modalActions}>
				<button type="button" className={styles.btnGhost} onClick={onClose}>
					{soloLectura ? 'Cerrar' : 'Cancelar'}
				</button>
				{!soloLectura ? (
					<button type="button" className={styles.btnPrimary} onClick={() => void guardar()} disabled={guardando || cargando}>
						{guardando ? 'Guardando…' : 'Guardar'}
					</button>
				) : null}
			</div>
		</Modal>
	);
}
