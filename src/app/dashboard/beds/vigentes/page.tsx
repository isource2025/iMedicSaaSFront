'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import admisionesVigentesService, {
	type AdmisionVigente,
} from '@/app/services/admisionesVigentesService';
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

function escaparHtml(s: string | number | null | undefined): string {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
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

/** Hoja limpia en una ventana aparte: sin menú lateral ni controles de la app. */
function imprimir(grupos: Grupo[], total: number, filtro: string) {
	const ventana = window.open('', '_blank');
	if (!ventana) return;
	const ahora = new Date().toLocaleString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
	const secciones = grupos
		.map(
			(g) => `
			<h2>${escaparHtml(g.titulo)} <span>(${g.filas.length})</span></h2>
			<table>
				<thead><tr>
					<th>Cama</th><th>Paciente</th><th>DNI</th><th>Edad</th><th>Ingreso</th>
					<th>Días</th><th>Diagnóstico</th><th>Cobertura</th><th>Médico</th><th class="notas">Notas</th>
				</tr></thead>
				<tbody>${g.filas
					.map(
						(f) => `<tr>
						<td>${escaparHtml(f.cama)}</td>
						<td><strong>${escaparHtml(f.paciente)}</strong><br><small>Visita ${f.numeroVisita}</small></td>
						<td>${escaparHtml(f.documento)}</td>
						<td>${escaparHtml(edadSexo(f))}</td>
						<td>${escaparHtml(fechaCorta(f.fechaIngreso))}</td>
						<td>${escaparHtml(f.diasInternacion)}</td>
						<td>${escaparHtml(f.diagnostico)}</td>
						<td>${escaparHtml(f.cobertura)}</td>
						<td>${escaparHtml(f.medico)}</td>
						<td class="notas"></td>
					</tr>`,
					)
					.join('')}</tbody>
			</table>`,
		)
		.join('');

	ventana.document.write(`<!doctype html><html><head><meta charset="utf-8">
		<title>Admisiones vigentes - ${escaparHtml(ahora)}</title>
		<style>
			@page { size: A4 landscape; margin: 10mm; }
			body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
			h1 { font-size: 16px; margin: 0 0 2px; }
			.meta { color: #555; margin-bottom: 8px; }
			h2 { font-size: 12px; margin: 12px 0 4px; break-after: avoid; }
			h2 span { font-weight: normal; color: #555; }
			table { width: 100%; border-collapse: collapse; }
			th, td { border: 1px solid #999; padding: 3px 4px; text-align: left; vertical-align: top; }
			th { background: #eee; }
			tr { break-inside: avoid; }
			small { color: #555; }
			.notas { width: 18%; }
		</style></head><body>
		<h1>Admisiones vigentes · Recorrido de sala</h1>
		<div class="meta">${escaparHtml(ahora)} · ${total} paciente${total === 1 ? '' : 's'}${
			filtro ? ` · ${escaparHtml(filtro)}` : ''
		}</div>
		${secciones}
		</body></html>`);
	ventana.document.close();
	ventana.focus();
	ventana.print();
}

export default function AdmisionesVigentesPage() {
	const [filas, setFilas] = useState<AdmisionVigente[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState('');
	const [sector, setSector] = useState('');
	const [busqueda, setBusqueda] = useState('');

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
						type='button'
						className={styles.botonSecundario}
						onClick={() => void cargar()}
						disabled={cargando}
					>
						<RefreshCw size={15} /> Actualizar
					</button>
					<button
						type='button'
						className={styles.botonPrimario}
						onClick={() => imprimir(grupos, filtradas.length, descripcionFiltro)}
						disabled={cargando || filtradas.length === 0}
					>
						<Printer size={15} /> Imprimir
					</button>
				</div>
			</div>

			<div className={styles.filtros}>
				<select
					className={styles.select}
					value={sector}
					onChange={(e) => setSector(e.target.value)}
					aria-label='Sector'
				>
					<option value=''>Todos los sectores</option>
					{sectores.map((s) => (
						<option key={s.clave} value={s.clave}>
							{s.titulo}
						</option>
					))}
				</select>
				<input
					className={styles.input}
					type='search'
					placeholder='Buscar por paciente, DNI, cama, médico o visita…'
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
		</div>
	);
}
