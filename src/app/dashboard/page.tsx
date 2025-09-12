'use client';

import { useEffect, useState } from 'react';
import { bedsService } from '../services/bedsService';
import { indicadoresService, ResumenPacientesHoy } from '../services/indicadoresService';
import styles from './DashboardPage.module.css';

const Icon = ({ path, className }: { path: string; className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <path d={path} />
  </svg>
);

const ICONS = {
  arrowRight: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
};

interface BedStats {
  totalCamas: number;
  camasDisponibles: number;
  camasOcupadas: number;
  camasNoDisponibles: number;
}

const initialPatientSummary: ResumenPacientesHoy = {
  totalHoy: 0,
  porcentajeCambio: 0,
};

export default function Dashboard() {
  const [bedStats, setBedStats] = useState<BedStats>({
    totalCamas: 0,
    camasDisponibles: 0,
    camasOcupadas: 0,
    camasNoDisponibles: 0
  });
  const [patientSummary, setPatientSummary] = useState<ResumenPacientesHoy>(initialPatientSummary);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    const fetchBedStats = async () => {
      try {
        const stats = await bedsService.getTotalBeds();
        setBedStats(stats);
      } catch (error) {
        console.error('Error fetching bed statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPatientSummary = async () => {
      try {
        const summary = await indicadoresService.obtenerResumenPacientesHoy();
        setPatientSummary(summary);
      } catch (error) {
        console.error('Error fetching patient summary:', error);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchBedStats();
    fetchPatientSummary();
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Panel de Control</h2>
      
      <div className={styles.cardsGrid}>
        {/* Dashboard Cards */}
        <div 
          className={styles.cardBedsTotal}
          onClick={() => window.location.href = '/dashboard/beds/analytics'}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.cardHeader}>
            <h3 className={styles.cardLabel}>Total Camas</h3>
            <button className={styles.arrowButton} aria-label="Ver análisis de camas">
              <Icon path={ICONS.arrowRight} className={styles.arrowIcon} />
            </button>
          </div>
          <p className={styles.cardValue}>
            {loading ? '...' : bedStats.totalCamas}
          </p>
          <div className={styles.cardStats}>
            <span className={styles.statGreen}>
              {loading ? '...' : bedStats.camasDisponibles} Disponibles
            </span>
            <span className={styles.divider}>|</span>
            <span className={styles.statRed}>
              {loading ? '...' : bedStats.camasOcupadas} Ocupadas
            </span>
          </div>
        </div>
        
        <div 
          className={styles.cardPatients}
          onClick={() => window.location.href = '/dashboard/patients/analytics'}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.cardHeader}>
            <h3 className={styles.cardLabel}>Pacientes</h3>
            <button className={styles.arrowButton} aria-label="Ver análisis de pacientes">
              <Icon path={ICONS.arrowRight} className={styles.arrowIcon} />
            </button>
          </div>
          <p className={styles.cardValue}>{loadingPatients ? '...' : patientSummary.totalHoy}</p>
          <div className={styles.cardStats}>
            {loadingPatients ? (
              <span className={styles.statBlue}>Cargando...</span>
            ) : (
              <span
                className={patientSummary.porcentajeCambio >= 0 ? styles.statGreen : styles.statRed}
              >
                {patientSummary.porcentajeCambio >= 0 ? '▲' : '▼'} {Math.abs(patientSummary.porcentajeCambio)}% vs ayer
              </span>
            )}
          </div>
        </div>
        
        <div className={styles.cardAppointments}>
          <h3 className={styles.cardLabel}>Citas del Día</h3>
          <p className={styles.cardValue}>28</p>
          <div className={styles.cardStats}>
            <span className={styles.statOrange}>12 Pendientes</span>
          </div>
        </div>
        
        <div className={styles.cardStaff}>
          <h3 className={styles.cardLabel}>Personal Activo</h3>
          <p className={styles.cardValue}>18</p>
          <div className={styles.cardStats}>
            <span className={styles.statPurple}>Próximamente</span>
          </div>
        </div>
      </div>
      
      {/* Activity Overview */}
      <div className={styles.activitySection}>
        <h3 className={styles.activityTitle}>Actividad Reciente</h3>
        <div className={styles.activityList}>
          {[
            { time: '09:45', action: 'Ingreso de paciente', details: 'Juan Pérez - Habitación 203', icon: '👤' },
            { time: '11:30', action: 'Alta médica', details: 'María Rodríguez - Habitación 108', icon: '🏥' },
            { time: '13:15', action: 'Cambio de cama', details: 'Roberto Gómez - De 305 a 310', icon: '🛏️' },
            { time: '14:20', action: 'Programación de cirugía', details: 'Ana Torres - Quirófano 2', icon: '🔪' },
          ].map((item, index) => (
            <div key={index} className={styles.activityItem}>
              <div className={styles.activityIconContainer}>
                <div className="w-8 h-8 rounded-full bg-pantone-311u bg-opacity-20 flex items-center justify-center">
                  <span>{item.icon}</span>
                </div>
              </div>
              <div className={styles.activityContent}>
                <p className={styles.activityAction}>{item.action}</p>
                <p className={styles.activityDetails}>{item.details}</p>
              </div>
              <div className={styles.activityTime}>{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
