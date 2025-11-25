'use client';

import { useState, useEffect } from 'react';
import { useRendiciones } from '../../../hooks/useRendiciones';
import { Rendicion } from '../../../types/RendicionInterface';
import RendicionList from '../../../components/Rendiciones/RendicionList';
import RendicionFilters from '../../../components/Rendiciones/RendicionFilters';
import styles from './rendiciones.module.css';
import { formatDate as formatClarionDate } from '../../../utils/dateUtils';

export default function RendicionesPage() {
	const {
		rendiciones,
		loading,
		error,
		selectedRendicion,
		searchTerm,
		currentPage,
		totalPages,
		totalCount,
		initialized,
		estadoFilter,
		periodoFilter,
		isAddModalOpen,
		isEditModalOpen,
		isDeleteModalOpen,
		isViewModalOpen,
		handlePageChange,
		handleSearch,
		handleEstadoFilterChange,
		handlePeriodoFilterChange,
		createRendicion,
		updateRendicion,
		deleteRendicion,
		initializeRendiciones,
		openAddModal,
		closeAddModal,
		openEditModal,
		closeEditModal,
		openDeleteModal,
		closeDeleteModal,
		openViewModal,
		closeViewModal,
	} = useRendiciones();

	const handleView = (rendicion: Rendicion) => {
		openViewModal(rendicion);
	};

	const handleEdit = (rendicion: Rendicion) => {
		openEditModal(rendicion);
	};

	const handleDelete = (rendicion: Rendicion) => {
		openDeleteModal(rendicion);
	};

	const handleClose = (rendicion: Rendicion) => {
		// TODO: Implementar funcionalidad de cerrar rendición
		console.log('Cerrar rendición:', rendicion.IdRendicion);
	};

	// Función para exportar a CSV
	const handleExportToExcel = () => {
		const dataToExport = rendiciones.map((rendicion: Rendicion) => {
			const total =
				(rendicion.Honorarios || 0) +
				(rendicion.Gastos || 0) +
				(rendicion.Medicamentos || 0) +
				(rendicion.OtrosServicios || 0);

			return {
				ID: rendicion.IdRendicion,
				Cliente: rendicion.ClienteRazonSocial || '-',
				'ID Cliente': rendicion.idCliente,
				'Convenio Descripción': rendicion.ConvenioDescripcion || '-',
				Período: formatClarionDate(rendicion.Periodo, { isClarionDate: true }),
				Honorarios: rendicion.Honorarios || 0,
				Gastos: rendicion.Gastos || 0,
				Medicamentos: rendicion.Medicamentos || 0,
				'Otros Servicios': rendicion.OtrosServicios || 0,
				Total: total,
				'Fecha Grabación': rendicion.FechaGraba
					? new Date(rendicion.FechaGraba).toLocaleDateString('es-AR')
					: '-',
				Estado: rendicion.FechaCierre ? 'Cerrada' : 'Abierta',
				'Fecha Cierre': rendicion.FechaCierre
					? new Date(rendicion.FechaCierre).toLocaleDateString('es-AR')
					: '-',
			};
		});

		// Convertir a CSV con punto y coma como separador (estándar español)
		const headers = Object.keys(dataToExport[0] || {});
		const csvContent = [
			headers.join(';'),
			...dataToExport.map((row) =>
				headers.map((header) => {
					const value = row[header as keyof typeof row];
					// Escapar valores que contienen punto y coma o comillas
					if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				}).join(';')
			),
		].join('\r\n');

		// Crear y descargar archivo con BOM para UTF-8
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		const fecha = new Date().toISOString().split('T')[0];
		link.setAttribute('href', url);
		link.setAttribute('download', `rendiciones_${fecha}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Inicializar datos al montar el componente
	useEffect(() => {
		if (!initialized) {
			initializeRendiciones();
		}
	}, [initialized, initializeRendiciones]);

	return (
		<div className={styles.container}>
			<h1 className={styles.title}>Gestión de Rendiciones</h1>
			<div className={styles.content}>
				<div className={styles.controls}>
					<RendicionFilters
						searchTerm={searchTerm}
						setSearchTerm={handleSearch}
						estadoFilter={estadoFilter}
						setEstadoFilter={handleEstadoFilterChange}
						periodoFilter={periodoFilter}
						setPeriodoFilter={handlePeriodoFilterChange}
						loading={loading}
						error={error}
					/>
					<div className={styles.actionButtons}>
						<button
							className={styles.exportButton}
							onClick={handleExportToExcel}
							aria-label='Exportar a Excel'
							disabled={rendiciones.length === 0}
						>
							📊 Exportar a Excel
						</button>
						<button
							className={styles.addButton}
							onClick={openAddModal}
							aria-label='Agregar nueva rendición'
						>
							<span className={styles.addIcon}>➕</span> Agregar rendición
						</button>
					</div>
				</div>

				<div className={styles.statsContainer}>
					<div className={styles.statCard}>
						<span className={styles.statLabel}>Total de rendiciones</span>
						<span className={styles.statValue}>{totalCount}</span>
					</div>
					<div className={styles.statCard}>
						<span className={styles.statLabel}>En página actual</span>
						<span className={styles.statValue}>{rendiciones.length}</span>
					</div>
				</div>

				<RendicionList
					rendiciones={rendiciones}
					loading={loading}
					error={error}
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={handlePageChange}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onView={handleView}
					onClose={handleClose}
				/>

				{/* TODO: Implementar modales para agregar, editar, eliminar y ver detalles */}
				{isAddModalOpen && (
					<div className={styles.modalPlaceholder}>
						<p>Modal de agregar rendición (por implementar)</p>
						<button onClick={closeAddModal}>Cerrar</button>
					</div>
				)}

				{isEditModalOpen && selectedRendicion && (
					<div className={styles.modalPlaceholder}>
						<p>Modal de editar rendición {selectedRendicion.IdRendicion} (por implementar)</p>
						<button onClick={closeEditModal}>Cerrar</button>
					</div>
				)}

				{isDeleteModalOpen && selectedRendicion && (
					<div className={styles.modalPlaceholder}>
						<p>¿Confirmar eliminación de rendición {selectedRendicion.IdRendicion}?</p>
						<button onClick={() => deleteRendicion(selectedRendicion.IdRendicion)}>
							Eliminar
						</button>
						<button onClick={closeDeleteModal}>Cancelar</button>
					</div>
				)}

				{isViewModalOpen && selectedRendicion && (
					<div className={styles.modalPlaceholder}>
						<h3>Detalles de Rendición {selectedRendicion.IdRendicion}</h3>
						<p>Cliente: {selectedRendicion.ClienteRazonSocial}</p>
						<p>
							Convenio: {selectedRendicion.ConvenioNumero} {selectedRendicion.ConvenioDescripcion}
						</p>
						<p>Honorarios: ${selectedRendicion.Honorarios}</p>
						<p>Gastos: ${selectedRendicion.Gastos}</p>
						<button onClick={closeViewModal}>Cerrar</button>
					</div>
				)}
			</div>
		</div>
	);
}
