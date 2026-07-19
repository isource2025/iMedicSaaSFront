'use client';

import ConfigOpcGrdTables from '@/app/components/opcGrd/ConfigOpcGrdTables';

export default function BedsTablesPage() {
	return (
		<ConfigOpcGrdTables
			rubro="INTERNACION"
			title="Tablas de Internación"
			description="Configuración de opciones del módulo de internación"
		/>
	);
}
