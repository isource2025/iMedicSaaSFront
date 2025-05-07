'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bed } from '../../types/beds';
import styles from './BedDetailView.module.css';
import { IoMedicalOutline, IoDocumentTextOutline, IoArrowBack, IoMenu } from 'react-icons/io5';
import { formatDate } from '../../utils/dateUtils';

interface BedDetailViewProps {
  bed: Bed;
}

const BedDetailView: React.FC<BedDetailViewProps> = ({ bed }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={handleBack}>
            <IoArrowBack />
            <span>Volver</span>
          </button>
          <button className={styles.menuButton} onClick={toggleSidebar}>
            <IoMenu />
          </button>
          <h1 className={styles.title}>
            Cama {bed.numeroCama} - {bed.sector}
          </h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.statusBadge}>
            {bed.estadoDescripcion || 'Sin estado'}
          </span>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className={styles.contentContainer}>
        {/* Sidebar - hidden by default */}
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h2>Menú</h2>
            <button className={styles.closeSidebarButton} onClick={toggleSidebar}>
              ×
            </button>
          </div>
          <div className={styles.sidebarContent}>
            <ul className={styles.sidebarMenu}>
              <li className={styles.sidebarMenuItem}>
                <button className={styles.sidebarButton}>
                  <IoMedicalOutline />
                  <span>Reporte de Enfermería</span>
                </button>
              </li>
              <li className={styles.sidebarMenuItem}>
                <button className={styles.sidebarButton}>
                  <IoDocumentTextOutline />
                  <span>Últimas Indicaciones</span>
                </button>
              </li>
              <li className={styles.sidebarMenuItem}>
                <button className={styles.sidebarButton}>
                  <span>Historial Clínico</span>
                </button>
              </li>
              <li className={styles.sidebarMenuItem}>
                <button className={styles.sidebarButton}>
                  <span>Estudios</span>
                </button>
              </li>
              <li className={styles.sidebarMenuItem}>
                <button className={styles.sidebarButton}>
                  <span>Medicación</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

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
      
      {/* Backdrop for sidebar when open */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={toggleSidebar}></div>
      )}
    </div>
  );
};

export default BedDetailView;
