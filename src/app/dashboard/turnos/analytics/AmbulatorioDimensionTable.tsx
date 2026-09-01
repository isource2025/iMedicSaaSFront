'use client';

import {
  ExpandableAnalyticsTable,
  type AnalyticsTableColumn,
} from '@/app/components/Analytics/ExpandableAnalyticsTable';
import type { DimensionAmbulatorio } from '@/app/types/ambulatorio';
import tableStyles from '@/app/components/Analytics/ExpandableAnalyticsTable.module.css';

function minutos(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1).replace('.', ',')} min`;
}

function pct(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

function claseAusentismo(valor: number | null | undefined): string {
  if (valor == null) return '';
  if (valor >= 20) return tableStyles.badgeAlto;
  if (valor >= 10) return tableStyles.badgeMedio;
  return tableStyles.badgeBajo;
}

function columnasBase(
  etiquetaCodigo: string,
): AnalyticsTableColumn<DimensionAmbulatorio>[] {
  return [
    {
      id: 'nombre',
      header: etiquetaCodigo,
      render: (f) => (
        <span className={tableStyles.nameCell}>
          {f.descripcion || <span className={tableStyles.muted}>Sin identificar</span>}
          {f.codigo && f.descripcion ? (
            <span className={tableStyles.muted}> · {f.codigo}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'agenda',
      header: 'Agenda',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => f.programados.toLocaleString(),
    },
    {
      id: 'demanda',
      header: 'A demanda',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => (f.aDemanda ?? 0).toLocaleString(),
    },
    {
      id: 'atendidos',
      header: 'Atendidos',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => f.atendidos.toLocaleString(),
    },
    {
      id: 'ausentes',
      header: 'Ausentes',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => f.ausentes.toLocaleString(),
    },
    {
      id: 'ausentismo',
      header: 'Ausentismo',
      align: 'right',
      className: (f) => `${tableStyles.numeric} ${claseAusentismo(f.tasaAusentismo)}`,
      render: (f) =>
        f.programados > 0 ? (
          pct(f.tasaAusentismo)
        ) : (
          <span className={tableStyles.muted}>No aplica</span>
        ),
    },
    {
      id: 'espera',
      header: 'Espera prom.',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => minutos(f.esperaProm),
    },
    {
      id: 'permanencia',
      header: 'Permanencia',
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => minutos(f.permanenciaProm),
    },
  ];
}

type AmbulatorioDimensionTableProps = {
  filas: DimensionAmbulatorio[];
  etiquetaCodigo: string;
  columnaExtra?: { titulo: string; valor: (f: DimensionAmbulatorio) => string };
};

export function AmbulatorioDimensionTable({
  filas,
  etiquetaCodigo,
  columnaExtra,
}: AmbulatorioDimensionTableProps) {
  const columns = columnasBase(etiquetaCodigo);

  if (columnaExtra) {
    columns.push({
      id: 'extra',
      header: columnaExtra.titulo,
      align: 'right',
      className: tableStyles.numeric,
      render: (f) => columnaExtra.valor(f),
    });
  }

  return (
    <ExpandableAnalyticsTable
      rows={filas}
      columns={columns}
      getRowKey={(f) => `${f.codigo}-${f.descripcion ?? ''}`}
      initialLimit={10}
    />
  );
}
