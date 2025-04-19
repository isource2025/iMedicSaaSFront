import { BedCardProps } from '../../types/beds/BedComponents';
import styles from './BedCard.module.css';
import {
  IoMedicalOutline,
  IoSwapHorizontalOutline,
  IoDocumentTextOutline,
  IoMale,
  IoFemale,
} from 'react-icons/io5';
import { formatDate } from '../../utils/dateUtils';

/**
 * Componente que muestra la información de una cama en formato de tarjeta
 */
export const BedCard: React.FC<BedCardProps> = ({
  bed,
  onNursingReport,
  onRecentIndications,
  onChangeBed
}) => {
  const renderGenderIcon = () => {
    const sexoValue = bed.sexoPaciente.toLowerCase();
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
    <div className={`${styles.bedCard} ${estadoClass}`}>
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
            <span className={styles.patientName}><strong>{bed.nombrePaciente}</strong> </span>
              
              {bed.fechaIngreso && (
                <span className={styles.date}>
                  <p className={styles.dateLabel}>Fecha de ingreso</p>
                  {formatDate(bed.fechaIngreso, { 
                    isClarionDate: true,
                  })}
                </span>
              )}
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
                onClick={() => onNursingReport(bed)}
              >
                <IoMedicalOutline className={styles.actionIcon} />
              </span>
              <span
                className={styles.iconWrapper}
                title="Últimas Indicaciones"
                onClick={() => onRecentIndications && onRecentIndications(bed.id)}
              >
                <IoDocumentTextOutline  className={styles.actionIcon} />
              </span>
              <span
                className={styles.iconWrapper}
                title="Cambiar Cama"
                onClick={() => onChangeBed && onChangeBed(bed.id)}
              >
                <IoSwapHorizontalOutline className={styles.actionIcon} />
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
