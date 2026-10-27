'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import admisionesVigentesService, {
	type AdmisionVigente,
} from '@/app/services/admisionesVigentesService';
import AdmisionesVigentesPdfPreviewModal from '@/app/components/admission/AdmisionesVigentesPdfPreviewModal';
import Loader from '@/app/components/Loader/Loader';
import styles from './vigentes.module.css';

interface Grupo {
	clave: string;
	titulo: string;
	filas: AdmisionVigente[];
}

function fechaCorta(iso: string | null): string {
	if (!iso) return '—';
	const [y, m, d] = iso.split('-');
	return y && m && d ? `${d}/${m}/${y}` : iso;
}

function normalizar(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function edadSexo(a: AdmisionVigente): string {
	const partes = [a.edad != null ? `${a.edad} a` : '', a.sexo ? a.sexo.charAt(0) : ''];
	return partes.filter(Boolean).join(' · ') || '—';
}

function agrupar(filas: AdmisionVigente[]): Grupo[] {
	const mapa = new Map<string, Grupo>();
	for (const f of filas) {
		const clave = f.sector || '—';
		if (!mapa.has(clave)) {
			mapa.set(clave, { clave, titulo: f.sectorDescripcion || clave, filas: [] });
		}
		mapa.get(clave)!.filas.push(f);
	}
	return Array.from(mapa.values());
}

export default function AdmisionesVigentesPage() {
	const [filas, setFilas] = useState<AdmisionVigente[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState('');
	const [sector, setSector] = useState('');
	const [busqueda, setBusqueda] = useState('');
	const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		setError('');
		try {
			setFilas(await admisionesVigentesService.listar());
		} catch {
			setError('No se pudieron obtener las admisiones vigentes.');
		} finally {
			setCargando(false);
		}
	}, []);

	useEffect(() => {
		void cargar();
	}, [cargar]);

	const sectores = useMemo(() => agrupar(filas).map((g) => ({ clave: g.clave, titulo: g.titulo })), [filas]);

	const filtradas = useMemo(() => {
		const q = normalizar(busqueda.trim());
		return filas.filter((f) => {
			if (sector && (f.sector || '—') !== sector) return false;
			if (!q) return true;
			return normalizar(
				`${f.paciente} ${f.documento || ''} ${f.cama || ''} ${f.medico || ''} ${f.numeroVisita}`,
			).includes(q);
		});
	}, [filas, sector, busqueda]);

	const grupos = useMemo(() => agrupar(filtradas), [filtradas]);

	const descripcionFiltro = [
		sector ? sectores.find((s) => s.clave === sector)?.titulo || sector : '',
		busqueda.trim() ? `"${busqueda.trim()}"` : '',
	]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className={styles.contenedor}>
			<div className={styles.encabezado}>
				<div>
					<h1 className={styles.titulo}>Admisiones vigentes</h1>
					<p className={styles.subtitulo}>
						Pacientes internados con cama asignada, para el recorrido de sala.
					</p>
				</div>
				<div className={styles.acciones}>
					<button
						type="button"
						className={styles.botonSecundario}
						onClick={() => void cargar()}
						disabled={cargando}
					>
						<RefreshCw size={15} /> Actualizar
					</button>
					<button
						type="button"
						className={styles.botonExport}
						onClick={() => setPdfPreviewOpen(true)}
						disabled={cargando || filtradas.length === 0}
						title={
							filtradas.length === 0
								? 'No hay pacientes para exportar'
								: 'Exportar listado en PDF'
						}
					>
						Exportar PDF
					</button>
				</div>
			</div>

			<div className={styles.filtros}>
				<select
					className={styles.select}
					value={sector}
					onChange={(e) => setSector(e.target.value)}
					aria-label="Sector"
				>
					<option value="">Todos los sectores</option>
					{sectores.map((s) => (
						<option key={s.clave} value={s.clave}>
							{s.titulo}
						</option>
					))}
				</select>
				<input
					className={styles.input}
					type="search"
					placeholder="Buscar por paciente, DNI, cama, médico o visita…"
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
				/>
				<span className={styles.total}>
					{filtradas.length} paciente{filtradas.length === 1 ? '' : 's'}
				</span>
			</div>

			{error && <p className={styles.error}>{error}</p>}

			{cargando ? (
				<div className={styles.cargando}>
					<Loader />
				</div>
			) : grupos.length === 0 ? (
				<p className={styles.vacio}>No hay admisiones vigentes para mostrar.</p>
			) : (
				grupos.map((g) => (
					<section key={g.clave} className={styles.grupo}>
						<h2 className={styles.grupoTitulo}>
							{g.titulo} <span>({g.filas.length})</span>
						</h2>
						<div className={styles.tablaWrap}>
							<table className={styles.tabla}>
								<thead>
									<tr>
										<th>Cama</th>
										<th>Paciente</th>
										<th>DNI</th>
										<th>Edad</th>
										<th>Ingreso</th>
										<th>Días</th>
										<th>Diagnóstico</th>
										<th>Cobertura</th>
										<th>Médico</th>
									</tr>
								</thead>
								<tbody>
									{g.filas.map((f) => (
										<tr key={f.numeroVisita}>
											<td className={styles.cama}>{f.cama || '—'}</td>
											<td>
												<strong>{f.paciente || '—'}</strong>
												<div className={styles.meta}>Visita {f.numeroVisita}</div>
											</td>
											<td>{f.documento || '—'}</td>
											<td>{edadSexo(f)}</td>
											<td>
												{fechaCorta(f.fechaIngreso)}
												{f.horaIngreso ? (
													<div className={styles.meta}>{f.horaIngreso}</div>
												) : null}
											</td>
											<td>{f.diasInternacion ?? '—'}</td>
											<td>{f.diagnostico || '—'}</td>
											<td>{f.cobertura || '—'}</td>
											<td>{f.medico || '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<ul className={styles.tarjetas}>
							{g.filas.map((f) => (
								<li key={f.numeroVisita} className={styles.tarjeta}>
									<div className={styles.tarjetaCabecera}>
										<span className={styles.tarjetaCama}>{f.cama || '—'}</span>
										<div className={styles.tarjetaPaciente}>
											<strong>{f.paciente || '—'}</strong>
											<span className={styles.meta}>
												{[f.documento ? `DNI ${f.documento}` : '', edadSexo(f)]
													.filter((x) => x && x !== '—')
													.join(' · ') || '—'}
											</span>
										</div>
										<span className={styles.tarjetaDias}>
											{f.diasInternacion ?? '—'}
											<small>días</small>
										</span>
									</div>
									{f.diagnostico ? (
										<p className={styles.tarjetaDiagnostico}>{f.diagnostico}</p>
									) : null}
									<dl className={styles.tarjetaDatos}>
										<dt>Ingreso</dt>
										<dd>
											{fechaCorta(f.fechaIngreso)}
											{f.horaIngreso ? ` ${f.horaIngreso}` : ''}
										</dd>
										<dt>Cobertura</dt>
										<dd>{f.cobertura || '—'}</dd>
										<dt>Médico</dt>
										<dd>{f.medico || '—'}</dd>
										<dt>Visita</dt>
										<dd>{f.numeroVisita}</dd>
									</dl>
								</li>
							))}
						</ul>
					</section>
				))
			)}

			<AdmisionesVigentesPdfPreviewModal
				isOpen={pdfPreviewOpen}
				onClose={() => setPdfPreviewOpen(false)}
				rows={filtradas}
				filtroDescripcion={descripcionFiltro}
			/>
		</div>
	);
}
