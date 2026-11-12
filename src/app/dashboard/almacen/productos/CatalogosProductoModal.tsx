'use client';

import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { useToast } from '@/app/components/UI/ToastProvider';
import { almacenStockService } from '@/app/services/almacenStockService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { CatalogoProductoNombre, ProductosCatalogos } from '@/app/types/almacenStock';
import { Segmented } from '../AlmacenVisual';
import styles from '../stock.module.css';

type Fila = { id: string | number; desc: string; padre?: number };

const TITULOS: Record<CatalogoProductoNombre, string> = {
	rubros: 'Rubros',
	subrubros: 'Subrubros',
	marcas: 'Marcas',
	unidades: 'Unidades',
};

function filasDe(cat: ProductosCatalogos | null, nombre: CatalogoProductoNombre): Fila[] {
	if (!cat) return [];
	if (nombre === 'rubros') return cat.rubros.map((r) => ({ id: r.IdRubro, desc: r.Descripcion }));
	if (nombre === 'subrubros') return cat.subrubros.map((s) => ({ id: s.IdSubRubro, desc: s.Descripcion, padre: s.IdRubro }));
	if (nombre === 'marcas') return (cat.marcas || []).map((m) => ({ id: m.IdMarca, desc: m.Descripcion }));
	return cat.unidades.map((u) => ({ id: u.IdUnidad, desc: u.Descripcion }));
}

