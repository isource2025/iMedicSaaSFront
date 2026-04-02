"use client";
import { useState, useMemo } from 'react';
import { ExamenLabCompleto } from '@/app/types/laboratorios';
import { laboratoriosService } from '@/app/services/laboratoriosService';
import LabParameterChart from './LabParameterChart';
import styles from './LabAnalysisView.module.css';

interface LabAnalysisViewProps {
  examenes: ExamenLabCompleto[];
}

interface ParameterData {
  parametro: string;
  valores: Array<{
    fecha: string;
    valor: number | null;
    valorReferencia?: string;
    unidad?: string;
  }>;
}

export default function LabAnalysisView({ examenes }: LabAnalysisViewProps) {
  const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState<string>('');
  const [parametroSeleccionado, setParametroSeleccionado] = useState<string>('');
  const [vistaActual, setVistaActual] = useState<'tabla' | 'grafico'>('tabla');

  // Agrupar exámenes por tipo de estudio
  const examenesPorTipo = useMemo(() => {
    const grupos: Record<string, ExamenLabCompleto[]> = {};
    examenes.forEach(examen => {
      if (!grupos[examen.TipoEstudio]) {
        grupos[examen.TipoEstudio] = [];
      }
      grupos[examen.TipoEstudio].push(examen);
    });
    // Ordenar por fecha descendente dentro de cada grupo
    Object.keys(grupos).forEach(tipo => {
      grupos[tipo].sort((a, b) => 
        new Date(b.FechaExamen).getTime() - new Date(a.FechaExamen).getTime()
      );
    });
    return grupos;
  }, [examenes]);

  // Obtener parámetros únicos del tipo de estudio seleccionado
  const parametrosDisponibles = useMemo(() => {
    if (!tipoEstudioSeleccionado) return [];
    
    const parametrosSet = new Set<string>();
    examenesPorTipo[tipoEstudioSeleccionado]?.forEach(examen => {
      examen.detalles.forEach(detalle => {
        parametrosSet.add(detalle.NombreParametro);
      });
    });
    
    return Array.from(parametrosSet).sort();
  }, [tipoEstudioSeleccionado, examenesPorTipo]);

  // Preparar datos para el gráfico del parámetro seleccionado
  const datosGrafico = useMemo(() => {
    if (!tipoEstudioSeleccionado || !parametroSeleccionado) return [];
    
    const datos: Array<{ fechaHora: string; valor: number | null; valorReferencia?: string }> = [];
    
    examenesPorTipo[tipoEstudioSeleccionado]?.forEach(examen => {
      const detalle = examen.detalles.find(d => d.NombreParametro === parametroSeleccionado);
      if (detalle) {
        const fecha = laboratoriosService.formatDate(examen.FechaExamen);
        const valor = parseFloat(detalle.Resultado);
        
        datos.push({
          fechaHora: fecha,
          valor: isNaN(valor) ? null : valor,
          valorReferencia: detalle.ValorReferencia
        });
      }
    });
    
    return datos.reverse(); // Invertir para mostrar cronológicamente
  }, [tipoEstudioSeleccionado, parametroSeleccionado, examenesPorTipo]);

  // Obtener unidad del parámetro seleccionado
  const unidadParametro = useMemo(() => {
    if (!tipoEstudioSeleccionado || !parametroSeleccionado) return '';
    
    const examen = examenesPorTipo[tipoEstudioSeleccionado]?.[0];
    const detalle = examen?.detalles.find(d => d.NombreParametro === parametroSeleccionado);
    return detalle?.UnidadMedida || '';
  }, [tipoEstudioSeleccionado, parametroSeleccionado, examenesPorTipo]);

  if (examenes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay exámenes de laboratorio para analizar</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Análisis de Laboratorios</h3>
        <p className={styles.subtitle}>Visualiza la evolución de parámetros por tipo de estudio</p>
      </div>

      {/* Selector de tipo de estudio */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Tipo de Estudio:</label>
          <select
            className={styles.select}
            value={tipoEstudioSeleccionado}
            onChange={(e) => {
              setTipoEstudioSeleccionado(e.target.value);
              setParametroSeleccionado('');
            }}
          >
            <option value="">Seleccione un tipo de estudio</option>
            {Object.keys(examenesPorTipo).map(tipo => (
              <option key={tipo} value={tipo}>
                {laboratoriosService.getTipoEstudioNombre(tipo)} ({examenesPorTipo[tipo].length})
              </option>
            ))}
          </select>
        </div>

        {tipoEstudioSeleccionado && (
          <>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Parámetro:</label>
              <select
                className={styles.select}
                value={parametroSeleccionado}
                onChange={(e) => setParametroSeleccionado(e.target.value)}
              >
                <option value="">Seleccione un parámetro</option>
                {parametrosDisponibles.map(param => (
                  <option key={param} value={param}>
                    {param}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${vistaActual === 'tabla' ? styles.active : ''}`}
                onClick={() => setVistaActual('tabla')}
              >
                📊 Tabla
              </button>
              <button
                className={`${styles.toggleButton} ${vistaActual === 'grafico' ? styles.active : ''}`}
                onClick={() => setVistaActual('grafico')}
                disabled={!parametroSeleccionado}
              >
                📈 Gráfico
              </button>
            </div>
          </>
        )}
      </div>

      {/* Contenido */}
      {tipoEstudioSeleccionado && (
        <div className={styles.content}>
          {vistaActual === 'tabla' ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Sector</th>
                    {parametrosDisponibles.slice(0, 8).map(param => (
                      <th key={param}>{param}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {examenesPorTipo[tipoEstudioSeleccionado].map((examen, idx) => (
                    <tr key={examen.IdExamen || idx}>
                      <td className={styles.dateCell}>
                        {laboratoriosService.formatDate(examen.FechaExamen)}
                      </td>
                      <td className={styles.sectorCell}>
                        {examen.SectorDescripcion || '-'}
                      </td>
                      {parametrosDisponibles.slice(0, 8).map(param => {
                        const detalle = examen.detalles.find(d => d.NombreParametro === param);
                        return (
                          <td key={param} className={styles.valueCell}>
                            {detalle ? (
                              <>
                                <span className={styles.value}>{detalle.Resultado}</span>
                                {detalle.ValorReferencia && (
                                  <span className={styles.reference}>
                                    ({detalle.ValorReferencia})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className={styles.noData}>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {parametroSeleccionado ? (
                <LabParameterChart
                  data={datosGrafico}
                  parametro={parametroSeleccionado}
                  unidad={unidadParametro}
                />
              ) : (
                <div className={styles.selectParameterMessage}>
                  <p>Seleccione un parámetro para ver el gráfico de evolución</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
