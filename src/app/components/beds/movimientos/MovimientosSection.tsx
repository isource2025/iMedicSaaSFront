"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBedDetail } from "../contexts/BedDetailContext";
import { usePermiso } from "../../../hooks/usePermiso";
import ModalIntercambiarCama from "../../modals/ModalIntercambiarCama";
import type { PatientHeaderSnapshot } from "../../../utils/bedHeader";
import { useBedSectionFetch } from "../contexts/useBedSectionQuery";
import styles from "../indicaciones/IndicacionesSection.module.css";
import movStyles from "./MovimientosSection.module.css";
import BedSectionLoading from "../shared/BedSectionLoading";
import EmptyState from "../shared/EmptyState";
import ExportButton, { ExportOption } from "../shared/ExportButton";
import { generarPDFMovimientos } from "../../../utils/pdfExportLazy";
import { obtenerInfoEmpresa } from "../../../services/empresaService";
import { getDisposicionesEgreso } from "../../../services/disposicionEgresoService";
import {
	catalogoDisposiciones,
	clasificarEstadoMovimiento,
	ordenarMovimientos,
	rangoMovimiento,
} from "./movimientosDisplay";
import PeriodFilter, { Periodo, filtrarPorRangoEnPeriodo } from "../shared/PeriodFilter";
import MovimientosTimelineTable from "./MovimientosTimelineTable";

interface MovimientosProps {
	numeroVisita: number | null;
	patientName?: string;
	patientLocation?: string;
	documentoPaciente?: string;
	fechaIngreso?: string;
	horaIngreso?: string;
	header?: PatientHeaderSnapshot | null;
	/** La visita sigue internada (sin egreso): habilita el intercambio de cama. */
	internado?: boolean;
}

export default function MovimientosSection({
	numeroVisita,
	patientName,
	patientLocation,
	documentoPaciente,
	fechaIngreso,
	horaIngreso,
	header,
	internado = false,
}: MovimientosProps) {
	const router = useRouter();
	const { activeSection, selectedDate } = useBedDetail();
	const { puede } = usePermiso();
	const puedeIntercambiar =
		internado &&
		!!numeroVisita &&
		(puede("INTERNACION.MOVIMIENTOS.TRASLADAR") || puede("INTERNACION.MOVIMIENTOS.GESTIONAR"));
	const [intercambioOpen, setIntercambioOpen] = useState(false);
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
		const ordenados = ordenarMovimientos(raw);
		return ordenados.map((m, idx) => ({
			...m,
			EstadoUi: clasificarEstadoMovimiento(m, idx, ordenados),
		}));
	}, [data]);

	const [periodo, setPeriodo] = useState<Periodo>("all");
	const movimientosVisibles = useMemo(
		() => filtrarPorRangoEnPeriodo(movimientos, periodo, rangoMovimiento),
		[movimientos, periodo],
	);

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
			await generarPDFMovimientos({
				items: movimientosVisibles,
				disposiciones: dispCatalogo,
				fileName: `movimientos_${numeroVisita}.pdf`,
				empresaInfo,
				patient: {
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
						{puedeIntercambiar && (
							<button
								type="button"
								className={`${styles.btn} ${styles.btnPrimary} ${styles.btnAddDate}`}
								onClick={() => setIntercambioOpen(true)}
								title="Intercambiar la cama con otro paciente internado"
							>
								⇄ Intercambiar cama
							</button>
						)}
						<ExportButton
							data={movimientosVisibles}
							fileName={`movimientos_${numeroVisita}.pdf`}
							onExport={handleExport}
							options={["pdf"]}
						/>
					</div>
				</div>
			)}

			<div className={`${styles.toolbar} ${movStyles.toolbarFilters}`}>
				<PeriodFilter value={periodo} onChange={setPeriodo} />
			</div>

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
					{!isLoading && !error && movimientosVisibles.length === 0 && (
						<EmptyState
							variant="movimientos"
							text={movimientos.length === 0 ? "Sin movimientos registrados" : "Sin resultados"}
							description={
								movimientos.length === 0
									? "Esta visita no tiene traslados ni cambios de cama registrados."
									: "No hay movimientos en el período elegido. Probá con otro período."
							}
						/>
					)}
					{!isLoading && !error && movimientosVisibles.length > 0 && (
						<MovimientosTimelineTable movimientos={movimientosVisibles} dispCatalogo={dispCatalogo} />
					)}
				</div>
			</div>

			{puedeIntercambiar && numeroVisita ? (
				<ModalIntercambiarCama
					isOpen={intercambioOpen}
					onClose={() => setIntercambioOpen(false)}
					numeroVisita={numeroVisita}
					header={header}
					onSuccess={(camaNueva) => {
						refetch();
						router.replace(`/dashboard/beds/${encodeURIComponent(camaNueva.id)}`);
					}}
				/>
			) : null}
		</div>
	);
}
