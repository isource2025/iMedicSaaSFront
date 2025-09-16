import { useState } from 'react';

export type SidebarItemKey =
	| 'hcIngreso'
	| 'indicaciones'
	| 'evoluciones'
	| 'solicitudEstudios'
	| 'protocolos'
	| 'epicrisis'
	| 'procedimientos'
	| 'movimientos';

export function useIndicacionesFilters() {
	const [open, setOpen] = useState<{ [k: string]: boolean }>({
		medica: true,
		enfermeria: true,
		otras: true,
	});
	const [active, setActive] = useState<SidebarItemKey>('indicaciones');
	return { open, setOpen, active, setActive };
}
