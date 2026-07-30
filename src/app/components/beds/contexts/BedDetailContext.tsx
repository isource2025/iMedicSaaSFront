'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Bed } from '../../../types/beds';

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

export interface BedDetailContextType {
	/** Cama/paciente actual — fuente de verdad para headers/modales */
	bed: Bed | null;
	setBed: (bed: Bed | null) => void;

	openSections: { [key: string]: boolean };
	setOpenSections: (sections: { [key: string]: boolean }) => void;

	activeSection: SidebarSection;
	setActiveSection: (section: SidebarSection) => void;

	selectedDate: Date | null;
	setSelectedDate: (date: Date | null) => void;

	navigateToSection: (section: SidebarSection) => void;
	toggleSection: (sectionName: string, isCurrentlyOpen: boolean) => void;

	adjuntosTotalCount: number;
	adjuntosRecientesCount: number;
	setAdjuntosSidebarInfo: (total: number, recientes: number) => void;
}

export const BedDetailContext = createContext<BedDetailContextType | undefined>(undefined);

interface BedDetailProviderProps {
	children: ReactNode;
	initialSection?: SidebarSection;
	initialDate?: Date | null;
	initialBed?: Bed | null;
}

export function BedDetailProvider({
	children,
	initialSection = 'hcIngreso',
	initialDate = new Date(),
	initialBed = null,
}: BedDetailProviderProps) {
	const [bed, setBed] = useState<Bed | null>(initialBed);
	const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
		medica: true,
		enfermeria: false,
		otras: true,
	});

	const [activeSection, setActiveSection] = useState<SidebarSection>(initialSection);
	const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
	const [adjuntosTotalCount, setAdjuntosTotalCount] = useState(0);
	const [adjuntosRecientesCount, setAdjuntosRecientesCount] = useState(0);

	useEffect(() => {
		if (initialBed) setBed(initialBed);
	}, [initialBed]);

	const setAdjuntosSidebarInfo = (total: number, recientes: number) => {
		setAdjuntosTotalCount(total);
		setAdjuntosRecientesCount(recientes);
	};

	const navigateToSection = (section: SidebarSection) => {
		setActiveSection(section);
	};

	const toggleSection = (sectionName: string, isCurrentlyOpen: boolean) => {
		if (sectionName === 'otras') return;

		setOpenSections((prev) => {
			if (isCurrentlyOpen) return prev;
			const newState = { ...prev };
			Object.keys(newState).forEach((key) => {
				if (key !== 'otras') newState[key] = false;
			});
			newState[sectionName] = true;
			return newState;
		});
	};

	const value: BedDetailContextType = {
		bed,
		setBed,
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
