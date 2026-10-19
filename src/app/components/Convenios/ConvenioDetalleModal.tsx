'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Calculator,
	Copy,
	FileDown,
	FileText,
	Percent,
	Pill,
	Save,
	Stethoscope,
	Syringe,
	type LucideIcon,
} from 'lucide-react';
import ConfirmDialog from '@/app/components/Agenda/ConfirmDialog';
import Modal from '@/app/components/UI/Modal';
import { useToast } from '@/app/components/UI/ToastProvider';
import { conveniosService, detallesDeError } from '@/app/services/conveniosService';
import { mensajeDeError } from '@/app/utils/apiError';
import { descargarLibroExcel } from '@/app/utils/export/libroExcel';
import type { CabeceraConvenio, CatalogosConvenio, ConvenioDetalle, PestanaId, UsoConvenio } from '@/app/types/convenios';
import ConvenioAjusteModal from './ConvenioAjusteModal';
import ConvenioCabeceraForm from './ConvenioCabeceraForm';
import ConvenioDuplicarModal from './ConvenioDuplicarModal';
import ConvenioGrilla from './ConvenioGrilla';
import { ESTADO_LABEL } from './conveniosFormato';
import { fmtFecha, fmtImporte, fmtNumero } from '@/app/components/Facturacion/formato';
import { libroDeConvenio } from './exportarConvenio';
import s from '@/app/components/admission/visitDetail/VisitDetail.module.css';
import c from '@/app/components/Facturacion/Facturacion.module.css';

type SeccionId = 'datos' | 'uso' | PestanaId;

const GRUPOS: { id: string; label: string; icono: LucideIcon; secciones: SeccionId[] }[] = [
	{ id: 'convenio', label: 'Convenio', icono: FileText, secciones: ['datos', 'uso'] },
	{ id: 'valores', label: 'Valores', icono: Calculator, secciones: ['valores'] },
	{ id: 'practicas', label: 'Prácticas', icono: Stethoscope, secciones: ['nomenclador', 'moduladas'] },
	{ id: 'medicamentos', label: 'Medicamentos', icono: Pill, secciones: ['vademecum', 'genericos'] },
	{ id: 'anestesia', label: 'Anestesia', icono: Syringe, secciones: ['complejidad'] },
];

const ETIQUETAS: Record<'datos' | 'uso', string> = { datos: 'Datos generales', uso: 'Uso en facturación' };

const ESTADO_PILL: Record<string, string> = {
	vigente: s.statusActivo,
	vencido: s.statusEgresado,
};

interface Props {
	codigo: number | null;
	catalogos: CatalogosConvenio | null;
	permisos: { crear: boolean; editar: boolean };
	onClose: () => void;
	/** Algo cambió (cabecera, filas o ajuste): el listado tiene que refrescarse. */
	onCambio: () => void;
	onAbrirOtro: (codigo: number) => void;
}

type Navegacion = { tipo: 'seccion'; id: SeccionId } | { tipo: 'cerrar' };

/** Hay otro diálogo encima (picker, confirmación): Escape tiene que cerrar ese, no el detalle. */
const hayDialogoEncima = () =>
	typeof document !== 'undefined' &&
	(document.querySelectorAll('[role="dialog"]').length > 1 || Boolean(document.querySelector('[role="alertdialog"]')));

