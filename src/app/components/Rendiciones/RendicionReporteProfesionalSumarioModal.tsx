'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import {
	abrirPdfBlob,
	generarPdfRendicionProfesionalSumario,
	reservarVentanaPreview,
} from '@/app/utils/pdfRendicionProfesionalSumario';
import type { ModoPdfBlob } from '@/app/utils/pdfRendicionResumen';
import type { ProfesionalRendicion } from '@/app/types/rendiciones';
import c from '@/app/components/Facturacion/Facturacion.module.css';

interface Props {
	id: number;
	open: boolean;
	onClose: () => void;
}

export default function RendicionReporteProfesionalSumarioModal({ id, open, onClose }: Props) {
	const toast = useToast();
	const [profesionales, setProfesionales] = useState<ProfesionalRendicion[]>([]);
	const [cargandoCat, setCargandoCat] = useState(false);
	const [generando, setGenerando] = useState<ModoPdfBlob | null>(null);
	const [todosLosMedicos, setTodosLosMedicos] = useState(true);
	const [matriculaSel, setMatriculaSel] = useState<number | null>(null);
	const [busqueda, setBusqueda] = useState('');
	const [saltarHoja, setSaltarHoja] = useState(false);

	useEffect(() => {
		if (!open) return;
		let vivo = true;
		setCargandoCat(true);
		setTodosLosMedicos(true);
		setMatriculaSel(null);
		setBusqueda('');
		setSaltarHoja(false);

		(async () => {
			try {
				const lista = await rendicionesService.profesionales(id);
				if (!vivo) return;
				setProfesionales(lista || []);
			} catch (e) {
				if (vivo) toast.error(mensajeDeError(e, 'No se pudieron cargar los profesionales'));
			} finally {
				if (vivo) setCargandoCat(false);
			}
		})();

		return () => {
			vivo = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir / cambiar rendición
	}, [open, id]);

	const filtrados = useMemo(() => {
		const q = busqueda.trim().toLowerCase();
		if (!q) return profesionales;
		return profesionales.filter((p) => {
			const nom = (p.nombre || '').toLowerCase();
			const mat = String(p.matricula || '');
			return nom.includes(q) || mat.includes(q);
		});
	}, [profesionales, busqueda]);

	const generar = async (modo: ModoPdfBlob) => {
		if (!todosLosMedicos && (matriculaSel == null || matriculaSel < 0)) {
			toast.error('Elegí un profesional o marcá todos los médicos.');
			return;
		}

		const previewWin = modo === 'previsualizar' ? reservarVentanaPreview() : null;
		setGenerando(modo);
		try {
			const data = await rendicionesService.reporteProfesionalSumario(id, {
				todosLosMedicos,
				matriculas: todosLosMedicos || matriculaSel == null ? [] : [matriculaSel],
			});
			const { blob, fileName } = await generarPdfRendicionProfesionalSumario(data, {
				saltarHojaPorProfesional: saltarHoja,
			});
			abrirPdfBlob(blob, fileName, modo, previewWin);
			toast.success(
				modo === 'previsualizar'
					? data.totalProfesionales
						? `Vista previa · ${data.totalProfesionales} profesional${data.totalProfesionales === 1 ? '' : 'es'}`
						: 'Vista previa lista'
					: data.totalProfesionales
						? `PDF exportado · ${data.totalProfesionales} profesional${data.totalProfesionales === 1 ? '' : 'es'}`
						: 'PDF exportado sin filas para esos filtros',
			);
			if (modo === 'descargar') onClose();
		} catch (e) {
			previewWin?.close();
			toast.error(mensajeDeError(e, 'No se pudo generar el sumario por profesional'));
		} finally {
			setGenerando(null);
		}
	};

	const ocupado = Boolean(generando);

	return (
		<Modal
			isOpen={open}
			onClose={ocupado ? () => undefined : onClose}
			title='Sumarizado por profesional'
			size='medium'
			priority='high'
		>
			<div className={c.reporteBody}>
				<p className={c.reporteLead}>
					Honorarios agregados por práctica, agrupados por matrícula del profesional.
				</p>

				{cargandoCat ? (
					<div className={c.reporteCargando} role='status'>
						<Loader2 size={18} className={c.reporteSpin} aria-hidden />
						Cargando profesionales…
					</div>
				) : (
					<>
						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Médicos</h3>
								<span className={c.reporteMeta}>
									{todosLosMedicos
										? `${profesionales.length} en la rendición`
										: matriculaSel != null
											? '1 seleccionado'
											: 'Ninguno'}
								</span>
							</div>
							<div className={c.reporteSegmento} role='group' aria-label='Alcance de médicos'>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${todosLosMedicos ? c.reporteSegBtnOn : ''}`}
									onClick={() => {
										setTodosLosMedicos(true);
										setMatriculaSel(null);
									}}
									disabled={ocupado}
								>
									Todos
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${!todosLosMedicos ? c.reporteSegBtnOn : ''}`}
									onClick={() => setTodosLosMedicos(false)}
									disabled={ocupado || profesionales.length === 0}
								>
									Elegir
								</button>
							</div>

							{!todosLosMedicos ? (
								<>
									<label className={c.reporteBusqueda} htmlFor='rep-sum-prof-q'>
										<Search size={15} aria-hidden />
										<input
											id='rep-sum-prof-q'
											type='search'
											value={busqueda}
											onChange={(e) => setBusqueda(e.target.value)}
											placeholder='Buscar por nombre o matrícula…'
											disabled={ocupado}
											autoComplete='off'
										/>
									</label>
									<div className={c.reporteLista} role='listbox' aria-label='Elegir profesional'>
										{filtrados.length === 0 ? (
											<p className={c.reporteHint}>No hay coincidencias.</p>
										) : (
											filtrados.map((p) => {
												const on = matriculaSel === p.matricula;
												return (
													<button
														key={p.matricula}
														type='button'
														role='option'
														aria-selected={on}
														className={`${c.reporteFila} ${on ? c.reporteFilaOn : ''}`}
														onClick={() => setMatriculaSel(p.matricula)}
														disabled={ocupado}
													>
														<span className={c.reporteMark} aria-hidden>
															✓
														</span>
														<span className={c.reporteMono}>{p.matricula || '—'}</span>
														<span className={c.reporteFilaTxt}>{p.nombre || 'Sin nombre'}</span>
													</button>
												);
											})
										)}
									</div>
								</>
							) : null}
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Opciones</h3>
							</div>
							<div className={c.reporteChips}>
								<button
									type='button'
									className={`${c.reporteChip} ${saltarHoja ? c.reporteChipOn : ''}`}
									onClick={() => setSaltarHoja((v) => !v)}
									disabled={ocupado}
									aria-pressed={saltarHoja}
								>
									<span className={c.reporteMark} aria-hidden>
										✓
									</span>
									<span className={c.reporteChipLabel}>1 profesional por hoja</span>
								</button>
							</div>
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
