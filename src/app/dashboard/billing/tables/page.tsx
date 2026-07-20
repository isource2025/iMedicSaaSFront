'use client';

import ConfigOpcGrdTables from '@/app/components/opcGrd/ConfigOpcGrdTables';

export default function BillingTablesPage() {
	return (
		<ConfigOpcGrdTables
			rubro="FACTURACION"
			eyebrow="Facturación"
			title="Tablas maestras"
			description="Catálogos y parámetros del circuito de facturación"
		/>
	);
}
