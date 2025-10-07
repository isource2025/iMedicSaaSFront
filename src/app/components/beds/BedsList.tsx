'use client';
import { useBedsManagement } from '../../hooks/useBedsManagement';
import { useState, useEffect, useRef } from 'react';
import NursingReportModal from '../nursing/NursingReportModal';
import ModalEgresoPaciente from '../modals/ModalEgresoPaciente';
import ModalCambiarCama from '../modals/ModalCambiarCama';
import BedCard from './BedCard';
import BedFilters from './BedFilters';
import styles from './Bedslist.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { Bed } from '../../types/beds';
import { formatDate } from '../../utils/dateUtils';

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
		refreshBeds,
		autoRefresh,
		setAutoRefresh,
		refreshInterval,
		setRefreshInterval,
	} = useBedsManagement();

	const [nursingModalOpen, setNursingModalOpen] = useState(false);
	const [egresoModalOpen, setEgresoModalOpen] = useState(false);
	const [cambiarCamaModalOpen, setCambiarCamaModalOpen] = useState(false);
	const [selectedBed, setSelectedBed] = useState<{
		numeroVisita: number;
		nombrePaciente: string;
		id: string;
		sector: string;
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

	const handleNursingReport = (bed: Bed) => {
		// Validar que existan los datos mínimos requeridos
		if (!bed.numeroVisita || !bed.NombrePaciente) {
			console.warn('No hay datos suficientes para generar el parte de enfermería.');
			return;
		}
		setSelectedBed({
			numeroVisita: bed.numeroVisita!,
			nombrePaciente: bed.NombrePaciente!,
			id: bed.numeroCama,
			sector: bed.sector,
		});
		setNursingModalOpen(true);
	};

	const handleRecentIndications = (bedId: string) => {
		// Implementa la lógica de indicaciones recientes aquí
	};

	const handleChangeBed = (bedId: string, bedSector: string) => {
		// Encontrar la cama seleccionada
		const bed = beds.find((bed) => bed.id === bedId && bed.sector === bedSector);

		// Encontrar la información completa del sector
		const sectorInfo = sectors.find((sector) => sector.valor === bedSector);
		console.log('Sector encontrado:', sectorInfo);

		// Abrir el modal solo si la cama está ocupada y tiene un número de visita
		if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
			setSelectedBed({
				numeroVisita: bed.numeroVisita,
				nombrePaciente: bed.NombrePaciente || 'Paciente',
				id: bed.numeroCama,
				sector: bed.sector,
			});

			// Guardar la información completa del sector
			setSelectedSector(sectorInfo || null);

			setCambiarCamaModalOpen(true);
		} else {
			// Opcionalmente mostrar algún mensaje de error o aviso
			console.warn('No se puede cambiar de cama a un paciente que no está ingresado');
		}
	};

	const handleBedClick = (bedId: string) => {
		// Encontrar la cama seleccionada
		const selectedBed = beds.find((bed) => bed.id === bedId);

		// Solo navegar si la cama está ocupada
		if (selectedBed && selectedBed.estado === 'ocupada') {
			router.push(`/dashboard/beds/${bedId}`);
		}
	};

	const handleLabResults = (bedId: string) => {
		// Implementar la lógica para mostrar los resultados de laboratorio
		console.log('Mostrando resultados de laboratorio para la cama:', bedId);
		// Aquí se puede implementar la lógica para mostrar un modal o navegar a una página de resultados
	};

	const handleDischarge = (bedId: string) => {
		// Encontrar la cama seleccionada
		const bed = beds.find((bed) => bed.id === bedId);

		// Abrir el modal solo si la cama está ocupada y tiene un número de visita
		if (bed && bed.estado === 'ocupada' && bed.numeroVisita) {
			setSelectedBed({
				numeroVisita: bed.numeroVisita,
				nombrePaciente: bed.NombrePaciente || 'Paciente',
				id: bed.numeroCama,
				sector: bed.sector,
			});
			setEgresoModalOpen(true);
		} else {
			// Opcionalmente mostrar algún mensaje de error o aviso
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
				refreshBeds={handleRefreshBeds}
				autoRefresh={autoRefresh}
				setAutoRefresh={setAutoRefresh}
				refreshInterval={refreshInterval}
				setRefreshInterval={setRefreshInterval}
				lastUpdateTime={lastUpdateTime}
			/>
			{loading ? (
				<div className={styles.loadingState}>Cargando camas...</div>
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
				/>
			)}

			{egresoModalOpen && selectedBed && (
				<ModalEgresoPaciente
					isOpen={egresoModalOpen}
					onClose={() => setEgresoModalOpen(false)}
					numeroVisita={selectedBed.numeroVisita}
					bedId={selectedBed.id}
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
				/>
			)}
		</div>
	);
};

export default BedsList;
