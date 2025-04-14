import styles from './DashboardPage.module.css';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Panel de Control</h2>
      
      <div className={styles.cardsGrid}>
        {/* Dashboard Cards */}
        <div className={styles.cardBedsTotal}>
          <h3 className={styles.cardLabel}>Total Camas</h3>
          <p className={styles.cardValue}>45</p>
          <div className={styles.cardStats}>
            <span className={styles.statGreen}>32 Disponibles</span>
            <span className={styles.divider}>|</span>
            <span className={styles.statRed}>13 Ocupadas</span>
          </div>
        </div>
        
        <div className={styles.cardPatients}>
          <h3 className={styles.cardLabel}>Pacientes</h3>
          <p className={styles.cardValue}>126</p>
          <div className={styles.cardStats}>
            <span className={styles.statBlue}>8 Ingresos hoy</span>
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
            <span className={styles.statPurple}>3 Médicos de guardia</span>
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
