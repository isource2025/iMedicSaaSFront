'use client';

import { ExamenLabCompleto } from '@/app/types/laboratorios';
import { laboratoriosService } from '@/app/services/laboratoriosService';
import styles from './LabResultsTable.module.css';

interface LabResultsTableProps {
  examen: ExamenLabCompleto;
}

export default function LabResultsTable({ examen }: LabResultsTableProps) {
  return (
    <div className={styles.container}>
      {/* Información del examen */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Fecha:</span>
            <span className={styles.infoValue}>
              {laboratoriosService.formatDate(examen.FechaExamen)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Hora:</span>
            <span className={styles.infoValue}>
              {laboratoriosService.formatTime(examen.HoraExamen)}
            </span>
          </div>
          {examen.Laboratorio && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Laboratorio:</span>
              <span className={styles.infoValue}>{examen.Laboratorio}</span>
            </div>
          )}
          {examen.Protocolo && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Protocolo:</span>
              <span className={styles.infoValue}>{examen.Protocolo}</span>
            </div>
          )}
        </div>
        {examen.Observaciones && (
          <div className={styles.observaciones}>
            <span className={styles.infoLabel}>Observaciones:</span>
            <p>{examen.Observaciones}</p>
          </div>
        )}
      </div>

      {/* Tabla de resultados */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Resultado</th>
              <th>Unidad</th>
              <th>Valor de Referencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {examen.detalles && examen.detalles.length > 0 ? (
              examen.detalles.map((detalle, index) => (
                <tr key={detalle.IdDetalle || index}>
                  <td className={styles.parametroCell}>
                    {detalle.NombreParametro}
                    {detalle.Metodo && (
                      <span className={styles.metodo}>
                        Método: {detalle.Metodo}
                      </span>
                    )}
                  </td>
                  <td className={styles.resultadoCell}>
                    <span
                      className={styles.resultado}
                      style={{
                        color: detalle.FueraDeRango ? '#f59e0b' : '#10b981',
                        fontWeight: detalle.FueraDeRango ? 600 : 400
                      }}
                    >
                      {detalle.Resultado}
                    </span>
                  </td>
                  <td>{detalle.UnidadMedida || '-'}</td>
                  <td className={styles.referenciaCell}>
                    {detalle.ValorReferencia || 
                     (detalle.ValorMinimo && detalle.ValorMaximo 
                       ? `${detalle.ValorMinimo} - ${detalle.ValorMaximo}`
                       : '-'
                     )}
                  </td>
                  <td className={styles.estadoCell}>
                    {detalle.FueraDeRango ? (
                      <span className={styles.badgeWarning}>
                        ⚠️ Fuera de rango
                      </span>
                    ) : (
                      <span className={styles.badgeSuccess}>
                        ✓ Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  No hay parámetros registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      {examen.detalles && examen.detalles.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total de parámetros:</span>
            <span className={styles.summaryValue}>{examen.detalles.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Parámetros normales:</span>
            <span className={styles.summaryValue} style={{ color: '#10b981' }}>
              {examen.detalles.filter(d => !d.FueraDeRango).length}
            </span>
          </div>
          {examen.detalles.filter(d => d.FueraDeRango).length > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Parámetros fuera de rango:</span>
              <span className={styles.summaryValue} style={{ color: '#f59e0b' }}>
                {examen.detalles.filter(d => d.FueraDeRango).length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
