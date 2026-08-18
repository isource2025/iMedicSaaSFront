"use client";

import React, { useMemo } from "react";
import { useBedDetail } from "../contexts/BedDetailContext";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import styles from "../indicaciones/IndicacionesSection.module.css";
import tStyles from "./MovimientosSection.module.css";
import BedSectionLoading from "../shared/BedSectionLoading";
import EmptyState from "../shared/EmptyState";
import ExportButton, { ExportOption } from "../shared/ExportButton";
import { exportToPDF } from "../../../utils/pdfExport";
import { obtenerInfoEmpresa } from "../../../services/empresaService";
import { clarionDateToISO, horaMostrada, isoCalendarioADmy } from "../../../utils/dateUtils";

interface MovimientosProps {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
}

function formatClarionDate(v: number | null | undefined): string {
	const iso = clarionDateToISO(v);
	return iso ? isoCalendarioADmy(iso) : "—";
}

function esCodigoCrudo(valor: string): boolean {
	const v = valor.trim();
	if (!v) return true;
	if (/^\d+$/.test(v)) return true;
	if (/^[A-Z][0-9][0-9A-Z.]{1,6}$/i.test(v)) return true;
	return false;
}

function nombreOperador(m: Record<string, unknown>): string {
	const nombre = String(m.OperadorNombre || m.NombreOperador || "").trim();
	if (nombre && !esCodigoCrudo(nombre)) return nombre;
	return "—";
}

function diagnosticoTexto(m: Record<string, unknown>): string {
	const desc = String(m.DiagnosticoDescripcion || "").trim();
	if (desc && !esCodigoCrudo(desc)) return desc;
	return "—";
}

