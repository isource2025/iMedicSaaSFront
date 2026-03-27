'use client';

import React, { useState, useEffect } from 'react';
import { Indicacion } from '../../types/indicaciones';
import { indicacionesService } from '../../services/indicacionesService';
import styles from './IndicacionesList.module.css';
import Loader from '../Loader/Loader';

interface IndicacionesListProps {
  numeroVisita: number | null;
  showAll?: boolean;
  limit?: number;
}

const IndicacionesList: React.FC<IndicacionesListProps> = ({ 
  numeroVisita, 
  showAll = false, 
  limit = 5 
}) => {
  const [indicaciones, setIndicaciones] = useState<Indicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (numeroVisita) {
      fetchIndicaciones();
    }
  }, [numeroVisita, showAll, limit]);

  const fetchIndicaciones = async () => {
    if (!numeroVisita) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data: Indicacion[];
      if (showAll) {
        data = await indicacionesService.getIndicacionesByVisita(numeroVisita);
      } else {
        data = await indicacionesService.getLastIndicacionesByVisita(numeroVisita, limit);
      }
      setIndicaciones(data);
    } catch (err) {
      setError('Error al cargar las indicaciones');
      console.error('Error fetching indicaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Este componente no maneja creación; el botón/modal se controla desde BedDetail

  const formatDateTime = (fecha: string | null, hora: string | null): string => {
    if (!fecha) return 'No especificada';
    
    try {
      const date = new Date(fecha);
      const dateStr = date.toLocaleDateString('es-AR');
      const timeStr = hora || '';
      return `${dateStr} ${timeStr}`.trim();
    } catch {
      return 'Fecha inválida';
    }
  };

  const getEstadoColor = (estado: string | null): string => {
    switch (estado?.toUpperCase()) {
      case 'A': return styles.estadoActivo;
      case 'C': return styles.estadoCumplido;
      case 'P': return styles.estadoPendiente;
      case 'S': return styles.estadoSuspendido;
      default: return styles.estadoDefault;
    }
  };

  const getEstadoText = (estado: string | null): string => {
    switch (estado?.toUpperCase()) {
      case 'A': return 'Activo';
      case 'C': return 'Cumplido';
      case 'P': return 'Pendiente';
      case 'S': return 'Suspendido';
      default: return estado || 'Sin estado';
    }
  };

  if (!numeroVisita) {
    return (
      <div className={styles.emptyState}>
        <p>No hay número de visita disponible</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '200px' }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={fetchIndicaciones} className={styles.retryButton}>
          Reintentar
        </button>
      </div>
    );
  }

  if (indicaciones.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No hay indicaciones registradas para esta visita</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.indicacionesList}>
        {indicaciones.map((indicacion) => (
          <div key={indicacion.NroIndicacion} className={styles.indicacionItem}>
            <div className={styles.indicacionHeader}>
              <div className={styles.indicacionInfo}>
                <span className={styles.indicacionNumber}>
                  {indicacion.OperadorApellido && indicacion.OperadorNombres
                    ? `${indicacion.OperadorApellido}, ${indicacion.OperadorNombres}`
                    : (indicacion.OperadorCarga ?? 'Operador desconocido')}
                </span>
              </div>
            </div>
            
            <div className={styles.indicacionContent}>
              {indicacion.AliasMedicamento && (
                <div className={styles.medicamento}>
                  <strong>Medicamento:</strong> {indicacion.AliasMedicamento}
                </div>
              )}
              {typeof indicacion.Cantidad !== 'undefined' && indicacion.Cantidad !== null && (
                <div className={styles.cantidad}>
                  <strong>Cantidad:</strong> {indicacion.Cantidad} {indicacion.TipoUnidad || ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndicacionesList;
