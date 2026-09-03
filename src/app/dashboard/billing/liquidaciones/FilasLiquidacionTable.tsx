'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ui from '../../profile/profile.module.css';
import styles from './liquidaciones.module.css';
import { formatImporte, type FilaTablaLiquidacion } from './liquidacionesShared';

const FILAS_POR_PAGINA = 20;

function textoBusqueda(f: FilaTablaLiquidacion) {
	return [
		f.profesional,
		f.matricula != null ? String(f.matricula) : '',
		f.numeroVisita != null ? String(f.numeroVisita) : '',
		f.codigo,
		f.idPrestacion != null ? String(f.idPrestacion) : '',
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

export default function FilasLiquidacionTable({ filas }: { filas: FilaTablaLiquidacion[] }) {
	const [pagina, setPagina] = useState(1);
	const [busqueda, setBusqueda] = useState('');

	const filtradas = useMemo(() => {
		const q = busqueda.trim().toLowerCase();
		if (!q) return filas;
		return filas.filter((f) => textoBusqueda(f).includes(q));
	}, [filas, busqueda]);

	const totalPaginas = Math.max(1, Math.ceil(filtradas.length / FILAS_POR_PAGINA));
	const visibles = useMemo(() => {
		const inicio = (pagina - 1) * FILAS_POR_PAGINA;
		return filtradas.slice(inicio, inicio + FILAS_POR_PAGINA);
	}, [filtradas, pagina]);

	useEffect(() => {
		setPagina(1);
	}, [filas, busqueda]);

	useEffect(() => {
		if (pagina > totalPaginas) setPagina(totalPaginas);
	}, [pagina, totalPaginas]);

	if (filas.length === 0) {
		return <div className={ui.empty}>Sin renglones para mostrar.</div>;
	}

	return (
		<>
			<div className={ui.tableHeaderRow}>
				<div>
					<h3 className={ui.tableSectionTitle}>Detalle de prácticas</h3>
					<p className={ui.tableSubtitle}>
						{filtradas.length === filas.length
							? `${filas.length} renglones`
							: `${filtradas.length} de ${filas.length} renglones`}
					</p>
				</div>
				<div className={styles.tableTools}>
					<label className={styles.tableSearch}>
						<Search size={14} aria-hidden />
						<input
							type="search"
							className={ui.dateInput}
							placeholder="Profesional, visita o práctica"
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
						/>
					</label>
					<span className={ui.tableCount}>
						Mostrando {visibles.length} de {filtradas.length}
					</span>
				</div>
			</div>
			{filtradas.length === 0 ? (
				<div className={ui.empty}>Ningún renglón coincide con la búsqueda.</div>
			) : (
				<>
					<div className={ui.tableWrap}>
						<table className={ui.table}>
							<thead>
								<tr>
									<th>Profesional</th>
									<th>Visita</th>
									<th>Práctica</th>
									<th className={ui.num}>Facturado</th>
									<th className={ui.num}>Anterior</th>
									<th className={ui.num}>Liquidado</th>
								</tr>
							</thead>
							<tbody>
								{visibles.map((f) => (
									<tr
										key={f.key}
										className={f.estado === 'APLICADO' ? ui.rowValor : ui.rowSinValor}
									>
										<td>
											<div className={ui.pacienteCell}>
												<span className={ui.pacienteNombre}>{f.profesional || 'Sin nombre'}</span>
												<span className={ui.pacienteDni}>Mat. {f.matricula ?? '—'}</span>
											</div>
										</td>
										<td>
											{f.numeroVisita ? (
												<span className={ui.pacienteMeta}>Visita {f.numeroVisita}</span>
											) : (
												<span className={ui.amountMuted}>—</span>
											)}
										</td>
										<td>
											<div className={ui.practicaCell}>
												<span className={ui.practicaCodeWrap}>
													<span className={ui.practicaCode}>{f.codigo || '—'}</span>
												</span>
												{f.idPrestacion != null && (
													<span className={ui.practicaFunc}>IdPrestacion {f.idPrestacion}</span>
												)}
											</div>
										</td>
										<td className={ui.num}>
											{f.importeFinal != null ? (
												<span className={ui.amount}>${formatImporte(f.importeFinal)}</span>
											) : (
												<span className={ui.amountMuted}>—</span>
											)}
										</td>
										<td className={ui.num}>
											{f.importeAnterior != null ? (
												<span className={ui.amount}>${formatImporte(f.importeAnterior)}</span>
											) : (
												<span className={ui.amountMuted}>—</span>
											)}
										</td>
										<td className={ui.num}>
											{f.importeNuevo != null ? (
												<span className={ui.amountStrong}>${formatImporte(f.importeNuevo)}</span>
											) : (
												<span className={ui.badgePending}>Sin liquidar</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className={ui.pagination}>
						<button
							type="button"
							className={ui.pageButton}
							disabled={pagina <= 1}
							onClick={() => setPagina((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft size={15} /> Anterior
						</button>
						<span className={ui.pageInfo}>
							Página {pagina} de {totalPaginas}
						</span>
						<button
							type="button"
							className={ui.pageButton}
							disabled={pagina >= totalPaginas}
							onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
						>
							Siguiente <ChevronRight size={15} />
						</button>
					</div>
				</>
			)}
		</>
	);
}
