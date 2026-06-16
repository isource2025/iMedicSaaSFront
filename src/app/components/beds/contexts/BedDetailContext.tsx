'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SidebarSection =
	| 'hcIngreso'
	| 'indicaciones'
	| 'evoluciones'
	| 'interconsulta'
	| 'solicitudEstudios'
	| 'protocolos'
	| 'epicrisis'
	| 'procedimientos'
	| 'movimientos'
	| 'medicacion-suministrada'
	| 'controles-frecuentes'
	| 'evolucion-enfermeria'
	| 'dieta'
	| 'balance-hidrico'
	| 'insumos'
	| 'informe_evo'
	| 'control'
	| 'adjuntos'
	| 'laboratorios';

interface BedDetailContextType {
	// Estado de los desplegables
	openSections: { [key: string]: boolean };
	setOpenSections: (sections: { [key: string]: boolean }) => void;

	// Sección activa
	activeSection: SidebarSection;
	setActiveSection: (section: SidebarSection) => void;

	// Fecha seleccionada
	selectedDate: Date | null;
	setSelectedDate: (date: Date | null) => void;

	// Función para cambiar sección (maneja navegación)
	navigateToSection: (section: SidebarSection) => void;

	// Función para toggle de desplegables (uno abierto a la vez) y manejo de panel fijo "otras"
	toggleSection: (sectionName: string, isCurrentlyOpen: boolean) => void;

	/** Resumen de adjuntos para destacar el ítem del menú (no equivale a push como en otros sistemas) */
	adjuntosTotalCount: number;
	adjuntosRecientesCount: number;
	setAdjuntosSidebarInfo: (total: number, recientes: number) => void;
}

const BedDetailContext = createContext<BedDetailContextType | undefined>(undefined);

interface BedDetailProviderProps {
	children: ReactNode;
	initialSection?: SidebarSection;
	initialDate?: Date | null;
}

export function BedDetailProvider({
	children,
	initialSection = 'hcIngreso',
	initialDate = new Date(),
}: BedDetailProviderProps) {
	const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
		medica: true, // Gestión médica abierta por defecto
		enfermeria: false,
		otras: true, // Panel "Otras Funciones" siempre visible (no es desplegable)
	});

	const [activeSection, setActiveSection] = useState<SidebarSection>(initialSection);
	const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
	const [adjuntosTotalCount, setAdjuntosTotalCount] = useState(0);
	const [adjuntosRecientesCount, setAdjuntosRecientesCount] = useState(0);

	const setAdjuntosSidebarInfo = (total: number, recientes: number) => {
		setAdjuntosTotalCount(total);
		setAdjuntosRecientesCount(recientes);
	};

	const navigateToSection = (section: SidebarSection) => {
		setActiveSection(section);
		// Aquí se puede agregar lógica de navegación/routing si es necesario
		console.log('Navegando a sección:', section);
	};

	const toggleSection = (sectionName: string, isCurrentlyOpen: boolean) => {
		// El panel "Otras Funciones" es fijo y siempre visible, no permite toggle
		if (sectionName === 'otras') {
			return;
		}
		//cerrar todo primero luego abrir la sección seleccionada, si se hace click en la sección que ya está abierta no se hace nada y se deja abierta

		setOpenSections((prev) => {
			const newState = { ...prev };

			// Si se hace click en una sección que ya está abierta, no hacer nada
			// (excepto "otras" que ya fue manejada arriba)
			if (isCurrentlyOpen) {
				return prev;
			}

			// Si se hace click en una sección cerrada:
			// 1. Cerrar TODAS las secciones desplegables (manteniendo "otras" siempre abierta)
			Object.keys(newState).forEach((key) => {
				if (key !== 'otras') {
					newState[key] = false;
				}
			});

			// 2. Abrir solo la sección clickeada
			newState[sectionName] = true;

			return newState;
		});
	};

	const value: BedDetailContextType = {
		openSections,
		setOpenSections,
		activeSection,
		setActiveSection,
		selectedDate,
		setSelectedDate,
		navigateToSection,
		toggleSection,
		adjuntosTotalCount,
		adjuntosRecientesCount,
		setAdjuntosSidebarInfo,
	};

	return <BedDetailContext.Provider value={value}>{children}</BedDetailContext.Provider>;
}

export function useBedDetail() {
	const context = useContext(BedDetailContext);
	if (context === undefined) {
		throw new Error('useBedDetail must be used within a BedDetailProvider');
	}
	return context;
}
