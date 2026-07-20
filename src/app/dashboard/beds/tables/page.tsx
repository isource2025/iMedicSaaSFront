'use client';

import ConfigOpcGrdTables from '@/app/components/opcGrd/ConfigOpcGrdTables';

export default function BedsTablesPage() {
	return (
		<ConfigOpcGrdTables
			rubro="INTERNACION"
			eyebrow="Internación"
			title="Tablas maestras"
			description="Catálogos y parámetros del circuito de internación"
		/>
	);
}