export default function MovimientosSection({
	numeroVisita,
	patientName,
	patientLocation,
	documentoPaciente,
	fechaIngreso,
	horaIngreso,
}: MovimientosProps) {
	const { activeSection, selectedDate } = useBedDetail();

	const movPath = useMemo(
		() =>
			numeroVisita ? `/visita-movimientos/visita/${numeroVisita}` : undefined,
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
		enabled: !!movPath && activeSection === "movimientos",
		endpointOverride: movPath ? { movimientos: movPath } : undefined,
		cacheTimeMs: 30000,
	});

	const movimientos: any[] = useMemo(() => {
		if (!data) return [];
		if (Array.isArray(data)) return data;
		if (Array.isArray(data.data)) return data.data;
		if (data && typeof data === "object") return [data];
		return [];
	}, [data]);

	const formatSelectedDate = () => {
		if (!selectedDate) return null;
		const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
		const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
		return {
			diaSemana: dias[selectedDate.getDay()],
			diaMes: selectedDate.getDate(),
			mes: meses[selectedDate.getMonth()],
		};
	};
	const fechaFormateada = formatSelectedDate();

	const handleExport = async (option: ExportOption) => {
		if (option === "pdf") {
			const empresaInfo = await obtenerInfoEmpresa();
			const parts = movimientos.map((m, idx) => ({
				title: `Movimiento ${idx + 1}`,
				fields: [
					{ label: "Cama", value: m.NombreCama || m.ValorHabitacionCama || "—" },
					{ label: "Sector", value: m.NombreSector || m.ValorSector || "—" },
					{
						label: "Ingreso",
						value: `${m.FechaAdmisionISO ? isoCalendarioADmy(m.FechaAdmisionISO) : formatClarionDate(m.FechaAdmision)} ${horaMostrada(m.HoraAdmisionISO || m.HoraAdmision)}`.trim(),
					},
					{
						label: "Egreso",
						value: `${m.FechaEgresoISO ? isoCalendarioADmy(m.FechaEgresoISO) : formatClarionDate(m.FechaEgreso)} ${horaMostrada(m.HoraEgresoISO || m.HoraEgreso)}`.trim(),
					},
					{
						label: "Operador",
						value: nombreOperador(m),
					},
					{
						label: "Disposición",
						value:
							m.DisposicionEgreso && Number(m.DisposicionEgreso) > 0
								? String(m.DisposicionEgreso)
								: "—",
					},
					{ label: "Diagnóstico", value: diagnosticoTexto(m) },
				],
				profesional: {
					nombre: nombreOperador(m) !== "—" ? nombreOperador(m) : undefined,
					matricula:
						(m as any).OperadorEgreso ??
						(m as any).OperadorAdmision ??
						(m as any).Matricula ??
						undefined,
				},
			}));

			await exportToPDF({
				title: "Movimientos / Traslados",
				subtitle: `Visita: ${numeroVisita}`,
				parts,
				fileName: `movimientos_${numeroVisita}.pdf`,
				orientation: "portrait",
				empresaInfo,
				patientInfo: {
					numeroVisita: numeroVisita || undefined,
					nombre: patientName,
					numeroDocumento: documentoPaciente,
					ubicacion: patientLocation,
					fechaIngreso,
					horaIngreso,
				},
			});
		}
	};

	if (activeSection !== "movimientos") return null;

	if (isLoading) {
		return <BedSectionLoading />;
	}

	return (
		<div className={styles.root}>
			{/* Header */}
			{fechaFormateada && (
				<div className={styles.dateHeader}>
					<h2 className={styles.sectionTitle}>Movimientos</h2>
					<span className={styles.dateNumber}>{fechaFormateada.diaMes}</span>
					<span className={styles.dateText}>
						{fechaFormateada.diaSemana} {fechaFormateada.diaMes}, {fechaFormateada.mes}
					</span>
					<div className={styles.dateActions}>
						<ExportButton
							data={movimientos}
							fileName={`movimientos_${numeroVisita}.pdf`}
							onExport={handleExport}
							options={["pdf"]}
						/>
					</div>
				</div>
			)}

			<div className={styles.content}>
				<div className={styles.tableHolder}>
					{error && (
						<div className={styles.errorBox}>
							Error al cargar movimientos: {error.message}
							<button
								style={{ marginLeft: 12, fontSize: "0.8rem", cursor: "pointer" }}
								onClick={() => refetch()}
							>
								Reintentar
							</button>
						</div>
					)}
					{!isLoading && !error && movimientos.length === 0 && (
						<EmptyState
							variant="movimientos"
							text="Sin movimientos registrados"
							description="Esta visita no tiene traslados ni cambios de cama registrados."
						/>
					)}
					{!isLoading && !error && movimientos.length > 0 && (
						<div className={tStyles.tableWrap}>
							<table className={tStyles.table}>
								<thead>
									<tr>
										<th>#</th>
										<th>Operador</th>
										<th>Cama</th>
										<th>Sector</th>
										<th>Fecha ingreso</th>
										<th>Hora ingreso</th>
										<th>Fecha egreso</th>
										<th>Hora egreso</th>
										<th>Disposición</th>
										<th>Diagnóstico</th>
									</tr>
								</thead>
								<tbody>
									{movimientos.map((m, idx) => {
										const fechaAdm = m.FechaAdmisionISO
											? isoCalendarioADmy(m.FechaAdmisionISO)
											: formatClarionDate(m.FechaAdmision);
										const horaAdm = horaMostrada(m.HoraAdmisionISO || m.HoraAdmision);
										const fechaEg = m.FechaEgresoISO
											? isoCalendarioADmy(m.FechaEgresoISO)
											: formatClarionDate(m.FechaEgreso);
										const horaEg = horaMostrada(m.HoraEgresoISO || m.HoraEgreso);
										const abierto =
											!(Number(m.FechaEgreso) > 0) && !m.FechaEgresoISO;
										const esActual = idx === 0 && abierto;

										return (
									<tr key={idx} className={esActual ? tStyles.rowActual : ""}>
											<td className={tStyles.cellIdx}>
												{movimientos.length - idx}
												{esActual && <span className={tStyles.badgeActual}>actual</span>}
											</td>
											<td className={tStyles.cellOperador}>{nombreOperador(m)}</td>
											<td className={tStyles.cellCama}>
												{m.NombreCama || m.NumeroCama || m.ValorHabitacionCama || "—"}
											</td>
											<td>{m.NombreSector || m.ValorSector || "—"}</td>
											<td>{fechaAdm}</td>
											<td>{horaAdm}</td>
											<td>{fechaEg}</td>
											<td>{horaEg}</td>
											<td>{m.DisposicionEgreso && Number(m.DisposicionEgreso) > 0 ? String(m.DisposicionEgreso) : "—"}</td>
											<td className={tStyles.cellDiag}>{diagnosticoTexto(m)}</td>
										</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
