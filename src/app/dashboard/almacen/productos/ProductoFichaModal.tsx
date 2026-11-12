'use client';

import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Boxes, Building2, History, Pencil, Truck, Warehouse } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import { almacenStockService } from '@/app/services/almacenStockService';
import { mensajeDeError } from '@/app/utils/apiError';
import type { ProductoFicha } from '@/app/types/almacenStock';
import {
	ActividadChart,
	Card,
	EstadoBadge,
	FotoProducto,
	Kpi,
	KpiGrid,
	NivelBar,
	Pill,
	Skeleton,
	fmtFecha,
	fmtMoney,
	fmtNum,
} from '../AlmacenVisual';
import styles from '../stock.module.css';

export default function ProductoFichaModal({
	idProducto,
	fotoVersion,
	onClose,
	onEditar,
}: {
	idProducto: number | null;
	fotoVersion?: number;
	onClose: () => void;
	onEditar?: (id: number) => void;
}) {
	const [ficha, setFicha] = useState<ProductoFicha | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (idProducto == null) return;
		let vivo = true;
		setFicha(null);
		setError(null);
		almacenStockService
			.fichaProducto(idProducto)
			.then((f) => vivo && setFicha(f))
			.catch((e) => vivo && setError(mensajeDeError(e, 'No se pudo cargar la ficha')));
		return () => {
			vivo = false;
		};
	}, [idProducto]);

	const p = ficha?.producto;
	const stockTotal = ficha?.stock.reduce((a, s) => a + Math.max(0, s.CantFisico || 0), 0) ?? 0;
	const valorizado = ficha?.stock.reduce((a, s) => a + (s.Valorizado || 0), 0) ?? 0;
	const entradas90 = ficha?.actividad.reduce((a, d) => a + d.entradas, 0) ?? 0;
	const salidas90 = ficha?.actividad.reduce((a, d) => a + d.salidas, 0) ?? 0;

	return (
		<Modal isOpen={idProducto != null} onClose={onClose} title={p ? `Ficha · ${p.Descripcion || p.IdProducto}` : 'Ficha de producto'} size="xlarge">
			{error ? <div className={styles.error}>{error}</div> : null}
			{!ficha && !error ? (
				<div className={styles.fichaWrap}>
					<Skeleton alto={110} />
					<Skeleton alto={220} />
				</div>
			) : null}
			{ficha && p ? (
				<div className={styles.fichaWrap}>
					<div className={styles.fichaHero}>
						<FotoProducto id={p.IdProducto} tieneFoto={p.TieneFoto} rubro={p.RubroNombre} size={104} redondeo={16} version={fotoVersion} />
						<div className={styles.fichaHeroBody}>
							<div className={styles.fichaHeroTitle}>
								<h2>{p.Descripcion || `Producto ${p.IdProducto}`}</h2>
								{p.Activo === false ? <Pill color="#dc2626">Baja</Pill> : <Pill color="#16a34a">Activo</Pill>}
							</div>
							{p.DescripcionC && p.DescripcionC !== p.Descripcion ? <p className={styles.muted}>{p.DescripcionC}</p> : null}
							<div className={styles.fichaChips}>
								<span className={styles.fichaChip}>
									<strong>Cód.</strong> {p.IdProducto}
								</span>
								{p.CodAlternativo ? (
									<span className={styles.fichaChip}>
										<strong>Sec.</strong> {p.CodAlternativo}
									</span>
								) : null}
								{p.CBarra ? (
									<span className={styles.fichaChip}>
										<strong>EAN</strong> {p.CBarra}
									</span>
								) : null}
								{p.RubSubLin && p.RubSubLin !== '—' ? <span className={styles.fichaChip}>{p.RubSubLin}</span> : null}
								{p.UnidadNombre ? <span className={styles.fichaChip}>{p.UnidadNombre}</span> : null}
								{p.MarcaNombre ? <span className={styles.fichaChip}>{p.MarcaNombre}</span> : null}
							</div>
						</div>
						<div className={styles.fichaPrecios}>
							<div>
								<span>Venta</span>
								<strong>{fmtMoney(p.PrecioVenta)}</strong>
							</div>
							<div>
								<span>Costo</span>
								<strong>{fmtMoney(p.PrecioCosto)}</strong>
							</div>
							{p.PrecioVenta && p.PrecioCosto ? (
								<div>
									<span>Margen</span>
									<strong className={p.PrecioVenta >= p.PrecioCosto ? styles.importeEntrada : styles.importeSalida}>
										{Math.round(((p.PrecioVenta - p.PrecioCosto) / p.PrecioCosto) * 100)}%
									</strong>
								</div>
							) : null}
							{onEditar ? (
								<button type="button" className={styles.btnGhost} onClick={() => onEditar(p.IdProducto)}>
									<Pencil size={15} /> Editar
								</button>
							) : null}
						</div>
					</div>

					<KpiGrid>
						<Kpi label="Stock total" value={fmtNum(stockTotal)} hint={p.UnidadNombre || undefined} icon={<Boxes size={22} />} />
						<Kpi
							label="Depósitos"
							value={`${ficha.stock.filter((s) => s.CantFisico > 0).length} / ${ficha.stock.length}`}
							hint="con stock / dados de alta"
							icon={<Warehouse size={22} />}
							tono="violet"
						/>
						<Kpi label="Valorizado" value={fmtMoney(valorizado)} hint="a precio de costo" icon={<Building2 size={22} />} tono="ok" />
						<Kpi
							label="Remitos"
							value={fmtNum(ficha.remitos, 0)}
							hint={ficha.ultimoRemito ? `último ${fmtFecha(ficha.ultimoRemito)}` : 'sin remitos'}
							icon={<History size={22} />}
							tono="neutral"
						/>
					</KpiGrid>

					<div className={styles.fichaGrid}>
						<Card title="Stock por depósito" icon={<Warehouse size={15} />}>
							{ficha.stock.length === 0 ? (
								<div className={styles.empty}>No está dado de alta en ningún depósito.</div>
							) : (
								<ul className={styles.depList}>
									{ficha.stock.map((s) => {
										const techo = s.StockMaximo || (s.StockMinimo ? s.StockMinimo * 2 : 0);
										return (
											<li key={s.IdDeposito}>
												<div className={styles.depTop}>
													<span className={styles.depNombre}>{s.DepositoNombre}</span>
													<EstadoBadge estado={s.estado} />
												</div>
												<NivelBar
													pct={s.nivelPct}
													estado={s.estado}
													marcaMin={techo ? Math.round(((s.StockMinimo || 0) / techo) * 100) : null}
													marcaPunto={techo ? Math.round(((s.PuntoPedido || 0) / techo) * 100) : null}
												/>
												<div className={styles.depMeta}>
													<strong>{fmtNum(s.CantFisico)}</strong> {p.IdUnidad}
													{s.StockMinimo ? ` · mín ${fmtNum(s.StockMinimo)}` : ''}
													{s.StockMaximo ? ` · máx ${fmtNum(s.StockMaximo)}` : ''}
													{s.Ubicacion ? ` · ${s.Ubicacion}` : ''}
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</Card>

						<Card
							title="Actividad 90 días"
							icon={<History size={15} />}
							actions={
								<span className={styles.fichaFlujo}>
									<span className={styles.importeEntrada}>
										<ArrowDownRight size={14} />
										{fmtNum(entradas90)}
									</span>
									<span className={styles.importeSalida}>
										<ArrowUpRight size={14} />
										{fmtNum(salidas90)}
									</span>
								</span>
							}
						>
							<ActividadChart data={ficha.actividad} alto={200} />
						</Card>
					</div>

					<div className={styles.fichaGrid}>
						<Card title={`Proveedores (${ficha.proveedores.length})`} icon={<Truck size={15} />}>
							{ficha.proveedores.length === 0 ? (
								<div className={styles.empty}>Sin proveedores asignados.</div>
							) : (
								<ul className={styles.provMini}>
									{ficha.proveedores.map((v) => (
										<li key={v.IdProveedor}>
											<span className={styles.provMiniNombre}>{v.Descripcion}</span>
											{v.CodProveedor ? <span className={styles.muted}>cód. {v.CodProveedor}</span> : null}
											<span className={styles.provMiniPrecio}>{v.PrecioRef != null ? fmtMoney(v.PrecioRef) : '—'}</span>
										</li>
									))}
								</ul>
							)}
						</Card>

						<Card title="Últimos movimientos" icon={<History size={15} />}>
							{ficha.movimientos.length === 0 ? (
								<div className={styles.empty}>Sin movimientos.</div>
							) : (
								<table className={`${styles.table} ${styles.tableMini}`}>
									<tbody>
										{ficha.movimientos.map((m, i) => (
											<tr key={`${m.Comprobante}-${i}`}>
												<td className={styles.mono}>{fmtFecha(m.Fecha)}</td>
												<td>
													<div>{m.Comprobante}</div>
													<div className={styles.muted}>
														{m.DepositoNombre}
														{m.Concepto ? ` · ${m.Concepto}` : ''}
													</div>
												</td>
												<td className={`${styles.mono} ${m.Cantidad >= 0 ? styles.importeEntrada : styles.importeSalida}`}>
													{m.Cantidad >= 0 ? '+' : ''}
													{fmtNum(m.Cantidad)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</Card>
					</div>
				</div>
			) : null}
		</Modal>
	);
}