export default function CatalogosProductoModal({
	isOpen,
	onClose,
	catalogos,
	onCambio,
	puedeCrear,
	puedeEditar,
	puedeEliminar,
}: {
	isOpen: boolean;
	onClose: () => void;
	catalogos: ProductosCatalogos | null;
	onCambio: () => void;
	puedeCrear: boolean;
	puedeEditar: boolean;
	puedeEliminar: boolean;
}) {
	const toast = useToast();
	const [tab, setTab] = useState<CatalogoProductoNombre>('rubros');
	const [filtro, setFiltro] = useState('');
	const [rubroPadre, setRubroPadre] = useState<number | ''>('');
	const [editando, setEditando] = useState<Fila | null>(null);
	const [texto, setTexto] = useState('');
	const [nuevo, setNuevo] = useState('');
	const [nuevoId, setNuevoId] = useState('');
	const [ocupado, setOcupado] = useState(false);

	const rubroOpts = useMemo(
		() => (catalogos?.rubros || []).map((r) => ({ value: r.IdRubro, label: r.Descripcion || String(r.IdRubro) })),
		[catalogos],
	);

	const filas = useMemo(() => {
		const q = filtro.trim().toUpperCase();
		return filasDe(catalogos, tab).filter(
			(f) =>
				(tab !== 'subrubros' || rubroPadre === '' || f.padre === Number(rubroPadre)) &&
				(!q || f.desc?.toUpperCase().includes(q) || String(f.id).includes(q)),
		);
	}, [catalogos, tab, filtro, rubroPadre]);

	const nombreRubro = (id?: number) => catalogos?.rubros.find((r) => r.IdRubro === id)?.Descripcion || id;

	const correr = async (fn: () => Promise<unknown>, ok: string) => {
		setOcupado(true);
		try {
			await fn();
			toast.success(ok);
			onCambio();
			return true;
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo guardar'));
			return false;
		} finally {
			setOcupado(false);
		}
	};

	const agregar = async () => {
		if (!nuevo.trim()) return;
		if (tab === 'subrubros' && rubroPadre === '') {
			toast.error('Elegí el rubro del subrubro');
			return;
		}
		if (tab === 'unidades' && !nuevoId.trim()) {
			toast.error('Indicá el código de la unidad (3 letras)');
			return;
		}
		const ok = await correr(
			() =>
				almacenStockService.guardarCatalogoProducto(tab, {
					Descripcion: nuevo,
					Id: tab === 'unidades' ? nuevoId : undefined,
					IdRubro: tab === 'subrubros' ? Number(rubroPadre) : undefined,
				}),
			'Registro agregado',
		);
		if (ok) {
			setNuevo('');
			setNuevoId('');
		}
	};

	const guardarEdicion = async () => {
		if (!editando || !texto.trim()) return;
		const ok = await correr(
			() =>
				almacenStockService.guardarCatalogoProducto(
					tab,
					{ Descripcion: texto, IdRubro: editando.padre },
					editando.id,
				),
			'Registro actualizado',
		);
		if (ok) setEditando(null);
	};

	const borrar = async (f: Fila) => {
		if (!window.confirm(`¿Borrar «${f.desc}»?`)) return;
		await correr(() => almacenStockService.eliminarCatalogoProducto(tab, f.id, f.padre), 'Registro eliminado');
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Catálogos de productos" size="large">
			<div className={styles.catWrap}>
				<Segmented
					value={tab}
					onChange={(v) => {
						setTab(v);
						setEditando(null);
						setFiltro('');
					}}
					opciones={(Object.keys(TITULOS) as CatalogoProductoNombre[]).map((k) => ({
						value: k,
						label: TITULOS[k],
						count: filasDe(catalogos, k).length,
					}))}
				/>

				<div className={styles.catToolbar}>
					<input className={styles.searchInput} placeholder="Filtrar…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
					{tab === 'subrubros' ? (
						<div className={styles.toolbarSelect}>
							<CustomSelect
								label="Rubro"
								name="cat-rubro"
								value={rubroPadre}
								compact
								options={[{ value: '', label: 'Todos los rubros' }, ...rubroOpts]}
								onChange={(v) => setRubroPadre(v === '' || v == null ? '' : Number(v))}
							/>
						</div>
					) : null}
				</div>

				{puedeCrear ? (
					<div className={styles.catNuevo}>
						{tab === 'unidades' ? (
							<input
								className={`${styles.input} ${styles.catNuevoId}`}
								placeholder="Cód."
								maxLength={3}
								value={nuevoId}
								onChange={(e) => setNuevoId(e.target.value.toUpperCase())}
							/>
						) : null}
						<input
							className={styles.input}
							placeholder={tab === 'subrubros' && rubroPadre === '' ? 'Elegí un rubro para agregar subrubros' : `Nuevo ${TITULOS[tab].toLowerCase().replace(/s$/, '')}…`}
							value={nuevo}
							disabled={tab === 'subrubros' && rubroPadre === ''}
							onChange={(e) => setNuevo(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && void agregar()}
						/>
						<button type="button" className={styles.btnPrimary} onClick={() => void agregar()} disabled={ocupado || !nuevo.trim()}>
							<Plus size={15} /> Agregar
						</button>
					</div>
				) : null}

				<ul className={styles.catList}>
					{filas.length === 0 ? <li className={styles.empty}>Sin registros</li> : null}
					{filas.slice(0, 300).map((f) => {
						const enEdicion = editando && editando.id === f.id && editando.padre === f.padre;
						return (
							<li key={`${f.padre ?? ''}-${f.id}`} className={styles.catItem}>
								<span className={`${styles.mono} ${styles.catId}`}>{f.id}</span>
								{enEdicion ? (
									<input
										className={styles.input}
										autoFocus
										value={texto}
										onChange={(e) => setTexto(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') void guardarEdicion();
											if (e.key === 'Escape') setEditando(null);
										}}
									/>
								) : (
									<span className={styles.catDesc}>
										{f.desc}
										{tab === 'subrubros' && rubroPadre === '' ? <span className={styles.muted}> · {nombreRubro(f.padre)}</span> : null}
									</span>
								)}
								<span className={styles.rowActions}>
									{enEdicion ? (
										<>
											<button type="button" className={styles.actionEdit} onClick={() => void guardarEdicion()} disabled={ocupado} aria-label="Guardar">
												<Check size={15} />
											</button>
											<button type="button" className={styles.actionDelete} onClick={() => setEditando(null)} aria-label="Cancelar">
												<X size={15} />
											</button>
										</>
									) : (
										<>
											{puedeEditar ? (
												<button
													type="button"
													className={styles.actionEdit}
													aria-label={`Editar ${f.desc}`}
													onClick={() => {
														setEditando(f);
														setTexto(f.desc);
													}}
												>
													<Pencil size={15} />
												</button>
											) : null}
											{puedeEliminar ? (
												<button type="button" className={styles.actionDelete} aria-label={`Borrar ${f.desc}`} onClick={() => void borrar(f)} disabled={ocupado}>
													<Trash2 size={15} />
												</button>
											) : null}
										</>
									)}
								</span>
							</li>
						);
					})}
				</ul>
				{filas.length > 300 ? <p className={styles.muted}>Mostrando 300 de {filas.length}. Filtrá para acotar.</p> : null}
			</div>
		</Modal>
	);
}
