'use client';

import ConfigOpcGrdTables from '@/app/components/opcGrd/ConfigOpcGrdTables';

export default function BillingTablesPage() {
	return (
		<ConfigOpcGrdTables
			rubro="FACTURACION"
			title="Tablas de Facturación"
			description="Configuración de opciones del módulo de facturación"
		/>
	);
}
