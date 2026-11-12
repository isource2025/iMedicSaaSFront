'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import CustomSelect from '@/app/components/Patients/AddPatient/LoadingSelect';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ExistenciaStock, RemitoDeposito } from '@/app/types/almacenStock';
import styles from '../stock.module.css';

function fmtQty(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { maximumFractionDigits: 4 });
}

export default function StockClient() {
	const { puede, loaded } = usePermiso();
	const puedeVer = loaded && puede('ALMACEN.STOCK.VER');

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [depFiltro, setDepFiltro] = useState<number | ''>('');
	const [soloBajo, setSoloBajo] = useState(false);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<ExistenciaStock[]>([]);
	const [agrupadoPorProducto, setAgrupadoPorProducto] = useState(true);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [depositos, setDepositos] = useState<RemitoDeposito[]>([]);

	useEffect(() => {
		const t = setTimeout(() => {
			setSearchDebounced(search.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(t);
	}, [search]);

	useEffect(() => {
		if (!puedeVer) return;
		almacenStockService
			.catalogosExistencias()
			.then((c) => setDepositos(c.depositos || []))
			.catch(() => setDepositos([]));
	}, [puedeVer]);

	const cargar = useCallback(async () => {
		if (!puedeVer) return;
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarExistencias({
				search: searchDebounced || undefined,
				idDeposito: depFiltro === '' ? undefined : Number(depFiltro),
				soloBajoMinimo: soloBajo,
				page,
				pageSize: 40,
			});
			setItems(data.items || []);
			setAgrupadoPorProducto(Boolean(data.agrupadoPorProducto ?? depFiltro === ''));
			setTotal(data.total || 0);
			setTotalPages(data.totalPages || 1);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudo cargar el stock'));
			setItems([]);
			setAgrupadoPorProducto(depFiltro === '');
		} finally {
			setLoading(false);
		}
	}, [puedeVer, searchDebounced, depFiltro, soloBajo, page]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	const depositoOptions = useMemo(
		() => [
			{ value: '', label: 'Todos los depósitos' },
			...depositos.map((d) => ({
				value: d.IdDeposito,
				label: d.Descripcion || String(d.IdDeposito),
			})),
		],
		[depositos],
	);

	if (loaded && !puedeVer) {
		return <p className={styles.empty}>No tenés permiso para ver el stock.</p>;
	}

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Boxes size={22} aria-hidden />
					</div>
					<div className={styles.titleBlock}>
						<h1>Stock</h1>
						<p>Existencias por depósito (Clarion · dbo.Stock)</p>
					</div>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className={styles.btnGhost} onClick={() => void cargar()} disabled={loading}>
						<RefreshCw size={15} aria-hidden />
						Actualizar
					</button>
				</div>
			</header>

			{error ? <div className={styles.error}>{error}</div> : null}

			<div className={styles.toolbar}>
				<div className={styles.searchRow}>
					<input
						className={styles.searchInput}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Producto, código o barra…"
						aria-label="Buscar en stock"
					/>
					<div className={styles.toolbarSelect}>
						<CustomSelect
							label=""
							name="stock-dep"
							value={depFiltro}
							onChange={(v) => {
								setDepFiltro(v === '' || v == null ? '' : Number(v));
								setPage(1);
							}}
							options={depositoOptions}
						/>
					</div>
					<button
						type="button"
						className={`${styles.statusToggle} ${soloBajo ? styles.statusOn : styles.statusOff}`}
						role="switch"
						aria-checked={soloBajo}
						aria-label="Solo bajo mínimo"
						onClick={() => {
							setSoloBajo((v) => !v);
							setPage(1);
						}}
					>
						<span className={styles.statusTrack} aria-hidden>
							<span className={styles.statusThumb} />
						</span>
						<span className={styles.statusLabel}>Solo bajo mínimo</span>
					</button>
				</div>
			</div>

			<section className={styles.panel}>
				<div className={styles.tableWrap}>
					{loading ? (
						<div className={styles.empty}>Cargando stock…</div>
					) : items.length === 0 ? (
						<div className={styles.empty}>Sin existencias para el filtro actual.</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Producto</th>
									<th>{agrupadoPorProducto ? 'Alcance' : 'Depósito'}</th>
									<th>Físico</th>
									<th>Disp.</th>
									<th>Mín.</th>
									<th>Máx.</th>
									<th>Unidad</th>
								</tr>
							</thead>
							<tbody>
								{items.map((r) => (
									<tr
										key={
											agrupadoPorProducto || r.IdDeposito == null
												? `prod-${r.IdProducto}`
												: `${r.IdProducto}-${r.IdDeposito}`
										}
										className={r.bajoMinimo ? styles.rowAlert : undefined}
									>
										<td>
											<div>{r.Descripcion}</div>
											<div className={styles.muted}>
												#{r.IdProducto}
												{r.CodAlternativo ? ` · ${r.CodAlternativo}` : ''}
												{r.RubroNombre ? ` · ${r.RubroNombre}` : ''}
												{r.bajoMinimo ? ' · Bajo mínimo' : ''}
											</div>
										</td>
										<td>
											{agrupadoPorProducto
												? r.DepositoNombre ||
													(r.DepositosCount && r.DepositosCount > 1
														? `Total · ${r.DepositosCount} dep.`
														: 'Total')
												: r.DepositoNombre || '—'}
										</td>
										<td className={styles.mono}>{fmtQty(r.CantFisico)}</td>
										<td className={styles.mono}>{fmtQty(r.CantDisp)}</td>
										<td className={styles.mono}>{fmtQty(r.StockMinimo)}</td>
										<td className={styles.mono}>{fmtQty(r.StockMaximo)}</td>
										<td>{r.UnidadNombre || '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<div className={styles.pager}>
					<span className={styles.muted}>
						{total.toLocaleString('es-AR')}{' '}
						{agrupadoPorProducto ? 'productos' : 'registros'} · pág. {page}/{totalPages}
					</span>
					<div className={styles.pagerBtns}>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page <= 1 || loading}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							className={styles.btnGhost}
							disabled={page >= totalPages || loading}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
