import { BedCardProps } from '../../types/beds/BedComponents';
import styles from './BedCard.module.css';
import {
  IoMedicalOutline,
  IoSwapHorizontalOutline,
  IoDocumentTextOutline,
  IoMale,
  IoFemale,
  IoFlaskOutline,
  IoExitOutline,
  IoTimeOutline
} from 'react-icons/io5';

/**
 * Componente que muestra la información de una cama en formato de tarjeta
 */
const BedCard: React.FC<BedCardProps> = ({
  bed,
  onNursingReport,
  onRecentIndications,
  onChangeBed,
  onBedClick,
  onLabResults,
  onDischarge
}) => {
  // Ya no necesitamos cargar el movimiento por separado
  // porque fechaIngresoSQL y horaIngresoSQL vienen directamente del backend
  const renderGenderIcon = () => {
        const sexoValue = bed.SexoPaciente ? bed.SexoPaciente.toLowerCase() : '';
    if (sexoValue === 'm' || sexoValue === 'masculino') {
      return <IoMale className={styles.maleIcon} title={bed.descripcionSexo || 'Masculino'} />;
    } else if (sexoValue === 'f' || sexoValue === 'femenino') {
      return <IoFemale className={styles.femaleIcon} title={bed.descripcionSexo || 'Femenino'} />;
    }
    // return <IoPerson title={bed.descripcionSexo || 'No especificado'} />;
  };

  // Cálculo robusto de edad
  let edadStr: string | null = null;
  const fechaNacimiento = (bed as any).fechaNacimientoPaciente || (bed as any).fechaNacimiento;
  if (fechaNacimiento) {
    const nacimiento = new Date(fechaNacimiento);
    if (!isNaN(nacimiento.getTime())) {
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      edadStr = `${edad} años`;
    }
  }

  const isLibre = bed.estado === 'desocupada' || bed.estado === 'disponible';
  const isOcupada = bed.estado === 'ocupada';
  const isAislada = bed.estado === 'aislada';
  let estadoClass = '';
  if (isOcupada) estadoClass = styles['estado-ocupada'];
  else if (isLibre) estadoClass = styles['estado-libre'];
  else if (isAislada) estadoClass = styles['estado-aislada'];
  else if (bed.estado) estadoClass = styles[`estado-${bed.estado}`] || '';

  return (
    <div 
      className={`${styles.bedCard} ${estadoClass}`} 
      onClick={() => onBedClick && onBedClick(bed.id)}
    >
      <div className={styles.cardHeader}>
        <div className={styles.bedInfo}>
          <span className={styles.sectorLabel}>{bed.sector}</span>
          <span className={styles.bedNumber}>{bed.numeroCama}</span>
        </div>
        {bed.numeroVisita && bed.numeroVisita !== 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {bed.numeroVisita}
            {renderGenderIcon()}
          </div>
        ) : null}
      </div>
      <div className={styles.cardBody}>
        {isOcupada ? (
          <>
          <div className={styles.primaryData}>
            <div className={styles.patientData}>
              
              <span className={styles.documentNumber}>{bed.documentoPaciente}</span>
            <span className={styles.patientName}><strong>{bed.NombrePaciente}</strong> </span>
              
              <div className={styles.dateTimeContainer}>
                {/* Fecha de ingreso */}
                {(bed as any).fechaIngresoSQL && (
                  <span className={styles.date}>
                    <p className={styles.dateLabel}>Fecha de ingreso</p>
                    {(bed as any).fechaIngresoSQL}
                    {(bed as any).horaIngresoSQL && (
                      <span className={styles.timeValue}>
                        <IoTimeOutline className={styles.timeIcon} />
                        {(bed as any).horaIngresoSQL}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {bed.servicioMedicoDescripcion && (
                <span className={styles.date}>
                  {bed.servicioMedicoDescripcion}
                </span>
              )}
              {bed.razonSocialCliente && (
                <span className={styles.date}>
                  {bed.razonSocialCliente}
                </span>
              )}
            </div>
          </div>
          
           
            {bed.diagnosticoDescripcion && (
              <div className={styles.diagnosticSection}>
                <p className={styles.diagnostic}>{bed.diagnosticoDescripcion}</p>
              </div>
            )}
            <div className={styles.iconsContainer}>
              <span
                className={styles.iconWrapper}
                title="Reporte de Enfermería"
                onClick={(e) => {
                  e.stopPropagation(); // Detener la propagación del evento
                  onNursingReport(bed);
                }}
              >
                <IoMedicalOutline className={styles.actionIcon} />
              </span>

              <span
                className={styles.iconWrapper}
                title="Resultados de Laboratorio"
                onClick={(e) => {
                  e.stopPropagation(); // Detener la propagación del evento
                  onLabResults && onLabResults(bed.id);
                }}
              >
                <IoFlaskOutline className={styles.actionIcon} />
              </span>

              <span
                className={styles.iconWrapper}
                title="Últimas Indicaciones"
                onClick={(e) => {
                  e.stopPropagation(); // Detener la propagación del evento
                  onRecentIndications && onRecentIndications(bed.id);
                }}
              >
                <IoDocumentTextOutline  className={styles.actionIcon} />
              </span>
              <span
                className={styles.iconWrapper}
                title="Cambiar Cama"
                onClick={(e) => {
                  e.stopPropagation(); // Detener la propagación del evento
                  onChangeBed && onChangeBed(bed.id);
                }}
              >
                <IoSwapHorizontalOutline className={styles.actionIcon} />
              </span>
              <span
                className={styles.iconWrapper}
                title="Egreso del Paciente"
                onClick={(e) => {
                  e.stopPropagation(); // Detener la propagación del evento
                  onDischarge && onDischarge(bed.id);
                }}
              >
                <IoExitOutline className={styles.actionIcon} />
              </span>
            </div>
          </>
        ) : (
          <div className={styles.freeBodyContent}>
            <span className={styles.statusBadge}>
              {bed.estadoDescripcion || 'Sin estado'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedCard;
