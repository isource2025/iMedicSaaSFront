'use client';

// Importamos el componente modularizado AdmissionTables
import AdmissionTables from '../../../components/admission/AdmissionTables/AdmissionTables';

// Mantenemos los estilos locales para cualquier estilo adicional específico de página
import styles from './tables.module.css';

export default function AdmissionTablesPage() {
  return (
    <div className={styles.container}>
      <AdmissionTables />
    </div>
  );
}
