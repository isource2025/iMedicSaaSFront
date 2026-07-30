'use client';
import { useBedsManagement } from '../../hooks/useBedsManagement';
import { useState, useEffect, useRef } from 'react';
import NursingReportModal from '../nursing/NursingReportModal';
import LabResultsModal from './laboratorios/LabResultsModal';
import ModalEgresoPaciente from '../modals/ModalEgresoPaciente';
import ModalCambiarCama from '../modals/ModalCambiarCama';
import BedCard from './BedCard';
import BedFilters from './BedFilters';
import styles from './Bedslist.module.css';
import Loader from '../Loader/Loader';
import { useRouter, useSearchParams } from 'next/navigation';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { Bed } from '../../types/beds';
import { formatDate } from '../../utils/dateUtils';
import { setBedSnapshot } from '../../utils/bedSnapshotCache';
import { bedToHeaderSnapshot, type PatientHeaderSnapshot } from '../../utils/bedHeader';

const BedsList = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const selectedBedId = searchParams.get('id');
	const {
		beds,
		allBeds,
		bedStates,
		sectors,
		serviciosMedicos,
		loading,
		error,
		filter,
		setFilter,
		sectorFilter,
		setSectorFilter,
		servicioFilter,
		setServicioFilter,
		searchTerm,
		setSearchTerm,
		tipoRecursoFilter,
		setTipoRecursoFilter,
		refreshBeds,
		autoRefresh,
		setAutoRefresh,
		refreshInterval,
		setRefreshInterval,
	} = useBedsManagement({ enableAutoRefresh: false });

	const [nursingModalOpen, setNursingModalOpen] = useState(false);
	const [labModalOpen, setLabModalOpen] = useState(false);
	const [egresoModalOpen, setEgresoModalOpen] = useState(false);
	const [cambiarCamaModalOpen, setCambiarCamaModalOpen] = useState(false);
	const [selectedBed, setSelectedBed] = useState<{
		numeroVisita: number;
		nombrePaciente: string;
		id: string;
		sector: string;
		header: PatientHeaderSnapshot | null;
	} | null>(null);
	const [selectedSector, setSelectedSector] = useState<{
		id: string;
		valor: string;
		descripcion: string;
	} | null>(null);
	const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
	const prevBedsSignatureRef = useRef<string | null>(null);

	// Actualizar el tiempo de última actualización cuando cambian las camas (evitando bucles por nuevas referencias)
	useEffect(() => {
		// Crear una firma estable basada en el contenido relevante de las camas
		const signature = JSON.stringify(
			(beds || []).map((b) => ({
				id: b.id,
				estado: b.estado,
				fechaIngreso: b.fechaIngreso,
				numeroVisita: b.numeroVisita,
			})),
		);
		if (prevBedsSignatureRef.current !== signature) {
			prevBedsSignatureRef.current = signature;
			setLastUpdateTime(Date.now());
		}
	}, [beds]);

	// Función para actualizar manualmente las camas
	const handleRefreshBeds = () => {
		refreshBeds();
		setLastUpdateTime(Date.now());
	};

	const pickSelected = (bed: Bed) => ({
		numeroVisita: bed.numeroVisita || bed.NumeroVisita || 0,
		nombrePaciente: bed.NombrePaciente || 'Paciente',
		id: bed.numeroCama,
		sector: bed.sector,
		header: bedToHeaderSnapshot(bed),
	});

	const handleNursingReport = (bed: Bed) => {
		if (!bed.numeroVisita || !bed.NombrePaciente) {
			console.warn('No hay datos suficientes para generar el parte de enfermería.');
			return;
		}
		setSelectedBed(pickSelected(bed));
		setNursingModalOpen(true);
	};

	const handleRecentIndications = (bedId: string) => {
		// Implementa la lógica de indicaciones recientes aquí
	};

	const handleChangeBed = (bedId: string, bedSector: string) => {
		const bed = beds.find((b) => b.id === bedId && b.sector === bedSector);
		const sectorInfo = sectors.find((sector) => sector.valor === bedSector);

		if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
			setSelectedBed(pickSelected(bed));
			setSelectedSector(sectorInfo || null);
			setCambiarCamaModalOpen(true);
		} else {
			console.warn('No se puede cambiar de cama a un paciente que no está ingresado');
		}
	};

	const handleBedClick = (bedId: string) => {
		const selected = beds.find((bed) => bed.id === bedId);
		if (selected && selected.estado === 'ocupada') {
			setBedSnapshot(selected);
			router.push(`/dashboard/beds/${bedId}`);
		}
	};

	const handleLabResults = (bedId: string) => {
		const bed = beds.find((item) => item.id === bedId);
		if (!bed || bed.estado !== 'ocupada' || !bed.numeroVisita) {
			console.warn('No hay datos suficientes para abrir resultados de laboratorio.');
			return;
		}
		setSelectedBed(pickSelected(bed));
		setLabModalOpen(true);
	};

	const handleDischarge = (bedId: string) => {
		const bed = beds.find((b) => b.id === bedId);
		if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
			setSelectedBed(pickSelected(bed));
			setEgresoModalOpen(true);
		} else {
			console.warn('No se puede iniciar el egreso para esta cama');
		}
	};

	return (
		<div className={styles.container}>
			<BedFilters
				placeHolder='Buscar por nombre, DNI, HC o admisión...'
				sectors={sectors}
				bedStates={bedStates}
				filter={filter}
				setFilter={setFilter}
				sectorFilter={sectorFilter}
				setSectorFilter={setSectorFilter}
				serviciosMedicos={(serviciosMedicos || []).filter(
					(s): s is string => typeof s === 'string',
				)}
				servicioFilter={servicioFilter}
				setServicioFilter={setServicioFilter}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				tipoRecursoFilter={tipoRecursoFilter}
				setTipoRecursoFilter={setTipoRecursoFilter}
				refreshBeds={handleRefreshBeds}
				autoRefresh={autoRefresh}
				setAutoRefresh={setAutoRefresh}
				refreshInterval={refreshInterval}
				setRefreshInterval={setRefreshInterval}
				lastUpdateTime={lastUpdateTime}
			/>
			{loading ? (
				<div style={{ position: 'relative', minHeight: '300px' }}>
					<Loader />
				</div>
			) : error ? (
				<div className={styles.errorState}>{error}</div>
			) : beds.length === 0 ? (
				<div className={styles.emptyState}>
					No se encontraron camas con los filtros seleccionados
				</div>
			) : (
				<div className={styles.bedsGrid}>
					{beds.map((bed) => (
						<BedCard
							key={bed.id}
							bed={bed}
							onNursingReport={handleNursingReport}
							onRecentIndications={() => handleRecentIndications(bed.id)}
							onChangeBed={() => handleChangeBed(bed.id, bed.sector)}
							onBedClick={() => handleBedClick(bed.id)}
							onLabResults={() => handleLabResults(bed.id)}
							onDischarge={() => handleDischarge(bed.id)}
						/>
					))}
				</div>
			)}
			{nursingModalOpen && selectedBed && (
				<NursingReportModal
					isOpen={nursingModalOpen}
					onClose={() => setNursingModalOpen(false)}
					numeroVisita={selectedBed.numeroVisita}
					nombrePaciente={selectedBed.nombrePaciente}
					header={selectedBed.header}
					bedSector={selectedBed.sector}
				/>
			)}

			{labModalOpen && selectedBed && (
				<LabResultsModal
					isOpen={labModalOpen}
					onClose={() => setLabModalOpen(false)}
					numeroVisita={selectedBed.numeroVisita}
					header={selectedBed.header}
				/>
			)}

			{egresoModalOpen && selectedBed && (
				<ModalEgresoPaciente
					isOpen={egresoModalOpen}
					onClose={() => setEgresoModalOpen(false)}
					numeroVisita={selectedBed.numeroVisita}
					bedId={selectedBed.id}
					header={selectedBed.header}
				/>
			)}

			{cambiarCamaModalOpen && selectedBed && (
				<ModalCambiarCama
					isOpen={cambiarCamaModalOpen}
					onClose={() => setCambiarCamaModalOpen(false)}
					numeroVisita={selectedBed.numeroVisita}
					bedId={selectedBed.id}
					bedSector={selectedBed.sector}
					sectorInfo={selectedSector}
					header={selectedBed.header}
				/>
			)}
		</div>
	);
};

export default BedsList;
