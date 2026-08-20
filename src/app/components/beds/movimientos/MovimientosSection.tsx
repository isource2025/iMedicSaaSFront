"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBedDetail } from "../contexts/BedDetailContext";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import styles from "../indicaciones/IndicacionesSection.module.css";
import BedSectionLoading from "../shared/BedSectionLoading";
import EmptyState from "../shared/EmptyState";
import ExportButton, { ExportOption } from "../shared/ExportButton";
import { exportToPDF } from "../../../utils/pdfExport";
import { obtenerInfoEmpresa } from "../../../services/empresaService";
import { getDisposicionesEgreso } from "../../../services/disposicionEgresoService";
import {
	catalogoDisposiciones,
	clasificarEstadoMovimiento,
	diagnosticoTexto,
	disposicionTexto,
	etiquetaCama,
	etiquetaSector,
	fechaHoraEgreso,
	fechaHoraIngreso,
	nombreOperador,
	ordenarMovimientos,
} from "./movimientosDisplay";
import MovimientosTimelineTable from "./MovimientosTimelineTable";

interface MovimientosProps {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
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
	const [dispCatalogo, setDispCatalogo] = useState<Map<number, string>>(new Map());

	useEffect(() => {
		if (activeSection !== "movimientos") return;
		void getDisposicionesEgreso().then((rows) => {
			setDispCatalogo(catalogoDisposiciones(rows));
		});
	}, [activeSection]);

	const movPath = useMemo(
		() =>
			numeroVisita ? `/visita-movimientos/visita/${numeroVisita}` : undefined,
		[numeroVisita],
	);

	const { data, isLoading, error, refetch } = useBedSectionFetch<any>({
		enabled: !!movPath && activeSection === "movimientos",
		admissionId: numeroVisita ?? undefined,
		endpointOverride: movPath ? { movimientos: movPath } : undefined,
		cacheTimeMs: 30000,
	});

	const movimientos: any[] = useMemo(() => {
		let raw: any[] = [];
		if (!data) raw = [];
		else if (Array.isArray(data)) raw = data;
		else if (Array.isArray(data.data)) raw = data.data;
		else if (data && typeof data === "object") raw = [data];
		return ordenarMovimientos(raw);
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
					{
						label: "Estado",
						value: clasificarEstadoMovimiento(m, idx, movimientos),
					},
					{ label: "Cama", value: etiquetaCama(m) },
					{ label: "Sector", value: etiquetaSector(m) },
					{ label: "Fecha/Hora Ingreso", value: fechaHoraIngreso(m) },
					{ label: "Fecha/Hora Egreso", value: fechaHoraEgreso(m) },
					{ label: "Diagnóstico", value: diagnosticoTexto(m) },
					{ label: "Operador", value: nombreOperador(m) },
					{ label: "Disposición", value: disposicionTexto(m, dispCatalogo) },
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
						<MovimientosTimelineTable movimientos={movimientos} dispCatalogo={dispCatalogo} />
					)}
				</div>
			</div>
		</div>
	);
}