export default function ConvenioDetalleModal({ codigo, catalogos, permisos, onClose, onCambio, onAbrirOtro }: Props) {
	const toast = useToast();
	const [detalle, setDetalle] = useState<ConvenioDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uso, setUso] = useState<UsoConvenio[] | null>(null);
	const [seccion, setSeccion] = useState<SeccionId>('datos');
	const [pendientesGrilla, setPendientesGrilla] = useState(0);
	const [borrador, setBorrador] = useState<CabeceraConvenio | null>(null);
	const [guardandoCab, setGuardandoCab] = useState(false);
	const [errorCab, setErrorCab] = useState<{ mensaje: string; detalles: string[] } | null>(null);
	const [navPendiente, setNavPendiente] = useState<Navegacion | null>(null);
	const [ajusteAbierto, setAjusteAbierto] = useState(false);
	const [duplicarAbierto, setDuplicarAbierto] = useState(false);
	const [exportando, setExportando] = useState(false);
	const [versionGrilla, setVersionGrilla] = useState(0);

	const cargar = useCallback(
		async (silencioso = false) => {
			if (!codigo) return;
			if (!silencioso) setCargando(true);
			setError(null);
			try {
				const d = await conveniosService.obtener(codigo);
				setDetalle(d);
				if (!silencioso) setBorrador(d.cabecera);
			} catch (e) {
				setError(mensajeDeError(e, 'No se pudo cargar el convenio'));
			} finally {
				setCargando(false);
			}
		},
		[codigo],
	);

	useEffect(() => {
		setDetalle(null);
		setBorrador(null);
		setUso(null);
		setSeccion('datos');
		setPendientesGrilla(0);
		setErrorCab(null);
		if (!codigo) return;
		cargar();
		conveniosService
			.uso(codigo)
			.then(setUso)
			.catch(() => setUso([]));
	}, [codigo, cargar]);

	const cabeceraSucia = useMemo(
		() => Boolean(detalle && borrador && JSON.stringify(borrador) !== JSON.stringify(detalle.cabecera)),
		[detalle, borrador],
	);
	const pendientes = (seccion === 'datos' ? (cabeceraSucia ? 1 : 0) : pendientesGrilla);

	const ejecutarNav = (n: Navegacion) => {
		setPendientesGrilla(0);
		if (detalle) setBorrador(detalle.cabecera);
		setErrorCab(null);
		if (n.tipo === 'cerrar') onClose();
		else setSeccion(n.id);
	};
	const navegar = (n: Navegacion) => {
		if (n.tipo === 'seccion' && n.id === seccion) return;
		if (pendientes > 0) setNavPendiente(n);
		else ejecutarNav(n);
	};
	const pedirCierre = () => {
		if (hayDialogoEncima()) return;
		navegar({ tipo: 'cerrar' });
	};

	const guardarCabecera = async () => {
		if (!detalle || !borrador) return;
		setGuardandoCab(true);
		setErrorCab(null);
		try {
			const d = await conveniosService.actualizar(detalle.codigo, borrador);
			setDetalle(d);
			setBorrador(d.cabecera);
			toast.success('Datos del convenio guardados.');
			onCambio();
		} catch (e) {
			setErrorCab({ mensaje: mensajeDeError(e, 'No se pudieron guardar los datos'), detalles: detallesDeError(e) });
		} finally {
			setGuardandoCab(false);
		}
	};

	const exportar = async () => {
		if (!detalle || !catalogos) return;
		setExportando(true);
		try {
			const exp = await conveniosService.exportar(detalle.codigo);
			await descargarLibroExcel(libroDeConvenio(exp, catalogos));
		} catch (e) {
			toast.error(mensajeDeError(e, 'No se pudo generar el Excel'));
		} finally {
			setExportando(false);
		}
	};

	const alGuardarGrilla = useCallback(() => {
		cargar(true);
		onCambio();
	}, [cargar, onCambio]);

	const pestanaDef = catalogos?.pestanas.find((p) => p.id === seccion) ?? null;
	const usosTotales = uso?.reduce((a, u) => a + u.cantidad, 0) ?? null;
	const visitas = uso?.find((u) => u.id === 'visitas')?.cantidad;

	const etiqueta = (id: SeccionId) => (id === 'datos' || id === 'uso' ? ETIQUETAS[id] : catalogos?.pestanas.find((p) => p.id === id)?.titulo || id);
	const conteo = (id: SeccionId): number | null => {
		if (id === 'datos') return null;
		if (id === 'uso') return usosTotales;
		return detalle?.conteos[id] ?? 0;
	};

	const titulo = codigo ? `Convenio #${codigo}` : 'Convenio';
	const cab = detalle?.cabecera;
	const hechos: [string, string][] = detalle
		? [
				['Obra social', detalle.obraSocial.valor === 0 ? 'Convenio general' : detalle.obraSocial.razonSocial || `#${detalle.obraSocial.valor}`],
				['Vigencia desde', fmtFecha(detalle.vigenciaDesde) || '—'],
				['Vigencia hasta', fmtFecha(detalle.vigenciaHasta) || (detalle.vigenciaDesde ? 'Sin fin' : '—')],
				['Cob. honorarios', fmtImporte(cab?.CoberturaHonorarios ?? 0)],
				['Cob. gastos', fmtImporte(cab?.CoberturaGastos ?? 0)],
				['Visitas', visitas === undefined ? '…' : fmtNumero(visitas)],
		  ]
		: [];

	return (
		<>
			<Modal isOpen={codigo !== null} onClose={pedirCierre} title={titulo} size='full'>
				<div className={c.modalBody} style={{ flex: 1, minHeight: 0 }}>
					{cargando ? (
						<div className={s.stateBox} role='status'>
							<span className={s.spinner} aria-hidden />
							<span>Cargando el convenio…</span>
						</div>
					) : !detalle || !catalogos ? (
						<p className={s.empty}>{error || 'No se pudo cargar el convenio.'}</p>
					) : (
						<div className={s.root}>
							<header className={s.header}>
								<div className={s.headerTop}>
									<div className={s.identity}>
										<div className={s.identityLine}>
											<h3 className={s.patientName}>{detalle.descripcion || 'Sin descripción'}</h3>
											<span className={`${s.statusPill} ${ESTADO_PILL[detalle.estado] || ''}`}>{ESTADO_LABEL[detalle.estado]}</span>
											{detalle.multiConvenio ? <span className={s.statusPill}>Multiconvenio</span> : null}
										</div>
										<p className={s.identityMeta}>
											<span>
												Convenio <strong>#{detalle.codigo}</strong>
											</span>
											<span>
												Obra social <strong>{detalle.obraSocial.valor}</strong>
											</span>
											{usosTotales !== null ? (
												<span>
													Usado en <strong>{fmtNumero(usosTotales)}</strong> registros
												</span>
											) : null}
										</p>
									</div>
									<div className={s.headerActions}>
										<button type='button' className={s.ghostBtn} onClick={pedirCierre}>
											← Volver al listado
										</button>
										<button type='button' className={s.primaryBtn} onClick={exportar} disabled={exportando}>
											<FileDown size={16} aria-hidden />
											{exportando ? 'Generando…' : 'Exportar Excel'}
										</button>
										{permisos.crear ? (
											<button
												type='button'
												className={s.primaryBtn}
												onClick={() => setDuplicarAbierto(true)}
												disabled={pendientes > 0}
												title={pendientes > 0 ? 'Guardá o descartá los cambios antes de duplicar' : undefined}
											>
												<Copy size={16} aria-hidden />
												Duplicar
											</button>
										) : null}
										{permisos.editar ? (
											<button
												type='button'
												className={s.primaryBtn}
												onClick={() => setAjusteAbierto(true)}
												disabled={pendientes > 0}
												title={pendientes > 0 ? 'Guardá o descartá los cambios antes de ajustar' : undefined}
											>
												<Percent size={16} aria-hidden />
												Ajustar valores
											</button>
										) : null}
									</div>
								</div>
								<dl className={s.facts}>
									{hechos.map(([k, v]) => (
										<div key={k} className={s.fact}>
											<dt>{k}</dt>
											<dd title={v}>{v}</dd>
										</div>
									))}
								</dl>
							</header>

							<div className={s.layout}>
								<nav className={s.nav} aria-label='Secciones del convenio'>
									{GRUPOS.map((g) => {
										const Icono = g.icono;
										return (
											<div key={g.id} className={s.navGroup}>
												<span className={s.navGroupTitle}>
													<span className={s.navGroupLabel}>
														<Icono size={15} aria-hidden />
														{g.label}
													</span>
												</span>
												{g.secciones.map((id) => {
													const n = conteo(id);
													return (
														<button
															key={id}
															type='button'
															className={`${s.navItem} ${seccion === id ? s.navItemActive : ''} ${n === 0 ? s.navItemEmpty : ''}`}
															onClick={() => navegar({ tipo: 'seccion', id })}
															aria-current={seccion === id ? 'page' : undefined}
														>
															<span>{etiqueta(id)}</span>
															{n !== null ? <span className={s.navCount}>{fmtNumero(n)}</span> : null}
														</button>
													);
												})}
											</div>
										);
									})}
								</nav>

								<div className={s.main}>
									<section aria-labelledby='conv-seccion'>
										<div className={s.sectionHead}>
											<div>
												<span className={s.sectionGroup}>{GRUPOS.find((g) => g.secciones.includes(seccion))?.label}</span>
												<h3 id='conv-seccion' className={s.sectionTitle}>
													{etiqueta(seccion)}
												</h3>
											</div>
											{conteo(seccion) !== null ? <span className={s.countPill}>{fmtNumero(conteo(seccion))}</span> : null}
										</div>

										{seccion === 'datos' && borrador ? (
											<>
												<ConvenioCabeceraForm valor={borrador} onChange={setBorrador} catalogos={catalogos} disabled={!permisos.editar || guardandoCab} />
												{errorCab ? (
													<div className={c.error} role='alert' style={{ marginTop: 12 }}>
														{errorCab.mensaje}
														{errorCab.detalles.length > 1 ? (
															<ul className={c.errorList}>
																{errorCab.detalles.map((d) => (
																	<li key={d}>{d}</li>
																))}
															</ul>
														) : null}
													</div>
												) : null}
												{permisos.editar ? (
													<div className={c.footer} style={{ marginTop: 12 }}>
														{cabeceraSucia ? <span className={c.pendientes}>Cambios sin guardar</span> : null}
														<button type='button' className={c.btnGhost} onClick={() => setBorrador(detalle.cabecera)} disabled={!cabeceraSucia || guardandoCab}>
															Descartar
														</button>
														<button type='button' className={c.btnPrimary} onClick={guardarCabecera} disabled={!cabeceraSucia || guardandoCab}>
															<Save size={15} aria-hidden />
															{guardandoCab ? 'Guardando…' : 'Guardar datos'}
														</button>
													</div>
												) : null}
											</>
										) : null}

										{seccion === 'uso' ? (
											<>
												<p className={c.info} style={{ marginBottom: 12 }}>
													Registros de otras tablas que apuntan a este convenio. Los convenios no se borran desde la web: si uno ya no se usa,
													cerrale la vigencia.
												</p>
												{uso === null ? (
													<div className={s.stateBox} role='status'>
														<span className={s.spinner} aria-hidden />
														<span>Contando usos…</span>
													</div>
												) : (
													<div className={s.tableWrap}>
														<table className={s.table}>
															<thead>
																<tr>
																	<th>Dónde</th>
																	<th>Tabla</th>
																	<th className={s.colNum}>Registros</th>
																</tr>
															</thead>
															<tbody>
																{uso.map((u) => (
																	<tr key={u.id} className={u.cantidad ? '' : s.rowMuted}>
																		<td>{u.etiqueta}</td>
																		<td className={c.subtexto}>
																			{u.tabla}.{u.columna}
																		</td>
																		<td className={s.colNum}>{fmtNumero(u.cantidad)}</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												)}
											</>
										) : null}

										{pestanaDef ? (
											<ConvenioGrilla
												key={`${pestanaDef.id}-${versionGrilla}`}
												codigo={detalle.codigo}
												pestana={pestanaDef}
												catalogos={catalogos}
												puedeEditar={permisos.editar}
												onPendientes={setPendientesGrilla}
												onGuardado={alGuardarGrilla}
											/>
										) : null}
									</section>
								</div>
							</div>
						</div>
					)}
				</div>
			</Modal>

			<ConfirmDialog
				open={Boolean(navPendiente)}
				title='Cambios sin guardar'
				message={`Tenés ${pendientes > 1 ? `${pendientes} cambios` : 'cambios'} sin guardar en "${etiqueta(seccion)}". Si seguís se pierden.`}
				confirmLabel='Descartar y seguir'
				tone='danger'
				onCancel={() => setNavPendiente(null)}
				onConfirm={() => {
					const n = navPendiente;
					setNavPendiente(null);
					if (n) ejecutarNav(n);
				}}
			/>

			{detalle && catalogos ? (
				<>
					<ConvenioAjusteModal
						open={ajusteAbierto}
						convenio={detalle}
						catalogos={catalogos}
						onClose={() => setAjusteAbierto(false)}
						onAplicado={() => {
							cargar(true);
							setVersionGrilla((v) => v + 1);
							onCambio();
						}}
					/>
					<ConvenioDuplicarModal
						open={duplicarAbierto}
						convenio={detalle}
						catalogos={catalogos}
						onClose={() => setDuplicarAbierto(false)}
						onDuplicado={(nuevo) => {
							setDuplicarAbierto(false);
							onCambio();
							onAbrirOtro(nuevo);
						}}
					/>
				</>
			) : null}
		</>
	);
}
