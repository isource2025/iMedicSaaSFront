'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { getTiposAdmision } from '@/app/services/tipoAdmision.service';
import { catalogoSqlService } from '@/app/services/catalogoSqlService';
import { rendicionesService } from '@/app/services/rendicionesService';
import { mensajeDeError } from '@/app/utils/apiError';
import { abrirPdfBlob, generarPdfRendicionDetalle, reservarVentanaPreview } from '@/app/utils/pdfRendicionDetalle';
import type { ModoPdfBlob } from '@/app/utils/pdfRendicionResumen';
import type { VisitaRendida } from '@/app/types/rendiciones';
import c from '@/app/components/Facturacion/Facturacion.module.css';

type LetraPractica = { valor: string; descripcion: string };
type TipoAdm = { valor: string; descripcion: string };

const RUBROS: { valor: 'G' | 'H' | 'M'; label: string }[] = [
	{ valor: 'G', label: 'Gastos' },
	{ valor: 'H', label: 'Honorarios' },
	{ valor: 'M', label: 'Medicamentos' },
];

function tituloPractica(texto: string) {
	const t = texto.trim();
	if (!t) return 'Sin descripción';
	return t
		.toLowerCase()
		.replace(/(^|[\s(/-])([a-záéíóúñü])/g, (_, p, l) => `${p}${l.toUpperCase()}`);
}

interface Props {
	id: number;
	open: boolean;
	onClose: () => void;
}

export default function RendicionReporteDetalleModal({ id, open, onClose }: Props) {
	const toast = useToast();
	const [tiposAdmision, setTiposAdmision] = useState<TipoAdm[]>([]);
	const [letras, setLetras] = useState<LetraPractica[]>([]);
	const [visitas, setVisitas] = useState<VisitaRendida[]>([]);
	const [cargandoCat, setCargandoCat] = useState(false);
	const [generando, setGenerando] = useState<ModoPdfBlob | null>(null);

	const [tipoAdmision, setTipoAdmision] = useState('');
	const [todasLasAdmisiones, setTodasLasAdmisiones] = useState(true);
	const [visitasSel, setVisitasSel] = useState<number[]>([]);
	const [rubros, setRubros] = useState<Record<'G' | 'H' | 'M', boolean>>({ G: true, H: true, M: true });
	const [letrasSel, setLetrasSel] = useState<Set<string>>(new Set());
	const [saltarHoja, setSaltarHoja] = useState(false);
	const [incluirValorizacion, setIncluirValorizacion] = useState(true);

	useEffect(() => {
		if (!open) return;
		let vivo = true;
		setCargandoCat(true);
		setTipoAdmision('');
		setTodasLasAdmisiones(true);
		setVisitasSel([]);
		setRubros({ G: true, H: true, M: true });
		setSaltarHoja(false);
		setIncluirValorizacion(true);

		(async () => {
			try {
				const [ta, catLetras, pagVisitas] = await Promise.all([
					getTiposAdmision(),
					catalogoSqlService.listar('letras-practicas'),
					rendicionesService.visitas(id, { pagina: 1, tamPagina: 500 }),
				]);
				if (!vivo) return;
				const letrasRows = (catLetras.rows || [])
					.map((r) => ({
						valor: String(r.Valor ?? '').trim(),
						descripcion: String(r.Descripcion ?? '').trim(),
					}))
					.filter((l) => l.valor);
				setTiposAdmision(
					(ta || [])
						.map((t) => ({
							valor: String(t.valor ?? '').trim(),
							descripcion: String(t.descripcion ?? '').trim(),
						}))
						.filter((t) => t.valor),
				);
				setLetras(letrasRows);
				setLetrasSel(new Set(letrasRows.map((l) => l.valor)));
				setVisitas(pagVisitas.filas || []);
			} catch (e) {
				if (vivo) toast.error(mensajeDeError(e, 'No se pudieron cargar los filtros del reporte'));
			} finally {
				if (vivo) setCargandoCat(false);
			}
		})();

		return () => {
			vivo = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir / cambiar rendición
	}, [open, id]);

	const visitasFiltradas = useMemo(() => {
		if (!tipoAdmision) return visitas;
		return visitas.filter((v) => (v.tipoAdmision?.valor || '') === tipoAdmision);
	}, [visitas, tipoAdmision]);

	useEffect(() => {
		if (!tipoAdmision) return;
		setVisitasSel((prev) => prev.filter((n) => visitasFiltradas.some((v) => v.numeroVisita === n)));
	}, [tipoAdmision, visitasFiltradas]);

	const letrasTodas = letras.length > 0 && letrasSel.size === letras.length;
	const rubrosActivos = (Object.keys(rubros) as Array<'G' | 'H' | 'M'>).filter((k) => rubros[k]).length;

	const toggleLetra = (valor: string) => {
		setLetrasSel((prev) => {
			const next = new Set(prev);
			if (next.has(valor)) next.delete(valor);
			else next.add(valor);
			return next;
		});
	};

	const toggleVisita = (n: number) => {
		setVisitasSel((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
	};

	const generar = async (modo: ModoPdfBlob) => {
		const tipos = (Object.keys(rubros) as Array<'G' | 'H' | 'M'>).filter((k) => rubros[k]);
		if (!tipos.length) {
			toast.error('Elegí al menos un concepto: gastos, honorarios o medicamentos.');
			return;
		}
		if (!todasLasAdmisiones && !visitasSel.length) {
			toast.error('Incluí todas las admisiones o marcá al menos una.');
			return;
		}
		if (!letrasSel.size) {
			toast.error('Elegí al menos un tipo de práctica.');
			return;
		}

		const previewWin = modo === 'previsualizar' ? reservarVentanaPreview() : null;
		setGenerando(modo);
		try {
			const data = await rendicionesService.reporteDetalle(id, {
				tipoAdmision: tipoAdmision || undefined,
				todasLasAdmisiones,
				visitas: todasLasAdmisiones ? [] : visitasSel,
				tipos,
				letras: letrasTodas ? ['*'] : Array.from(letrasSel),
				saltarHojaPorAdmision: saltarHoja,
				incluirValorizacion,
			});
			const { blob, fileName } = await generarPdfRendicionDetalle(data, {
				saltarHojaPorAdmision: saltarHoja,
				incluirValorizacion,
			});
			abrirPdfBlob(blob, fileName, modo, previewWin);
			toast.success(
				modo === 'previsualizar'
					? data.totalAdmisiones
						? `Vista previa · ${data.totalAdmisiones} admisión${data.totalAdmisiones === 1 ? '' : 'es'}`
						: 'Vista previa lista'
					: data.totalAdmisiones
						? `PDF exportado · ${data.totalAdmisiones} admisión${data.totalAdmisiones === 1 ? '' : 'es'}`
						: 'PDF exportado sin filas para esos filtros',
			);
			if (modo === 'descargar') onClose();
		} catch (e) {
			previewWin?.close();
			toast.error(mensajeDeError(e, 'No se pudo generar el detalle'));
		} finally {
			setGenerando(null);
		}
	};

	const ocupado = Boolean(generando);

	return (
		<Modal
			isOpen={open}
			onClose={ocupado ? () => undefined : onClose}
			title='Detalle de rendición'
			size='medium'
			priority='high'
		>
			<div className={c.reporteBody}>
				<p className={c.reporteLead}>
					PDF individual por admisión, con ficha del paciente y detalle de prestaciones.
				</p>

				{cargandoCat ? (
					<div className={c.reporteCargando} role='status'>
						<Loader2 size={18} className={c.reporteSpin} aria-hidden />
						Cargando opciones…
					</div>
				) : (
					<>
						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Tipo de admisión</h3>
							</div>
							<select
								id='rep-det-tipo-adm'
								className={c.select}
								value={tipoAdmision}
								onChange={(e) => setTipoAdmision(e.target.value)}
								disabled={ocupado}
								aria-label='Tipo de admisión'
							>
								<option value=''>Todas</option>
								{tiposAdmision.map((t) => (
									<option key={t.valor} value={t.valor}>
										{t.descripcion || t.valor}
									</option>
								))}
							</select>
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Admisiones</h3>
								<span className={c.reporteMeta}>
									{todasLasAdmisiones
										? `${visitasFiltradas.length} en total`
										: `${visitasSel.length} seleccionada${visitasSel.length === 1 ? '' : 's'}`}
								</span>
							</div>
							<div className={c.reporteSegmento} role='group' aria-label='Alcance de admisiones'>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${todasLasAdmisiones ? c.reporteSegBtnOn : ''}`}
									onClick={() => {
										setTodasLasAdmisiones(true);
										setVisitasSel([]);
									}}
									disabled={ocupado}
								>
									Todas
								</button>
								<button
									type='button'
									className={`${c.reporteSegBtn} ${!todasLasAdmisiones ? c.reporteSegBtnOn : ''}`}
									onClick={() => setTodasLasAdmisiones(false)}
									disabled={ocupado || visitasFiltradas.length === 0}
								>
									Elegir
								</button>
							</div>
							{!todasLasAdmisiones ? (
								<div className={c.reporteLista} role='group' aria-label='Elegir admisiones'>
									{visitasFiltradas.length === 0 ? (
										<p className={c.reporteHint}>No hay admisiones para este tipo.</p>
									) : (
										visitasFiltradas.map((v) => {
											const on = visitasSel.includes(v.numeroVisita);
											return (
												<button
													key={v.numeroVisita}
													type='button'
													className={`${c.reporteFila} ${on ? c.reporteFilaOn : ''}`}
													onClick={() => toggleVisita(v.numeroVisita)}
													disabled={ocupado}
													aria-pressed={on}
												>
													<span className={c.reporteMark} aria-hidden>
														✓
													</span>
													<span className={c.reporteMono}>{v.numeroVisita}</span>
													<span className={c.reporteFilaTxt}>{v.paciente.nombre || 'Sin paciente'}</span>
												</button>
											);
										})
									)}
								</div>
							) : null}
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Conceptos</h3>
								<span className={c.reporteMeta}>
									{rubrosActivos} de {RUBROS.length}
								</span>
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
									<span className={c.reporteChipLabel}>Saltar hoja por admisión</span>
								</button>
								<button
									type='button'
									className={`${c.reporteChip} ${incluirValorizacion ? c.reporteChipOn : ''}`}
									onClick={() => setIncluirValorizacion((v) => !v)}
									disabled={ocupado}
									aria-pressed={incluirValorizacion}
								>
									<span className={c.reporteMark} aria-hidden>
										✓
									</span>
									<span className={c.reporteChipLabel}>Incluir valorización</span>
								</button>
							</div>
						</section>

						<section className={c.reporteSeccion}>
							<div className={c.reporteSeccionHead}>
								<h3 className={c.reporteSeccionTitulo}>Tipos de práctica</h3>
								<div className={c.reporteListaAcciones}>
									<button
										type='button'
										className={c.reporteLinkBtn}
										onClick={() => setLetrasSel(new Set(letras.map((l) => l.valor)))}
										disabled={ocupado || !letras.length}
									>
										Todas
									</button>
									<button
										type='button'
										className={c.reporteLinkBtn}
										onClick={() => setLetrasSel(new Set())}
										disabled={ocupado || !letras.length}
									>
										Ninguna
									</button>
								</div>
							</div>
							{letras.length === 0 ? (
								<p className={c.reporteHint}>No hay letras cargadas en Facturación › Tablas.</p>
							) : (
								<div className={c.reportePracticas} role='group' aria-label='Tipos de práctica'>
									{letras.map((l) => {
										const on = letrasSel.has(l.valor);
										return (
											<button
												key={l.valor}
												type='button'
												className={`${c.reportePractica} ${on ? c.reportePracticaOn : ''}`}
												onClick={() => toggleLetra(l.valor)}
												disabled={ocupado}
												aria-pressed={on}
											>
												<span className={c.reporteMark} aria-hidden>
													✓
												</span>
												<span className={c.reportePracticaLetra}>{l.valor}</span>
												<span className={c.reportePracticaDesc}>{tituloPractica(l.descripcion)}</span>
											</button>
										);
									})}
								</div>
							)}
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
