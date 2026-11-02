'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Truck } from 'lucide-react';
import { almacenStockService } from '@/app/services/almacenStockService';
import { usePermiso } from '@/app/hooks/usePermiso';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ProveedorClarion } from '@/app/types/almacenStock';
import styles from '../stock.module.css';

export default function ProveedoresClient() {
	const { puede, loaded } = usePermiso();
	const puedeVer = loaded && puede('ALMACEN.PROVEEDORES.VER');

	const [search, setSearch] = useState('');
	const [searchDebounced, setSearchDebounced] = useState('');
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<ProveedorClarion[]>([]);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	useEffect(() => {
		const t = setTimeout(() => {
			setSearchDebounced(search.trim());
			setPage(1);
		}, 350);
		return () => clearTimeout(t);
	}, [search]);

	const cargar = useCallback(async () => {
		if (!puedeVer) return;
		setLoading(true);
		setError(null);
		try {
			const data = await almacenStockService.listarProveedoresClarion({
				search: searchDebounced || undefined,
				page,
				pageSize: 40,
			});
			setItems(data.items || []);
			setTotal(data.total || 0);
			setTotalPages(data.totalPages || 1);
		} catch (e) {
			setError(mensajeDeError(e, 'No se pudieron cargar los proveedores'));
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [puedeVer, searchDebounced, page]);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	if (loaded && !puedeVer) {
		return <p className={styles.empty}>No tenés permiso para ver proveedores.</p>;
	}

	return (
		<div className={styles.wrap}>
			<header className={styles.header}>
				<div className={styles.titleLeft}>
					<div className={styles.titleIcon}>
						<Truck size={22} aria-hidden />
					</div>
					<div className={styles.titleBlock}>
						<h1>Proveedores</h1>
						<p>Catálogo Clarion · dbo.PROVEEDORES</p>
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
						placeholder="Nombre, fantasía o CUIT…"
						aria-label="Buscar proveedores"
					/>
				</div>
			</div>

			<section className={styles.panel}>
				<div className={styles.tableWrap}>
					{loading ? (
						<div className={styles.empty}>Cargando proveedores…</div>
					) : items.length === 0 ? (
						<div className={styles.empty}>Sin proveedores para la búsqueda.</div>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Proveedor</th>
									<th>CUIT</th>
									<th>Email</th>
									<th>Domicilio</th>
								</tr>
							</thead>
							<tbody>
								{items.map((r) => (
									<tr key={r.IdProveedor}>
										<td>
											<div>{r.Descripcion}</div>
											<div className={styles.muted}>
												#{r.IdProveedor}
												{r.NombreFantasia ? ` · ${r.NombreFantasia}` : ''}
											</div>
										</td>
										<td className={styles.mono}>{r.Cuit || '—'}</td>
										<td>{r.Email || '—'}</td>
										<td>{r.Domicilio || '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<div className={styles.pager}>
					<span className={styles.muted}>
						{total.toLocaleString('es-AR')} registros · pág. {page}/{totalPages}
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
