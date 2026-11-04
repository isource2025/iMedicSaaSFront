'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	abrirPdfBlob,
	generarPdfRendicionPracticaDetalle,
	reservarVentanaPreview,
} from '@/app/utils/pdfRendicionPracticaDetalle';
import type { ModoPdfBlob } from '@/app/utils/pdfRendicionResumen';
import type { OpcionesPracticaDetalle } from '@/app/types/rendiciones';
import c from '@/app/components/Facturacion/Facturacion.module.css';

const RUBROS: { valor: 'G' | 'H' | 'M'; label: string }[] = [
	{ valor: 'G', label: 'Gastos' },
	{ valor: 'H', label: 'Honorarios' },
	{ valor: 'M', label: 'Medicamentos' },
];

interface Props {
	id: number;
	open: boolean;
	onClose: () => void;
}

export default function RendicionReportePracticaDetalleModal({ id, open, onClose }: Props) {
	const toast = useToast();
	const [opciones, setOpciones] = useState<OpcionesPracticaDetalle | null>(null);
	const [cargandoCat, setCargandoCat] = useState(false);
	const [generando, setGenerando] = useState<ModoPdfBlob | null>(null);

	const [rubros, setRubros] = useState<Record<'G' | 'H' | 'M', boolean>>({ G: true, H: true, M: true });
	const [orden, setOrden] = useState<'admision' | 'practica'>('admision');
	const [desglosarModulos, setDesglosarModulos] = useState(true);

	const [todasPracticas, setTodasPracticas] = useState(true);
	const [practicasSel, setPracticasSel] = useState<number[]>([]);
	const [qPractica, setQPractica] = useState('');

	const [todasFunciones, setTodasFunciones] = useState(true);
	const [funcionesSel, setFuncionesSel] = useState<number[]>([]);
	const [qFuncion, setQFuncion] = useState('');

	const [todosMedicos, setTodosMedicos] = useState(true);
	const [matriculasSel, setMatriculasSel] = useState<number[]>([]);
	const [qMedico, setQMedico] = useState('');

	useEffect(() => {
		if (!open) return;
		let vivo = true;
		setCargandoCat(true);
		setRubros({ G: true, H: true, M: true });
		setOrden('admision');
		setDesglosarModulos(true);
		setTodasPracticas(true);
		setPracticasSel([]);
		setTodasFunciones(true);
		setFuncionesSel([]);
		setTodosMedicos(true);
		setMatriculasSel([]);
		setQPractica('');
		setQFuncion('');
		setQMedico('');

		(async () => {
			try {
				const data = await rendicionesService.opcionesPracticaDetalle(id);
				if (!vivo) return;
				setOpciones(data);
			} catch (e) {
				if (vivo) toast.error(mensajeDeError(e, 'No se pudieron cargar los filtros'));
			} finally {
				if (vivo) setCargandoCat(false);
			}
		})();

		return () => {
			vivo = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, id]);

	const practicasFiltradas = useMemo(() => {
		const lista = opciones?.practicas || [];
		const q = qPractica.trim().toLowerCase();
		if (!q) return lista;
		return lista.filter(
			(p) =>
				String(p.codigo).includes(q) ||
				(p.descripcion || '').toLowerCase().includes(q),
		);
	}, [opciones, qPractica]);

	const funcionesFiltradas = useMemo(() => {
		const lista = opciones?.funciones || [];
		const q = qFuncion.trim().toLowerCase();
		if (!q) return lista;
		return lista.filter(
			(f) =>
				String(f.valor).includes(q) ||
				(f.descripcion || '').toLowerCase().includes(q),
		);
	}, [opciones, qFuncion]);

	const medicosFiltrados = useMemo(() => {
		const lista = opciones?.profesionales || [];
		const q = qMedico.trim().toLowerCase();
		if (!q) return lista;
		return lista.filter(
			(p) =>
				String(p.matricula).includes(q) ||
				(p.nombre || '').toLowerCase().includes(q),
		);
	}, [opciones, qMedico]);

	const toggleNum = (lista: number[], n: number) =>
		lista.includes(n) ? lista.filter((x) => x !== n) : [...lista, n];

	const generar = async (modo: ModoPdfBlob) => {
		const tipos = (Object.keys(rubros) as Array<'G' | 'H' | 'M'>).filter((k) => rubros[k]);
		if (!tipos.length) {
			toast.error('Elegí al menos un concepto: gastos, honorarios o medicamentos.');
			return;
		}
		if (!todasPracticas && !practicasSel.length) {
			toast.error('Incluí todas las prácticas o marcá al menos una.');
			return;
		}
		if (!todasFunciones && !funcionesSel.length) {
			toast.error('Incluí todas las funciones o marcá al menos una.');
			return;
		}
		if (!todosMedicos && !matriculasSel.length) {
			toast.error('Incluí todos los profesionales o marcá al menos uno.');
			return;
		}

		const previewWin = modo === 'previsualizar' ? reservarVentanaPreview() : null;
		setGenerando(modo);
		try {
			const data = await rendicionesService.reportePracticaDetalle(id, {
				tipos,
				practicas: todasPracticas ? [] : practicasSel,
				funciones: todasFunciones ? [] : funcionesSel,
				matriculas: todosMedicos ? [] : matriculasSel,
				orden,
				desglosarModulos,
			});
			const { blob, fileName } = await generarPdfRendicionPracticaDetalle(data);
			abrirPdfBlob(blob, fileName, modo, previewWin);
			toast.success(
				modo === 'previsualizar'
					? data.totales.practicas
						? `Vista previa · ${data.totales.practicas} práctica${data.totales.practicas === 1 ? '' : 's'}`
						: 'Vista previa lista'
					: data.totales.practicas
						? `PDF exportado · ${data.totales.practicas} práctica${data.totales.practicas === 1 ? '' : 's'}`
						: 'PDF exportado sin filas para esos filtros',
			);
			if (modo === 'descargar') onClose();
		} catch (e) {
			previewWin?.close();
			toast.error(mensajeDeError(e, 'No se pudo generar el detalle por práctica'));
		} finally {
			setGenerando(null);
		}
	};

	const ocupado = Boolean(generando);

	return (
		<Modal
			isOpen={open}
			onClose={ocupado ? () => undefined : onClose}
			title='Por práctica detallado'
			size='large'
			priority='high'
		>
			<div className={c.reporteBody}>
				<p className={c.reporteLead}>
					Listado de prestaciones con paciente y profesional. Los filtros usan lo que hay en esta
					rendición (sin rangos numéricos).
				</p>

				{cargandoCat ? (
					<div className={c.reporteCargando} role='status'>
						<Loader2 size={18} className={c.reporteSpin} aria-hidden />
						Cargando filtros…
					</div>
				) : (
					<>
						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Conceptos</h3>
							</div>
							<div className={c.reporteChips}>
								{RUBROS.map((r) => {
									const on = rubros[r.valor];
									return (
										<button
											key={r.valor}
											type='button'
											className={`${c.reporteChip} ${on ? c.reporteChipOn : ''}`}
											onClick={() => setRubros((prev) => ({ ...prev, [r.valor]: !prev[r.valor] }))}
											disabled={ocupado}
											aria-pressed={on}
										>
											<span className={c.reporteMark} aria-hidden>
												✓
											</span>
											<span className={c.reporteChipLabel}>{r.label}</span>
										</button>
									);
								})}
							</div>
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Orden y opciones</h3>
							</div>
							<div className={c.reporteSegmento} role='group' aria-label='Ordenar por'>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${orden === 'admision' ? c.reporteSegBtnOn : ''}`}
									onClick={() => setOrden('admision')}
									disabled={ocupado}
								>
									Por admisión
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${orden === 'practica' ? c.reporteSegBtnOn : ''}`}
									onClick={() => setOrden('practica')}
									disabled={ocupado}
								>
									Por práctica
								</button>
							</div>
							<div className={c.reporteChips} style={{ marginTop: 8 }}>
								<button
									type='button'
									className={`${c.reporteChip} ${desglosarModulos ? c.reporteChipOn : ''}`}
									onClick={() => setDesglosarModulos((v) => !v)}
									disabled={ocupado}
									aria-pressed={desglosarModulos}
								>
									<span className={c.reporteMark} aria-hidden>
										✓
									</span>
									<span className={c.reporteChipLabel}>Desglosar módulos</span>
								</button>
							</div>
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Prácticas</h3>
								<span className={c.reporteMeta}>
									{todasPracticas
										? `${opciones?.practicas.length ?? 0} en total`
										: `${practicasSel.length} seleccionada${practicasSel.length === 1 ? '' : 's'}`}
								</span>
							</div>
							<div className={c.reporteSegmento}>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${todasPracticas ? c.reporteSegBtnOn : ''}`}
									onClick={() => {
										setTodasPracticas(true);
										setPracticasSel([]);
									}}
									disabled={ocupado}
								>
									Todas
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${!todasPracticas ? c.reporteSegBtnOn : ''}`}
									onClick={() => setTodasPracticas(false)}
									disabled={ocupado || !(opciones?.practicas.length)}
								>
									Elegir
								</button>
							</div>
							{!todasPracticas ? (
								<>
									<label className={c.reporteBusqueda} htmlFor='rep-prac-q'>
										<Search size={15} aria-hidden />
										<input
											id='rep-prac-q'
											type='search'
											value={qPractica}
											onChange={(e) => setQPractica(e.target.value)}
											placeholder='Buscar código o descripción…'
											disabled={ocupado}
										/>
									</label>
									<div className={c.reporteLista}>
										{practicasFiltradas.map((p) => {
											const on = practicasSel.includes(p.codigo);
											return (
												<button
													key={p.codigo}
													type='button'
													className={`${c.reporteFila} ${on ? c.reporteFilaOn : ''}`}
													onClick={() => setPracticasSel((prev) => toggleNum(prev, p.codigo))}
													disabled={ocupado}
													aria-pressed={on}
												>
													<span className={c.reporteMark} aria-hidden>
														✓
													</span>
													<span className={c.reporteMono}>{p.codigo}</span>
													<span className={c.reporteFilaTxt}>{p.descripcion || 'Sin descripción'}</span>
												</button>
											);
										})}
									</div>
								</>
							) : null}
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Funciones</h3>
								<span className={c.reporteMeta}>
									{todasFunciones
										? `${opciones?.funciones.length ?? 0} en total`
										: `${funcionesSel.length} seleccionada${funcionesSel.length === 1 ? '' : 's'}`}
								</span>
							</div>
							<div className={c.reporteSegmento}>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${todasFunciones ? c.reporteSegBtnOn : ''}`}
									onClick={() => {
										setTodasFunciones(true);
										setFuncionesSel([]);
									}}
									disabled={ocupado}
								>
									Todas
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${!todasFunciones ? c.reporteSegBtnOn : ''}`}
									onClick={() => setTodasFunciones(false)}
									disabled={ocupado || !(opciones?.funciones.length)}
								>
									Elegir
								</button>
							</div>
							{!todasFunciones ? (
								<>
									<label className={c.reporteBusqueda} htmlFor='rep-fun-q'>
										<Search size={15} aria-hidden />
										<input
											id='rep-fun-q'
											type='search'
											value={qFuncion}
											onChange={(e) => setQFuncion(e.target.value)}
											placeholder='Buscar función…'
											disabled={ocupado}
										/>
									</label>
									<div className={c.reporteLista}>
										{funcionesFiltradas.map((f) => {
											const on = funcionesSel.includes(f.valor);
											return (
												<button
													key={f.valor}
													type='button'
													className={`${c.reporteFila} ${on ? c.reporteFilaOn : ''}`}
													onClick={() => setFuncionesSel((prev) => toggleNum(prev, f.valor))}
													disabled={ocupado}
													aria-pressed={on}
												>
													<span className={c.reporteMark} aria-hidden>
														✓
													</span>
													<span className={c.reporteMono}>{f.valor || '—'}</span>
													<span className={c.reporteFilaTxt}>{f.descripcion}</span>
												</button>
											);
										})}
									</div>
								</>
							) : null}
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Profesional</h3>
								<span className={c.reporteMeta}>
									{todosMedicos
										? `${opciones?.profesionales.length ?? 0} en total`
										: `${matriculasSel.length} seleccionado${matriculasSel.length === 1 ? '' : 's'}`}
								</span>
							</div>
							<div className={c.reporteSegmento}>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${todosMedicos ? c.reporteSegBtnOn : ''}`}
									onClick={() => {
										setTodosMedicos(true);
										setMatriculasSel([]);
									}}
									disabled={ocupado}
								>
									Todos
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${!todosMedicos ? c.reporteSegBtnOn : ''}`}
									onClick={() => setTodosMedicos(false)}
									disabled={ocupado || !(opciones?.profesionales.length)}
								>
									Elegir
								</button>
							</div>
							{!todosMedicos ? (
								<>
									<label className={c.reporteBusqueda} htmlFor='rep-med-q'>
										<Search size={15} aria-hidden />
										<input
											id='rep-med-q'
											type='search'
											value={qMedico}
											onChange={(e) => setQMedico(e.target.value)}
											placeholder='Buscar matrícula o nombre…'
											disabled={ocupado}
										/>
									</label>
									<div className={c.reporteLista}>
										{medicosFiltrados.map((p) => {
											const on = matriculasSel.includes(p.matricula);
											return (
												<button
													key={p.matricula}
													type='button'
													className={`${c.reporteFila} ${on ? c.reporteFilaOn : ''}`}
													onClick={() => setMatriculasSel((prev) => toggleNum(prev, p.matricula))}
													disabled={ocupado}
													aria-pressed={on}
												>
													<span className={c.reporteMark} aria-hidden>
														✓
													</span>
													<span className={c.reporteMono}>{p.matricula}</span>
													<span className={c.reporteFilaTxt}>{p.nombre || 'Sin nombre'}</span>
												</button>
											);
										})}
									</div>
								</>
							) : null}
						</section>
					</>
				)}

				{ocupado ? (
					<div className={c.reporteProgreso} role='status'>
						<span className={c.reporteBarra} aria-hidden />
						<span>{generando === 'previsualizar' ? 'Preparando vista previa…' : 'Exportando PDF…'}</span>
					</div>
				) : null}

				<div className={c.reporteAcciones}>
					<button type='button' className={c.reporteBtnCancelar} onClick={onClose} disabled={ocupado}>
						Cancelar
					</button>
					<button
						type='button'
						className={c.reporteBtnPrevisualizar}
						onClick={() => generar('previsualizar')}
						disabled={ocupado || cargandoCat}
					>
						{generando === 'previsualizar' ? (
							<>
								<Loader2 size={16} className={c.reporteSpin} aria-hidden />
								Previsualizando…
							</>
						) : (
							'Previsualizar'
						)}
					</button>
					<button
						type='button'
						className={c.reporteBtnExportar}
						onClick={() => generar('descargar')}
						disabled={ocupado || cargandoCat}
					>
						{generando === 'descargar' ? (
							<>
								<Loader2 size={16} className={c.reporteSpin} aria-hidden />
								Exportando…
							</>
						) : (
							'Exportar'
						)}
					</button>
				</div>
			</div>
		</Modal>
	);
}
