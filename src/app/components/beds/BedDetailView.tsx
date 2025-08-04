'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bed } from '../../types/beds';
import styles from './BedDetailView.module.css';
import { IoMedicalOutline, IoDocumentTextOutline, IoArrowBack, IoChevronDown, IoChevronUp} from 'react-icons/io5';
import { formatDate } from '../../utils/dateUtils';

interface BedDetailViewProps {
  bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleBack = () => {
    router.back();
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Función para manejar clicks en los items del menú
  const handleMenuItemClick = (option: string) => {
    console.log(`Opción seleccionada: ${option}`);
    // Aquí se implementará la lógica para cada opción
    setMenuOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        
        <div className={styles.headerTop}>
          <button className={styles.backButton} onClick={handleBack}>
            <IoArrowBack className={styles.icon}/>
            <span>Volver</span>
          </button>
          
          
        </div>

        <div className={styles.headerBottom}>
          <h1 className={styles.title}>
            Cama {bed.numeroCama} - {bed.sector}
          </h1>
          <span className={styles.statusBadge}>
            {bed.estadoDescripcion || 'Sin estado'}
          </span>

          {/* MENU PACIENTE  */}
          <div className={styles.menuContainer}>
            <button className={styles.menuButton} onClick={toggleMenu}>
              <span>Administrar Internación</span>
              {menuOpen ? <IoChevronUp className={styles.icon} /> : <IoChevronDown className={styles.icon} />}
            </button>
            
            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <button 
                  className={styles.menuItem} 
                  onClick={() => handleMenuItemClick('indicaciones')}
                >
                  <IoMedicalOutline className={styles.menuIcon} />
                  <span>Indicaciones médicas</span>
                </button>
                <button 
                  className={styles.menuItem} 
                  onClick={() => handleMenuItemClick('evolucion')}
                >
                  <IoDocumentTextOutline className={styles.menuIcon} />
                  <span>Evolución</span>
                </button>
              </div>
            )}
          </div>
        </div>



      </div>

      {/* Main content with sidebar */}
      <div className={styles.contentContainer}>
        

        {/* Main content */}
        <div className={styles.mainContent}>
          {/* Patient info card */}
          <div className={styles.patientCard}>
            <div className={styles.patientHeader}>
              <h2 className={styles.patientName}>{bed.nombrePaciente}</h2>
              <span className={styles.patientDocument}>{bed.documentoPaciente}</span>
            </div>
            
            <div className={styles.patientDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Fecha de ingreso:</span>
                <span className={styles.detailValue}>
                  {bed.fechaIngreso ? formatDate(bed.fechaIngreso, { isClarionDate: true }) : 'N/A'}
                </span>
              </div>
              
              {bed.diagnosticoDescripcion && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Diagnóstico:</span>
                  <span className={styles.detailValue}>{bed.diagnosticoDescripcion}</span>
                </div>
              )}
              
              {bed.servicioMedicoDescripcion && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Servicio médico:</span>
                  <span className={styles.detailValue}>{bed.servicioMedicoDescripcion}</span>
                </div>
              )}
              
              {bed.razonSocialCliente && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Cobertura social:</span>
                  <span className={styles.detailValue}>{bed.razonSocialCliente}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional information sections */}
          <div className={styles.sectionGrid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Signos Vitales</h3>
              <div className={styles.sectionContent}>
                <p className={styles.emptyState}>No hay datos de signos vitales recientes</p>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Últimas Indicaciones</h3>
              <div className={styles.sectionContent}>
                <p className={styles.emptyState}>No hay indicaciones recientes</p>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Medicación Actual</h3>
              <div className={styles.sectionContent}>
                <p className={styles.emptyState}>No hay medicación registrada</p>
              </div>
            </div>
            
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Estudios Pendientes</h3>
              <div className={styles.sectionContent}>
                <p className={styles.emptyState}>No hay estudios pendientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Backdrop para cerrar el menú cuando está abierto */}
      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default BedDetailView;
